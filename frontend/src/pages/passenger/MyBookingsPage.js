import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Button, Chip, Avatar, CircularProgress,
  Divider, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Paper, Alert
} from '@mui/material';
import {
  LocationOn, Schedule, EventSeat, AttachMoney, Chat, Cancel, Star,
  ArrowForward, Refresh, GpsFixed, Payment, CheckCircle, AccountBalance, CurrencyBitcoin
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import FeedbackDialog from '../../components/FeedbackDialog';
import SOSButton from '../../components/SOSButton';
import { useSocket } from '../../context/SocketContext';
import { getActiveUser } from '../../utils/authUtils';

const INR_TO_ETH_RATE = 200000;

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const activeUser = getActiveUser(); // works for both stored-keys and MetaMask users
  const token = localStorage.getItem('token');
  const { socket } = useSocket();

  const [bookings,   setBookings]   = useState([]);
  const [rides,      setRides]      = useState({});
  const [loading,    setLoading]    = useState(true);
  const [cancelling, setCancelling] = useState('');

  // Pay dialog
  const [payDialog,      setPayDialog]      = useState(false);
  const [payBooking,     setPayBooking]     = useState(null);
  const [payRide,        setPayRide]        = useState(null);
  const [payMethod,      setPayMethod]      = useState('cash');
  const [payLoading,     setPayLoading]     = useState(false);
  const [paidBookings,   setPaidBookings]   = useState({});
  const [driverWallet,   setDriverWallet]   = useState('');
  const [walletFetching, setWalletFetching] = useState(false);

  // Feedback dialog
  const [feedbackOpen,    setFeedbackOpen]    = useState(false);
  const [feedbackTarget,  setFeedbackTarget]  = useState(null);
  const [feedbackBooking, setFeedbackBooking] = useState(null);
  const [feedbackRide,    setFeedbackRide]    = useState(null);

  // OTP display
  const [otps, setOtps] = useState({}); // bookingID → otp string
  const [otpLoading, setOtpLoading] = useState({});

  // Driver profiles: driverID → { name, profilePic, vehicleInfo, licensePlate }
  const [driverProfiles, setDriverProfiles] = useState({});


  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/bookings/my/bookings');
      const rawBookings = Array.isArray(res.data) ? res.data : [];
      setBookings(rawBookings);
      const uniqueRideIDs = [...new Set(rawBookings.map(b => b.rideID).filter(Boolean))];
      const rideMap = {};
      await Promise.all(uniqueRideIDs.map(async (rID) => {
        try {
          const rRes = await api.get(`/api/rides/${rID}`);
          rideMap[rID] = rRes.data?.ride || rRes.data;
        } catch (_) { rideMap[rID] = null; }
      }));
      setRides(rideMap);

      // Fetch driver public profiles for all rides
      const driverIDs = [...new Set(Object.values(rideMap).map(r => r?.driverID).filter(Boolean))];
      const profileMap = {};
      await Promise.all(driverIDs.map(async (dID) => {
        try {
          const pRes = await api.get(`/api/users/${dID}/public`);
          profileMap[dID] = pRes.data;
        } catch (_) { profileMap[dID] = null; }
      }));
      setDriverProfiles(profileMap);
    } catch (err) {
      enqueueSnackbar('Failed to load bookings', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };


  // Refresh only ride statuses (lightweight, no booking re-fetch)
  const refreshRideStatuses = useCallback(async (currentBookings) => {
    const bks = currentBookings || bookings;
    const uniqueRideIDs = [...new Set(bks.map(b => b.rideID).filter(Boolean))];
    if (uniqueRideIDs.length === 0) return;
    const rideMap = {};
    await Promise.all(uniqueRideIDs.map(async (rID) => {
      try {
        const rRes = await api.get(`/api/rides/${rID}`);
        rideMap[rID] = rRes.data?.ride || rRes.data;
      } catch (_) {}
    }));
    setRides(prev => ({ ...prev, ...rideMap }));
  }, [bookings]);

  useEffect(() => { fetchBookings(); }, []);

  // Auto-fetch OTPs for confirmed bookings when bookings load
  useEffect(() => {
    if (!bookings.length) return;
    bookings.forEach(async (b) => {
      if (['booked', 'confirmed', 'pending'].includes(b.status) && !otps[b.bookingID]) {
        try {
          const res = await api.get(`/api/bookings/otp/${b.bookingID}`);
          if (res.data?.otp) {
            setOtps(prev => ({ ...prev, [b.bookingID]: res.data.otp }));
          } else if (res.data?.used) {
            setOtps(prev => ({ ...prev, [b.bookingID]: 'USED' }));
          }
        } catch (_) { /* no OTP yet — normal for old bookings */ }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings]);


  // Poll every 15 seconds to catch ride_started status
  useEffect(() => {
    const interval = setInterval(() => {
      if (bookings.length > 0) refreshRideStatuses();
    }, 15000);
    return () => clearInterval(interval);
  }, [bookings, refreshRideStatuses]);

  // Listen for socket event ride_started — immediately refresh
  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      enqueueSnackbar('🚀 Your ride has started! You can now pay the driver.', { variant: 'info', autoHideDuration: 5000 });
      refreshRideStatuses();
    };
    socket.on('ride_started', handler);
    socket.on('ride_completed', refreshRideStatuses);
    return () => {
      socket.off('ride_started', handler);
      socket.off('ride_completed', refreshRideStatuses);
    };
  }, [socket, refreshRideStatuses, enqueueSnackbar]);

  const handleCancel = async (bookingID) => {
    setCancelling(bookingID);
    try {
      await api.post('/api/bookings/cancel', { bookingID });
      enqueueSnackbar('Booking cancelled', { variant: 'success' });
      setBookings(prev => prev.map(b => b.bookingID === bookingID ? { ...b, status: 'cancelled' } : b));
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Cancel failed', { variant: 'error' });
    } finally {
      setCancelling('');
    }
  };

  const openPayDialog = async (booking, ride) => {
    setPayBooking(booking);
    setPayRide(ride);
    setPayMethod('cash');
    setDriverWallet(''); // reset
    setPayDialog(true);

    // Auto-fetch driver's wallet address from their profile
    const driverID = ride?.driverID;
    if (driverID) {
      setWalletFetching(true);
      try {
        // MetaMask-registered drivers: their driverID IS their wallet address
        if (driverID.startsWith('0x')) {
          setDriverWallet(driverID);
        } else {
          const wRes = await api.get(`/api/users/${driverID}/wallet`);
          if (wRes.data?.walletAddress) {
            setDriverWallet(wRes.data.walletAddress);
          }
        }
      } catch (err) {
        console.warn('Could not fetch driver wallet:', err.message);
      } finally {
        setWalletFetching(false);
      }
    }
  };

  const handlePayCash = async () => {
    setPayLoading(true);
    try {
      // Try blockchain record; if Fabric is down, still mark paid locally
      try {
        await api.post('/api/payments/direct-pay', {
          bookingID: payBooking.bookingID,
          rideID:    payBooking.rideID,
          amount:    payBooking.totalPrice || 0,
          method:    'cash',
        });
      } catch (apiErr) {
        // If backend error but not 4xx auth error, still proceed (non-critical for cash)
        if (apiErr.response?.status >= 400 && apiErr.response?.status < 500) throw apiErr;
        console.warn('Cash record API error (non-critical):', apiErr.message);
      }
      enqueueSnackbar('✓ Cash payment recorded! Hand ₹' + (payBooking.totalPrice || 0) + ' to the driver.', { variant: 'success' });
      setPaidBookings(prev => ({ ...prev, [payBooking.bookingID]: 'cash' }));
      setPayDialog(false);
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || err.message || 'Failed to record payment', { variant: 'error' });
    } finally {
      setPayLoading(false);
    }
  };

  const handlePayUPI = async () => {
    setPayLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Failed to load Razorpay. Check your connection.');

      const orderRes = await api.post('/api/payments/create-order', {
        bookingID: payBooking.bookingID,
        rideID:    payBooking.rideID,
        amount:    payBooking.totalPrice || 0,
      });
      const { orderID, amount, currency, keyID, simulated } = orderRes.data;

      if (simulated) {
        // Simulated — auto-verify
        await api.post('/api/payments/verify-razorpay', {
          bookingID:          payBooking.bookingID,
          razorpay_order_id:  orderID,
          razorpay_payment_id: 'SIMULATED_' + Date.now(),
          razorpay_signature: 'SIMULATED',
        });
        enqueueSnackbar('UPI payment simulated successfully! ✓', { variant: 'success' });
        setPaidBookings(prev => ({ ...prev, [payBooking.bookingID]: 'upi' }));
        setPayDialog(false);
        setPayLoading(false);
        return;
      }

      // Get user info for prefill
      let prefillName = '', prefillEmail = '', prefillContact = '';
      try {
        const userStr = localStorage.getItem('user');
        const u = userStr ? JSON.parse(userStr) : {};
        prefillName = u.name || '';
        prefillEmail = u.email || '';
      } catch (_) {}

      await new Promise((resolve, reject) => {
        const options = {
          key: keyID,
          amount,
          currency,
          name: 'WayFair',
          description: `Ride Payment — ${payBooking.rideID?.slice(0, 12)}`,
          order_id: orderID,
          prefill: {
            name:    prefillName,
            email:   prefillEmail,
            contact: prefillContact,
          },
          notes: {
            bookingID: payBooking.bookingID,
            rideID:    payBooking.rideID,
            app: 'WayFair',
          },
          theme: { color: '#06B6D4' },
          handler: async (response) => {
            try {
              await api.post('/api/payments/verify-razorpay', {
                bookingID:           payBooking.bookingID,
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              });
              enqueueSnackbar(`₹${payBooking.totalPrice} paid via UPI! ✓`, { variant: 'success' });
              setPaidBookings(prev => ({ ...prev, [payBooking.bookingID]: 'upi' }));
              setPayDialog(false);
              resolve();
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', (resp) => reject(new Error(resp.error?.description || 'Payment failed')));
        rzp.open();
      });
    } catch (err) {
      enqueueSnackbar(err.message || 'UPI payment failed', { variant: 'error' });
    } finally {
      setPayLoading(false);
    }
  };

  const handlePayETH = async () => {
    setPayLoading(true);
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed. Install MetaMask browser extension and try again.');
      }

      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const fromAddress = accounts?.[0];
      if (!fromAddress) throw new Error('No MetaMask account found. Please unlock MetaMask.');

      // Get driver wallet — use auto-fetched value first, then fallback chain
      let resolvedWallet = driverWallet
        || payRide?.driverWallet
        || payRide?.walletAddress
        || payRide?.ethAddress
        || '';

      // If driverID itself is a wallet address (MetaMask login)
      if (!resolvedWallet && payRide?.driverID?.startsWith('0x')) {
        resolvedWallet = payRide.driverID;
      }

      if (!resolvedWallet) {
        // Last resort: prompt
        resolvedWallet = window.prompt(
          'Could not auto-detect driver wallet.\nAsk your driver for their Ethereum wallet address:'
        );
        if (!resolvedWallet || !resolvedWallet.startsWith('0x')) {
          throw new Error('Invalid wallet address. Please use Cash or UPI instead.');
        }
      }

      const amount = payBooking.totalPrice || 0;
      const ethAmount = (amount / INR_TO_ETH_RATE).toFixed(8);
      const ethInWei = Math.floor(parseFloat(ethAmount) * 1e18);

      if (ethInWei <= 0) {
        throw new Error('Amount too small for ETH transfer. Use Cash or UPI instead.');
      }

      const weiHex = '0x' + ethInWei.toString(16);

      enqueueSnackbar(`Sending ${ethAmount} ETH to driver... Please confirm in MetaMask.`, { variant: 'info' });

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from:  fromAddress,
          to:    resolvedWallet,
          value: weiHex,
          gas:   '0x5208',
        }],
      });

      if (!txHash) throw new Error('Transaction rejected or failed in MetaMask.');

      // Record on backend (best-effort)
      try {
        await api.post('/api/payments/record-eth-payment', {
          bookingID:    payBooking.bookingID,
          rideID:       payBooking.rideID,
          txHash,
          ethAmount,
          inrAmount:    amount,
          driverWallet: resolvedWallet,
        });
      } catch (recErr) {
        console.warn('ETH record error (non-critical):', recErr.message);
      }

      enqueueSnackbar(`✓ ${ethAmount} ETH sent! Tx: ${txHash.slice(0, 14)}...`, { variant: 'success' });
      setPaidBookings(prev => ({ ...prev, [payBooking.bookingID]: 'eth' }));
      setPayDialog(false);
    } catch (err) {
      // User-friendly MetaMask error messages
      const msg = err.message || 'ETH payment failed';
      if (msg.includes('User rejected') || msg.includes('user rejected') || err.code === 4001) {
        enqueueSnackbar('MetaMask transaction cancelled by user.', { variant: 'warning' });
      } else {
        enqueueSnackbar(msg, { variant: 'error' });
      }
    } finally {
      setPayLoading(false);
    }
  };

  const handlePay = () => {
    if (payMethod === 'cash')     handlePayCash();
    else if (payMethod === 'upi') handlePayUPI();
    else                          handlePayETH();
  };

  const openFeedback = (booking, ride) => {
    setFeedbackBooking(booking);
    setFeedbackRide(ride);
    setFeedbackTarget({ userID: ride?.driverID || 'DRIVER', name: 'Driver', role: 'driver' });
    setFeedbackOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#06B6D4' }} />
          <Typography sx={{ color: '#475569', mt: 2 }}>Loading bookings...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', pt: 11, pb: 8, position: 'relative' }}>
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '8%', left: '5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '10%', right: '5%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>📅</Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>My Bookings</Typography>
                <Typography variant="body2" sx={{ color: '#475569' }}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</Typography>
              </Box>
            </Box>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchBookings} sx={{ color: '#475569', border: '1px solid rgba(139,92,246,0.2)', '&:hover': { color: '#06B6D4', background: 'rgba(6,182,212,0.08)' } }}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>

          {bookings.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', borderRadius: '24px', background: '#fff', border: '2px dashed rgba(139,92,246,0.2)' }}>
              <Box sx={{ fontSize: '3.5rem', mb: 2 }}>🚗</Box>
              <Typography variant="h5" sx={{ color: '#0F172A', fontWeight: 700, mb: 1 }}>No bookings yet</Typography>
              <Typography sx={{ color: '#475569', mb: 3 }}>You haven't booked any rides yet.</Typography>
              <Button variant="contained" onClick={() => navigate('/passenger/search')}
                sx={{ borderRadius: '14px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', fontWeight: 700, px: 3 }}>
                Search for Rides
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {bookings.map(booking => {
                const ride = rides[booking.rideID];
                const startAddr = ride?.startLocation?.address || ride?.startAddress || booking.pickupAddress || 'N/A';
                const endAddr   = ride?.endLocation?.address   || ride?.endAddress   || booking.dropAddress   || 'N/A';
                const isActive  = !['cancelled', 'completed'].includes(booking.status);
                const isDone    = booking.status === 'completed';
                // Check ride active — covers all possible status strings the chaincode may return
                const rideActive = ['started', 'in-progress', 'active', 'inprogress', 'in_progress'].includes(
                  (ride?.status || '').toLowerCase()
                );
                const alreadyPaid = !!paidBookings[booking.bookingID];
                // Compute effective price — fallback to ride.pricePerSeat × seatsBooked when totalPrice not stored
                const effectiveAmount = booking.totalPrice > 0
                  ? booking.totalPrice
                  : (ride?.pricePerSeat || 0) * (booking.seatsBooked || 1);

                return (
                  <Grid item xs={12} key={booking.bookingID}>
                    <Box sx={{
                      borderRadius: '20px', overflow: 'hidden',
                      background: '#fff', border: '1px solid rgba(139,92,246,0.15)',
                      opacity: booking.status === 'cancelled' ? 0.55 : 1,
                      transition: 'all 0.3s',
                      '&:hover': { border: '1px solid rgba(6,182,212,0.3)', boxShadow: '0 10px 30px rgba(6,182,212,0.08)' }
                    }}>
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }} noWrap>{startAddr}</Typography>
                            </Box>
                            <Box sx={{ pl: 0.5 }}><ArrowForward fontSize="small" sx={{ color: '#475569' }} /></Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                              <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }} noWrap>{endAddr}</Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              <Chip
                                label={(booking.status || 'pending').toUpperCase()} size="small"
                                sx={{
                                  fontWeight: 700, fontSize: '0.65rem',
                                  background: booking.status === 'completed' ? 'rgba(16,185,129,0.12)' : booking.status === 'confirmed' ? 'rgba(6,182,212,0.12)' : booking.status === 'cancelled' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                  color: booking.status === 'completed' ? '#059669' : booking.status === 'confirmed' ? '#0891B2' : booking.status === 'cancelled' ? '#DC2626' : '#D97706',
                                  border: '1px solid',
                                  borderColor: booking.status === 'completed' ? 'rgba(16,185,129,0.25)' : booking.status === 'confirmed' ? 'rgba(6,182,212,0.25)' : booking.status === 'cancelled' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)',
                                }}
                              />
                              <Chip icon={<EventSeat sx={{ fontSize: '0.85rem !important' }} />} label={`${booking.seatsBooked || 1} seat(s)`} size="small"
                                sx={{ background: 'rgba(6,182,212,0.08)', color: '#0891B2', border: '1px solid rgba(6,182,212,0.2)' }} />
                              {effectiveAmount > 0 && (
                                <Chip icon={<AttachMoney sx={{ fontSize: '0.85rem !important' }} />} label={`₹${effectiveAmount}`} size="small"
                                  sx={{ background: 'rgba(16,185,129,0.08)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }} />
                              )}
                              {ride?.departureTime && (
                                <Chip icon={<Schedule sx={{ fontSize: '0.85rem !important' }} />}
                                  label={new Date(ride.departureTime).toLocaleString()} size="small"
                                  sx={{ background: 'rgba(100,116,139,0.08)', color: '#475569', border: '1px solid rgba(100,116,139,0.2)' }} />
                              )}
                              {rideActive && (
                                <Chip label="🚀 Ride Active" size="small"
                                  sx={{ background: 'rgba(245,158,11,0.12)', color: '#D97706', border: '1px solid rgba(245,158,11,0.25)', fontWeight: 700 }} />
                              )}
                              {alreadyPaid && (
                                <Chip icon={<CheckCircle sx={{ fontSize: '0.85rem !important' }} />} label="Paid" size="small"
                                  sx={{ background: 'rgba(16,185,129,0.12)', color: '#059669', border: '1px solid rgba(16,185,129,0.25)', fontWeight: 700 }} />
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: '#94A3B8', mt: 1, display: 'block' }}>
                              ID: {booking.bookingID?.slice(0, 16)}
                            </Typography>
                          </Grid>

                          <Grid item xs={12} md={3}>
                            {/* Driver Profile Card */}
                            {(() => {
                              const driverID = ride?.driverID;
                              const dp = driverID ? driverProfiles[driverID] : null;
                              const driverName = dp?.name || ride?.driverName || 'Driver';
                              const driverPic = dp?.profilePic
                                ? `https://gateway.pinata.cloud/ipfs/${dp.profilePic}`
                                : null;
                              const vehicle = dp?.vehicleInfo || dp?.vehicleModel || null;
                              const plate = dp?.licensePlate || null;
                              return (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar
                                    src={driverPic}
                                    sx={{
                                      width: 48, height: 48,
                                      background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                                      fontSize: '1.2rem', fontWeight: 700,
                                      border: '2px solid rgba(6,182,212,0.3)',
                                    }}
                                  >
                                    {!driverPic && (driverName.charAt(0).toUpperCase() || '🚗')}
                                  </Avatar>
                                  <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="caption" sx={{ color: '#475569', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: 0.5 }}>Driver</Typography>
                                    <Typography variant="body2" sx={{ color: '#0F172A', fontWeight: 700 }} noWrap>{driverName}</Typography>
                                    {vehicle && (
                                      <Typography variant="caption" sx={{ color: '#64748B' }} noWrap>🚙 {vehicle}</Typography>
                                    )}
                                    {plate && (
                                      <Box sx={{ display: 'inline-flex', alignItems: 'center', mt: 0.3, px: 1, py: 0.2, background: '#0F172A', borderRadius: '6px', border: '1px solid #475569' }}>
                                        <Typography sx={{ fontFamily: 'monospace', fontSize: '0.72rem', fontWeight: 900, color: '#FACC15', letterSpacing: 1 }}>{plate}</Typography>
                                      </Box>
                                    )}
                                  </Box>
                                </Box>
                              );
                            })()}
                          </Grid>

                          {/* OTP Display — shown to passenger when booking is active */}
                          {isActive && otps[booking.bookingID] && otps[booking.bookingID] !== 'USED' && (
                            <Grid item xs={12}>
                              <Box sx={{
                                mt: 1, p: 2, borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(139,92,246,0.08))',
                                border: '2px solid rgba(6,182,212,0.3)',
                                display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap',
                              }}>
                                <Box sx={{ fontSize: '1.5rem' }}>🔐</Box>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="caption" sx={{ color: '#06B6D4', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Your Ride OTP</Typography>
                                  <Typography sx={{ fontFamily: 'monospace', fontSize: '2rem', fontWeight: 900, color: '#0F172A', letterSpacing: '8px', lineHeight: 1.2 }}>
                                    {otps[booking.bookingID]}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#475569' }}>Share this OTP with your driver to start the ride</Typography>
                                </Box>
                              </Box>
                            </Grid>
                          )}
                          {isActive && otps[booking.bookingID] === 'USED' && (
                            <Grid item xs={12}>
                              <Chip
                                icon={<CheckCircle sx={{ fontSize: '0.9rem !important', color: '#059669 !important' }} />}
                                label="OTP verified — Ride is active!"
                                sx={{ background: 'rgba(5,150,105,0.1)', color: '#059669', border: '1px solid rgba(5,150,105,0.3)', fontWeight: 700, width: '100%' }}
                              />
                            </Grid>
                          )}
                        </Grid>
                      </Box>

                      <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid rgba(139,92,246,0.08)', display: 'flex', gap: 1, flexWrap: 'wrap', background: 'rgba(248,250,252,0.7)' }}>
                        <Button size="small" variant="outlined" onClick={() => navigate(`/ride/${booking.rideID}`)}
                          sx={{ borderRadius: '10px', borderColor: 'rgba(6,182,212,0.35)', color: '#0891B2' }}>
                          View Ride
                        </Button>

                        {/* PAY NOW — shown when ride is active and not yet paid */}
                        {isActive && rideActive && !alreadyPaid && (
                          <Button size="small" variant="contained" startIcon={<Payment />}
                            onClick={() => openPayDialog({ ...booking, totalPrice: effectiveAmount }, ride)}
                            sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #06B6D4)', fontWeight: 700, boxShadow: '0 4px 12px rgba(16,185,129,0.3)', animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }, '50%': { boxShadow: '0 4px 24px rgba(16,185,129,0.6)' } } }}>
                            💳 Pay Now{effectiveAmount > 0 ? ` ₹${effectiveAmount}` : ''}
                          </Button>
                        )}

                        {isActive && (
                          <>
                            <Button size="small" variant="text" startIcon={<Chat />}
                              onClick={() => navigate(`/chat/${booking.rideID}`)}
                              sx={{ borderRadius: '10px', color: '#475569' }}>
                              Chat
                            </Button>
                            <Button size="small" variant="contained" startIcon={<GpsFixed />}
                              onClick={() => navigate(`/live/${booking.rideID}`)}
                              sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #0891B2, #059669)', fontWeight: 700 }}>
                              Track Live
                            </Button>
                            <Button size="small" startIcon={<Cancel />}
                              disabled={cancelling === booking.bookingID}
                              onClick={() => handleCancel(booking.bookingID)}
                              sx={{ borderRadius: '10px', color: '#DC2626', '&:hover': { background: 'rgba(239,68,68,0.08)' } }}>
                              {cancelling === booking.bookingID ? <CircularProgress size={16} /> : 'Cancel'}
                            </Button>
                          </>
                        )}

                        {isDone && ride && (
                          <Button size="small" variant="contained" startIcon={<Star />}
                            onClick={() => openFeedback(booking, ride)}
                            sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #F59E0B, #D97706)', fontWeight: 700 }}>
                            Rate Driver
                          </Button>
                        )}
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      </Container>

      {/* Pay Now Dialog */}
      <Dialog open={payDialog} onClose={() => !payLoading && setPayDialog(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: '20px', border: '1px solid rgba(139,92,246,0.2)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Payment sx={{ color: '#06B6D4' }} />
            <Typography variant="h6" fontWeight={700} color="#0F172A">Pay Driver</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {payBooking && (
            <>
              <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, background: 'rgba(248,250,252,0.8)' }}>
                <Typography variant="caption" sx={{ color: '#475569', textTransform: 'uppercase', fontWeight: 600 }}>Amount Due</Typography>
                <Typography variant="h4" sx={{ color: '#0891B2', fontWeight: 800, mt: 0.5 }}>₹{payBooking.totalPrice}</Typography>
                <Typography variant="caption" sx={{ color: '#475569' }}>Pay directly to your driver</Typography>
              </Paper>

              <FormControl component="fieldset" sx={{ mb: 2 }}>
                <FormLabel component="legend" sx={{ color: '#0F172A', fontWeight: 600, mb: 1 }}>Payment Method</FormLabel>
                <RadioGroup value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                  <FormControlLabel value="cash" control={<Radio />}
                    label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><span>💵</span><Typography sx={{ color: '#0F172A' }}>Cash (hand to driver)</Typography></Box>} />
                  <FormControlLabel value="upi" control={<Radio />}
                    label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AccountBalance fontSize="small" sx={{ color: '#0891B2' }} /><Typography sx={{ color: '#0F172A' }}>UPI via Razorpay</Typography></Box>} />
                  <FormControlLabel value="eth" control={<Radio />}
                    label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CurrencyBitcoin fontSize="small" sx={{ color: '#F59E0B' }} /><Typography sx={{ color: '#0F172A' }}>MetaMask ETH (direct)</Typography></Box>} />
                </RadioGroup>
              </FormControl>

              {payMethod === 'cash' && (
                <Alert severity="info" sx={{ borderRadius: 2, mb: 1 }}>Hand ₹{payBooking.totalPrice} cash to the driver and click confirm.</Alert>
              )}
              {payMethod === 'upi' && (
                <Alert severity="info" sx={{ borderRadius: 2, mb: 1 }}>
                  Razorpay UPI checkout will open. Pay ₹{payBooking.totalPrice} directly.
                  <br />
                  <strong>🧪 Test mode:</strong> Use card <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 4px', borderRadius: 4 }}>4111 1111 1111 1111</code>, any future date, CVV <code style={{ background: 'rgba(0,0,0,0.07)', padding: '1px 4px', borderRadius: 4 }}>123</code>
                </Alert>
              )}
              {payMethod === 'eth' && (
                <Box sx={{ mb: 1 }}>
                  {walletFetching ? (
                    <Alert severity="info" sx={{ borderRadius: 2 }} icon={<CircularProgress size={16} />}>
                      Looking up driver's ETH wallet...
                    </Alert>
                  ) : driverWallet ? (
                    <Alert severity="success" sx={{ borderRadius: 2 }}>
                      <strong>Driver wallet found ✓</strong><br />
                      <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                        {driverWallet.slice(0, 10)}...{driverWallet.slice(-8)}
                      </span><br />
                      MetaMask will open. ETH goes directly to driver.
                    </Alert>
                  ) : (
                    <Alert severity="warning" sx={{ borderRadius: 2 }}>
                      Driver wallet not found. You'll be prompted to enter it manually, or use Cash/UPI instead.
                    </Alert>
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(139,92,246,0.08)', p: 2, gap: 1 }}>
          <Button onClick={() => setPayDialog(false)} disabled={payLoading} sx={{ color: '#475569' }}>Cancel</Button>
          <Button variant="contained" onClick={handlePay} disabled={payLoading || walletFetching}
            sx={{ borderRadius: '12px', background: 'linear-gradient(135deg, #10B981, #06B6D4)', fontWeight: 700, px: 3 }}>
            {payLoading ? <CircularProgress size={20} color="inherit" /> : `Confirm ${payMethod === 'cash' ? 'Cash' : payMethod === 'upi' ? 'UPI' : 'ETH'} Payment`}
          </Button>
        </DialogActions>
      </Dialog>

      <FeedbackDialog
        open={feedbackOpen} onClose={() => setFeedbackOpen(false)}
        booking={feedbackBooking} ride={feedbackRide} targetUser={feedbackTarget}
        onFeedbackSuccess={() => enqueueSnackbar('Thank you for your feedback!', { variant: 'success' })}
      />

      {(() => {
        const activeEntry = bookings.find(b => {
          const r = rides[b.rideID];
          return (r?.status === 'started' || r?.status === 'in-progress') && b.status !== 'cancelled';
        });
        return activeEntry ? <SOSButton rideID={activeEntry.rideID} bookingID={activeEntry.bookingID} /> : null;
      })()}
    </Box>
  );
}
