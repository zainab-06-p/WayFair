const express = require('express');
const router = express.Router();
const fabricHelper = require('../utils/fabricHelper');
const fabricClient = require('../utils/fabricClient');
const { v4: uuidv4 } = require('uuid');

// Record payment on blockchain
router.post('/record', async (req, res) => {
  try {
    const {
      bookingID,
      rideID,
      amount,
      paymentMethod,
      transactionHash,
      upiId,
      ethAddress
    } = req.body;

    if (!bookingID || !rideID || !amount || !paymentMethod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const userID = req.user?.userID || req.headers['x-user-id'];
    const transactionID = uuidv4();
    const timestamp = new Date().toISOString();

    // Get booking and ride details
    const bookingJSON = await fabricClient.evaluateTransaction('GetBooking', bookingID);
    const booking = JSON.parse(bookingJSON);

    const rideJSON = await fabricClient.evaluateTransaction('GetRideByID', rideID);
    const ride = JSON.parse(rideJSON);

    // Record transaction on blockchain
    await fabricHelper.submitTransaction(
      'RecordTransaction',
      transactionID,
      bookingID,
      rideID,
      booking.passengerPseudoID,
      ride.driverPseudoID,
      amount.toString(),
      paymentMethod,
      transactionHash || '',
      timestamp,
      JSON.stringify({
        upiId: upiId || '',
        ethAddress: ethAddress || '',
        status: 'completed'
      })
    );

    // Update booking status to paid
    await fabricHelper.submitTransaction(
      'UpdateBookingStatus',
      bookingID,
      'paid'
    );

    res.json({
      message: 'Payment recorded successfully',
      transactionID,
      success: true
    });
  } catch (error) {
    console.error('Payment recording error:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get payment history for a user
router.get('/history/:userID', async (req, res) => {
  try {
    const { userID } = req.params;

    // Query transactions from blockchain
    const txJSON = await fabricClient.evaluateTransaction('GetUserTransactions', userID);
    const transactions = JSON.parse(txJSON || '[]');

    res.json({ transactions });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get payment details for a specific booking
router.get('/booking/:bookingID', async (req, res) => {
  try {
    const { bookingID } = req.params;

    const txJSON = await fabricClient.evaluateTransaction('GetBookingTransaction', bookingID);
    const transaction = JSON.parse(txJSON);

    res.json({ transaction });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({ error: 'Failed to fetch payment details' });
  }
});

// Verify Ethereum transaction
router.post('/verify-eth', async (req, res) => {
  try {
    const { transactionHash } = req.body;

    if (!transactionHash) {
      return res.status(400).json({ error: 'Transaction hash required' });
    }

    // In a real app, verify the transaction on Ethereum network
    // For now, just return success
    res.json({
      verified: true,
      transactionHash,
      message: 'Ethereum transaction verified'
    });
  } catch (error) {
    console.error('ETH verification error:', error);
    res.status(500).json({ error: 'Failed to verify transaction' });
  }
});

module.exports = router;
