const express = require('express');
const router = express.Router();
const fabricClient = require('../utils/fabricClient');
const fabricHelper = require('../utils/fabricHelper');
const jwt = require('jsonwebtoken');
const ipfsClient = require('../utils/ipfsClient');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

// Get current user's profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const { userID, walletAddress, pseudoID } = req.user;

    // Fetch user from blockchain (with local storage fallback)
    let userJSON;
    if (walletAddress) {
      userJSON = await fabricHelper.evaluateTransaction('GetUserByWallet', walletAddress);
    } else if (userID) {
      userJSON = await fabricHelper.evaluateTransaction('GetUser', userID);
    } else if (pseudoID) {
      userJSON = await fabricHelper.evaluateTransaction('GetUserByPseudoID', pseudoID);
    } else {
      return res.status(400).json({ error: 'User identification missing' });
    }

    const user = JSON.parse(userJSON);

    // Fetch full profile data from IPFS if available
    let profileData = {
      userID: user.userID,
      pseudoID: user.pseudoID,
      walletAddress: user.walletAddress,
      role: user.role,
      email: user.email,
      emailVerified: user.emailVerified,
      registrationDate: user.registrationDate,
      isActive: user.isActive
    };

    if (user.ipfsHash) {
      try {
        const ipfsData = await ipfsClient.getJSON(user.ipfsHash);
        profileData = {
          ...profileData,
          name: ipfsData.name,
          age: ipfsData.age,
          gender: ipfsData.gender,
          ipfsHash: user.ipfsHash,
          documents: ipfsData.documents || {},
          profilePic: ipfsData.documents?.profilePic || null
        };
      } catch (error) {
        console.error('Failed to fetch IPFS data:', error);
        // Continue with basic profile data
      }
    }

    res.json(profileData);

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get current user's stats (rides created / bookings made)
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { userID, walletAddress } = req.user;
    const passengerID = userID || walletAddress;

    // Count bookings made by this passenger — from blockchain
    const bookingsJSON = await fabricHelper.evaluateTransaction('GetBookingsByPassenger', passengerID);
    const myBookings = JSON.parse(bookingsJSON || '[]') || [];

    // Count rides created by this driver — from blockchain
    const ridesJSON = await fabricHelper.evaluateTransaction('GetAllRides');
    const allRides = JSON.parse(ridesJSON || '[]');
    const myRides = allRides.filter(r => r.driverID === userID || r.driverID === walletAddress);

    const completedRides    = myRides.filter(r => r.status === 'completed').length;
    const completedBookings = myBookings.filter(b => b.status === 'completed').length;

    // Feedback/XP — from blockchain
    const feedbackJSON = await fabricHelper.evaluateTransaction('GetUserFeedback', passengerID);
    const myFeedback = JSON.parse(feedbackJSON || '[]') || [];
    const xp = myFeedback.length * 10 + completedRides * 10 + completedBookings * 5;

    res.json({
      totalRidesCreated: myRides.length,
      completedRides,
      totalBookings: myBookings.length,
      completedBookings,
      xp,
      feedbackCount: myFeedback.length
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── Get any user's wallet address by userID (for ETH payments) ──────────────
// Returns only wallet address — safe to expose to authenticated users
router.get('/:userID/wallet', authenticateToken, async (req, res) => {
  try {
    const { userID } = req.params;
    if (!userID) return res.status(400).json({ error: 'userID required' });

    let user = null;

    // Try GetUser first (standard users)
    try {
      const j = await fabricHelper.evaluateTransaction('GetUser', userID);
      user = j && j !== 'null' ? JSON.parse(j) : null;
    } catch (_) {}

    // If not found, try GetUserByWallet (MetaMask users whose userID IS their wallet)
    if (!user && userID.startsWith('0x')) {
      try {
        const j = await fabricHelper.evaluateTransaction('GetUserByWallet', userID);
        user = j && j !== 'null' ? JSON.parse(j) : null;
      } catch (_) {}
    }

    // Also try by pseudoID
    if (!user) {
      try {
        const j = await fabricHelper.evaluateTransaction('GetUserByPseudoID', userID);
        user = j && j !== 'null' ? JSON.parse(j) : null;
      } catch (_) {}
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found', walletAddress: null });
    }

    const wallet = user.walletAddress || (userID.startsWith('0x') ? userID : null);

    res.json({
      userID:        user.userID,
      walletAddress: wallet,
      hasWallet:     !!wallet,
    });
  } catch (error) {
    console.error('Get user wallet error:', error);
    res.status(500).json({ error: 'Failed to fetch wallet address', walletAddress: null });
  }
});

// ─── Get any user's public profile (name, pic, vehicle) ──────────────────────
router.get('/:userID/public', authenticateToken, async (req, res) => {
  try {
    const { userID } = req.params;
    if (!userID) return res.status(400).json({ error: 'userID required' });

    let user = null;

    // Try GetUser first
    try {
      const j = await fabricHelper.evaluateTransaction('GetUser', userID);
      user = j && j !== 'null' ? JSON.parse(j) : null;
    } catch (_) {}

    // Try wallet
    if (!user && userID.startsWith('0x')) {
      try {
        const j = await fabricHelper.evaluateTransaction('GetUserByWallet', userID);
        user = j && j !== 'null' ? JSON.parse(j) : null;
      } catch (_) {}
    }

    // Try pseudoID
    if (!user) {
      try {
        const j = await fabricHelper.evaluateTransaction('GetUserByPseudoID', userID);
        user = j && j !== 'null' ? JSON.parse(j) : null;
      } catch (_) {}
    }

    // Also check in-memory stores
    if (!user && global.users) {
      user = global.users.get(userID) || null;
    }
    if (!user && global.walletUsers) {
      user = global.walletUsers.get(userID) || null;
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build public profile
    const publicProfile = {
      userID: user.userID,
      role: user.role,
      name: user.name || null,
      profilePic: user.profilePic || null,
      // vehicle info
      vehicleInfo: user.vehicleInfo || user.vehicle || null,
      licensePlate: user.licensePlate || user.vehicleNumber || null,
      vehicleModel: user.vehicleModel || null,
      vehicleColor: user.vehicleColor || null,
    };

    // Enrich from IPFS if available
    if (user.ipfsHash) {
      try {
        const ipfsData = await ipfsClient.getJSON(user.ipfsHash);
        publicProfile.name = publicProfile.name || ipfsData.name || null;
        publicProfile.profilePic = publicProfile.profilePic || ipfsData.documents?.profilePic || null;
        publicProfile.vehicleInfo = publicProfile.vehicleInfo || ipfsData.vehicleInfo || ipfsData.vehicle || null;
        publicProfile.licensePlate = publicProfile.licensePlate || ipfsData.licensePlate || ipfsData.vehicleNumber || null;
        publicProfile.vehicleModel = publicProfile.vehicleModel || ipfsData.vehicleModel || null;
        publicProfile.vehicleColor = publicProfile.vehicleColor || ipfsData.vehicleColor || null;
      } catch (_) {}
    }

    res.json(publicProfile);
  } catch (error) {
    console.error('Public profile error:', error);
    res.status(500).json({ error: 'Failed to fetch public profile' });
  }
});

module.exports = router;
