const express = require('express');
const router = express.Router();
const fabricClient = require('../utils/fabricClient');
const fabricHelper = require('../utils/fabricHelper');
const ipfsClient = require('../utils/ipfsClient');

// Admin wallet address (hardcoded for security)
const ADMIN_WALLET_ADDRESS = '0x7613787893518461Bc6C007ccd97A5F7F877E2C4';

// Middleware to verify admin
const verifyAdmin = (req, res, next) => {
  const adminWallet = req.headers['x-admin-wallet'];
  
  if (!adminWallet || adminWallet.toLowerCase() !== ADMIN_WALLET_ADDRESS.toLowerCase()) {
    return res.status(403).json({ error: 'Unauthorized: Admin access only' });
  }
  
  next();
};

// Get all users
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    // Query all users from blockchain with local storage fallback
    let usersJSON;
    try {
      usersJSON = await fabricClient.evaluateTransaction('GetAllUsers');
    } catch (e) {
      usersJSON = await fabricHelper.evaluateTransaction('GetAllUsers');
    }
    let users = JSON.parse(usersJSON || '[]');

    // Deduplicate by userID
    const seen = new Set();
    users = users.filter(u => {
      if (!u.userID || seen.has(u.userID)) return false;
      seen.add(u.userID);
      return true;
    });

    // Fetch IPFS data for each user
    const usersWithData = await Promise.all(
      users.map(async (user) => {
        try {
          if (user.ipfsHash) {
            // Fetch full user data from IPFS
            const ipfsData = await ipfsClient.getFile(user.ipfsHash);
            
            return {
              userID: user.userID,
              pseudoID: user.pseudoID,
              walletAddress: user.walletAddress,
              role: user.role,
              email: user.email,
              emailVerified: user.emailVerified,
              ipfsHash: user.ipfsHash,
              registrationDate: user.registrationDate,
              isActive: user.isActive,
              name: ipfsData.name || 'N/A',
              age: ipfsData.age || 'N/A',
              gender: ipfsData.gender || 'N/A',
              documents: ipfsData.documents || {},
              profilePic: ipfsData.documents?.profilePic || null
            };
          }
          return {
            ...user,
            name: 'N/A',
            age: 'N/A',
            gender: 'N/A',
            documents: {},
            profilePic: null
          };
        } catch (err) {
          console.error(`Error fetching IPFS data for user ${user.userID}:`, err);
          return {
            ...user,
            name: 'N/A',
            age: 'N/A',
            gender: 'N/A',
            documents: {},
            profilePic: null
          };
        }
      })
    );

    res.json({ users: usersWithData });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Block/Unblock user
router.post('/block-user', verifyAdmin, async (req, res) => {
  try {
    const { userID, isBlocked, reason } = req.body;

    if (!userID) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Update user status on blockchain
    await fabricHelper.submitTransaction(
      'BlockUser',
      userID,
      isBlocked.toString(),
      reason || 'Admin action'
    );

    res.json({
      message: isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
      success: true
    });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Get user details by ID
router.get('/user/:userID', verifyAdmin, async (req, res) => {
  try {
    const { userID } = req.params;

    const userJSON = await fabricClient.evaluateTransaction('GetUser', userID);
    const user = JSON.parse(userJSON);

    // Fetch IPFS data
    if (user.ipfsHash) {
      const userData = await ipfsClient.getFile(user.ipfsHash);
      user.userData = userData;
    }

    res.json({ user });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Get application statistics
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const usersJSON = await fabricClient.evaluateTransaction('GetAllUsers');
    const users = JSON.parse(usersJSON || '[]');

    const ridesJSON = await fabricClient.evaluateTransaction('GetAllRides');
    const rides = JSON.parse(ridesJSON || '[]');

    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter(u => !u.isBlocked).length,
      blockedUsers: users.filter(u => u.isBlocked).length,
      drivers: users.filter(u => u.role === 'driver').length,
      passengers: users.filter(u => u.role === 'passenger').length,
      totalRides: rides.length,
      activeRides: rides.filter(r => r.status === 'created' || r.status === 'started').length,
      completedRides: rides.filter(r => r.status === 'completed').length
    };

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
