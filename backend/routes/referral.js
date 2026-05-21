const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticateToken } = require('./auth');

// ─── Persistence ────────────────────────────────────────────────────────────
const REFERRAL_FILE = path.join(__dirname, '..', 'local-referrals.json');

function persistReferrals() {
  try {
    const data = {
      referrals:        Array.from((global.referrals        || new Map()).entries()),
      userReferralCodes: Array.from((global.userReferralCodes || new Map()).entries()),
      referralRewards:  Array.from((global.referralRewards  || new Map()).entries()),
    };
    fs.writeFileSync(REFERRAL_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.warn('⚠️  Could not persist referrals:', e.message);
  }
}

function loadReferrals() {
  try {
    if (fs.existsSync(REFERRAL_FILE)) {
      const raw = JSON.parse(fs.readFileSync(REFERRAL_FILE, 'utf8'));
      global.referrals        = new Map(raw.referrals        || []);
      global.userReferralCodes = new Map(raw.userReferralCodes || []);
      global.referralRewards  = new Map(raw.referralRewards  || []);
      console.log(`✅ Loaded ${global.referrals.size} referral records`);
    }
  } catch (e) {
    console.warn('⚠️  Could not load referrals:', e.message);
  }
}

// In-memory stores
global.referrals         = global.referrals         || new Map(); // code → { ownerID, uses[], createdAt }
global.userReferralCodes = global.userReferralCodes || new Map(); // userID → code
global.referralRewards   = global.referralRewards   || new Map(); // userID → { xp, points, totalReferrals }

loadReferrals();

function generateCode(userID) {
  const suffix = userID.slice(-6).toUpperCase().replace(/[^A-Z0-9]/g, 'X');
  const rand   = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WAY_${suffix}_${rand}`;
}

// ─── GET /api/referral/my-code ───────────────────────────────────────────────
// Get or create referral code for logged-in user
router.get('/my-code', authenticateToken, (req, res) => {
  const userID = req.user.userID || req.user.walletAddress;
  if (!userID) return res.status(400).json({ error: 'User ID missing' });

  let code = global.userReferralCodes.get(userID);
  if (!code) {
    code = generateCode(userID);
    global.userReferralCodes.set(userID, code);
    global.referrals.set(code, { ownerID: userID, uses: [], createdAt: new Date().toISOString() });
    persistReferrals();
  }

  const ref = global.referrals.get(code) || { ownerID: userID, uses: [] };
  const rewards = global.referralRewards.get(userID) || { xp: 0, points: 0, totalReferrals: 0 };

  res.json({
    code,               // consistent field name
    referralCode: code, // alias for backward compat
    totalUses: ref.uses.length,
    uses: ref.uses,
    rewards,
  });
});

// ─── POST /api/referral/validate ─────────────────────────────────────────────
// Validate a referral code (no auth required — called during registration)
router.post('/validate', (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) return res.status(400).json({ error: 'referralCode required' });

  const code = referralCode.trim().toUpperCase();
  const ref  = global.referrals.get(code);
  if (!ref) return res.status(404).json({ valid: false, error: 'Invalid referral code' });

  res.json({ valid: true, ownerID: ref.ownerID });
});

// ─── POST /api/referral/apply ────────────────────────────────────────────────
// Apply a referral code (called after registration)
router.post('/apply', (req, res) => {
  const { referralCode, newUserID } = req.body;
  if (!referralCode || !newUserID) {
    return res.status(400).json({ error: 'referralCode and newUserID required' });
  }

  const code = referralCode.trim().toUpperCase();
  const ref  = global.referrals.get(code);
  if (!ref) return res.status(404).json({ error: 'Invalid referral code' });

  if (ref.ownerID === newUserID) {
    return res.status(400).json({ error: 'Cannot use your own referral code' });
  }

  if (ref.uses.find(u => u.userID === newUserID)) {
    return res.status(400).json({ error: 'Referral already applied for this user' });
  }

  // Record use
  ref.uses.push({ userID: newUserID, appliedAt: new Date().toISOString() });
  global.referrals.set(code, ref);

  // Award rewards to referrer
  const ownerRewards = global.referralRewards.get(ref.ownerID) || { xp: 0, points: 0, totalReferrals: 0 };
  ownerRewards.xp            += 50;
  ownerRewards.points        += 100;
  ownerRewards.totalReferrals += 1;
  global.referralRewards.set(ref.ownerID, ownerRewards);

  // Award bonus to new user (store under newUserID key with special flag)
  const newUserRewards = global.referralRewards.get(newUserID) || { xp: 0, points: 0, totalReferrals: 0 };
  newUserRewards.xp    += 25;
  newUserRewards.points += 50;
  newUserRewards.bonusFromReferral = true;
  global.referralRewards.set(newUserID, newUserRewards);

  persistReferrals();

  // ── Real-time notification to referrer via Socket.IO ────────────────────
  try {
    // req.app.get('io') is set in server.js
    const io = req.app.get('io');
    if (io) {
      // Emit to the referrer's personal socket room (they join `userID` room on connect)
      io.to(ref.ownerID).emit('referral_applied', {
        ownerID:    ref.ownerID,
        newUserID,
        code,
        xpEarned:   50,
        pointsEarned: 100,
        totalReferrals: ownerRewards.totalReferrals,
        message: `🎉 Someone joined using your referral code! +50 XP earned!`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (socketErr) {
    console.warn('Could not emit referral socket event:', socketErr.message);
  }

  res.json({
    message:  'Referral applied successfully! Rewards credited.',
    ownerID:  ref.ownerID,
    xpEarned: 50,
    bonusXP:  25, // for new user
  });
});

// ─── GET /api/referral/stats/:userID ─────────────────────────────────────────
router.get('/stats/:userID', authenticateToken, (req, res) => {
  const { userID } = req.params;
  if (req.user.userID !== userID && req.user.walletAddress !== userID && !req.user.isAdmin) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const code    = global.userReferralCodes.get(userID);
  const ref     = code ? global.referrals.get(code) : null;
  const rewards = global.referralRewards.get(userID) || { xp: 0, points: 0, totalReferrals: 0 };

  res.json({
    code:       code || null,
    totalUses:  ref ? ref.uses.length : 0,
    uses:       ref ? ref.uses : [],
    rewards,
  });
});

module.exports = router;
