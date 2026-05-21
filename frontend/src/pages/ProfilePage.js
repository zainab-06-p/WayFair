import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Container,
  Box,
  Typography,
  Avatar,
  Grid,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDocViewer, setOpenDocViewer] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Read keyData from localStorage ? used for userID, ipfsHash, pseudoID
  const keyData = JSON.parse(localStorage.getItem('keyData') || '{}');

  const userRole = localStorage.getItem('userRole') || user?.role || 'passenger';

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) { setLoading(false); return; }

        const headers = { 'Authorization': `Bearer ${token}` };

        const [profileRes, statsRes] = await Promise.allSettled([
          api.get('/api/users/profile', { headers }),
          api.get('/api/users/stats', { headers })
        ]);

        if (profileRes.status === 'fulfilled') {
          const userData = profileRes.value.data;
          setProfileData({
            name: userData.name || 'User',
            email: userData.email || 'email@example.com',
            age: userData.age || 'N/A',
            gender: userData.gender || 'N/A',
            role: userData.role || userRole,
            walletAddress: userData.walletAddress,
            profilePic: userData.documents?.profilePic || null,
            documents: userData.documents || {}
          });
        } else {
          setProfileData({
            name: user?.name || 'User',
            email: user?.email || 'email@example.com',
            age: 'N/A', gender: 'N/A', role: userRole,
            profilePic: null, documents: {}
          });
        }

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data);
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user, userRole]);

  const handleOpenDoc = (docType) => {
    setSelectedDoc(docType);
    setOpenDocViewer(true);
  };

  const handleCloseDoc = () => {
    setOpenDocViewer(false);
    setSelectedDoc(null);
  };

  const getProfilePicUrl = () => {
    // Try profilePic IPFS hash from profile data or documents
    const hash = profileData?.profilePic || profileData?.documents?.profilePic || keyData?.profilePic;
    if (hash) {
      return `https://gateway.pinata.cloud/ipfs/${hash}`;
    }
    return null;
  };

  if (!profileData || loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <Box sx={{ fontSize: '3rem', mb: 2 }}>{`\u{1F464}`}</Box>
          <Typography sx={{ color: '#334155' }}>Loading profile...</Typography>
        </Box>
      </Box>
    );
  }

  const InfoRow = ({ label, value, mono }) => (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</Typography>
      <Typography variant="body2" sx={{ color: '#0F172A', mt: 0.5, fontFamily: mono ? 'monospace' : undefined, wordBreak: 'break-all', lineHeight: 1.6 }}>
        {value || '�'}
      </Typography>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', pt: 11, pb: 8, position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '5%', right: '5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '10%', left: '0%', width: 450, height: 450, background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Profile Hero Card */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{
            p: { xs: 3, md: 5 }, mb: 4, borderRadius: '28px',
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(139,92,246,0.3)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* gradient line top */}
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #06B6D4, #8B5CF6, #EC4899)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
              <Box sx={{ position: 'relative' }}>
                <Avatar
                  src={getProfilePicUrl()}
                  sx={{
                    width: 110, height: 110,
                    fontSize: '2.5rem', fontWeight: 800,
                    background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                    boxShadow: '0 0 40px rgba(139,92,246,0.5)',
                    border: '3px solid rgba(139,92,246,0.4)',
                  }}
                >
                  {profileData.name.charAt(0).toUpperCase()}
                </Avatar>
              </Box>
              <Box sx={{ flex: 1, minWidth: 200 }}>
                <Typography variant="h4" sx={{
                  fontWeight: 800, mb: 1,
                  background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}>
                  {profileData.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip label={profileData.role.charAt(0).toUpperCase() + profileData.role.slice(1)} size="small" sx={{ background: 'rgba(139,92,246,0.2)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)', fontWeight: 700 }} />
                  <Chip label={profileData.email} size="small" sx={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.2)', fontFamily: 'monospace' }} />
                  {user?.walletAddress && <Chip label="MetaMask Connected" size="small" sx={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.25)', fontWeight: 600 }} />}
                </Box>
              </Box>
            </Box>
          </Box>
        </motion.div>

        <Grid container spacing={3}>
          {/* Personal Info */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Box sx={{
                p: 3.5, borderRadius: '22px', height: '100%',
                background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139,92,246,0.2)',
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2.5, fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'flex', alignItems: 'center', gap: 1 }}>
                  {`\u{1F464}`} Personal Info
                </Typography>
                <Box sx={{ height: '2px', background: 'linear-gradient(90deg, #06B6D4, transparent)', mb: 2.5, borderRadius: 2 }} />
                <InfoRow label="Full Name" value={profileData.name} />
                <InfoRow label="Email" value={profileData.email} />
                <InfoRow label="Age" value={profileData.age !== 'N/A' ? `${profileData.age} years` : profileData.age} />
                <InfoRow label="Gender" value={profileData.gender} />
              </Box>
            </motion.div>
          </Grid>

          {/* Account Details */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Box sx={{
                p: 3.5, borderRadius: '22px', height: '100%',
                background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
                border: '1px solid rgba(139,92,246,0.2)',
              }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2.5, fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'flex', alignItems: 'center', gap: 1 }}>
                  {`\u{1F512}`} Account Details
                </Typography>
                <Box sx={{ height: '2px', background: 'linear-gradient(90deg, #8B5CF6, transparent)', mb: 2.5, borderRadius: 2 }} />
                {user?.walletAddress && <InfoRow label="Wallet Address" value={user.walletAddress} mono />}
                {user?.pseudoID && <InfoRow label="Pseudo ID" value={user.pseudoID} mono />}
                <InfoRow label="User ID" value={keyData.userID || user?.userID} mono />
                {keyData.ipfsHash && <InfoRow label="IPFS Data Hash" value={keyData.ipfsHash} mono />}
              </Box>
            </motion.div>
          </Grid>

          {/* Stats */}
          {stats && (
            <Grid item xs={12}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <Box sx={{
                  p: 3.5, borderRadius: '22px',
                  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139,92,246,0.2)',
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2.5, fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'flex', alignItems: 'center', gap: 1 }}>
                    {`\u26A1`} Activity &amp; XP
                  </Typography>
                  <Box sx={{ height: '2px', background: 'linear-gradient(90deg, #FBBF24, transparent)', mb: 3, borderRadius: 2 }} />
                  <Grid container spacing={2}>
                    {userRole === 'driver' && (
                      <>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center', p: 2, borderRadius: '14px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                            <Box sx={{ fontSize: '1.6rem', mb: 0.5 }}>{`\u{1F697}`}</Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#06B6D4', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{stats.totalRidesCreated ?? 0}</Typography>
                            <Typography variant="caption" sx={{ color: '#334155' }}>Rides Created</Typography>
                          </Box>
                        </Grid>
                        <Grid item xs={6} sm={3}>
                          <Box sx={{ textAlign: 'center', p: 2, borderRadius: '14px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                            <Box sx={{ fontSize: '1.6rem', mb: 0.5 }}>{`\u2705`}</Box>
                            <Typography variant="h5" sx={{ fontWeight: 800, color: '#34D399', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{stats.completedRides ?? 0}</Typography>
                            <Typography variant="caption" sx={{ color: '#334155' }}>Completed Rides</Typography>
                          </Box>
                        </Grid>
                      </>
                    )}
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 2, borderRadius: '14px', background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <Box sx={{ fontSize: '1.6rem', mb: 0.5 }}>{`\u{1F4C3}`}</Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#8B5CF6', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{stats.totalBookings ?? 0}</Typography>
                        <Typography variant="caption" sx={{ color: '#334155' }}>Total Bookings</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center', p: 2, borderRadius: '14px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                        <Box sx={{ fontSize: '1.6rem', mb: 0.5 }}>{`\u26A1`}</Box>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#FBBF24', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{stats.xp ?? 0}</Typography>
                        <Typography variant="caption" sx={{ color: '#334155' }}>XP Points</Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              </motion.div>
            </Grid>
          )}

          {/* Documents (Drivers) */}
          {userRole === 'driver' && (
            <Grid item xs={12}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Box sx={{
                  p: 3.5, borderRadius: '22px',
                  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139,92,246,0.2)',
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 2.5, fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'flex', alignItems: 'center', gap: 1 }}>
                    ?? Uploaded Documents
                  </Typography>
                  <Box sx={{ height: '2px', background: 'linear-gradient(90deg, #EC4899, transparent)', mb: 3, borderRadius: 2 }} />
                  <Grid container spacing={2}>
                    {[
                      { key: 'license', label: 'Driving License', icon: '??' },
                      { key: 'vehiclePapers', label: 'Vehicle Papers', icon: '??' },
                    ].map((doc) => (
                      <Grid item xs={12} sm={6} key={doc.key}>
                        <Box sx={{
                          p: 3, borderRadius: '16px', textAlign: 'center',
                          background: 'rgba(248,250,252,0.95)',
                          border: '1px solid rgba(139,92,246,0.15)',
                          '&:hover': { border: '1px solid rgba(139,92,246,0.35)' }, transition: 'all 0.3s',
                        }}>
                          <Box sx={{ fontSize: '2.5rem', mb: 1 }}>{doc.icon}</Box>
                          <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600, mb: 1.5 }}>{doc.label}</Typography>
                          {profileData.documents?.[doc.key] ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                              <Chip label="Uploaded" size="small" sx={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)', fontWeight: 700 }} />
                              <Button
                                size="small" variant="outlined"
                                onClick={() => handleOpenDoc(doc.key)}
                                sx={{ borderRadius: '10px', borderColor: 'rgba(6,182,212,0.4)', color: '#06B6D4', '&:hover': { background: 'rgba(6,182,212,0.08)' } }}
                              >
                                View Document
                              </Button>
                            </Box>
                          ) : (
                            <Chip label="Not Uploaded" size="small" sx={{ background: 'rgba(100,116,139,0.15)', color: '#334155', border: '1px solid rgba(100,116,139,0.25)' }} />
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </motion.div>
            </Grid>
          )}
        </Grid>

        {/* Document Viewer Dialog */}
        <Dialog open={openDocViewer} onClose={handleCloseDoc} maxWidth="md" fullWidth
          PaperProps={{ sx: { background: '#FFFFFF', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px' } }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(139,92,246,0.15)', pb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              {selectedDoc === 'license' ? '?? Driving License' : '?? Vehicle Papers'}
            </Typography>
            <IconButton onClick={handleCloseDoc} sx={{ color: '#334155', '&:hover': { color: 'text.primary', background: 'rgba(139,92,246,0.1)' } }}>
              <Close />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 3 }}>
            {selectedDoc && profileData.documents?.[selectedDoc] ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ fontSize: '3rem', mb: 2 }}>{`\u{1F4C4}`}</Box>
                <Typography variant="body1" sx={{ color: 'text.primary', mb: 1 }}>Document stored on IPFS</Typography>
                <Box sx={{ p: 2, borderRadius: '12px', background: '#F8FAFC', border: '1px solid rgba(139,92,246,0.2)', mb: 3 }}>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all', fontFamily: 'monospace', color: '#06B6D4', fontSize: '0.8rem' }}>
                    {profileData.documents[selectedDoc]}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  href={`https://gateway.pinata.cloud/ipfs/${profileData.documents[selectedDoc]}`}
                  target="_blank"
                  sx={{ borderRadius: '12px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700, px: 3 }}
                >
                  View on IPFS Gateway ?
                </Button>
              </Box>
            ) : (
              <Typography sx={{ color: '#334155', textAlign: 'center', py: 3 }}>Document not available</Typography>
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};

export default ProfilePage;

