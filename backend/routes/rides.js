const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const fabricHelper = require('../utils/fabricHelper');
const fabricClient = require('../utils/fabricClient');
const cryptoUtil = require('../utils/crypto');
const emailService = require('../utils/emailService');

// global.rideOTPs is initialized in bookings.js (loaded first)
// but guard here in case routes load in different order
global.rideOTPs = global.rideOTPs || new Map();

// Create a new ride (driver only)
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      driverID,
      startLocation,
      endLocation,
      departureTime,
      availableSeats,
      pricePerSeat,
      rideType
    } = req.body;

    if (!driverID || !startLocation || !endLocation || !departureTime || !availableSeats || !pricePerSeat) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const rideID = cryptoUtil.generateUniqueID('RIDE_');

    await fabricHelper.submitTransaction(
      'CreateRide',
      rideID,
      driverID,
      req.user.pseudoID || req.user.userID || 'unknown',
      (startLocation.lat ?? startLocation.latitude ?? 0).toString(),
      (startLocation.lng ?? startLocation.longitude ?? 0).toString(),
      startLocation.address,
      (endLocation.lat ?? endLocation.latitude ?? 0).toString(),
      (endLocation.lng ?? endLocation.longitude ?? 0).toString(),
      endLocation.address,
      departureTime,
      availableSeats.toString(),
      pricePerSeat.toString(),
      rideType || 'solo'
    );

    // Get driver email and send notification (best-effort, don't fail ride creation)
    try {
      const userJSON = await fabricHelper.evaluateTransaction('GetUser', driverID);
      const user = userJSON && userJSON !== 'null' ? JSON.parse(userJSON) : null;
      if (user?.email) {
        await emailService.sendRideNotification(user.email, 'RIDE_CREATED', {
          rideID,
          startLocation: startLocation.address,
          endLocation: endLocation.address,
          departureTime,
          price: pricePerSeat
        });
      }
    } catch (_notifErr) {
      // Email notification failure should not block ride creation
    }

    // Emit socket event
    const io = req.app.get('io');
    io.emit('ride_created', { rideID, startLocation, endLocation });

    res.status(201).json({
      message: 'Ride created successfully',
      rideID
    });

  } catch (error) {
    console.error('Create ride error:', error);
    res.status(500).json({ error: error.message || 'Failed to create ride' });
  }
});

// Search available rides
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { startLat, startLng, endLat, endLng, departureDate, seats } = req.query;

    // In production, implement proper querying with CouchDB rich queries
    // For now, this is a placeholder that would need chaincode query function
    
    res.json({
      message: 'Search functionality requires implementing rich queries in chaincode',
      suggestion: 'Use GetAllRides chaincode function and filter on client side'
    });

  } catch (error) {
    console.error('Search rides error:', error);
    res.status(500).json({ error: 'Failed to search rides' });
  }
});

// Get rides created by current user (driver) - must be before /:rideID
router.get('/my-rides', authenticateToken, async (req, res) => {
  try {
    const { userID, walletAddress } = req.user;

    let driverID = userID;
    if (!driverID && walletAddress) {
      const userJSON = await fabricHelper.evaluateTransaction('GetUserByWallet', walletAddress);
      const user = JSON.parse(userJSON);
      driverID = user?.userID;
    }

    if (!driverID) {
      return res.status(400).json({ error: 'User identification missing' });
    }

    const ridesJSON = await fabricHelper.evaluateTransaction('GetAllRides');
    const allRides = JSON.parse(ridesJSON) || [];
    const myRides = allRides.filter(ride => ride.driverID === driverID);

    res.json(myRides);

  } catch (error) {
    console.error('My rides error:', error);
    res.status(500).json({ error: 'Failed to fetch your rides' });
  }
});

// Get ride details
router.get('/:rideID', authenticateToken, async (req, res) => {
  try {
    const { rideID } = req.params;
    
    const rideJSON = await fabricHelper.evaluateTransaction('GetRide', rideID);
    const ride = JSON.parse(rideJSON);

    res.json(ride);

  } catch (error) {
    console.error('Get ride error:', error);
    res.status(500).json({ error: 'Failed to fetch ride details' });
  }
});

// Book a ride
router.post('/book', authenticateToken, async (req, res) => {
  try {
    const { rideID, passengerID, seatsBooked } = req.body;

    if (!rideID || !passengerID || !seatsBooked) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const bookingID = cryptoUtil.generateUniqueID('BOOKING_');

    await fabricHelper.submitTransaction(
      'BookRide',
      bookingID,
      rideID,
      passengerID,
      req.user.pseudoID,
      seatsBooked.toString()
    );

    // Get ride and user details
    const rideJSON = await fabricHelper.evaluateTransaction('GetRide', rideID);
    const ride = JSON.parse(rideJSON);
    
    const driverJSON = await fabricHelper.evaluateTransaction('GetUser', ride.driverID);
    const driver = JSON.parse(driverJSON);
    
    const passengerJSON = await fabricHelper.evaluateTransaction('GetUser', passengerID);
    const passenger = JSON.parse(passengerJSON);

    // Send notifications
    await emailService.sendRideNotification(driver.email, 'RIDE_BOOKED', {
      rideID,
      startLocation: ride.startLocation.address,
      endLocation: ride.endLocation.address,
      departureTime: ride.departureTime
    });

    await emailService.sendRideNotification(passenger.email, 'BOOKING_CONFIRMED', {
      rideID,
      startLocation: ride.startLocation.address,
      endLocation: ride.endLocation.address,
      departureTime: ride.departureTime,
      price: ride.pricePerSeat * seatsBooked
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(ride.driverID).emit('ride_booked', { bookingID, rideID, passengerID });

    res.status(201).json({
      message: 'Ride booked successfully',
      bookingID
    });

  } catch (error) {
    console.error('Book ride error:', error);
    res.status(500).json({ error: error.message || 'Failed to book ride' });
  }
});

// Verify OTP and start ride (driver enters OTP given by passenger)
router.post('/verify-otp', authenticateToken, async (req, res) => {
  try {
    const { rideID, bookingID, otp } = req.body;

    if (!rideID || !bookingID || !otp) {
      return res.status(400).json({ error: 'rideID, bookingID, and otp are required' });
    }

    const otpRecord = global.rideOTPs.get(bookingID);
    if (!otpRecord) {
      return res.status(404).json({ error: 'OTP not found for this booking. Ask passenger to refresh.' });
    }

    if (otpRecord.used) {
      return res.status(400).json({ error: 'OTP already used — ride is already started.' });
    }

    if (new Date(otpRecord.expiresAt) < new Date()) {
      global.rideOTPs.delete(bookingID);
      return res.status(400).json({ error: 'OTP expired. Please cancel and rebook.' });
    }

    if (otpRecord.otp !== otp.trim()) {
      return res.status(401).json({ error: 'Incorrect OTP. Please ask the passenger to read their OTP again.' });
    }

    // Mark OTP as used
    otpRecord.used = true;
    otpRecord.usedAt = new Date().toISOString();
    global.rideOTPs.set(bookingID, otpRecord);

    // Start the ride on blockchain
    await fabricHelper.submitTransaction('StartRide', rideID);

    // Get ride details for socket notification
    let ride = null;
    try {
      const rideJSON = await fabricHelper.evaluateTransaction('GetRide', rideID);
      ride = JSON.parse(rideJSON);
    } catch (_) {}

    // Emit real-time socket events
    const io = req.app.get('io');
    const startPayload = {
      rideID,
      bookingID,
      message: '🚗 Ride has started! OTP verified successfully.',
      timestamp: new Date().toISOString(),
    };
    io.emit('ride_started', startPayload);
    io.to(`ride_${rideID}`).emit('otp_verified', startPayload);
    // Also notify the passenger's personal room
    if (otpRecord.passengerID) {
      io.to(otpRecord.passengerID).emit('otp_verified', startPayload);
    }

    // Notify passengers via email (best-effort)
    try {
      if (ride?.passengers?.length) {
        for (const pID of ride.passengers) {
          const pJSON = await fabricHelper.evaluateTransaction('GetUser', pID);
          const p = JSON.parse(pJSON);
          if (p?.email) {
            await emailService.sendRideNotification(p.email, 'RIDE_STARTED', {
              rideID,
              startLocation: ride.startLocation?.address || ride.startAddress,
              endLocation: ride.endLocation?.address || ride.endAddress,
            });
          }
        }
      }
    } catch (_) {}

    res.json({
      message: 'OTP verified! Ride started successfully.',
      rideID,
      bookingID,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify OTP' });
  }
});

// Start a ride (legacy — kept for backward compat, but use /verify-otp instead)
router.post('/start', authenticateToken, async (req, res) => {
  try {
    const { rideID, driverID } = req.body;

    if (!rideID || !driverID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await fabricHelper.submitTransaction('StartRide', rideID);

    // Get ride details
    const rideJSON = await fabricHelper.evaluateTransaction('GetRide', rideID);
    const ride = JSON.parse(rideJSON);

    // Notify all passengers
    for (const passengerID of ride.passengers) {
      const passengerJSON = await fabricHelper.evaluateTransaction('GetUser', passengerID);
      const passenger = JSON.parse(passengerJSON);
      
      await emailService.sendRideNotification(passenger.email, 'RIDE_STARTED', {
        rideID,
        startLocation: ride.startLocation.address,
        endLocation: ride.endLocation.address
      });
    }

    // Emit socket event
    const io = req.app.get('io');
    io.emit('ride_started', { rideID });

    res.json({
      message: 'Ride started successfully',
      rideID
    });

  } catch (error) {
    console.error('Start ride error:', error);
    res.status(500).json({ error: error.message || 'Failed to start ride' });
  }
});

// End a ride
router.post('/end', authenticateToken, async (req, res) => {
  try {
    const { rideID, driverID } = req.body;

    if (!rideID || !driverID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await fabricHelper.submitTransaction('EndRide', rideID);

    // Get ride details
    const rideJSON = await fabricHelper.evaluateTransaction('GetRide', rideID);
    const ride = JSON.parse(rideJSON);

    // ── Auto-release escrow payments for all bookings ────────────────
    const paymentRoutes = require('./payment');
    const releasePaymentForBooking = paymentRoutes.releasePaymentForBooking;
    let releaseResults = [];

    try {
      const bookingsJSON = await fabricHelper.evaluateTransaction('GetRideBookings', rideID);
      const rideBookings = JSON.parse(bookingsJSON || '[]');

      for (const booking of rideBookings) {
        if (booking.status === 'cancelled') continue;

        // Auto-record transaction if not already present
        const amount = (booking.seatsBooked || 1) * (ride.pricePerSeat || 0);
        const txnID = cryptoUtil.generateUniqueID('TXN_');
        await fabricHelper.submitTransaction(
          'RecordTransaction',
          txnID,
          booking.bookingID,
          rideID,
          booking.passengerPseudoID || booking.passengerID,
          ride.driverPseudoID || ride.driverID,
          String(amount),
          booking.paymentMethod || 'cash',
          ''
        );

        // Release escrow payment
        if (releasePaymentForBooking) {
          const result = await releasePaymentForBooking(booking.bookingID);
          releaseResults.push({ bookingID: booking.bookingID, ...result });
          console.log(`💸 Payment release for ${booking.bookingID}:`, result);
        }
      }
    } catch (payErr) {
      console.warn('Payment release error (non-critical):', payErr.message);
    }

    // Notify all passengers
    for (const passengerID of (ride.passengers || [])) {
      try {
        const passengerJSON = await fabricHelper.evaluateTransaction('GetUser', passengerID);
        const passenger = JSON.parse(passengerJSON);
        if (passenger?.email) {
          await emailService.sendRideNotification(passenger.email, 'RIDE_COMPLETED', {
            rideID,
            startLocation: ride.startLocation?.address || ride.startAddress,
            endLocation: ride.endLocation?.address || ride.endAddress
          });
        }
      } catch (_) {}
    }

    // Emit socket event
    const io = req.app.get('io');
    io.emit('ride_completed', { rideID });
    io.emit('ride_ended', { rideID, payments: releaseResults });

    res.json({
      message: 'Ride completed successfully',
      rideID,
      paymentsReleased: releaseResults.length,
      paymentDetails: releaseResults,
    });

  } catch (error) {
    console.error('End ride error:', error);
    res.status(500).json({ error: error.message || 'Failed to end ride' });
  }
});


// Cancel a ride
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const { rideID, driverID } = req.body;

    if (!rideID) {
      return res.status(400).json({ error: 'Missing rideID' });
    }

    await fabricHelper.submitTransaction('CancelRide', rideID);

    // Get ride details and notify passengers
    const rideJSON = await fabricHelper.evaluateTransaction('GetRide', rideID);
    const ride = JSON.parse(rideJSON);

    for (const passengerID of ride.passengers) {
      const passengerJSON = await fabricHelper.evaluateTransaction('GetUser', passengerID);
      const passenger = JSON.parse(passengerJSON);
      
      await emailService.sendRideNotification(passenger.email, 'RIDE_CANCELLED', {
        rideID,
        startLocation: ride.startLocation.address,
        endLocation: ride.endLocation.address
      });
    }

    res.json({
      message: 'Ride cancelled successfully',
      rideID
    });

  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel ride' });
  }
});

// Cancel booking
router.post('/cancel-booking', authenticateToken, async (req, res) => {
  try {
    const { bookingID } = req.body;

    if (!bookingID) {
      return res.status(400).json({ error: 'Missing bookingID' });
    }

    await fabricHelper.submitTransaction('CancelBooking', bookingID);

    res.json({
      message: 'Booking cancelled successfully',
      bookingID
    });

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel booking' });
  }
});

// Record payment transaction
router.post('/payment', authenticateToken, async (req, res) => {
  try {
    const {
      bookingID,
      rideID,
      toPseudoID,
      amount,
      paymentMethod,
      ethTransactionHash
    } = req.body;

    if (!bookingID || !rideID || !toPseudoID || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transactionID = cryptoUtil.generateUniqueID('TXN_');

    await fabricHelper.submitTransaction(
      'RecordTransaction',
      transactionID,
      bookingID,
      rideID,
      req.user.pseudoID,
      toPseudoID,
      amount.toString(),
      paymentMethod,
      ethTransactionHash || ''
    );

    // Get driver info and send notification
    const rideJSON = await fabricHelper.evaluateTransaction('GetRide', rideID);
    const ride = JSON.parse(rideJSON);
    
    const driverJSON = await fabricHelper.evaluateTransaction('GetUser', ride.driverID);
    const driver = JSON.parse(driverJSON);

    await emailService.sendRideNotification(driver.email, 'PAYMENT_RECEIVED', {
      rideID,
      amount
    });

    res.status(201).json({
      message: 'Payment recorded successfully',
      transactionID
    });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ error: error.message || 'Failed to record payment' });
  }
});

module.exports = router;
