const express = require('express');
const router = express.Router();
const fabricHelper = require('../utils/fabricHelper');

async function query(fn, ...args) {
  return await fabricHelper.evaluateTransaction(fn, ...args);
}

// Get all rides
router.get('/all', async (req, res) => {
  try {
    const ridesJSON = await query('GetAllRides');
    const rides = JSON.parse(ridesJSON || '[]');
    res.json({ rides, count: rides.length });
  } catch (error) {
    console.error('Error fetching all rides:', error);
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

// Get all bookings
router.get('/bookings', async (req, res) => {
  try {
    const bookingsJSON = await query('GetAllBookings');
    const bookings = JSON.parse(bookingsJSON || '[]');
    res.json({ bookings, count: bookings.length });
  } catch (error) {
    console.error('Error fetching all bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Get all transactions
router.get('/transactions', async (req, res) => {
  try {
    const transactionsJSON = await query('GetAllTransactions');
    const transactions = JSON.parse(transactionsJSON || '[]');
    res.json({ transactions, count: transactions.length });
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get all feedback
router.get('/feedback', async (req, res) => {
  try {
    const feedbackJSON = await query('GetAllFeedback');
    const feedbacks = JSON.parse(feedbackJSON || '[]');
    res.json({ feedbacks, count: feedbacks.length });
  } catch (error) {
    console.error('Error fetching all feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get all SOS alerts
router.get('/sos', async (req, res) => {
  try {
    const alertsJSON = await query('GetAllSOSAlerts');
    const alerts = JSON.parse(alertsJSON || '[]');
    res.json({ alerts, count: alerts.length });
  } catch (error) {
    console.error('Error fetching SOS alerts:', error);
    res.status(500).json({ error: 'Failed to fetch SOS alerts' });
  }
});

// Get blockchain stats
router.get('/stats', async (req, res) => {
  try {
    const [usersJ, ridesJ, bookingsJ, feedbackJ, transactionsJ, sosJ] = await Promise.all([
      query('GetAllUsers'),
      query('GetAllRides'),
      query('GetAllBookings'),
      query('GetAllFeedback'),
      query('GetAllTransactions'),
      query('GetAllSOSAlerts'),
    ]);
    const users        = JSON.parse(usersJ        || '[]');
    const rides        = JSON.parse(ridesJ        || '[]');
    const bookings     = JSON.parse(bookingsJ     || '[]');
    const feedback     = JSON.parse(feedbackJ     || '[]');
    const transactions = JSON.parse(transactionsJ || '[]');
    const sosAlerts    = JSON.parse(sosJ          || '[]');

    const stats = {
      totalUsers:        users.length,
      totalRides:        rides.length,
      totalBookings:     bookings.length,
      totalFeedback:     feedback.length,
      totalTransactions: transactions.length,
      totalSOS:          sosAlerts.length,
      activeRides:       rides.filter(r => ['created', 'scheduled', 'started', 'in-progress'].includes(r.status)).length,
      completedRides:    rides.filter(r => r.status === 'completed').length,
      driverCount:       users.filter(u => (u.role || '').toLowerCase() === 'driver').length,
      passengerCount:    users.filter(u => (u.role || '').toLowerCase() === 'passenger').length,
    };
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
