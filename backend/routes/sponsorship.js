const express = require('express');
const router = express.Router();
const fabricHelper = require('../utils/fabricHelper');
const fabricClient = require('../utils/fabricClient');
const cryptoUtil = require('../utils/crypto');
const { authenticateToken } = require('./auth');

// Middleware to verify driver role
const isDriver = (req, res, next) => {
  if (req.user.role !== 'driver') {
    return res.status(403).json({ error: 'Only drivers can access this resource' });
  }
  next();
};

// Create sponsorship request
router.post('/request', authenticateToken, isDriver, async (req, res) => {
  try {
    const { sponsorPseudoID } = req.body;
    
    if (!sponsorPseudoID) {
      return res.status(400).json({ error: 'Sponsor pseudoID required' });
    }

    // Get sponsor details
    const usersJSON = await fabricClient.evaluateTransaction('GetAllUsers');
    const users = JSON.parse(usersJSON || '[]');
    const sponsor = users.find(u => u.pseudoID === sponsorPseudoID && u.role === 'driver');
    
    if (!sponsor) {
      return res.status(404).json({ error: 'Sponsor not found or not a driver' });
    }

    const sponsorshipID = cryptoUtil.generateUniqueID('SPONSORSHIP_');

    // Create sponsorship request on blockchain
    await fabricHelper.submitTransaction(
      'CreateSponsorshipRequest',
      sponsorshipID,
      sponsor.userID,
      sponsorPseudoID,
      req.user.userID,
      req.user.pseudoID
    );

    res.status(201).json({
      message: 'Sponsorship request created successfully',
      sponsorshipID,
      sponsorName: sponsor.name || 'Unknown',
      status: 'pending'
    });

  } catch (error) {
    console.error('Sponsorship request error:', error);
    res.status(500).json({ error: error.message || 'Failed to create sponsorship request' });
  }
});

// Get pending sponsorship requests for current driver (as sponsor)
router.get('/pending', authenticateToken, isDriver, async (req, res) => {
  try {
    const sponsorships = await fabricClient.evaluateTransaction('GetDriverSponsorships', req.user.userID);
    const allSponsorships = JSON.parse(sponsorships || '[]');
    
    // Filter for pending sponsorships where current user is the sponsor
    const pending = allSponsorships.filter(s => 
      s.sponsorID === req.user.userID && s.status === 'pending'
    );

    res.json({ sponsorships: pending });

  } catch (error) {
    console.error('Get pending sponsorships error:', error);
    res.status(500).json({ error: 'Failed to fetch pending sponsorships' });
  }
});

// Get all sponsorships for current driver (as sponsor or sponsee)
router.get('/my-sponsorships', authenticateToken, isDriver, async (req, res) => {
  try {
    const sponsorships = await fabricClient.evaluateTransaction('GetDriverSponsorships', req.user.userID);
    const allSponsorships = JSON.parse(sponsorships || '[]');

    // Separate into categories
    const asSponsor = allSponsorships.filter(s => s.sponsorID === req.user.userID);
    const asSponsee = allSponsorships.filter(s => s.sponseeID === req.user.userID);

    res.json({
      asSponsor,
      asSponsee,
      total: allSponsorships.length
    });

  } catch (error) {
    console.error('Get sponsorships error:', error);
    res.status(500).json({ error: 'Failed to fetch sponsorships' });
  }
});

// Accept sponsorship request
router.post('/accept/:sponsorshipID', authenticateToken, isDriver, async (req, res) => {
  try {
    const { sponsorshipID } = req.params;

    // Accept sponsorship on blockchain
    await fabricHelper.submitTransaction('AcceptSponsorship', sponsorshipID);

    res.json({
      message: 'Sponsorship accepted successfully',
      sponsorshipID,
      probationPeriod: '90 days'
    });

  } catch (error) {
    console.error('Accept sponsorship error:', error);
    res.status(500).json({ error: error.message || 'Failed to accept sponsorship' });
  }
});

// Record accountability event (admin or automated)
router.post('/accountability-event', authenticateToken, async (req, res) => {
  try {
    const {
      sponsorshipID,
      sponseeID,
      eventType, // 'positive' or 'negative'
      description,
      impactScore // -100 to +100
    } = req.body;

    if (!sponsorshipID || !sponseeID || !eventType || !impactScore) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const eventID = cryptoUtil.generateUniqueID('EVENT_');

    // Record event on blockchain
    await fabricHelper.submitTransaction(
      'RecordAccountabilityEvent',
      eventID,
      sponsorshipID,
      sponseeID,
      eventType,
      description,
      impactScore.toString()
    );

    res.json({
      message: 'Accountability event recorded',
      eventID,
      impactScore
    });

  } catch (error) {
    console.error('Record accountability event error:', error);
    res.status(500).json({ error: error.message || 'Failed to record accountability event' });
  }
});

// Get driver trust score
router.get('/trust-score', authenticateToken, isDriver, async (req, res) => {
  try {
    const trustScoreJSON = await fabricClient.evaluateTransaction('GetDriverTrustScore', req.user.userID);
    const trustScore = JSON.parse(trustScoreJSON);

    res.json({ trustScore });

  } catch (error) {
    console.error('Get trust score error:', error);
    res.status(500).json({ error: 'Failed to fetch trust score' });
  }
});

// Get trust score for specific driver (public)
router.get('/trust-score/:driverID', async (req, res) => {
  try {
    const { driverID } = req.params;
    const trustScoreJSON = await fabricClient.evaluateTransaction('GetDriverTrustScore', driverID);
    const trustScore = JSON.parse(trustScoreJSON);

    res.json({ trustScore });

  } catch (error) {
    console.error('Get trust score error:', error);
    res.status(500).json({ error: 'Failed to fetch trust score' });
  }
});

// Complete probation (automated - called after 90 days)
router.post('/complete-probation/:sponsorshipID', authenticateToken, async (req, res) => {
  try {
    const { sponsorshipID } = req.params;

    await fabricHelper.submitTransaction('CompleteProbation', sponsorshipID);

    res.json({
      message: 'Probation completed successfully',
      sponsorshipID
    });

  } catch (error) {
    console.error('Complete probation error:', error);
    res.status(500).json({ error: error.message || 'Failed to complete probation' });
  }
});

module.exports = router;
