const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');
const fabricHelper = require('../utils/fabricHelper');
const cryptoUtil = require('../utils/crypto');

// ─── OTP Store ──────────────────────────────────────────────────────────────
// global.rideOTPs: bookingID → { otp, rideID, passengerID, expiresAt, used }
global.rideOTPs = global.rideOTPs || new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ── specific routes first (before wildcard /:bookingID) ──────────

// Get current user's bookings
router.get('/my/bookings', authenticateToken, async (req, res) => {
  try {
    const { userID, walletAddress } = req.user;
    const passengerID = userID || walletAddress;
    const json = await fabricHelper.evaluateTransaction('GetBookingsByPassenger', passengerID);
    const bookings = JSON.parse(json || '[]') || [];
    res.json(bookings);
  } catch (error) {
    console.error('Fetch my bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch your bookings' });
  }
});

// Get all bookings for a specific ride
router.get('/ride/:rideID', authenticateToken, async (req, res) => {
  try {
    const { rideID } = req.params;
    const { userID, walletAddress } = req.user;
    const json = await fabricHelper.evaluateTransaction('GetRideBookings', rideID);
    const rideBookings = JSON.parse(json || '[]') || [];
    const myBooking = rideBookings.find(
      b => b.passengerID === userID || b.passengerID === walletAddress
    );
    res.json({ bookings: rideBookings, booking: myBooking || null });
  } catch (error) {
    console.error('Fetch ride bookings error:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// Create a booking
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const {
      rideID, seatsBooked,
      pickupAddress, pickupLat, pickupLng,
      dropAddress,   dropLat,   dropLng,
      paymentMethod, totalPrice
    } = req.body;
    const { userID, pseudoID, walletAddress } = req.user;

    if (!rideID || !seatsBooked) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const passengerID = userID || walletAddress;
    if (!passengerID) return res.status(400).json({ error: 'User identification missing' });

    const bookingID = cryptoUtil.generateUniqueID('BOOKING_');

    await fabricHelper.submitTransaction(
      'BookRide',
      bookingID,
      rideID,
      passengerID,
      pseudoID || walletAddress || passengerID,
      String(seatsBooked),
      String(pickupLat || '0'),
      String(pickupLng || '0'),
      pickupAddress || '',
      String(dropLat  || '0'),
      String(dropLng  || '0'),
      dropAddress || '',
      paymentMethod || 'cash',
    );

    // ── Generate OTP for this booking ─────────────────────────────────────
    const otp = generateOTP();
    global.rideOTPs.set(bookingID, {
      otp,
      rideID,
      passengerID: passengerID,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
      used: false,
      createdAt: new Date().toISOString(),
    });
    console.log(`🔐 OTP generated for booking ${bookingID}: ${otp}`);

    res.status(201).json({ message: 'Ride booked successfully', bookingID, otp });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ error: error.message || 'Failed to book ride' });
  }
});

// ─── GET /otp/:bookingID — Passenger fetches their OTP ─────────────────────
router.get('/otp/:bookingID', authenticateToken, (req, res) => {
  const { bookingID } = req.params;
  const { userID, walletAddress } = req.user;
  const otpRecord = global.rideOTPs.get(bookingID);

  if (!otpRecord) {
    return res.status(404).json({ error: 'OTP not found for this booking' });
  }

  // Verify the requester is the passenger
  const requesterID = userID || walletAddress;
  if (otpRecord.passengerID !== requesterID) {
    return res.status(403).json({ error: 'Forbidden — not your booking' });
  }

  if (otpRecord.used) {
    return res.json({ otp: null, used: true, message: 'OTP has already been used — ride started' });
  }

  res.json({
    otp: otpRecord.otp,
    bookingID,
    rideID: otpRecord.rideID,
    used: false,
    expiresAt: otpRecord.expiresAt,
  });
});

// Cancel a booking
router.post('/cancel', authenticateToken, async (req, res) => {
  try {
    const { bookingID } = req.body;
    if (!bookingID) return res.status(400).json({ error: 'Booking ID required' });
    await fabricHelper.submitTransaction('CancelBooking', bookingID);
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ── wildcard last ─────────────────────────────────────────────────
// Get booking by ID
router.get('/:bookingID', authenticateToken, async (req, res) => {
  try {
    const { bookingID } = req.params;
    const booking = (global.bookings || new Map()).get(bookingID);
    if (!booking) {
      // Try blockchain
      const j = await fabricHelper.evaluateTransaction('GetBooking', bookingID);
      const b = JSON.parse(j);
      if (!b) return res.status(404).json({ error: 'Booking not found' });
      return res.json(b);
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

module.exports = router;

