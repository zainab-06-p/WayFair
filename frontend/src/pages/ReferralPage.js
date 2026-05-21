import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Snackbar,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  InputAdornment
} from '@mui/material';
import {
  ContentCopy,
  Share,
  CardGiftcard,
  Group,
  Check,
  Person,
  LocalOffer
} from '@mui/icons-material';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const api = axios.create({ baseURL: 'http://localhost:5000' });


const ReferralPage = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [referralCode, setReferralCode] = useState('');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [applyCode, setApplyCode] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState('');
  const [applyError, setApplyError] = useState('');
  const [copied, setCopied] = useState(false);
  const [liveNotification, setLiveNotification] = useState(null); // real-time referral notification


  const token = localStorage.getItem('token');
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const referralLink = referralCode
    ? `${window.location.origin}/register?ref=${referralCode}`
    : '';

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    setLoading(true);
    setError('');
    try {
      const [codeRes, userID] = await Promise.all([
        api.get('/api/referral/my-code', authHeaders),
        Promise.resolve(user?.userID || user?.id || '')
      ]);
      setReferralCode(codeRes.data.code || codeRes.data.referralCode || '');


      if (userID) {
        try {
          const statsRes = await api.get(`/api/referral/stats/${userID}`, authHeaders);
          setStats(statsRes.data);
        } catch {
          // stats not critical
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time: listen for referral_applied socket events
  useEffect(() => {
    if (!socket) return;
    const userID = user?.userID || user?.id;
    if (userID) {
      // Subscribe to our own room
      socket.emit('referral:subscribe', { userID });
    }

    const handler = (data) => {
      setLiveNotification(data);
      // Update stats optimistically
      setStats(prev => prev ? {
        ...prev,
        totalUses: (prev.totalUses || 0) + 1,
        rewards: {
          ...(prev.rewards || {}),
          xp: ((prev.rewards?.xp) || 0) + (data.xpEarned || 50),
          points: ((prev.rewards?.points) || 0) + (data.pointsEarned || 100),
          totalReferrals: (prev.rewards?.totalReferrals || 0) + 1,
        }
      } : null);
      // Auto-dismiss after 8s
      setTimeout(() => setLiveNotification(null), 8000);
    };
    socket.on('referral_applied', handler);
    return () => socket.off('referral_applied', handler);
  }, [socket, user]);


  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on HF Rideshare!',
          text: `Use my referral code ${referralCode} to get bonus rewards when you sign up!`,
          url: referralLink
        });
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleApplyCode = async () => {
    if (!applyCode.trim()) return;
    setApplyLoading(true);
    setApplyError('');
    setApplySuccess('');
    try {
      await api.post('/api/referral/apply', {
        referralCode: applyCode.trim().toUpperCase(),
        newUserID: user?.userID || user?.id
      }, authHeaders);
      setApplySuccess('Referral code applied successfully! Rewards will be credited shortly.');
      setApplyCode('');
    } catch (err) {
      setApplyError(err.response?.data?.error || 'Failed to apply referral code');
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: '#06B6D4' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <Box sx={{ position: 'fixed', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'fixed', bottom: '20%', right: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <Container maxWidth="md" sx={{ pt: 4, pb: 6, position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', p: 4, mb: 3, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #06B6D4, #8B5CF6, #EC4899)' }} />
            <Typography sx={{ fontSize: '3rem', mb: 1 }}>{`\u{1F381}`}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: '"Plus Jakarta Sans", sans-serif', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Refer &amp; Earn
            </Typography>
            <Typography variant="body1" sx={{ color: '#475569', mt: 1 }}>
              Share your unique code with friends. Every successful referral earns you XP rewards!
            </Typography>
          </Box>
        </motion.div>

        {error && <Alert severity="error" sx={{ mb: 2, background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }} onClose={() => setError('')}>{error}</Alert>}

        {/* Real-time notification banner */}
        {liveNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Box sx={{
              mb: 3, p: 2.5, borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(6,182,212,0.15))',
              border: '2px solid rgba(52,211,153,0.4)',
              display: 'flex', alignItems: 'center', gap: 2,
            }}>
              <Box sx={{ fontSize: '2rem' }}>🎉</Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 800, color: '#059669', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                  Someone joined using your referral code!
                </Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>
                  {liveNotification.message || `+${liveNotification.xpEarned || 50} XP earned! Total referrals: ${liveNotification.totalReferrals}`}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontWeight: 900, color: '#06B6D4', fontSize: '1.3rem' }}>+{liveNotification.xpEarned || 50} XP</Typography>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>Live update</Typography>
              </Box>
            </Box>
          </motion.div>
        )}


        <Grid container spacing={3}>
          {/* Stats Cards */}
          {[
            { emoji: '\u{1F465}', value: stats?.uses?.length ?? 0, label: 'Total Referrals', color: '#8B5CF6' },
            { emoji: '\u26A1', value: (stats?.uses?.length ?? 0) * 50, label: 'XP Earned', color: '#EC4899' },
            { emoji: '\u{1F4B0}', value: (stats?.uses?.length ?? 0) * 100, label: 'Bonus Points', color: '#06B6D4' },

          ].map(({ emoji, value, label, color }, i) => (
            <Grid item xs={12} sm={4} key={label}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }}>
                <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: `1px solid ${color}33`, borderRadius: '16px', p: 3, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', mb: 1 }}>{emoji}</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: '"Plus Jakarta Sans", sans-serif', color }}>{value}</Typography>
                  <Typography variant="body2" sx={{ color: '#334155', mt: 0.5 }}>{label}</Typography>
                </Box>
              </motion.div>
            </Grid>
          ))}

          {/* Your Referral Code */}
          <Grid item xs={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                  Your Referral Code
                </Typography>
                <Box sx={{ height: 1, background: 'rgba(139,92,246,0.2)', mb: 2 }} />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <Box sx={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))', border: '1px solid rgba(139,92,246,0.4)', color: '#06B6D4', px: 4, py: 2, borderRadius: '12px', fontFamily: 'monospace', fontSize: '1.8rem', fontWeight: 'bold', letterSpacing: 4, textAlign: 'center', minWidth: 200 }}>
                    {referralCode || '------'}
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Button variant="contained" startIcon={copied ? <Check /> : <ContentCopy />} onClick={handleCopyCode} sx={{ minWidth: 160, borderRadius: '12px', background: copied ? 'linear-gradient(135deg, #34D399, #059669)' : 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700 }}>
                      {copied ? 'Copied!' : 'Copy Code'}
                    </Button>
                    <Button variant="outlined" startIcon={<Share />} onClick={handleShare} sx={{ minWidth: 160, borderRadius: '12px', borderColor: 'rgba(139,92,246,0.4)', color: '#8B5CF6', '&:hover': { background: 'rgba(139,92,246,0.08)' } }}>
                      Share Link
                    </Button>
                  </Box>
                </Box>

                <TextField fullWidth label="Shareable Link" value={referralLink} size="small"
                  InputProps={{ readOnly: true, endAdornment: (<InputAdornment position="end"><IconButton onClick={handleCopyLink} size="small" sx={{ color: '#475569' }}><ContentCopy fontSize="small" /></IconButton></InputAdornment>) }}
                  sx={{ mb: 1, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(139,92,246,0.3)' }, '&:hover fieldset': { borderColor: 'rgba(6,182,212,0.5)' } }, '& .MuiInputLabel-root': { color: '#334155' }, '& input': { color: '#475569', fontFamily: 'monospace', fontSize: '0.8rem' } }}
                />
                <Typography variant="caption" sx={{ color: '#334155' }}>
                  Share this link with friends ? they'll automatically get your referral code pre-filled on registration.
                </Typography>
              </Box>
            </motion.div>
          </Grid>

          {/* Apply a referral code */}
          <Grid item xs={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                  Apply a Referral Code
                </Typography>
                <Box sx={{ height: 1, background: 'rgba(139,92,246,0.2)', mb: 2 }} />
                <Typography variant="body2" sx={{ color: '#475569', mb: 2 }}>
                  Got a referral code from a friend? Enter it below to claim your bonus rewards.
                </Typography>

                {applySuccess && <Alert severity="success" sx={{ mb: 2, background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }} onClose={() => setApplySuccess('')}>{applySuccess}</Alert>}
                {applyError && <Alert severity="error" sx={{ mb: 2, background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }} onClose={() => setApplyError('')}>{applyError}</Alert>}

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <TextField label="Enter Referral Code" value={applyCode} onChange={e => setApplyCode(e.target.value.toUpperCase())} placeholder="e.g. ABC123" size="small"
                    sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(139,92,246,0.3)' }, '&:hover fieldset': { borderColor: 'rgba(6,182,212,0.5)' }, '&.Mui-focused fieldset': { borderColor: '#06B6D4' } }, '& .MuiInputLabel-root': { color: '#334155' }, '& input': { color: 'text.primary', letterSpacing: 2, fontFamily: 'monospace', textTransform: 'uppercase' } }}
                    inputProps={{ style: { letterSpacing: 2, fontFamily: 'monospace', textTransform: 'uppercase' } }}
                  />
                  <Button variant="contained" onClick={handleApplyCode} disabled={applyLoading || !applyCode.trim()} startIcon={applyLoading ? <CircularProgress size={16} /> : <CardGiftcard />}
                    sx={{ borderRadius: '12px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', fontWeight: 700, '&:disabled': { opacity: 0.5 } }}>
                    Apply Code
                  </Button>
                </Box>
              </Box>
            </motion.div>
          </Grid>

          {/* Referral History */}
          {stats?.uses?.length > 0 && (
            <Grid item xs={12}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                    Referral History
                  </Typography>
                  <Box sx={{ height: 1, background: 'rgba(139,92,246,0.2)', mb: 2 }} />
                  <List dense>
                    {stats.uses.map((use, idx) => (
                      <ListItem key={idx} sx={{ borderBottom: '1px solid rgba(139,92,246,0.1)', '&:last-child': { borderBottom: 'none' } }}>
                        <ListItemAvatar>
                          <Avatar sx={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', width: 36, height: 36, fontSize: '1rem' }}>{`\u{1F464}`}</Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>{typeof use === 'string' ? use : use.userID || `User #${idx + 1}`}</Typography>}
                          secondary={<Typography variant="caption" sx={{ color: '#334155' }}>Joined using your code</Typography>}
                        />
                        <Chip label="+50 XP" size="small" sx={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)', fontWeight: 700 }} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              </motion.div>
            </Grid>
          )}

          {/* How it Works */}
          <Grid item xs={12}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                  How It Works
                </Typography>
                <Box sx={{ height: 1, background: 'rgba(139,92,246,0.2)', mb: 2 }} />
                <Grid container spacing={2}>
                  {[
                    { step: '1', emoji: '\u{1F4E4}', text: 'Share your unique referral code or link with friends' },
                    { step: '2', emoji: '\u{1F4DD}', text: 'Your friend registers using your code' },
                    { step: '3', emoji: '\u{1F381}', text: 'Both of you receive bonus XP and ride credits instantly' },
                    { step: '4', emoji: '\u{1F4C8}', text: 'The more friends you invite, the more you earn!' }
                  ].map(({ step, emoji, text }) => (
                    <Grid item xs={12} sm={6} key={step}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: '12px', background: 'rgba(139,92,246,0.05)' }}>
                        <Avatar sx={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', width: 36, height: 36, flexShrink: 0, fontSize: '1rem' }}>{emoji}</Avatar>
                        <Typography variant="body2" sx={{ color: '#475569' }}>{text}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </motion.div>
          </Grid>
        </Grid>

        <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      </Container>
    </Box>
  );
};

export default ReferralPage;
