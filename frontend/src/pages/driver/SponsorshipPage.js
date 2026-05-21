import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box, Container, Typography, Button, TextField, Chip, Avatar,
  LinearProgress, Alert, CircularProgress
} from '@mui/material';
import { motion } from 'framer-motion';

const TABS = ['overview', 'asSponsor', 'asSponsee', 'request'];
const TAB_LABELS = ['\u{1F4CA} Overview', '\u{1F464} As Sponsor', '\u{1F393} As Sponsee', '\u2795 Request'];

const getTrustLevelColor = (level) => {
  const map = { Platinum:'#A78BFA', Gold:'#FBBF24', Silver:'#475569', Bronze:'#FB923C', Restricted:'#F87171' };
  return map[level] || '#475569';
};
const getTrustLevelIcon = (level) => {
  const map = { Platinum:'\u{1F48E}', Gold:'\u{1F947}', Silver:'\u{1F948}', Bronze:'\u{1F949}', Restricted:'\u26A0\uFE0F' };
  return map[level] || '\u{1F4CA}';
};
const getStatusStyle = (status) => {
  const map = {
    active:    { bg:'rgba(52,211,153,0.15)', color:'#34D399', border:'rgba(52,211,153,0.3)' },
    pending:   { bg:'rgba(251,191,36,0.15)', color:'#FBBF24', border:'rgba(251,191,36,0.3)' },
    completed: { bg:'rgba(56,189,248,0.15)', color:'#38BDF8', border:'rgba(56,189,248,0.3)' },
    revoked:   { bg:'rgba(239,68,68,0.15)', color:'#F87171', border:'rgba(239,68,68,0.3)' },
  };
  const s = map[(status||'').toLowerCase()] || { bg:'rgba(100,116,139,0.15)', color:'#475569', border:'rgba(100,116,139,0.3)' };
  return { background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight:700 };
};
const calculateResponsibilityPercent = (startDate) => {
  const days = Math.floor((new Date() - new Date(startDate)) / 86400000);
  if (days <= 30) return 100;
  if (days <= 90) return 50;
  return 10;
};

const glassCard = { background:'rgba(255,255,255,0.92)', backdropFilter:'blur(20px)', border:'1px solid rgba(139,92,246,0.2)', borderRadius:'14px', p:3 };

const SponsorshipPage = () => {
  const [trustScore, setTrustScore] = useState(null);
  const [sponsorships, setSponsorship] = useState({ asSponsor: [], asSponsee: [] });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sponsorPseudoID, setSponsorPseudoID] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchTrustScore();
    fetchSponsorships();
    fetchPendingRequests();
  }, []);

  const authHeader = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });

  const fetchTrustScore = async () => {
    try { const r = await axios.get('/api/sponsorship/trust-score', authHeader()); setTrustScore(r.data.trustScore); }
    catch (e) { console.error(e); }
  };
  const fetchSponsorships = async () => {
    try { const r = await axios.get('/api/sponsorship/my-sponsorships', authHeader()); setSponsorship(r.data); }
    catch (e) { console.error(e); }
  };
  const fetchPendingRequests = async () => {
    try { const r = await axios.get('/api/sponsorship/pending', authHeader()); setPendingRequests(r.data.sponsorships); }
    catch (e) { console.error(e); }
  };

  const handleRequestSponsorship = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/api/sponsorship/request', { sponsorPseudoID }, authHeader());
      alert('Sponsorship request sent successfully!');
      setSponsorPseudoID('');
      fetchSponsorships();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send sponsorship request');
    } finally { setLoading(false); }
  };

  const handleAcceptSponsorship = async (sponsorshipID) => {
    try {
      await axios.post(`/api/sponsorship/accept/${sponsorshipID}`, {}, authHeader());
      alert('Sponsorship accepted! Probation period started (90 days).');
      fetchPendingRequests(); fetchSponsorships(); fetchTrustScore();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept sponsorship');
    }
  };

  const levelColor = trustScore ? getTrustLevelColor(trustScore.trustLevel) : '#475569';

  return (
    <Box sx={{ minHeight:'100vh', background:'#F8FAFC', position:'relative', overflow:'hidden' }}>
      <Box sx={{ position:'fixed', top:'10%', left:'5%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', pointerEvents:'none' }} />
      <Box sx={{ position:'fixed', bottom:'15%', right:'5%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents:'none' }} />

      <Container maxWidth="lg" sx={{ position:'relative', zIndex:1, pt:4, pb:6 }}>

        {/* Header */}
        <motion.div initial={{ opacity:0, y:-20 }} animate={{ opacity:1, y:0 }}>
          <Box sx={{ ...glassCard, mb:3, position:'relative', overflow:'hidden' }}>
            <Box sx={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg, #06B6D4, #8B5CF6, #EC4899)' }} />
            <Typography variant="h4" sx={{ fontWeight:900, fontFamily:'"Plus Jakarta Sans", sans-serif', background:'linear-gradient(135deg, #06B6D4, #8B5CF6)', backgroundClip:'text', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {`\u{1F91D}`} Driver Sponsorship
            </Typography>
            <Typography variant="body2" sx={{ color:'#334155', mt:0.5 }}>Build trust, sponsor new drivers, and grow your reputation</Typography>
          </Box>
        </motion.div>

        {/* Trust Score Card */}
        {trustScore && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
            <Box sx={{ ...glassCard, mb:3, borderColor: `${levelColor}44` }}>
              <Box sx={{ display:'flex', alignItems:'center', gap:2, mb:2 }}>
                <Avatar sx={{ background:`linear-gradient(135deg, ${levelColor}66, ${levelColor}33)`, width:56, height:56, fontSize:'1.6rem' }}>
                  {getTrustLevelIcon(trustScore.trustLevel)}
                </Avatar>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight:700, color:'#FFFFFF', fontFamily:'"Plus Jakarta Sans", sans-serif' }}>
                    Your Trust Score
                  </Typography>
                  <Typography variant="body2" sx={{ color:levelColor, fontWeight:700 }}>{trustScore.trustLevel} Level</Typography>
                </Box>
                <Box sx={{ ml:'auto', textAlign:'right' }}>
                  <Typography variant="h4" sx={{ fontWeight:900, color:levelColor }}>{trustScore.trustScore}</Typography>
                  <Typography variant="caption" sx={{ color:'#334155' }}>/ 1000</Typography>
                </Box>
              </Box>
              <LinearProgress variant="determinate" value={(trustScore.trustScore/1000)*100}
                sx={{ height:8, borderRadius:4, bgcolor:'rgba(139,92,246,0.1)', '& .MuiLinearProgress-bar': { background:`linear-gradient(90deg, ${levelColor}, #8B5CF6)`, borderRadius:4 }, mb:2 }} />
              <Box sx={{ display:'flex', gap:2, flexWrap:'wrap' }}>
                {[
                  { label:'Max Sponsorships', val:trustScore.maxSponsorships },
                  { label:'Active', val:trustScore.activeSponsorships },
                  { label:'Total Sponsored', val:trustScore.totalSponsored },
                  { label:'Successful', val:trustScore.successfulSponsors },
                ].map(s => (
                  <Box key={s.label} sx={{ flex:'1 1 80px', background:'rgba(139,92,246,0.08)', border:'1px solid rgba(139,92,246,0.15)', borderRadius:'10px', p:1.5, textAlign:'center' }}>
                    <Typography variant="h6" sx={{ fontWeight:800, color:'#FFFFFF' }}>{s.val}</Typography>
                    <Typography variant="caption" sx={{ color:'#334155' }}>{s.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </motion.div>
        )}

        {/* Tabs */}
        <Box sx={{ display:'flex', gap:1, mb:3, flexWrap:'wrap' }}>
          {TABS.map((tab,i) => (
            <Button key={tab} onClick={() => setActiveTab(tab)} variant={activeTab===tab ? 'contained' : 'outlined'}
              sx={activeTab===tab
                ? { borderRadius:'12px', background:'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight:700, fontFamily:'"Plus Jakarta Sans", sans-serif' }
                : { borderRadius:'12px', borderColor:'rgba(139,92,246,0.3)', color:'#475569', '&:hover':{ borderColor:'#8B5CF6', color:'#FFFFFF' } }}>
              {TAB_LABELS[i]}
            </Button>
          ))}
        </Box>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <Box sx={{ display:'flex', flexDirection:'column', gap:3 }}>
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
              <Box sx={glassCard}>
                <Typography variant="h6" sx={{ fontWeight:700, color:'#FFFFFF', mb:2, fontFamily:'"Plus Jakarta Sans", sans-serif' }}>{`\u{1F3AF}`} How Sponsorship Works</Typography>
                {[
                  { n:'1', t:'Request Sponsorship', d:'New drivers request an experienced driver to sponsor them' },
                  { n:'2', t:'Sponsor Accepts', d:'Senior driver accepts and takes responsibility' },
                  { n:'3', t:'90-Day Probation', d:'Days 1-30: 100% · Days 31-90: 50% · Day 91+: 10% responsibility' },
                  { n:'4', t:'Rewards & Penalties', d:'\u2705 Good behavior = Trust points \u00B7 \u274C Bad behavior = Deductions' },
                ].map(s => (
                  <Box key={s.n} sx={{ display:'flex', gap:2, mb:2 }}>
                    <Avatar sx={{ background:'linear-gradient(135deg, #06B6D4, #8B5CF6)', width:32, height:32, fontSize:'0.85rem', fontWeight:800, flexShrink:0 }}>{s.n}</Avatar>
                    <Box>
                      <Typography sx={{ fontWeight:700, color:'#FFFFFF', fontSize:'0.95rem' }}>{s.t}</Typography>
                      <Typography variant="body2" sx={{ color:'#475569' }}>{s.d}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </motion.div>

            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
              <Box sx={glassCard}>
                <Typography variant="h6" sx={{ fontWeight:700, color:'#FFFFFF', mb:2, fontFamily:'"Plus Jakarta Sans", sans-serif' }}>{`\u{1F3C6}`} Trust Levels</Typography>
                <Box sx={{ display:'flex', flexDirection:'column', gap:1.5 }}>
                  {[
                    { icon:'\u26A0\uFE0F', name:'Restricted (0-399)', desc:'Cannot sponsor others', color:'#F87171' },
                    { icon:'\u{1F949}', name:'Bronze (400-599)', desc:'Can sponsor 1 driver', color:'#FB923C' },
                    { icon:'\u{1F948}', name:'Silver (600-799)', desc:'Can sponsor 2 drivers', color:'#475569' },
                    { icon:'\u{1F947}', name:'Gold (800-899)', desc:'Can sponsor 3 drivers', color:'#FBBF24' },
                    { icon:'\u{1F48E}', name:'Platinum (900-1000)', desc:'Can sponsor 5 drivers + VIP status', color:'#A78BFA' },
                  ].map(l => (
                    <Box key={l.name} sx={{ display:'flex', alignItems:'center', gap:2, p:1.5, background:'rgba(139,92,246,0.05)', border:`1px solid ${l.color}33`, borderRadius:'10px' }}>
                      <Typography sx={{ fontSize:'1.3rem' }}>{l.icon}</Typography>
                      <Box>
                        <Typography sx={{ fontWeight:700, color: l.color, fontSize:'0.9rem' }}>{l.name}</Typography>
                        <Typography variant="caption" sx={{ color:'#334155' }}>{l.desc}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </motion.div>

            {pendingRequests.length > 0 && (
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
                <Box sx={{ ...glassCard, borderColor:'rgba(251,191,36,0.3)' }}>
                  <Typography variant="h6" sx={{ fontWeight:700, color:'#FBBF24', mb:2, fontFamily:'"Plus Jakarta Sans", sans-serif' }}>
                    ?? Pending Requests ({pendingRequests.length})
                  </Typography>
                  {pendingRequests.map(req => (
                    <Box key={req.sponsorshipID} sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', p:2, background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:'10px', mb:1.5 }}>
                      <Box>
                        <Typography sx={{ fontWeight:600, color:'#FFFFFF', fontSize:'0.9rem' }}>Sponsee: {req.sponseeID}</Typography>
                        <Typography variant="caption" sx={{ color:'#334155' }}>Requested: {new Date(req.requestedAt).toLocaleDateString()}</Typography>
                      </Box>
                      <Button variant="contained" size="small" onClick={() => handleAcceptSponsorship(req.sponsorshipID)}
                        sx={{ borderRadius:'10px', background:'linear-gradient(135deg, #34D399, #059669)', fontWeight:700 }}>
                        ? Accept
                      </Button>
                    </Box>
                  ))}
                </Box>
              </motion.div>
            )}
          </Box>
        )}

        {/* As Sponsor Tab */}
        {activeTab === 'asSponsor' && (
          <Box sx={glassCard}>
            <Typography variant="h6" sx={{ fontWeight:700, color:'#FFFFFF', mb:3, fontFamily:'"Plus Jakarta Sans", sans-serif' }}>{`\u{1F91D}`} Drivers You're Sponsoring</Typography>
            {sponsorships.asSponsor.length === 0 ? (
              <Typography sx={{ color:'#334155', textAlign:'center', py:4 }}>You haven't sponsored anyone yet.</Typography>
            ) : sponsorships.asSponsor.map((s,i) => {
              const resp = calculateResponsibilityPercent(s.probationStartDate);
              return (
                <motion.div key={s.sponsorshipID} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}>
                  <Box sx={{ mb:2, p:2.5, background:'rgba(139,92,246,0.06)', border:'1px solid rgba(139,92,246,0.15)', borderRadius:'12px' }}>
                    <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
                      <Typography sx={{ fontWeight:700, color:'#FFFFFF' }}>Sponsee: {s.sponseeID}</Typography>
                      <Chip label={s.status.toUpperCase()} size="small" sx={getStatusStyle(s.status)} />
                    </Box>
                    <Typography variant="body2" sx={{ color:'#475569', mb:1 }}>Started: {new Date(s.probationStartDate).toLocaleDateString()}</Typography>
                    {s.status === 'active' && (
                      <>
                        <Typography variant="body2" sx={{ color:'#475569', mb:1 }}>Ends: {new Date(s.probationEndDate).toLocaleDateString()} ? Responsibility: {resp}%</Typography>
                        <LinearProgress variant="determinate" value={resp}
                          sx={{ height:6, borderRadius:3, bgcolor:'rgba(139,92,246,0.1)', '& .MuiLinearProgress-bar': { background:'linear-gradient(90deg, #06B6D4, #8B5CF6)', borderRadius:3 } }} />
                      </>
                    )}
                    {s.status === 'completed' && s.rewardsClaimed && (
                      <Typography variant="body2" sx={{ color:'#34D399', mt:1 }}>{`\u2705`} Rewards Claimed (+50 trust points)</Typography>
                    )}
                  </Box>
                </motion.div>
              );
            })}
          </Box>
        )}

        {/* As Sponsee Tab */}
        {activeTab === 'asSponsee' && (
          <Box sx={glassCard}>
            <Typography variant="h6" sx={{ fontWeight:700, color:'#FFFFFF', mb:3, fontFamily:'"Plus Jakarta Sans", sans-serif' }}>{`\u{1F465}`} Your Sponsors</Typography>
            {sponsorships.asSponsee.length === 0 ? (
              <Typography sx={{ color:'#334155', textAlign:'center', py:4 }}>You don't have a sponsor yet. Request one below!</Typography>
            ) : sponsorships.asSponsee.map((s,i) => (
              <motion.div key={s.sponsorshipID} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.07 }}>
                <Box sx={{ mb:2, p:2.5, background:'rgba(6,182,212,0.05)', border:'1px solid rgba(6,182,212,0.15)', borderRadius:'12px' }}>
                  <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:1 }}>
                    <Typography sx={{ fontWeight:700, color:'#FFFFFF' }}>Sponsor: {s.sponsorID}</Typography>
                    <Chip label={s.status.toUpperCase()} size="small" sx={getStatusStyle(s.status)} />
                  </Box>
                  <Typography variant="body2" sx={{ color:'#475569' }}>Requested: {new Date(s.requestedAt).toLocaleDateString()}</Typography>
                  {s.acceptedAt && <Typography variant="body2" sx={{ color:'#475569' }}>Accepted: {new Date(s.acceptedAt).toLocaleDateString()}</Typography>}
                  {s.status === 'active' && <Typography variant="body2" sx={{ color:'#475569' }}>Probation Ends: {new Date(s.probationEndDate).toLocaleDateString()}</Typography>}
                  {s.status === 'pending' && <Typography variant="body2" sx={{ color:'#FBBF24', mt:0.5 }}>{`\u23F3`} Waiting for sponsor to accept</Typography>}
                </Box>
              </motion.div>
            ))}
          </Box>
        )}

        {/* Request Tab */}
        {activeTab === 'request' && (
          <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}>
            <Box sx={glassCard}>
              <Typography variant="h6" sx={{ fontWeight:700, color:'#FFFFFF', mb:1, fontFamily:'"Plus Jakarta Sans", sans-serif' }}>{`\u2795`} Request Sponsorship</Typography>
              <Typography variant="body2" sx={{ color:'#475569', mb:3 }}>
                Enter the Pseudo ID or Wallet Address of an experienced driver who you know personally and who can vouch for your trustworthiness.
              </Typography>
              <Box component="form" onSubmit={handleRequestSponsorship}>
                <TextField fullWidth label="Sponsor's Pseudo ID or Wallet Address" placeholder="PSEUDO_abc123? or 0x?"
                  value={sponsorPseudoID} onChange={e => setSponsorPseudoID(e.target.value)} required sx={{ mb:2,
                    '& .MuiOutlinedInput-root': { '& fieldset': { borderColor:'rgba(139,92,246,0.3)' }, '&:hover fieldset': { borderColor:'rgba(6,182,212,0.5)' }, '&.Mui-focused fieldset': { borderColor:'#06B6D4' } },
                    '& .MuiInputLabel-root': { color:'#334155' }, '& .MuiInputLabel-root.Mui-focused': { color:'#06B6D4' }, '& input': { color:'#FFFFFF' } }} />
                <Button type="submit" variant="contained" fullWidth disabled={loading}
                  sx={{ borderRadius:'14px', background:'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight:700, fontSize:'1rem', py:1.5, mb:3 }}>
                  {loading ? <CircularProgress size={24} sx={{ color:'white' }} /> : 'Send Request'}
                </Button>
              </Box>
              <Box sx={{ background:'rgba(6,182,212,0.06)', border:'1px solid rgba(6,182,212,0.2)', borderRadius:'12px', p:2 }}>
                <Typography sx={{ fontWeight:700, color:'#06B6D4', mb:1 }}>{`\u{1F4A1}`} Tips:</Typography>
                {['Choose a sponsor who knows you personally', 'Your sponsor must have a trust score of 400+', 'Their behavior will affect their trust score for 90 days', 'Good performance helps both you and your sponsor'].map((tip,i) => (
                  <Typography key={i} variant="body2" sx={{ color:'#475569', mb:0.5 }}>? {tip}</Typography>
                ))}
              </Box>
            </Box>
          </motion.div>
        )}

      </Container>
    </Box>
  );
};

export default SponsorshipPage;

