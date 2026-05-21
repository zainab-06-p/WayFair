import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Typography, Alert, CircularProgress,
  Divider, Switch, FormControlLabel, Paper
} from '@mui/material';
import { AccountBalanceWallet, AdminPanelSettings, LockOutlined } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useMetaMask } from '../hooks/useMetaMask';
import { useSnackbar } from 'notistack';

const ADMIN_WALLET_ADDRESS = '0x7613787893518461Bc6C007ccd97A5F7F877E2C4';

// Shared styled glassmorphism input
const GlassInput = ({ label, type = 'text', value, onChange, name, required, disabled }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, mb: 1, display: 'block', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.72rem' }}>
      {label}
    </Typography>
    <Box
      component="input"
      type={type}
      value={value}
      onChange={onChange}
      name={name}
      required={required}
      disabled={disabled}
      sx={{
        width: '100%', px: 2, py: 1.5,
        background: 'rgba(255,255,255,0.82)',
        border: '1px solid rgba(139,92,246,0.25)',
        borderRadius: '12px',
        color: 'text.primary',
        fontSize: '0.95rem',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        outline: 'none',
        transition: 'all 0.3s',
        boxSizing: 'border-box',
        '&:focus': { border: '1px solid #06B6D4', boxShadow: '0 0 0 3px rgba(6,182,212,0.15)' },
        '&::placeholder': { color: '#475569' },
        '&:disabled': { opacity: 0.5, cursor: 'not-allowed' },
      }}
    />
  </Box>
);

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithWallet } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { account, isConnected, connect, isLoading: walletLoading, error: walletError, isMetaMaskInstalled, signMessage } = useMetaMask();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try {
      await login();
      const role = localStorage.getItem('userRole');
      enqueueSnackbar('Welcome back to WayFair!', { variant: 'success' });
      navigate(role === 'driver' ? '/driver/dashboard' : '/passenger/dashboard');
    } catch (err) {
      setError(err.message || err);
      enqueueSnackbar(err.message || 'Login failed', { variant: 'error' });
    } finally { setLoading(false); }
  };

  const handleMetaMaskLogin = async () => {
    setError(''); setLoading(true);
    try {
      let walletAddress = account;
      if (!isConnected) {
        walletAddress = await connect();
        if (!walletAddress) throw new Error('Failed to connect wallet');
      }
      const message = `Login to WayFair | Wallet: ${walletAddress} | Timestamp: ${Date.now()}`;
      const signature = await signMessage(message);
      if (!signature) throw new Error('Failed to sign message');
      await loginWithWallet(walletAddress, message, signature);
      const role = localStorage.getItem('userRole');
      enqueueSnackbar('Welcome to WayFair!', { variant: 'success' });
      navigate(role === 'driver' ? '/driver/dashboard' : '/passenger/dashboard');
    } catch (err) {
      setError(err.message || err);
      enqueueSnackbar(err.message || 'MetaMask login failed', { variant: 'error' });
    } finally { setLoading(false); }
  };

  const handleAdminLogin = async () => {
    setError(''); setLoading(true);
    try {
      let walletAddress = account;
      if (!isConnected) {
        walletAddress = await connect();
        if (!walletAddress) throw new Error('Failed to connect wallet');
      }
      if (walletAddress.toLowerCase() !== ADMIN_WALLET_ADDRESS.toLowerCase()) {
        throw new Error('Unauthorized: Only admin wallet can access admin panel');
      }
      const message = `Admin Login to WayFair | Wallet: ${walletAddress} | Timestamp: ${Date.now()}`;
      const signature = await signMessage(message);
      if (!signature) throw new Error('Failed to sign message');
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('adminWallet', walletAddress);
      localStorage.setItem('token', 'admin-token-' + Date.now());
      enqueueSnackbar('Admin access granted!', { variant: 'success' });
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || err);
      enqueueSnackbar(err.message || 'Admin login failed', { variant: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      background: '#F8FAFC',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      px: 2,
      pt: 10,
      pb: 6,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '20%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 5 }}>
          <Box sx={{
            width: 60, height: 60, borderRadius: '18px', mx: 'auto', mb: 2,
            background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(6,182,212,0.4)',
            fontSize: '1.8rem',
          }}>🚗</Box>
          <Typography variant="h4" sx={{
            fontWeight: 900, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>WayFair</Typography>
          <Typography variant="body2" sx={{ color: '#475569', mt: 0.5 }}>
            {isAdminMode ? 'Admin Panel Access' : 'Welcome back — sign in to continue'}
          </Typography>
        </Box>

        {/* Card */}
        <Box sx={{
          background: '#FFFFFF',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(139,92,246,0.18)',
          borderRadius: '24px',
          p: { xs: 3, md: 4 },
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        }}>
          {/* Admin toggle */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              {isAdminMode ? 'Admin Sign In' : 'Sign In'}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={isAdminMode}
                  onChange={(e) => setIsAdminMode(e.target.checked)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#8B5CF6' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#8B5CF6' },
                  }}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AdminPanelSettings sx={{ fontSize: 16, color: isAdminMode ? '#A78BFA' : '#334155' }} />
                  <Typography variant="caption" sx={{ color: isAdminMode ? '#A78BFA' : '#334155', fontWeight: 600 }}>Admin</Typography>
                </Box>
              }
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
              {error}
            </Alert>
          )}
          {walletError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }}>
              {walletError}
            </Alert>
          )}
          {!isMetaMaskInstalled && (
            <Alert severity="warning" sx={{ mb: 2.5, borderRadius: '12px' }}>
              MetaMask not installed. Install it to use wallet auth.
            </Alert>
          )}

          {isAdminMode ? (
            <>
              <Alert severity="info" sx={{ mb: 3, borderRadius: '12px' }}>
                Requires authorized MetaMask wallet:<br />
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', fontSize: '0.7rem' }}>
                  {ADMIN_WALLET_ADDRESS}
                </Typography>
              </Alert>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  fullWidth variant="contained" size="large"
                  onClick={handleAdminLogin}
                  disabled={loading || walletLoading || !isMetaMaskInstalled}
                  startIcon={loading || walletLoading ? null : <AdminPanelSettings />}
                  sx={{
                    py: 1.7, borderRadius: '14px', fontWeight: 700, fontSize: '1rem',
                    background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                    boxShadow: '0 6px 30px rgba(139,92,246,0.4)',
                    '&:hover': { boxShadow: '0 10px 40px rgba(139,92,246,0.6)', transform: 'translateY(-1px)' },
                    '&:disabled': { opacity: 0.5 },
                  }}
                >
                  {loading || walletLoading ? <CircularProgress size={22} sx={{ color: 'white' }} /> :
                    isConnected ? `Admin Login (${account?.substring(0, 6)}...${account?.substring(38)})` : 'Connect Admin Wallet'}
                </Button>
              </motion.div>
            </>
          ) : (
            <>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  fullWidth variant="contained" size="large"
                  onClick={handleMetaMaskLogin}
                  disabled={loading || walletLoading || !isMetaMaskInstalled}
                  startIcon={loading || walletLoading ? null : <AccountBalanceWallet />}
                  sx={{
                    py: 1.7, borderRadius: '14px', fontWeight: 700, fontSize: '1rem',
                    background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                    boxShadow: '0 6px 30px rgba(6,182,212,0.4)',
                    '&:hover': { boxShadow: '0 10px 40px rgba(6,182,212,0.6)', transform: 'translateY(-1px)' },
                    '&:disabled': { opacity: 0.5 },
                    mb: 2,
                  }}
                >
                  {loading || walletLoading ? <CircularProgress size={22} sx={{ color: 'white' }} /> :
                    isConnected ? `MetaMask (${account?.substring(0, 6)}...${account?.substring(38)})` : 'Connect MetaMask & Sign In'}
                </Button>
              </motion.div>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, my: 2.5 }}>
                <Box sx={{ flex: 1, height: '1px', background: 'rgba(139,92,246,0.2)' }} />
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 500 }}>or</Typography>
                <Box sx={{ flex: 1, height: '1px', background: 'rgba(139,92,246,0.2)' }} />
              </Box>

              <Box sx={{
                mb: 2.5, p: 2.5, borderRadius: '12px',
                background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.15)',
              }}>
                <Typography variant="caption" sx={{ color: '#0891B2', fontWeight: 600, display: 'block', mb: 1 }}>
                  🔑 Stored Keys Authentication
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', lineHeight: 1.7, display: 'block' }}>
                  Your private key stored locally signs a challenge. No identity revealed.
                </Typography>
              </Box>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  fullWidth variant="outlined" size="large"
                  onClick={handleLogin}
                  disabled={loading}
                  startIcon={loading ? null : <LockOutlined />}
                  sx={{
                    py: 1.6, borderRadius: '14px', fontWeight: 600, fontSize: '0.95rem',
                    borderColor: 'rgba(6,182,212,0.4)', color: '#0891B2',
                    background: 'rgba(6,182,212,0.04)',
                    '&:hover': { borderColor: '#06B6D4', background: 'rgba(6,182,212,0.1)', boxShadow: '0 0 20px rgba(6,182,212,0.15)' },
                  }}
                >
                  {loading ? <CircularProgress size={22} sx={{ color: '#06B6D4' }} /> : 'Sign In with Stored Keys'}
                </Button>
              </motion.div>
            </>
          )}

          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(139,92,246,0.15)', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#334155' }}>
              Don't have an account?{' '}
              <Box
                component={RouterLink}
                to="/register"
                sx={{
                  background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  fontWeight: 700, textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Create account
              </Box>
            </Typography>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
};

export default LoginPage;
