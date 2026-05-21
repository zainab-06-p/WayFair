import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, CircularProgress, Alert,
  TextField, Chip
} from '@mui/material';
import { LockOpen, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useSnackbar } from 'notistack';

/**
 * OTPVerifyDialog — Driver enters the 6-digit OTP given by the passenger
 * Props:
 *   open: boolean
 *   onClose: () => void
 *   rideID: string
 *   bookingID: string  (the booking to verify OTP for)
 *   onVerified: (data) => void  (called when OTP is correct and ride starts)
 */
export default function OTPVerifyDialog({ open, onClose, rideID, bookingID, onVerified }) {
  const { enqueueSnackbar } = useSnackbar();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const otpString = otp.join('');

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // only last char
    setOtp(newOtp);
    setError('');

    // Auto-advance focus
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
    // Allow paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) return;
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (text.length > 0) {
      const newOtp = Array(6).fill('');
      text.split('').forEach((ch, i) => { newOtp[i] = ch; });
      setOtp(newOtp);
      // Focus last filled
      const lastIndex = Math.min(text.length - 1, 5);
      setTimeout(() => {
        const el = document.getElementById(`otp-input-${lastIndex}`);
        if (el) el.focus();
      }, 50);
    }
  };

  const handleVerify = async () => {
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/rides/verify-otp', {
        rideID,
        bookingID,
        otp: otpString,
      });

      setSuccess(true);
      enqueueSnackbar('Passenger confirmed on board! Payment is now enabled.', { variant: 'success', autoHideDuration: 4000 });

      setTimeout(() => {
        onVerified?.(res.data);
        handleClose();
      }, 1500);
    } catch (err) {
      const msg = err.response?.data?.error || 'OTP verification failed. Try again.';
      setError(msg);
      // Shake animation — clear OTP on wrong entry
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => {
        const firstInput = document.getElementById('otp-input-0');
        if (firstInput) firstInput.focus();
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setOtp(['', '', '', '', '', '']);
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '24px',
          border: '1px solid rgba(6,182,212,0.3)',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #F0F9FF 100%)',
          overflow: 'hidden',
        }
      }}
    >
      {/* Top gradient bar */}
      <Box sx={{ height: 4, background: 'linear-gradient(90deg, #06B6D4, #8B5CF6)' }} />

      <DialogTitle sx={{ textAlign: 'center', pt: 3, pb: 1 }}>
        <Box sx={{
          width: 64, height: 64, borderRadius: '20px', mx: 'auto', mb: 2,
          background: success
            ? 'linear-gradient(135deg, #34D399, #059669)'
            : 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(6,182,212,0.4)',
          transition: 'all 0.4s ease',
        }}>
          {success ? (
            <CheckCircle sx={{ color: 'white', fontSize: 32 }} />
          ) : (
            <LockOpen sx={{ color: 'white', fontSize: 32 }} />
          )}
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          {success ? 'Passenger Boarded! 🎉' : 'Confirm Passenger Boarding'}
        </Typography>
        <Typography variant="body2" sx={{ color: '#475569', mt: 0.5, fontWeight: 400 }}>
          {success
            ? 'Passenger is on board. Payment is now enabled!'
            : 'Ask the passenger to share their 6-digit OTP when they board'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 2 }}>
        <AnimatePresence>
          {!success && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              {/* OTP Input Boxes */}
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', my: 3 }}>
                {otp.map((digit, index) => (
                  <Box
                    key={index}
                    component="input"
                    id={`otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={loading || success}
                    sx={{
                      width: 48, height: 60,
                      textAlign: 'center',
                      fontSize: '1.6rem',
                      fontWeight: 900,
                      fontFamily: 'monospace',
                      border: `2px solid ${digit ? 'rgba(6,182,212,0.7)' : 'rgba(139,92,246,0.25)'}`,
                      borderRadius: '14px',
                      background: digit ? 'rgba(6,182,212,0.08)' : 'rgba(255,255,255,0.9)',
                      color: '#0F172A',
                      outline: 'none',
                      transition: 'all 0.2s',
                      caretColor: '#06B6D4',
                      '&:focus': {
                        border: '2px solid #06B6D4',
                        boxShadow: '0 0 0 4px rgba(6,182,212,0.15)',
                        background: 'rgba(6,182,212,0.05)',
                      },
                      '&:disabled': { opacity: 0.6 },
                    }}
                  />
                ))}
              </Box>

              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Alert
                    severity="error"
                    icon={<ErrorIcon />}
                    sx={{
                      borderRadius: '12px',
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.25)',
                      color: '#DC2626',
                      mb: 1,
                      '& .MuiAlert-icon': { color: '#DC2626' }
                    }}
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}

              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Chip
                  label="Ask the passenger for their OTP when they board your vehicle"
                  size="small"
                  sx={{
                    background: 'rgba(139,92,246,0.08)',
                    color: '#7C3AED',
                    border: '1px solid rgba(139,92,246,0.2)',
                    fontSize: '0.72rem', fontWeight: 600,
                  }}
                />
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1, justifyContent: 'center' }}>
        {!success && (
          <>
            <Button
              onClick={handleClose}
              disabled={loading}
              sx={{ color: '#475569', borderRadius: '12px', px: 2 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleVerify}
              disabled={loading || otpString.length !== 6}
              sx={{
                borderRadius: '14px',
                px: 4,
                py: 1.3,
                fontWeight: 800,
                background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                boxShadow: '0 6px 24px rgba(6,182,212,0.4)',
                '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 10px 32px rgba(6,182,212,0.5)' },
                '&:disabled': { opacity: 0.5 },
                fontSize: '1rem',
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : '🔐 Confirm Boarding'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
