import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Container,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Avatar,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import {
  Block,
  CheckCircle,
  Visibility,
  People,
  Block as BlockIcon,
  VerifiedUser
} from '@mui/icons-material';
import api from '../services/api';
import { useSnackbar } from 'notistack';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [openDocsDialog, setOpenDocsDialog] = useState(false);
  const [openBlockDialog, setOpenBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    blockedUsers: 0,
    drivers: 0,
    passengers: 0
  });

  useEffect(() => {
    // Check if admin is logged in
    const isAdmin = localStorage.getItem('isAdmin');
    const adminWallet = localStorage.getItem('adminWallet');
    
    if (!isAdmin || !adminWallet) {
      enqueueSnackbar('Unauthorized access', { variant: 'error' });
      navigate('/login');
      return;
    }

    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/users');
      const userData = response.data.users || [];
      
      // Deduplicate by userID
      const seen = new Set();
      const dedupedUsers = userData.filter(u => {
        if (!u.userID || seen.has(u.userID)) return false;
        seen.add(u.userID);
        return true;
      });
      
      setUsers(dedupedUsers);
      
      // Calculate stats
      setStats({
        totalUsers: dedupedUsers.length,
        activeUsers: dedupedUsers.filter(u => !u.isBlocked).length,
        blockedUsers: dedupedUsers.filter(u => u.isBlocked).length,
        drivers: dedupedUsers.filter(u => u.role === 'driver').length,
        passengers: dedupedUsers.filter(u => u.role === 'passenger').length
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      enqueueSnackbar('Failed to fetch users', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocs = (user) => {
    setSelectedUser(user);
    setOpenDocsDialog(true);
  };

  const handleBlockUser = (user) => {
    setSelectedUser(user);
    setOpenBlockDialog(true);
  };

  const confirmBlockUser = async () => {
    if (!selectedUser) return;

    try {
      await api.post('/api/admin/block-user', {
        userID: selectedUser.userID,
        reason: blockReason,
        isBlocked: !selectedUser.isBlocked
      });

      enqueueSnackbar(
        selectedUser.isBlocked ? 'User unblocked successfully' : 'User blocked successfully',
        { variant: 'success' }
      );

      setOpenBlockDialog(false);
      setBlockReason('');
      await fetchUsers();
    } catch (error) {
      console.error('Error blocking user:', error);
      enqueueSnackbar('Failed to update user status', { variant: 'error' });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminWallet');
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#030712', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress sx={{ color: '#06B6D4' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#030712', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'fixed', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'fixed', bottom: '10%', right: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

    <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
      <Box sx={{ pt: 4, pb: 4 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(24px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', p: 3, mb: 4, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #06B6D4, #8B5CF6, #EC4899)' }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: '"Plus Jakarta Sans", sans-serif', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ?? Admin Dashboard
              </Typography>
              <Typography variant="body1" sx={{ color: '#94A3B8', mt: 0.5 }}>
                Manage users, review documents, and monitor platform activity
              </Typography>
            </Box>
            <Button variant="outlined" onClick={handleLogout}
              sx={{ borderRadius: '12px', borderColor: 'rgba(239,68,68,0.4)', color: '#F87171', '&:hover': { background: 'rgba(239,68,68,0.08)' } }}>
              Logout
            </Button>
          </Box>
        </motion.div>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { emoji: '\u{1F465}', label: 'Total Users', value: stats.totalUsers, color: '#8B5CF6' },
            { emoji: '\u26A1', label: 'Active Users', value: stats.activeUsers, color: '#34D399' },
            { emoji: '\u{1F6AB}', label: 'Blocked Users', value: stats.blockedUsers, color: '#F87171' },
            { emoji: '\u{1F697}', label: 'Drivers', value: stats.drivers, color: '#06B6D4' },
            { emoji: '\u{1F9CD}', label: 'Passengers', value: stats.passengers, color: '#FBBF24' },
          ].map(({ emoji, label, value, color }, i) => (
            <Grid item xs={12} md={2.4} key={label}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileHover={{ y: -4 }}>
                <Box sx={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', border: `1px solid ${color}33`, borderRadius: '14px', p: 2.5, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '2rem', mb: 0.5 }}>{emoji}</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 900, fontFamily: '"Plus Jakarta Sans", sans-serif', color }}>{value}</Typography>
                  <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 600 }}>{label}</Typography>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Users Table */}
        <Box sx={{ background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ background: 'rgba(139,92,246,0.1)' }}>
                <TableRow>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}>User</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}>Email</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}>Age</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}>Role</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}>Status</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}>Registration</TableCell>
                  <TableCell sx={{ color: '#94A3B8', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ borderColor: 'rgba(139,92,246,0.1)', color: '#64748B' }}>
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.userID} sx={{ '& td': { borderColor: 'rgba(139,92,246,0.1)', color: '#94A3B8' }, '&:hover': { background: 'rgba(139,92,246,0.05)' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', width: 34, height: 34, fontSize: '0.9rem' }}>
                            {user.name?.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" sx={{ color: '#F1F5F9' }}>{user.name || 'N/A'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{user.email}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{user.age || 'N/A'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} size="small"
                          sx={user.role === 'driver' ? { background: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)', fontWeight: 700 } : { background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={user.isBlocked ? 'Blocked' : 'Active'} size="small"
                          sx={user.isBlocked ? { background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700 } : { background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {user.role === 'driver' && (
                            <IconButton size="small" onClick={() => handleViewDocs(user)} title="View Documents"
                              sx={{ color: '#06B6D4', '&:hover': { background: 'rgba(6,182,212,0.1)' } }}>
                              <Visibility />
                            </IconButton>
                          )}
                          <IconButton size="small" onClick={() => handleBlockUser(user)} title={user.isBlocked ? 'Unblock User' : 'Block User'}
                            sx={{ color: user.isBlocked ? '#34D399' : '#F87171', '&:hover': { background: user.isBlocked ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)' } }}>
                            {user.isBlocked ? <CheckCircle /> : <Block />}
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* View Documents Dialog */}
        <Dialog open={openDocsDialog} onClose={() => setOpenDocsDialog(false)} maxWidth="md" fullWidth
          PaperProps={{ sx: { background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '16px' } }}>
          <DialogTitle sx={{ color: '#F1F5F9', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700 }}>
            User Documents: {selectedUser?.name}
          </DialogTitle>
          <DialogContent>
            {selectedUser?.documents ? (
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Driver's License</Typography>
                    {selectedUser.documents.license ? (
                      <Box>
                        <iframe
                          src={`https://gateway.pinata.cloud/ipfs/${selectedUser.documents.license}`}
                          title="Driver License"
                          style={{ width: '100%', height: '500px', border: '1px solid #ccc', borderRadius: '8px' }}
                          onError={(e) => {
                            console.error('Failed to load license document');
                          }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{ mt: 1 }}
                          href={`https://gateway.pinata.cloud/ipfs/${selectedUser.documents.license}`}
                          target="_blank"
                        >
                          Open in New Tab
                        </Button>
                      </Box>
                    ) : (
                      <Alert severity="warning">License not uploaded</Alert>
                    )}
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Vehicle Papers</Typography>
                    {selectedUser.documents.vehiclePapers ? (
                      <Box>
                        <iframe
                          src={`https://gateway.pinata.cloud/ipfs/${selectedUser.documents.vehiclePapers}`}
                          title="Vehicle Papers"
                          style={{ width: '100%', height: '500px', border: '1px solid #ccc', borderRadius: '8px' }}
                          onError={(e) => {
                            console.error('Failed to load vehicle papers');
                          }}
                        />
                        <Button
                          variant="outlined"
                          size="small"
                          sx={{ mt: 1 }}
                          href={`https://gateway.pinata.cloud/ipfs/${selectedUser.documents.vehiclePapers}`}
                          target="_blank"
                        >
                          Open in New Tab
                        </Button>
                        <Alert severity="info" sx={{ mt: 1, display: 'none' }}>
                          Could not load image. Hash: {selectedUser.documents.vehiclePapers}
                        </Alert>
                      </Box>
                    ) : (
                      <Alert severity="warning">Vehicle papers not uploaded</Alert>
                    )}
                  </Grid>

                  {selectedUser.ipfsHash && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" gutterBottom sx={{ color: '#94A3B8' }}>Full Profile IPFS Hash:</Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', background: 'rgba(139,92,246,0.1)', color: '#8B5CF6', p: 1, borderRadius: '8px' }}>
                        {selectedUser.ipfsHash}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mt: 1 }}
                        href={`https://ipfs.io/ipfs/${selectedUser.ipfsHash}`}
                        target="_blank"
                      >
                        View Full Profile on IPFS
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </Box>
            ) : (
              <Alert severity="info">No documents available for this user</Alert>
            )}
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
            <Button onClick={() => setOpenDocsDialog(false)} sx={{ color: '#94A3B8' }}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Block/Unblock User Dialog */}
        <Dialog open={openBlockDialog} onClose={() => setOpenBlockDialog(false)}
          PaperProps={{ sx: { background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '16px' } }}>
          <DialogTitle sx={{ color: '#F1F5F9', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 700 }}>
            {selectedUser?.isBlocked ? 'Unblock User' : 'Block User'}
          </DialogTitle>
          <DialogContent>
            <Alert severity={selectedUser?.isBlocked ? 'info' : 'warning'}
              sx={{ mb: 2, background: selectedUser?.isBlocked ? 'rgba(6,182,212,0.1)' : 'rgba(251,191,36,0.1)', color: selectedUser?.isBlocked ? '#06B6D4' : '#FBBF24', border: `1px solid ${selectedUser?.isBlocked ? 'rgba(6,182,212,0.3)' : 'rgba(251,191,36,0.3)'}` }}>
              {selectedUser?.isBlocked
                ? 'This will restore user access to the application.'
                : 'This will prevent the user from accessing the application.'}
            </Alert>
            <TextField fullWidth multiline rows={3} label="Reason (optional)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Enter reason for blocking/unblocking"
              sx={{ '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(139,92,246,0.3)' }, '&:hover fieldset': { borderColor: 'rgba(6,182,212,0.5)' } }, '& .MuiInputLabel-root': { color: '#64748B' }, '& textarea': { color: '#F1F5F9' } }}
            />
          </DialogContent>
          <DialogActions sx={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
            <Button onClick={() => setOpenBlockDialog(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
            <Button variant="contained" onClick={confirmBlockUser}
              sx={{ borderRadius: '10px', background: selectedUser?.isBlocked ? 'linear-gradient(135deg, #34D399, #059669)' : 'linear-gradient(135deg, #F87171, #DC2626)', fontWeight: 700 }}>
              {selectedUser?.isBlocked ? 'Unblock' : 'Block'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Container>
    </Box>
  );
};

export default AdminDashboard;
