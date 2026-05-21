import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Button, Typography, Alert, CircularProgress,
  Select, MenuItem, FormControl
} from '@mui/material';
import { AccountBalanceWallet, PersonAdd, CloudUpload, CheckCircle, ContactPhone } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useMetaMask } from '../hooks/useMetaMask';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const GlassInput = ({ label, type = 'text', value, onChange, name, required, disabled, placeholder }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" sx={{ color: '#334155', fontWeight: 600, mb: 0.5, display: 'block', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.68rem' }}>
      {label}{required && <Box component="span" sx={{ color: '#EF4444', ml: 0.5 }}>*</Box>}
    </Typography>
    <Box
      component="input"
      type={type}
      value={value}
      onChange={onChange}
      name={name}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      sx={{
        width: '100%', px: 2, py: 1.4,
        background: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '10px',
        color: '#0F172A',
        fontSize: '0.93rem',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        outline: 'none',
        transition: 'all 0.2s',
        boxSizing: 'border-box',
        '&:focus': { border: '1.5px solid #06B6D4', boxShadow: '0 0 0 3px rgba(6,182,212,0.12)' },
        '&::placeholder': { color: '#94A3B8' },
        '&:disabled': { opacity: 0.5, background: '#F1F5F9' },
      }}
    />
  </Box>
);

const GlassSelect = ({ label, value, onChange, name, required, children }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" sx={{ color: '#334155', fontWeight: 600, mb: 0.5, display: 'block', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: '0.68rem' }}>
      {label}{required && <Box component="span" sx={{ color: '#EF4444', ml: 0.5 }}>*</Box>}
    </Typography>
    <Box component="select"
      value={value}
      onChange={onChange}
      name={name}
      required={required}
      sx={{
        width: '100%', px: 1.5, py: 1.4,
        background: '#FFFFFF',
        border: '1.5px solid #E2E8F0',
        borderRadius: '10px',
        color: '#0F172A',
        fontSize: '0.93rem',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
        outline: 'none',
        transition: 'all 0.2s',
        boxSizing: 'border-box',
        cursor: 'pointer',
        '&:focus': { border: '1.5px solid #06B6D4', boxShadow: '0 0 0 3px rgba(6,182,212,0.12)' },
        '& option': { background: '#FFFFFF', color: '#0F172A' },
      }}
    >
      {children}
    </Box>
  </Box>
);

const FileUploadButton = ({ label, file, name, onChange, accept, required }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, mb: 1, display: 'block', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
      {label}{required && <Box component="span" sx={{ color: '#EC4899', ml: 0.5 }}>*</Box>}
    </Typography>
    <Box
      component="label"
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.4, cursor: 'pointer',
        background: file ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.82)',
        border: `1px dashed ${file ? 'rgba(52,211,153,0.4)' : 'rgba(139,92,246,0.25)'}`,
        borderRadius: '12px',
        transition: 'all 0.3s',
        '&:hover': { border: '1px dashed rgba(6,182,212,0.5)', background: 'rgba(6,182,212,0.05)' },
      }}
    >
      {file ? (
        <CheckCircle sx={{ fontSize: 18, color: '#34D399', flexShrink: 0 }} />
      ) : (
        <CloudUpload sx={{ fontSize: 18, color: '#334155', flexShrink: 0 }} />
      )}
      <Typography variant="body2" sx={{ color: file ? '#34D399' : '#334155', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file ? file.name : `Choose ${label}`}
      </Typography>
      <input type="file" name={name} hidden accept={accept} onChange={onChange} />
    </Box>
  </Box>
);

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, registerWithWallet } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { account, isConnected, connect, isLoading: walletLoading, error: walletError, isMetaMaskInstalled, signMessage } = useMetaMask();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  const [formData, setFormData] = useState({ name: '', age: '', gender: '', email: '', role: '' });
  const [files, setFiles] = useState({ license: null, vehiclePapers: null, profilePic: null });

  // Emergency contact (passenger only)
  const [emergencyContact, setEmergencyContact] = useState({ name: '', phone: '', email: '', relationship: '' });

  // Referral code (pre-filled from URL ?ref=CODE)
  const [referralCode, setReferralCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref') || '';
  });
  const [referralValid, setReferralValid] = useState(null); // null | true | false

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleFileChange = (e) => setFiles({ ...files, [e.target.name]: e.target.files[0] });
  const handleECChange = (e) => setEmergencyContact({ ...emergencyContact, [e.target.name]: e.target.value });

  // Validate referral code on blur
  const handleReferralBlur = async () => {
    if (!referralCode.trim()) { setReferralValid(null); return; }
    try {
      await api.post('/api/referral/validate', { referralCode: referralCode.trim() });
      setReferralValid(true);
    } catch (_) {
      setReferralValid(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (!formData.name || !formData.age || !formData.gender || !formData.email || !formData.role) {
        throw new Error('Please fill all required fields');
      }
      if (formData.role === 'driver' && (!files.license || !files.vehiclePapers)) {
        throw new Error('Drivers must upload license and vehicle papers');
      }
      if (formData.role === 'passenger') {
        if (!emergencyContact.name || !emergencyContact.phone) {
          throw new Error('Please fill in emergency contact name and phone number.');
        }
      }

      const fullFormData = {
        ...formData,
        ...(formData.role === 'passenger' && { emergencyContact: JSON.stringify(emergencyContact) })
      };

      let result;
      if (useWallet) {
        let walletAddress = account;
        if (!isConnected) {
          walletAddress = await connect();
          if (!walletAddress) throw new Error('Failed to connect wallet');
        }
        const message = `Register to WayFair | Wallet: ${walletAddress} | Timestamp: ${Date.now()}`;
        const signature = await signMessage(message);
        if (!signature) throw new Error('Failed to sign message');
        result = await registerWithWallet(fullFormData, files, walletAddress, message, signature);
        enqueueSnackbar('Welcome to WayFair! 🎉', { variant: 'success' });
      } else {
        result = await register(fullFormData, files);
        enqueueSnackbar('Account created! Check your email to verify.', { variant: 'success' });
        alert(`IMPORTANT: Save these keys securely!\n\nUser ID: ${result.userID}\nPseudo ID: ${result.pseudoID}\n\nYour private key has been saved locally. Do not lose it!`);
      }

      if (referralCode.trim() && result?.userID) {
        try {
          await api.post('/api/referral/apply', {
            referralCode: referralCode.trim().toUpperCase(),
            newUserID: result.userID,
          });
          enqueueSnackbar('🎁 Referral code applied! Bonus XP credited.', { variant: 'info' });
        } catch (_) {}
      }

      navigate('/login');
    } catch (err) {
      setError(err.message || err);
      enqueueSnackbar(err.message || 'Registration failed', { variant: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{
      minHeight: '100vh', background: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      px: 2, pt: 10, pb: 6, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '15%', right: '10%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '15%', left: '8%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{ width: '100%', maxWidth: 500, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{
            width: 60, height: 60, borderRadius: '18px', mx: 'auto', mb: 2,
            background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 30px rgba(6,182,212,0.4)', fontSize: '1.8rem',
          }}>{`\u{1F697}`}</Box>
          <Typography variant="h4" sx={{
            fontWeight: 900, letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}>WayFair</Typography>
          <Typography variant="body2" sx={{ color: '#334155', mt: 0.5 }}>
            Create your account ? free forever
          </Typography>
        </Box>

        {/* Card */}
        <Box sx={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: '24px',
          p: { xs: 3, md: 4 },
          boxShadow: '0 20px 80px rgba(0,0,0,0.5)',
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 3, fontFamily: '"Plus Jakarta Sans", sans-serif', display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonAdd sx={{ color: '#06B6D4', fontSize: 22 }} />
            Create Account
          </Typography>

          {/* Auth method toggle */}
          {isMetaMaskInstalled && (
            <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
              <Button
                fullWidth onClick={() => setUseWallet(false)}
                sx={{
                  py: 1.2, borderRadius: '12px', fontWeight: 600, fontSize: '0.88rem',
                  background: !useWallet ? 'rgba(6,182,212,0.15)' : 'rgba(15,23,42,0.4)',
                  border: !useWallet ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(139,92,246,0.2)',
                  color: !useWallet ? '#06B6D4' : '#475569',
                  '&:hover': { background: 'rgba(6,182,212,0.1)' },
                }}
              >{`\u{1F511}`} Keys Auth</Button>
              <Button
                fullWidth onClick={() => setUseWallet(true)}
                sx={{
                  py: 1.2, borderRadius: '12px', fontWeight: 600, fontSize: '0.88rem',
                  background: useWallet ? 'rgba(139,92,246,0.15)' : 'rgba(15,23,42,0.4)',
                  border: useWallet ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(139,92,246,0.2)',
                  color: useWallet ? '#A78BFA' : '#475569',
                  '&:hover': { background: 'rgba(139,92,246,0.1)' },
                }}
              ><AccountBalanceWallet sx={{ fontSize: 16, mr: 0.5 }} /> MetaMask</Button>
            </Box>
          )}

          {useWallet && isConnected && (
            <Alert severity="success" sx={{ mb: 2.5, borderRadius: '12px', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', color: '#6EE7B7' }}>
              {`\u2705`} Connected: {account?.substring(0, 8)}...{account?.substring(36)}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', color: '#FCA5A5' }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 0 }}>
              <GlassInput label="Full Name" name="name" value={formData.name} onChange={handleChange} required placeholder="Priya Sharma" />
              <GlassInput label="Age" name="age" type="number" value={formData.age} onChange={handleChange} required placeholder="25" />
            </Box>

            <GlassInput label="Email" name="email" type="email" value={formData.email} onChange={handleChange} required placeholder="you@example.com" />

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <GlassSelect label="Gender" name="gender" value={formData.gender} onChange={handleChange} required>
                <option value="" disabled>Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other / Prefer not to say</option>
              </GlassSelect>
              <GlassSelect label="Role" name="role" value={formData.role} onChange={handleChange} required>
                <option value="" disabled>Select...</option>
                <option value="passenger">Passenger</option>
                <option value="driver">Driver</option>
              </GlassSelect>
            </Box>

            {formData.role === 'driver' && (
              <Box sx={{ mt: 0.5, p: 2.5, borderRadius: '14px', background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#A78BFA', fontWeight: 700, display: 'block', mb: 1.5 }}>
                  {`\u{1F4C4}`} Driver Documents
                </Typography>
                <FileUploadButton label="License" file={files.license} name="license" onChange={handleFileChange} accept="image/*,application/pdf" required />
                <FileUploadButton label="Vehicle Papers" file={files.vehiclePapers} name="vehiclePapers" onChange={handleFileChange} accept="image/*,application/pdf" required />
              </Box>
            )}

            {/* Emergency Contact — Required for Passengers */}
            {formData.role === 'passenger' && (
              <Box sx={{ mt: 0.5, mb: 2, p: 2.5, borderRadius: '14px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, fontSize: '0.75rem' }}>
                  <ContactPhone sx={{ fontSize: 15 }} /> Emergency Contact (Required for your safety)
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 2 }}>
                  This person will be alerted if you press SOS during a ride.
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <GlassInput label="Contact Name" name="name" value={emergencyContact.name} onChange={handleECChange} required placeholder="Mom / Dad / Friend" />
                  <GlassInput label="Phone Number" name="phone" value={emergencyContact.phone} onChange={handleECChange} required placeholder="+91 98765 43210" />
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <GlassInput label="Email (Optional)" name="email" type="email" value={emergencyContact.email} onChange={handleECChange} placeholder="contact@email.com" />
                  <GlassInput label="Relationship" name="relationship" value={emergencyContact.relationship} onChange={handleECChange} placeholder="Mother / Sibling" />
                </Box>
              </Box>
            )}

            {/* Referral Code */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, mb: 1, display: 'block', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                Referral Code <Box component="span" sx={{ color: '#94A3B8', fontSize: '0.65rem', textTransform: 'none' }}>(Optional — get bonus XP!)</Box>
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="input"
                  type="text"
                  value={referralCode}
                  onChange={e => { setReferralCode(e.target.value.toUpperCase()); setReferralValid(null); }}
                  onBlur={handleReferralBlur}
                  placeholder="e.g. WAY_AB1234_XY78"
                  sx={{
                    width: '100%', px: 2, py: 1.4, boxSizing: 'border-box',
                    background: referralValid === true ? 'rgba(52,211,153,0.06)' : referralValid === false ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.82)',
                    border: `1px solid ${referralValid === true ? 'rgba(52,211,153,0.5)' : referralValid === false ? 'rgba(239,68,68,0.5)' : 'rgba(139,92,246,0.25)'}`,
                    borderRadius: '12px', color: '#0F172A', fontSize: '0.93rem',
                    fontFamily: 'monospace', outline: 'none', transition: 'all 0.3s',
                    '&:focus': { border: '1px solid #06B6D4', boxShadow: '0 0 0 3px rgba(6,182,212,0.15)' },
                  }}
                />
                {referralValid === true && (
                  <Box sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#34D399', fontSize: '1.1rem' }}>✓</Box>
                )}
                {referralValid === false && (
                  <Box sx={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#EF4444', fontSize: '0.8rem', fontWeight: 700 }}>Invalid</Box>
                )}
              </Box>
            </Box>

            <FileUploadButton label="Profile Picture (Optional)" file={files.profilePic} name="profilePic" onChange={handleFileChange} accept="image/*" />

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} style={{ marginTop: '12px' }}>
              <Button
                type="submit" fullWidth variant="contained" size="large"
                disabled={loading || (useWallet && walletLoading)}
                sx={{
                  py: 1.8, borderRadius: '14px', fontWeight: 700, fontSize: '1rem',
                  background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                  boxShadow: '0 6px 30px rgba(6,182,212,0.4)',
                  '&:hover': { boxShadow: '0 10px 40px rgba(6,182,212,0.6)', transform: 'translateY(-1px)' },
                  '&:disabled': { opacity: 0.5 },
                }}
              >
                {loading || walletLoading ? <CircularProgress size={22} sx={{ color: 'white' }} /> :
                  useWallet ? 'Register with MetaMask' : 'Create Account'}
              </Button>
            </motion.div>
          </Box>

          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(139,92,246,0.15)', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#334155' }}>
              Already have an account?{' '}
              <Box
                component={RouterLink}
                to="/login"
                sx={{
                  background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  fontWeight: 700, textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' },
                }}
              >
                Sign in ?
              </Box>
            </Typography>
          </Box>
        </Box>
      </motion.div>
    </Box>
  );
};

export default RegisterPage;
