/**
 * Payment Routes — Direct payment system (no escrow)
 *
 * FLOW:
 *  1. Passenger books a ride → booking confirmed immediately (no payment)
 *  2. Driver starts the ride
 *  3. Passenger sees "Pay Now" button on their booking card
 *  4. POST /api/payments/direct-pay → payment recorded on blockchain
 *  5. For UPI: Razorpay order created & verified, payment goes directly (no escrow)
 *  6. For ETH: MetaMask sends ETH directly to driver wallet
 *  7. For Cash: payment marked as paid directly
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authenticateToken } = require('./auth');
const fabricHelper = require('../utils/fabricHelper');
const cryptoUtil = require('../utils/crypto');
const { getRazorpay } = require('../utils/razorpayClient');

// In-memory payment store (persisted to disk)
global.pendingPayments = global.pendingPayments || new Map();

function persistPayments() {
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(__dirname, '..', 'local-payments.json');
    const data = Array.from((global.pendingPayments || new Map()).entries());
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (_) {}
}

function loadPayments() {
  try {
    const fs = require('fs');
    const path = require('path');
    const file = path.join(__dirname, '..', 'local-payments.json');
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      global.pendingPayments = new Map(data || []);
      console.log(`✅ Loaded ${global.pendingPayments.size} payment records`);
    }
  } catch (_) {}
}

loadPayments();

// ─── Direct Pay: Create Razorpay Order (for UPI direct payment, no escrow) ──
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { bookingID, amount, currency = 'INR', rideID } = req.body;

    if (!bookingID || !amount) {
      return res.status(400).json({ error: 'bookingID and amount are required' });
    }

    const razorpay = getRazorpay();
    let order;

    if (razorpay) {
      order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // paise
        currency,
        receipt: bookingID,
        notes: { bookingID, rideID, userID: req.user.userID || req.user.walletAddress },
      });

      global.pendingPayments.set(bookingID, {
        type: 'upi',
        status: 'pending_payment',
        razorpayOrderID: order.id,
        amount,
        currency,
        rideID,
        userID: req.user.userID || req.user.walletAddress,
        createdAt: new Date().toISOString(),
      });
      persistPayments();

      return res.json({
        success: true,
        orderID: order.id,
        amount: order.amount,
        currency: order.currency,
        keyID: process.env.RAZORPAY_KEY_ID,
        simulated: false,
      });
    } else {
      // Simulated order when Razorpay keys not configured
      const fakeOrderID = 'order_SIMULATED_' + Date.now();
      global.pendingPayments.set(bookingID, {
        type: 'upi',
        status: 'pending_payment',
        razorpayOrderID: fakeOrderID,
        amount,
        currency,
        rideID,
        userID: req.user.userID || req.user.walletAddress,
        createdAt: new Date().toISOString(),
        simulated: true,
      });
      persistPayments();

      return res.json({
        success: true,
        orderID: fakeOrderID,
        amount: Math.round(amount * 100),
        currency,
        keyID: 'rzp_test_SIMULATED',
        simulated: true,
        message: 'Razorpay keys not configured — payment simulated successfully',
      });
    }
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment order' });
  }
});

// ─── Verify Razorpay Payment ─────────────────────────────────────────────────
router.post('/verify-razorpay', authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingID } = req.body;

    if (!bookingID) {
      return res.status(400).json({ error: 'bookingID required' });
    }

    const payRecord = global.pendingPayments.get(bookingID);
    if (!payRecord) {
      return res.status(404).json({ error: 'Payment record not found for this booking' });
    }

    // Skip signature verification for simulated payments
    if (!payRecord.simulated) {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSig = crypto.createHmac('sha256', secret).update(body).digest('hex');
      if (expectedSig !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    }

    payRecord.status = 'paid';
    payRecord.razorpayPaymentID = razorpay_payment_id || 'SIMULATED_PMT_' + Date.now();
    payRecord.paidAt = new Date().toISOString();
    global.pendingPayments.set(bookingID, payRecord);
    persistPayments();

    // Record on blockchain
    const txnID = cryptoUtil.generateUniqueID('TXN_');
    await fabricHelper.submitTransaction(
      'RecordTransaction',
      txnID,
      bookingID,
      payRecord.rideID || '',
      req.user.pseudoID || req.user.userID || '',
      '',
      String(payRecord.amount),
      'upi_direct',
      razorpay_payment_id || 'SIMULATED',
    );

    res.json({
      success: true,
      message: 'Payment verified and recorded. Thank you!',
      status: 'paid',
      transactionID: txnID,
    });
  } catch (error) {
    console.error('Verify Razorpay error:', error);
    res.status(500).json({ error: error.message || 'Payment verification failed' });
  }
});

// ─── Direct Pay: Record any payment method (cash / eth / upi-simulated) ─────
router.post('/direct-pay', authenticateToken, async (req, res) => {
  try {
    const { bookingID, rideID, amount, method, txHash, driverWallet } = req.body;

    if (!bookingID || !method) {
      return res.status(400).json({ error: 'bookingID and method are required' });
    }

    const paymentRecord = {
      type: method,
      status: 'paid',
      amount: amount || 0,
      rideID: rideID || '',
      userID: req.user.userID || req.user.walletAddress,
      paidAt: new Date().toISOString(),
      ...(txHash && { txHash }),
      ...(driverWallet && { driverWallet }),
    };

    global.pendingPayments.set(bookingID, paymentRecord);
    persistPayments();

    // Record on blockchain
    const txnID = cryptoUtil.generateUniqueID('TXN_');
    await fabricHelper.submitTransaction(
      'RecordTransaction',
      txnID,
      bookingID,
      rideID || '',
      req.user.pseudoID || req.user.userID || '',
      driverWallet || '',
      String(amount || 0),
      method,
      txHash || '',
    );

    res.json({
      success: true,
      message: `Payment recorded via ${method}. Thank you!`,
      status: 'paid',
      transactionID: txnID,
    });
  } catch (error) {
    console.error('Direct pay error:', error);
    res.status(500).json({ error: error.message || 'Failed to record payment' });
  }
});

// ─── Record ETH payment (MetaMask direct to driver) ─────────────────────────
router.post('/record-eth-payment', authenticateToken, async (req, res) => {
  try {
    const { bookingID, rideID, txHash, ethAmount, inrAmount, driverWallet } = req.body;

    if (!bookingID || !txHash) {
      return res.status(400).json({ error: 'bookingID and txHash required' });
    }

    global.pendingPayments.set(bookingID, {
      type: 'eth_direct',
      status: 'paid',
      ethTxHash: txHash,
      ethAmount: ethAmount || '0',
      inrAmount: inrAmount || '0',
      driverWallet: driverWallet || '',
      rideID,
      userID: req.user.userID || req.user.walletAddress,
      paidAt: new Date().toISOString(),
    });
    persistPayments();

    const txnID = cryptoUtil.generateUniqueID('TXN_');
    await fabricHelper.submitTransaction(
      'RecordTransaction',
      txnID,
      bookingID,
      rideID || '',
      req.user.pseudoID || req.user.userID || '',
      driverWallet || '',
      String(inrAmount || 0),
      'eth_direct',
      txHash,
    );

    res.json({
      success: true,
      message: `${ethAmount} ETH sent directly to driver. Payment recorded!`,
      status: 'paid',
      transactionID: txnID,
    });
  } catch (error) {
    console.error('Record ETH payment error:', error);
    res.status(500).json({ error: error.message || 'Failed to record ETH payment' });
  }
});

// ─── Get Payment Status ───────────────────────────────────────────────────────
router.get('/status/:bookingID', authenticateToken, (req, res) => {
  const record = global.pendingPayments.get(req.params.bookingID);
  if (!record) {
    return res.json({ status: 'not_paid', message: 'No payment recorded for this booking' });
  }
  res.json({
    status: record.status,
    type: record.type,
    amount: record.amount || record.inrAmount,
    ethAmount: record.ethAmount,
    paidAt: record.paidAt,
  });
});

// ─── Get All Payments (admin) ─────────────────────────────────────────────────
router.get('/all', authenticateToken, (req, res) => {
  const all = Array.from((global.pendingPayments || new Map()).entries()).map(([bookingID, rec]) => ({
    bookingID,
    ...rec,
  }));
  res.json({ payments: all, count: all.length });
});

// Keep this export for backward compat if rides.js references it
router.releasePaymentForBooking = async (bookingID) => {
  return { released: true, reason: 'Direct payment model — no escrow to release' };
};

module.exports = router;
