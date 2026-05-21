const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const fabricHelper = require('../utils/fabricHelper');
const fabricClient = require('../utils/fabricClient');
const ipfsClient = require('../utils/ipfsClient');
const cryptoUtil = require('../utils/crypto');
const emailService = require('../utils/emailService');

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG) and PDF files are allowed!'));
    }
  }
});

// Store verification tokens temporarily (use Redis in production)
const verificationTokens = new Map();
const authChallenges = new Map();

// Register new user
router.post('/register', upload.fields([
  { name: 'license', maxCount: 1 },
  { name: 'vehiclePapers', maxCount: 1 },
  { name: 'profilePic', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, age, gender, email, role, emergencyContact: ecStr } = req.body;

    // Validate required fields
    if (!name || !age || !gender || !email || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (role === 'driver' && (!req.files?.license || !req.files?.vehiclePapers)) {
      return res.status(400).json({ error: 'Drivers must upload license and vehicle papers' });
    }

    // Parse emergency contact (passengers only)
    let emergencyContact = null;
    if (role === 'passenger' && ecStr) {
      try { emergencyContact = typeof ecStr === 'string' ? JSON.parse(ecStr) : ecStr; } catch(_) {}
    }

    // Generate key pair for pseudonymous authentication
    const keyPair = cryptoUtil.generateKeyPair();
    
    // Prepare user data for IPFS
    const userData = {
      name,
      age,
      gender,
      email,
      role,
      ...(emergencyContact && { emergencyContact }),
      registrationDate: new Date().toISOString()
    };

    // Upload documents to IPFS
    const ipfsHashes = {};
    
    if (req.files?.license) {
      const licenseResult = await ipfsClient.uploadFile(
        req.files.license[0].path,
        `license_${email}`
      );
      ipfsHashes.license = licenseResult.ipfsHash;
      fs.unlinkSync(req.files.license[0].path); // Clean up
    }

    if (req.files?.vehiclePapers) {
      const papersResult = await ipfsClient.uploadFile(
        req.files.vehiclePapers[0].path,
        `vehicle_${email}`
      );
      ipfsHashes.vehiclePapers = papersResult.ipfsHash;
      fs.unlinkSync(req.files.vehiclePapers[0].path);
    }

    if (req.files?.profilePic) {
      const picResult = await ipfsClient.uploadFile(
        req.files.profilePic[0].path,
        `profile_${email}`
      );
      ipfsHashes.profilePic = picResult.ipfsHash;
      fs.unlinkSync(req.files.profilePic[0].path);
    }

    userData.documents = ipfsHashes;

    // Upload complete user data to IPFS
    const userDataResult = await ipfsClient.uploadJSON(userData, `user_${email}`);
    
    // Generate unique user ID
    const userID = cryptoUtil.generateUniqueID('USER_');

    // Register on blockchain or store locally
    await fabricHelper.submitTransaction(
      'RegisterUser',
      userID,
      keyPair.pseudoID,
      role,
      email,
      userDataResult.ipfsHash,
      emergencyContact ? JSON.stringify(emergencyContact) : ''
    );

    // Generate verification token
    const verificationToken = cryptoUtil.generateUniqueID('VERIFY_');
    verificationTokens.set(verificationToken, { userID, email, expiry: Date.now() + 86400000 }); // 24 hours

    // Send verification email (non-critical — user can still register if email fails)
    try {
      await emailService.sendVerificationEmail(email, userID, verificationToken);
    } catch (emailErr) {
      console.warn('⚠️  Verification email could not be sent:', emailErr.message);
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      userID,
      pseudoID: keyPair.pseudoID,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      ipfsHash: userDataResult.ipfsHash
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  try {
    const { token, userId } = req.body;

    if (!token || !userId) {
      return res.status(400).json({ error: 'Missing token or userId' });
    }

    const verification = verificationTokens.get(token);
    
    if (!verification) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    if (verification.userID !== userId) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    if (Date.now() > verification.expiry) {
      verificationTokens.delete(token);
      return res.status(400).json({ error: 'Verification token expired' });
    }

    // Verify on blockchain or update locally
    await fabricHelper.submitTransaction('VerifyUserEmail', userId);

    verificationTokens.delete(token);

    res.json({
      message: 'Email verified successfully. You can now use the application.',
      success: true
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message || 'Verification failed' });
  }
});

// Get authentication challenge
router.post('/challenge', async (req, res) => {
  try {
    const { pseudoID } = req.body;

    if (!pseudoID) {
      return res.status(400).json({ error: 'Missing pseudoID' });
    }

    const challenge = cryptoUtil.generateChallenge();
    authChallenges.set(pseudoID, {
      challenge,
      expiry: Date.now() + 300000 // 5 minutes
    });

    res.json({ challenge });

  } catch (error) {
    console.error('Challenge error:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

// Login with pseudonymous authentication
router.post('/login', async (req, res) => {
  try {
    const { pseudoID, publicKey, signature } = req.body;

    if (!pseudoID || !publicKey || !signature) {
      return res.status(400).json({ error: 'Missing authentication data' });
    }

    // Get challenge
    const authData = authChallenges.get(pseudoID);
    
    if (!authData) {
      return res.status(400).json({ error: 'No challenge found. Request a challenge first.' });
    }

    if (Date.now() > authData.expiry) {
      authChallenges.delete(pseudoID);
      return res.status(400).json({ error: 'Challenge expired' });
    }

    // Verify pseudoID matches public key
    const computedPseudoID = cryptoUtil.hashPublicKey(publicKey);
    if (computedPseudoID !== pseudoID) {
      return res.status(401).json({ error: 'Invalid pseudoID' });
    }

    // Verify signature
    const isValid = cryptoUtil.verifySignature(authData.challenge, signature, publicKey);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    authChallenges.delete(pseudoID);

    // ── Resolve authoritative userID & role from blockchain ─────────────────
    // ALWAYS prefer blockchain data over client-provided values.
    // The client's keyData.userID may have been corrupted (e.g. by a previous
    // MetaMask login that merged wallet data into keyData).  The pseudoID is
    // cryptographically proven above, so blockchain lookup by pseudoID is safe.
    let { userID: clientUserID, role: clientRole } = req.body;
    let userID = null;
    let role   = null;

    try {
      const userJSON = await fabricHelper.evaluateTransaction('GetUserByPseudoID', pseudoID);
      const userData = userJSON && userJSON !== 'null' ? JSON.parse(userJSON) : null;
      if (userData) {
        userID = userData.userID;
        role   = userData.role;
        console.log(`ℹ️  Login resolved from blockchain: userID=${userID} role=${role}`);
      }
    } catch (lookupErr) {
      console.warn('⚠️  Blockchain lookup failed, falling back to client values:', lookupErr.message);
    }

    // Last resort: use whatever the client sent (covers offline / Fabric-down scenarios)
    if (!userID) userID = clientUserID;
    if (!role)   role   = clientRole;

    // Generate JWT
    const token = jwt.sign(
      { pseudoID, publicKey, ...(userID && { userID }), ...(role && { role }) },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      pseudoID,
      userID,
      role
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Get user profile (protected route)
router.get('/profile/:userID', authenticateToken, async (req, res) => {
  try {
    const { userID } = req.params;
    
    const userJSON = await fabricClient.evaluateTransaction('GetUser', userID);
    const user = JSON.parse(userJSON);

    // Get user data from IPFS
    const userData = await ipfsClient.getFile(user.ipfsHash);

    res.json({
      ...user,
      userData
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Register with MetaMask wallet
router.post('/register-wallet', upload.fields([
  { name: 'license', maxCount: 1 },
  { name: 'vehiclePapers', maxCount: 1 },
  { name: 'profilePic', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, age, gender, email, role, walletAddress, message, signature, emergencyContact: ecStr } = req.body;

    // Validate required fields
    if (!name || !age || !gender || !email || !role || !walletAddress || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (role === 'driver' && (!req.files?.license || !req.files?.vehiclePapers)) {
      return res.status(400).json({ error: 'Drivers must upload license and vehicle papers' });
    }

    // Parse emergency contact (passengers only)
    let emergencyContact = null;
    if (role === 'passenger' && ecStr) {
      try { emergencyContact = typeof ecStr === 'string' ? JSON.parse(ecStr) : ecStr; } catch(_) {}
    }

    // Check if wallet already registered (blockchain first, then local storage)
    try {
      const existingUserJSON = await fabricHelper.evaluateTransaction('GetUserByWallet', walletAddress);
      if (existingUserJSON && existingUserJSON !== 'null') {
        const existingUser = JSON.parse(existingUserJSON);
        if (existingUser) {
          return res.status(400).json({ 
            error: 'You are already registered. Please login instead.',
            code: 'ALREADY_REGISTERED'
          });
        }
      }
    } catch (err) {
      // User doesn't exist, continue with registration
    }

    // Verify wallet signature (normalize \r\n so multipart form data can't break the hash)
    const Web3 = require('web3');
    const web3 = new Web3();
    const normalizedMessage = (message || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    try {
      const recoveredAddress = web3.eth.accounts.recover(normalizedMessage, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        console.error(`Register sig mismatch: expected ${walletAddress}, got ${recoveredAddress}`);
        return res.status(401).json({ error: 'Invalid wallet signature' });
      }
    } catch (err) {
      console.error('Register sig error:', err.message);
      return res.status(401).json({ error: 'Failed to verify wallet signature' });
    }

    // Prepare user data for IPFS
    const userData = {
      name,
      age,
      gender,
      email,
      role,
      walletAddress,
      authMethod: 'wallet',
      ...(emergencyContact && { emergencyContact }),
      registrationDate: new Date().toISOString()
    };

    // Upload documents to IPFS
    const ipfsHashes = {};
    
    if (req.files?.license) {
      const licenseResult = await ipfsClient.uploadFile(
        req.files.license[0].path,
        `license_${walletAddress}`
      );
      ipfsHashes.license = licenseResult.ipfsHash;
      fs.unlinkSync(req.files.license[0].path);
    }

    if (req.files?.vehiclePapers) {
      const papersResult = await ipfsClient.uploadFile(
        req.files.vehiclePapers[0].path,
        `vehicle_${walletAddress}`
      );
      ipfsHashes.vehiclePapers = papersResult.ipfsHash;
      fs.unlinkSync(req.files.vehiclePapers[0].path);
    }

    if (req.files?.profilePic) {
      const picResult = await ipfsClient.uploadFile(
        req.files.profilePic[0].path,
        `profile_${walletAddress}`
      );
      ipfsHashes.profilePic = picResult.ipfsHash;
      fs.unlinkSync(req.files.profilePic[0].path);
    }

    userData.documents = ipfsHashes;

    // Upload complete user data to IPFS
    const userDataResult = await ipfsClient.uploadJSON(userData, `user_${walletAddress}`);
    
    // Generate unique user ID
    const userID = cryptoUtil.generateUniqueID('USER_');

    // Register on blockchain
    await fabricHelper.submitTransaction(
      'RegisterWalletUser',
      userID,
      walletAddress,
      role,
      email,
      userDataResult.ipfsHash,
      emergencyContact ? JSON.stringify(emergencyContact) : ''
    );

    // Generate verification token
    const verificationToken = cryptoUtil.generateUniqueID('VERIFY_');
    verificationTokens.set(verificationToken, { userID, email, expiry: Date.now() + 86400000 });

    // Send verification email (non-critical — user can still register if email fails)
    try {
      await emailService.sendVerificationEmail(email, userID, verificationToken);
    } catch (emailErr) {
      console.warn('⚠️  Verification email could not be sent:', emailErr.message);
    }

    res.status(201).json({
      message: 'Registration successful with MetaMask!',
      userID,
      walletAddress,
      ipfsHash: userDataResult.ipfsHash
    });

  } catch (error) {
    console.error('Wallet registration error:', error);
    res.status(500).json({ error: error.message || 'Wallet registration failed' });
  }
});

// Login with MetaMask wallet
router.post('/login-wallet', async (req, res) => {
  try {
    const { walletAddress, message, signature } = req.body;

    if (!walletAddress || !message || !signature) {
      return res.status(400).json({ error: 'Missing authentication data' });
    }

    // Verify wallet signature (normalize \r\n so multipart form data can't break the hash)
    const Web3 = require('web3');
    const web3 = new Web3();
    const normalizedMessageLogin = (message || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    try {
      const recoveredAddress = web3.eth.accounts.recover(normalizedMessageLogin, signature);
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        console.error(`Login sig mismatch: expected ${walletAddress}, got ${recoveredAddress}`);
        return res.status(401).json({ error: 'Invalid wallet signature' });
      }
    } catch (err) {
      console.error('Login sig error:', err.message);
      return res.status(401).json({ error: 'Failed to verify wallet signature' });
    }

    // Get user from blockchain (with local storage fallback)
    let user;
    try {
      const userJSON = await fabricHelper.evaluateTransaction('GetUserByWallet', walletAddress);
      if (!userJSON || userJSON === 'null') {
        return res.status(404).json({ error: 'Wallet not registered. Please register first.' });
      }
      user = JSON.parse(userJSON);
      if (!user) {
        return res.status(404).json({ error: 'Wallet not registered. Please register first.' });
      }
    } catch (queryErr) {
      if (queryErr.message && (queryErr.message.toLowerCase().includes('not registered') || queryErr.message.toLowerCase().includes('does not exist') || queryErr.message.toLowerCase().includes('not found'))) {
        return res.status(404).json({ error: 'Wallet not registered. Please register first.' });
      }
      throw queryErr;
    }

    // Check if email is verified
    if (!user.isActive || !user.emailVerified) {
      return res.status(403).json({ 
        error: 'Email not verified. Please check your email and verify your account before logging in.',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return res.status(403).json({ 
        error: 'Your account has been blocked. Please contact support.',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userID: user.userID, walletAddress, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    );

    res.json({
      message: 'Login successful with MetaMask',
      token,
      user: {
        userID: user.userID,
        walletAddress,
        role: user.role,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Wallet login error:', error);
    if (error.message && (error.message.toLowerCase().includes('not registered') || error.message.toLowerCase().includes('does not exist') || error.message.toLowerCase().includes('not found'))) {
      return res.status(404).json({ error: 'Wallet not registered. Please register first.' });
    }
    res.status(500).json({ error: 'Wallet login failed' });
  }
});

module.exports = router;
module.exports.authenticateToken = authenticateToken;
