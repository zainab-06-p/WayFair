/**
 * Razorpay Client
 * Replace RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env with your test keys
 * from https://dashboard.razorpay.com/ → Settings → API Keys → Generate Test Key
 */

const Razorpay = require('razorpay');

let razorpayInstance = null;

function getRazorpay() {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId.startsWith('rzp_test_YOUR') || !keySecret) {
      console.warn('⚠️  Razorpay: Test keys not configured. Payment will be simulated.');
      return null;
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayInstance;
}

module.exports = { getRazorpay };
