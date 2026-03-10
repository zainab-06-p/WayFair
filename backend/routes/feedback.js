const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const fabricHelper = require('../utils/fabricHelper');

// Submit feedback
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const {
      rideID,
      bookingID,
      toUserID,
      rating,
      review,
      timestamp
    } = req.body;

    if (!rideID || !toUserID || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const fromUserID = req.user.userID || req.user.walletAddress;
    const feedbackID = 'FEEDBACK_' + require('crypto').randomBytes(12).toString('hex');

    // Submit feedback to blockchain
    await fabricHelper.submitTransaction(
      'SubmitFeedback',
      feedbackID,
      rideID,
      bookingID || '',
      fromUserID,
      toUserID,
      rating.toString(),
      review || ''
    );

    res.json({
      message: 'Feedback submitted successfully',
      feedbackID,
      success: true
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get user feedback
router.get('/user/:userID', async (req, res) => {
  try {
    const { userID } = req.params;
    const feedbackJSON = await fabricHelper.evaluateTransaction('GetUserFeedback', userID);
    const feedbackList = JSON.parse(feedbackJSON || '[]');
    let totalRating = 0, count = 0;
    feedbackList.forEach(fb => { if (fb.rating) { totalRating += parseInt(fb.rating); count++; } });
    const averageRating = count > 0 ? (totalRating / count).toFixed(1) : 0;
    res.json({ feedback: feedbackList, averageRating: parseFloat(averageRating), totalReviews: count });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get feedback for a specific ride
router.get('/ride/:rideID', async (req, res) => {
  try {
    const { rideID } = req.params;
    const feedbackJSON = await fabricHelper.evaluateTransaction('GetRideFeedback', rideID);
    const feedback = JSON.parse(feedbackJSON || '[]');
    res.json({ feedback });
  } catch (error) {
    console.error('Error fetching ride feedback:', error);
    res.status(500).json({ error: 'Failed to fetch ride feedback' });
  }
});

// Get feedback statistics
router.get('/stats/:userID', async (req, res) => {
  try {
    const { userID } = req.params;

    const feedbackJSON = await fabricHelper.evaluateTransaction('GetUserFeedback', userID);
    const feedbackList = JSON.parse(feedbackJSON || '[]');

    // Calculate statistics
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    feedbackList.forEach(feedback => {
      const rating = parseInt(feedback.rating);
      if (rating >= 1 && rating <= 5) {
        ratingCounts[rating]++;
        totalRating += rating;
      }
    });

    const totalReviews = feedbackList.length;
    const averageRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0;

    res.json({
      averageRating: parseFloat(averageRating),
      totalReviews,
      ratingDistribution: ratingCounts
    });
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch feedback statistics' });
  }
});

module.exports = router;
