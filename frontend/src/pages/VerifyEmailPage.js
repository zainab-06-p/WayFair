import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress
} from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';

const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');

  const token = searchParams.get('token');
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (!token || !userId) {
      setError('Invalid verification link');
    }
  }, [token, userId]);

  const handleVerify = async () => {
    setError('');
    setLoading(true);

    try {
      await verifyEmail(token, userId);
      setVerified(true);
      enqueueSnackbar('Email verified successfully!', { variant: 'success' });
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || err);
      enqueueSnackbar(err.message || 'Verification failed', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'fixed', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'fixed', bottom: '15%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 440, zIndex: 1, padding: '0 16px' }}>
        <Box sx={{ background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '20px', p: { xs: 3, sm: 5 }, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #06B6D4, #8B5CF6, #EC4899)' }} />

          {verified ? (
            <>
              <CheckCircle sx={{ fontSize: 80, color: '#34D399', mb: 2 }} />
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 900, fontFamily: '"Plus Jakarta Sans", sans-serif', background: 'linear-gradient(135deg, #34D399, #06B6D4)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Email Verified!
              </Typography>
              <Typography variant="body1" sx={{ color: '#94A3B8', mb: 1 }}>
                Your email has been verified successfully. You can now use the application.
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748B' }}>Redirecting to login?</Typography>
            </>
          ) : (
            <>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 900, fontFamily: '"Plus Jakarta Sans", sans-serif', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {`\u2709\uFE0F`} Verify Email
              </Typography>

              <Typography variant="body1" sx={{ color: '#94A3B8', mt: 2, mb: 3 }}>
                Click the button below to verify your email address and activate your account.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2, textAlign: 'left', background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '1px solid rgba(239,68,68,0.3)' }}>
                  {error}
                </Alert>
              )}

              <Button fullWidth variant="contained" size="large" onClick={handleVerify} disabled={loading || !token || !userId}
                sx={{ borderRadius: '14px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700, fontSize: '1rem', py: 1.5, boxShadow: '0 8px 24px rgba(6,182,212,0.35)', mb: 2 }}>
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Verify Email'}
              </Button>

              <Button fullWidth variant="text" onClick={() => navigate('/login')} sx={{ color: '#64748B', '&:hover': { color: '#94A3B8' } }}>
                Back to Login
              </Button>
            </>
          )}
        </Box>
      </motion.div>
    </Box>
  );
};

export default VerifyEmailPage;
