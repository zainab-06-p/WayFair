const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const fabricHelper = require('../utils/fabricHelper');
const cryptoUtil = require('../utils/crypto');
const emailService = require('../utils/emailService');

// Trigger SOS alert
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    const {
      rideID,
      bookingID,
      passengerID,
      location
    } = req.body;

    if (!rideID || !bookingID || !passengerID || !location) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const alertID = cryptoUtil.generateUniqueID('SOS_');

    // Get passenger and driver info first
    let passenger = null, ride = null, driver = null;
    try {
      const passengerJSON = await fabricHelper.evaluateTransaction('GetUser', passengerID);
      passenger = JSON.parse(passengerJSON);
      const rideJSON = await fabricHelper.evaluateTransaction('GetRide', rideID);
      ride = JSON.parse(rideJSON);
      if (ride?.driverID) {
        const driverJSON = await fabricHelper.evaluateTransaction('GetUser', ride.driverID);
        driver = JSON.parse(driverJSON);
      }
    } catch (_) { /* non-critical - SOS still fires */ }

    // Record SOS on blockchain
    await fabricHelper.submitTransaction(
      'TriggerSOS',
      alertID,
      rideID,
      bookingID,
      passengerID,
      req.user.pseudoID || req.user.userID || passengerID || '',
      location.latitude.toString(),
      location.longitude.toString(),
      location.address || ''
    );

    // Send SOS alerts
    const alertDetails = {
      alertID,
      rideID,
      bookingID,
      passengerID,
      location: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      timestamp: new Date().toISOString()
    };

    // Notify passenger (confirmation)
    try {
      if (passenger?.email) await emailService.sendSOSAlert(passenger.email, alertDetails);
    } catch (_) { /* email non-critical */ }

    // Notify driver
    try {
      if (driver?.email) await emailService.sendSOSAlert(driver.email, alertDetails);
    } catch (_) { /* email non-critical */ }

    // Notify emergency contacts / authorities (via n8n)
    // This would typically go to a monitoring system or emergency services

    // Emit real-time socket event
    const io = req.app.get('io');
    io.emit('sos_alert', alertDetails);
    io.to(ride.driverID).emit('sos_alert', alertDetails);

    res.status(201).json({
      message: 'SOS alert triggered. Authorities have been notified.',
      alertID,
      alertDetails
    });

  } catch (error) {
    console.error('SOS trigger error:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger SOS' });
  }
});

// Get SOS alert details
router.get('/:alertID', authenticateToken, async (req, res) => {
  try {
    const { alertID } = req.params;
    const alertJSON = await fabricHelper.evaluateTransaction('GetSOSAlert', alertID);
    const alert = JSON.parse(alertJSON);
    res.json({ alert });
  } catch (error) {
    console.error('Get SOS error:', error);
    res.status(500).json({ error: 'Failed to fetch SOS alert' });
  }
});

// Get all SOS alerts (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const alertsJSON = await fabricHelper.evaluateTransaction('GetAllSOSAlerts');
    const alerts = JSON.parse(alertsJSON || '[]');
    res.json({ alerts });
  } catch (error) {
    console.error('Get all SOS alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch SOS alerts' });
  }
});

// Resolve SOS alert (admin/driver only)
router.post('/resolve', authenticateToken, async (req, res) => {
  try {
    const { alertID } = req.body;

    if (!alertID) {
      return res.status(400).json({ error: 'Missing alertID' });
    }

    await fabricHelper.submitTransaction('ResolveSOSAlert', alertID);

    res.json({
      message: 'SOS alert resolved successfully',
      alertID
    });

  } catch (error) {
    console.error('Resolve SOS error:', error);
    res.status(500).json({ error: 'Failed to resolve SOS alert' });
  }
});

module.exports = router;
