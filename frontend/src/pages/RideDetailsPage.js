import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Grid, Chip, Button, CircularProgress,
  Avatar, Divider, Dialog, DialogTitle, DialogContent, DialogActions,
  RadioGroup, FormControlLabel, Radio, FormControl, FormLabel,
  TextField, InputAdornment, Alert, Rating, Tooltip
} from '@mui/material';
import {
  LocationOn, Schedule, EventSeat, AttachMoney, Person, ArrowBack,
  Chat, Star, DirectionsCar, Payment, Cancel
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { motion } from 'framer-motion';
import api from '../services/api';
import SOSButton from '../components/SOSButton';
import FeedbackDialog from '../components/FeedbackDialog';

const normalizeRide = (r) => ({
  ...r,
  startAddress: r.startLocation?.address || r.startAddress || 'N/A',
  endAddress:   r.endLocation?.address   || r.endAddress   || 'N/A',
  availableSeats: r.availableSeats ?? r.AvailableSeats ?? 0,
  pricePerSeat:   r.pricePerSeat   ?? r.PricePerSeat   ?? 0,
  status:    r.status    || r.Status    || 'created',
  rideType:  r.rideType  || r.RideType  || 'solo',
  driverID:  r.driverID  || r.DriverID  || '',
});

const STATUS_COLORS = { created:'info', scheduled:'info', started:'primary', completed:'success', cancelled:'error' };
const getStatusStyle = (status) => {
  const map = {
    completed: { bg: 'rgba(52,211,153,0.15)', color: '#34D399', border: 'rgba(52,211,153,0.3)' },
    started:   { bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: 'rgba(139,92,246,0.3)' },
    created:   { bg: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: 'rgba(56,189,248,0.3)' },
    scheduled: { bg: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: 'rgba(56,189,248,0.3)' },
    cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#F87171', border: 'rgba(239,68,68,0.3)' },
  };
  const s = map[(status||'').toLowerCase()] || { bg: 'rgba(100,116,139,0.15)', color: '#475569', border: 'rgba(100,116,139,0.3)' };
  return { background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 700 };
};

const RideDetailsPage = () => {
  const { rideID } = useParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const keyData   = JSON.parse(localStorage.getItem('keyData') || '{}');
  const userRole  = keyData.role || localStorage.getItem('userRole') || '';

  const [ride,          setRide]          = useState(null);
  const [booking,       setBooking]       = useState(null);
  const [driverRating,  setDriverRating]  = useState({ avg: 0, count: 0, reviews: [] });
  const [loading,       setLoading]       = useState(true);

  // Booking dialog
  const [bookDialog,  setBookDialog]  = useState(false);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [payMethod,   setPayMethod]   = useState('cash');
  const [upiId,       setUpiId]       = useState('');
  const [bookingInProg, setBookingInProg] = useState(false);

  // Feedback dialog
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => { fetchAll(); }, [rideID]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const rRes = await api.get(`/api/rides/${rideID}`);
      const r = normalizeRide(rRes.data?.ride || rRes.data);
      setRide(r);

      // Check existing booking
      try {
        const bRes = await api.get(`/api/bookings/ride/${rideID}`);
        setBooking(bRes.data?.booking || null);
      } catch (_) {}

      // Fetch driver ratings
      if (r.driverID) {
        try {
          const fRes = await api.get(`/api/feedback/user/${r.driverID}`);
          setDriverRating({
            avg:     fRes.data.averageRating || 0,
            count:   fRes.data.totalReviews || 0,
            reviews: fRes.data.feedback || [],
          });
        } catch (_) {}
      }
    } catch (error) {
      enqueueSnackbar('Failed to fetch ride details', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    setBookingInProg(true);
    try {
      const totalPrice = seatsToBook * ride.pricePerSeat;
      if (payMethod === 'upi' && upiId) {
        window.location.href = `upi://pay?pa=${upiId}&pn=RideShare&am=${totalPrice.toFixed(2)}&cu=INR`;
        await new Promise(r => setTimeout(r, 2000));
      }
      const res = await api.post('/api/bookings/create', {
        rideID,
        seatsBooked:       seatsToBook,
        passengerID:       keyData.userID,
        passengerPseudoID: keyData.pseudoID || keyData.userID,
        pickupAddress:     ride.startAddress,
        pickupLat:         String(ride.startLat || 0),
        pickupLng:         String(ride.startLng || 0),
        dropAddress:       ride.endAddress,
        dropLat:           String(ride.endLat || 0),
        dropLng:           String(ride.endLng || 0),
        paymentMethod:     payMethod,
        upiId:             payMethod === 'upi' ? upiId : undefined,
        totalPrice,
      });

      if (payMethod === 'ethereum') {
        // ETH payment via MetaMask
        try {
          const Web3 = (await import('web3')).default;
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const web3 = new Web3(window.ethereum);
          const accounts = await web3.eth.getAccounts();
          const ethAmt = web3.utils.toWei((totalPrice / 200000).toFixed(6), 'ether');
          // Ideally send to driver's wallet ? for now send to own address as demo
          await web3.eth.sendTransaction({ from: accounts[0], to: accounts[0], value: ethAmt, gas: 21000 });
        } catch (ethErr) {
          console.warn('ETH payment error:', ethErr.message);
        }
      }

      enqueueSnackbar(`Booked! ID: ${res.data.bookingID}`, { variant: 'success' });
      setBookDialog(false);
      fetchAll();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Booking failed', { variant: 'error' });
    } finally {
      setBookingInProg(false);
    }
  };

  if (loading) return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <CircularProgress sx={{ color: '#06B6D4' }} />
    </Box>
  );

  if (!ride) return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '16px', p: 4, textAlign: 'center' }}>
        <Typography variant="h5" sx={{ color: 'text.primary', mb: 2 }}>Ride not found</Typography>
        <Button variant="contained" onClick={() => navigate('/passenger/search')} sx={{ borderRadius: '12px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)' }}>
          Back to Search
        </Button>
      </Box>
    </Box>
  );

  const canBook   = userRole === 'passenger' && !booking && ['created','scheduled'].includes(ride.status) && ride.availableSeats > 0;
  const canRate   = booking && ride.status === 'completed';
  const isActive  = ['created','scheduled','started'].includes(ride.status);
  const xp        = driverRating.count * 10;

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', position: 'relative', overflow: 'hidden' }}>
      <Box sx={{ position: 'fixed', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'fixed', bottom: '15%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
    <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
      <Box sx={{ pt: 4, pb: 4 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)}
          sx={{ mb: 2, color: '#475569', '&:hover': { color: '#06B6D4' } }}>Back</Button>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', p: 4, mb: 3, position: 'relative', overflow: 'hidden' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #06B6D4, #8B5CF6, #EC4899)' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: '"Plus Jakarta Sans", sans-serif', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
               Ride Details
              </Typography>
              <Chip label={(ride.status || 'created').toUpperCase()} size="small" sx={getStatusStyle(ride.status)} />
            </Box>
            <Typography variant="body2" sx={{ color: '#334155', mt: 1, fontFamily: 'monospace' }}>ID: {rideID}</Typography>
          </Box>
        </motion.div>

        <Grid container spacing={3}>
          {/* Route */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', p: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                   Route
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#334155', textTransform: 'uppercase', letterSpacing: 1 }}>FROM</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#34D399', mt: 0.5 }}>{ride.startAddress}</Typography>
                </Box>
                <Box sx={{ width: 2, height: 20, background: 'rgba(139,92,246,0.4)', ml: 0.5, mb: 1 }} />
                <Box>
                  <Typography variant="caption" sx={{ color: '#334155', textTransform: 'uppercase', letterSpacing: 1 }}>TO</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#F87171', mt: 0.5 }}>{ride.endAddress}</Typography>
                </Box>
              </Box>
            </motion.div>
          </Grid>

          {/* Schedule */}
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Box sx={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', p: 3, height: '100%' }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                   Schedule & Pricing
                </Typography>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#334155' }}>Departure</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
                    {ride.departureTime ? new Date(ride.departureTime).toLocaleString() : 'TBD'}
                  </Typography>
                </Box>
                <Box sx={{ mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: '#334155' }}>Available Seats</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, color: '#8B5CF6' }}>{ride.availableSeats}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: '#334155' }}>Price / Seat</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#06B6D4', fontSize: '1.1rem' }}>
                    ?{ride.pricePerSeat}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          </Grid>

          {/* Driver + XP */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Person color="primary" /> Driver & Experience
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60 }}>
                  {ride.driverID?.charAt(0)?.toUpperCase() || 'D'}
                </Avatar>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="body1" fontWeight={500}>
                    Driver ID: {ride.driverID || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Ride Type: {ride.rideType === 'solo' ? '\u{1F697} Solo' : '\u{1F3CE}\uFE0F Carpooling'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Rating value={Number(driverRating.avg)} readOnly precision={0.5} size="small" />
                    <Typography variant="body2">
                      {driverRating.avg > 0 ? `${driverRating.avg}/5` : 'No ratings yet'}
                      {driverRating.count > 0 && ` (${driverRating.count} reviews)`}
                    </Typography>
                  </Box>
                  <Tooltip title="Experience Points = rides completed x 10">
                    <Typography variant="body2" color="primary.main" fontWeight={700} sx={{ mt: 0.5 }}>
                      {`\u26A1`} {xp} XP &nbsp;&middot;&nbsp; {driverRating.count} completed ride(s)
                    </Typography>
                  </Tooltip>
                </Box>
              </Box>

              {/* Recent reviews */}
              {driverRating.reviews.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Divider sx={{ mb: 1 }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Recent Reviews
                  </Typography>
                  {driverRating.reviews.slice(0, 3).map((rv, i) => (
                    <Box key={i} sx={{ mb: 1, p: 1.5, bgcolor: 'grey.50', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating value={Number(rv.rating)} readOnly size="small" />
                        <Typography variant="caption" color="text.secondary">
                          {rv.timestamp ? new Date(rv.timestamp).toLocaleDateString() : ''}
                        </Typography>
                      </Box>
                      {rv.review && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{rv.review}</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Booking status */}
          {booking && (
            <Grid item xs={12}>
              <Alert severity="success" sx={{ borderRadius: '12px', background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }}>
                {`\u2705`} You have an active booking for this ride (Booking ID: {booking.bookingID?.slice(0,16)})
              </Alert>
            </Grid>
          )}
        </Grid>

        {/* Action buttons */}
        <Box sx={{ mt: 3, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {canBook && (
            <Button variant="contained" size="large" startIcon={<Payment />} onClick={() => setBookDialog(true)}
              sx={{ borderRadius: '14px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700, boxShadow: '0 8px 24px rgba(6,182,212,0.35)' }}>
              Book This Ride
            </Button>
          )}
          {booking && isActive && (
            <Button variant="outlined" size="large" startIcon={<Chat />} onClick={() => navigate(`/chat/${rideID}`)}
              sx={{ borderRadius: '14px', borderColor: 'rgba(139,92,246,0.4)', color: '#8B5CF6', '&:hover': { background: 'rgba(139,92,246,0.08)' } }}>
              Chat with Driver
            </Button>
          )}
          {canRate && (
            <Button variant="contained" size="large" startIcon={<Star />} onClick={() => setFeedbackOpen(true)}
              sx={{ borderRadius: '14px', background: 'linear-gradient(135deg, #FBBF24, #D97706)', fontWeight: 700 }}>
              Rate Driver
            </Button>
          )}
        </Box>

        {/* SOS */}
        {booking && isActive && <SOSButton rideID={rideID} bookingID={booking.bookingID} />}
      </Box>
    </Container>

      {/* -- Booking Dialog ------------------------------------------- */}
      <Dialog open={bookDialog} onClose={() => setBookDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '16px' } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: '1.2rem' }}>{`\u{1F697}`}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>Confirm Booking</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', p: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#334155' }}>Route</Typography>
            <Typography sx={{ color: 'text.primary' }}>{ride.startAddress} {`\u2192`} {ride.endAddress}</Typography>
            <Typography variant="body2" sx={{ mt: 1, color: '#475569' }}>
              {ride.availableSeats} seats available {`\u00B7`} {`\u20B9`}{ride.pricePerSeat}/seat
            </Typography>
          </Box>
          <TextField fullWidth label="Seats" type="number" size="small"
            inputProps={{ min: 1, max: ride.availableSeats }}
            value={seatsToBook}
            onChange={e => setSeatsToBook(Math.min(ride.availableSeats, Math.max(1, parseInt(e.target.value)||1)))}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(139,92,246,0.3)' }, '&:hover fieldset': { borderColor: 'rgba(6,182,212,0.5)' } }, '& .MuiInputLabel-root': { color: '#334155' }, '& input': { color: 'text.primary' } }} />
          <Typography variant="h6" sx={{ color: '#06B6D4', fontWeight: 700, mb: 2 }}>
            Total: {`\u20B9`}{seatsToBook * ride.pricePerSeat}
          </Typography>
          <FormControl>
            <FormLabel sx={{ color: '#475569' }}>Payment</FormLabel>
            <RadioGroup row value={payMethod} onChange={e => setPayMethod(e.target.value)}>
              <FormControlLabel value="cash"     control={<Radio sx={{ color: '#334155', '&.Mui-checked': { color: '#06B6D4' } }} />} label={<Typography sx={{ color: '#475569' }}>Cash</Typography>} />
              <FormControlLabel value="upi"      control={<Radio sx={{ color: '#334155', '&.Mui-checked': { color: '#06B6D4' } }} />} label={<Typography sx={{ color: '#475569' }}>UPI</Typography>} />
              <FormControlLabel value="ethereum" control={<Radio sx={{ color: '#334155', '&.Mui-checked': { color: '#06B6D4' } }} />} label={<Typography sx={{ color: '#475569' }}>MetaMask ETH</Typography>} />
            </RadioGroup>
          </FormControl>
          {payMethod === 'upi' && (
            <TextField fullWidth label="Driver's UPI ID" size="small" sx={{ mt: 2, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(139,92,246,0.3)' } }, '& .MuiInputLabel-root': { color: '#334155' }, '& input': { color: 'text.primary' } }}
              value={upiId} onChange={e => setUpiId(e.target.value)}
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <Button size="small" sx={{ color: '#06B6D4' }} onClick={() => {
                    if (!upiId) return;
                    window.location.href = `upi://pay?pa=${upiId}&pn=RideShare&am=${(seatsToBook*ride.pricePerSeat).toFixed(2)}&cu=INR`;
                  }} disabled={!upiId}>Pay</Button>
                </InputAdornment>
              )}} />
          )}
          {payMethod === 'ethereum' && (
            <Alert severity="info" sx={{ mt: 2, background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)' }}>
              MetaMask will prompt for ?{(seatsToBook*ride.pricePerSeat/200000).toFixed(6)} ETH.
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
          <Button onClick={() => setBookDialog(false)} disabled={bookingInProg} sx={{ color: '#475569' }}>Cancel</Button>
          <Button variant="contained" onClick={handleBook} disabled={bookingInProg || (payMethod==='upi' && !upiId)}
            sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700 }}>
            {bookingInProg ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Dialog */}
      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        booking={booking}
        ride={ride}
        targetUser={{ userID: ride?.driverID, name: 'Driver', role: 'driver' }}
        onFeedbackSuccess={() => { enqueueSnackbar('Feedback submitted!', { variant: 'success' }); fetchAll(); }}
      />
    </Box>
  );
};

export default RideDetailsPage;

