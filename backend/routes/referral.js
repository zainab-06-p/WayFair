const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./auth');

// In-memory referral store (persisted via fabricHelper's persistence mechanism)
global.referrals = global.referrals || new Map();     // referralCode -> { ownerID, uses: [] }
global.userReferralCodes = global.userReferralCodes || new Map();  // userID -> referralCode

function generateCode(userID) {
  return 'REF_' + userID.slice(-6).toUpperCase() + '_' + Math.random().toString(36).slice(2, 6).toUpperCase();
}

// Get or create referral code for logged-in user
router.get('/my-code', authenticateToken, (req, res) => {
  const userID = req.user.userID;
  let code = global.userReferralCodes.get(userID);
  if (!code) {
    code = generateCode(userID);
    global.userReferralCodes.set(userID, code);
    global.referrals.set(code, { ownerID: userID, uses: [], createdAt: new Date().toISOString() });
  }
  const ref = global.referrals.get(code) || { ownerID: userID, uses: [] };
  res.json({ code, totalUses: ref.uses.length, uses: ref.uses });
});

// Apply a referral code during registration (called after successful registration)
router.post('/apply', (req, res) => {
  const { referralCode, newUserID } = req.body;
  if (!referralCode || !newUserID) {
    return res.status(400).json({ error: 'referralCode and newUserID required' });
  }
  const ref = global.referrals.get(referralCode);
  if (!ref) {
    return res.status(404).json({ error: 'Invalid referral code' });
  }
  if (ref.uses.find(u => u.userID === newUserID)) {
    return res.status(400).json({ error: 'Referral already applied' });
  }
  ref.uses.push({ userID: newUserID, appliedAt: new Date().toISOString() });
  global.referrals.set(referralCode, ref);
  res.json({ message: 'Referral applied successfully', ownerID: ref.ownerID });
});

// Get referral stats for a user (admin or self)
router.get('/stats/:userID', authenticateToken, (req, res) => {
  const { userID } = req.params;
  // Only allow own stats or admin
  if (req.user.userID !== userID && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const code = global.userReferralCodes.get(userID);
  if (!code) {
    return res.json({ code: null, totalUses: 0, uses: [] });
  }
  const ref = global.referrals.get(code) || { uses: [] };
  res.json({ code, totalUses: ref.uses.length, uses: ref.uses });
});

module.exports = router;
