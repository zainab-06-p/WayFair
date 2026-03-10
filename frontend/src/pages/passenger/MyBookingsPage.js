import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, Avatar, CircularProgress, Alert, Divider, IconButton, Tooltip
} from '@mui/material';
import {
  LocationOn, Schedule, EventSeat, AttachMoney, DirectionsCar, Chat,
  Cancel, Star, ArrowForward, Refresh
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import FeedbackDialog from '../../components/FeedbackDialog';
import SOSButton from '../../components/SOSButton';

const STATUS_COLORS = {
  pending:   'warning',
  confirmed: 'primary',
  cancelled: 'error',
  completed: 'success',
};

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const keyData = JSON.parse(localStorage.getItem('keyData') || '{}');

  const [bookings,  setBookings]  = useState([]);
  const [rides,     setRides]     = useState({});   // rideID -> ride object
  const [loading,   setLoading]   = useState(true);
  const [cancelling, setCancelling] = useState('');

  // Feedback dialog
  const [feedbackOpen,  setFeedbackOpen]  = useState(false);
  const [feedbackTarget, setFeedbackTarget] = useState(null);
  const [feedbackBooking, setFeedbackBooking] = useState(null);
  const [feedbackRide,    setFeedbackRide]    = useState(null);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/bookings/my/bookings');
      const rawBookings = Array.isArray(res.data) ? res.data : [];
      setBookings(rawBookings);

      // Fetch ride details for each unique rideID
      const uniqueRideIDs = [...new Set(rawBookings.map(b => b.rideID).filter(Boolean))];
      const rideMap = {};
      await Promise.all(uniqueRideIDs.map(async (rID) => {
        try {
          const rRes = await api.get(`/api/rides/${rID}`);
          rideMap[rID] = rRes.data?.ride || rRes.data;
        } catch (_) { rideMap[rID] = null; }
      }));
      setRides(rideMap);
    } catch (err) {
      console.error('Failed to load bookings', err);
      enqueueSnackbar('Failed to load bookings', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, []);

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

  const openFeedback = (booking, ride) => {
    setFeedbackBooking(booking);
    setFeedbackRide(ride);
    setFeedbackTarget({ userID: ride?.driverID || 'DRIVER', name: 'Driver', role: 'driver' });
    setFeedbackOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}><CircularProgress sx={{ color: '#06B6D4' }} /><Typography sx={{ color: '#64748B', mt: 2 }}>Loading bookings...</Typography></Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#030712', pt: 11, pb: 8, position: 'relative' }}>
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '8%', left: '5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '10%', right: '5%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>{`\u{1F4C5}`}</Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#F1F5F9', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>My Bookings</Typography>
                <Typography variant="body2" sx={{ color: '#64748B' }}>{bookings.length} booking{bookings.length !== 1 ? 's' : ''}</Typography>
              </Box>
            </Box>
            <Tooltip title="Refresh">
              <IconButton onClick={fetchBookings} sx={{ color: '#64748B', border: '1px solid rgba(139,92,246,0.2)', '&:hover': { color: '#06B6D4', background: 'rgba(6,182,212,0.08)' } }}>
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>

          {bookings.length === 0 ? (
            <Box sx={{ p: 6, textAlign: 'center', borderRadius: '24px', background: 'rgba(15,23,42,0.7)', border: '2px dashed rgba(139,92,246,0.2)' }}>
              <Box sx={{ fontSize: '3.5rem', mb: 2 }}>{`\u{1F697}`}</Box>
              <Typography variant="h5" sx={{ color: '#F1F5F9', fontWeight: 700, mb: 1 }}>No bookings yet</Typography>
              <Typography sx={{ color: '#64748B', mb: 3 }}>You haven't booked any rides yet.</Typography>
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

                return (
                <Grid item xs={12} key={booking.bookingID}>
                  <Box sx={{
                    borderRadius: '20px', overflow: 'hidden',
                    background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    opacity: booking.status === 'cancelled' ? 0.55 : 1,
                    transition: 'all 0.3s',
                    '&:hover': { border: '1px solid rgba(6,182,212,0.35)', boxShadow: '0 10px 30px rgba(6,182,212,0.08)' }
                  }}>
                    <Box sx={{ p: 3 }}>
                      <Grid container spacing={2} alignItems="center">
                        {/* Route */}
                        <Grid item xs={12} md={5}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#F1F5F9' }} noWrap>{startAddr}</Typography>
                          </Box>
                          <Box sx={{ pl: 0.5 }}><ArrowForward fontSize="small" sx={{ color: '#64748B' }} /></Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#F87171', flexShrink: 0 }} />
                            <Typography variant="body1" sx={{ fontWeight: 600, color: '#F1F5F9' }} noWrap>{endAddr}</Typography>
                          </Box>
                        </Grid>

                        {/* Meta */}
                        <Grid item xs={12} md={4}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Chip
                              label={(booking.status || 'pending').toUpperCase()}
                              size="small"
                              sx={{
                                fontWeight: 700, fontSize: '0.65rem',
                                background: booking.status === 'completed' ? 'rgba(52,211,153,0.15)' : booking.status === 'confirmed' ? 'rgba(6,182,212,0.15)' : booking.status === 'cancelled' ? 'rgba(239,68,68,0.15)' : 'rgba(251,191,36,0.15)',
                                color: booking.status === 'completed' ? '#34D399' : booking.status === 'confirmed' ? '#06B6D4' : booking.status === 'cancelled' ? '#F87171' : '#FBBF24',
                                border: '1px solid',
                                borderColor: booking.status === 'completed' ? 'rgba(52,211,153,0.3)' : booking.status === 'confirmed' ? 'rgba(6,182,212,0.3)' : booking.status === 'cancelled' ? 'rgba(239,68,68,0.3)' : 'rgba(251,191,36,0.3)',
                              }}
                            />
                            <Chip icon={<EventSeat sx={{ fontSize: '0.85rem !important' }} />} label={`${booking.seatsBooked || 1} seat(s)`} size="small"
                              sx={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.2)' }} />
                            {booking.totalPrice > 0 && (
                              <Chip icon={<AttachMoney sx={{ fontSize: '0.85rem !important' }} />} label={`\u20B9${booking.totalPrice}`} size="small"
                                sx={{ background: 'rgba(52,211,153,0.1)', color: '#34D399', border: '1px solid rgba(52,211,153,0.2)' }} />
                            )}
                            {ride?.departureTime && (
                              <Chip icon={<Schedule sx={{ fontSize: '0.85rem !important' }} />}
                                label={new Date(ride.departureTime).toLocaleString()}
                                size="small" sx={{ background: 'rgba(100,116,139,0.1)', color: '#94A3B8', border: '1px solid rgba(100,116,139,0.2)' }} />
                            )}
                          </Box>
                          <Typography variant="caption" sx={{ color: '#475569', mt: 1, display: 'block' }}>
                            Booking ID: {booking.bookingID?.slice(0, 16)}
                          </Typography>
                        </Grid>

                        {/* Driver info */}
                        <Grid item xs={12} md={3}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', width: 36, height: 36, fontSize: '1rem' }}>{`\u{1F464}`}</Avatar>
                            <Box>
                              <Typography variant="caption" sx={{ color: '#64748B' }}>Ride</Typography>
                              <Typography variant="body2" sx={{ color: '#F1F5F9' }} noWrap>
                                {ride?.rideType || booking.rideType || 'Standard'}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>

                    <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid rgba(139,92,246,0.1)', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button size="small" variant="outlined"
                        onClick={() => navigate(`/ride/${booking.rideID}`)}
                        sx={{ borderRadius: '10px', borderColor: 'rgba(6,182,212,0.4)', color: '#06B6D4', '&:hover': { background: 'rgba(6,182,212,0.08)' } }}>
                        View Ride
                      </Button>

                      {isActive && (
                        <>
                          <Button size="small" variant="text" startIcon={<Chat />}
                            onClick={() => navigate(`/chat/${booking.rideID}`)}
                            sx={{ borderRadius: '10px', color: '#94A3B8' }}>
                            Chat
                          </Button>
                          <Button size="small" startIcon={<Cancel />}
                            disabled={cancelling === booking.bookingID}
                            onClick={() => handleCancel(booking.bookingID)}
                            sx={{ borderRadius: '10px', color: '#F87171', '&:hover': { background: 'rgba(239,68,68,0.08)' } }}>
                            {cancelling === booking.bookingID ? <CircularProgress size={16} /> : 'Cancel'}
                          </Button>
                        </>
                      )}

                      {isDone && ride && (
                        <Button size="small" variant="contained" startIcon={<Star />}
                          onClick={() => openFeedback(booking, ride)}
                          sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #FBBF24, #D97706)', fontWeight: 700 }}>
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

      <FeedbackDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        booking={feedbackBooking}
        ride={feedbackRide}
        targetUser={feedbackTarget}
        onFeedbackSuccess={() => enqueueSnackbar('Thank you for your feedback!', { variant: 'success' })}
      />

      {/* Fixed SOS button when any booked ride is currently in-progress */}
      {(() => {
        const activeEntry = bookings.find(b => {
          const r = rides[b.rideID];
          return (r?.status === 'started' || r?.status === 'in-progress') &&
                 b.status !== 'cancelled';
        });
        return activeEntry
          ? <SOSButton rideID={activeEntry.rideID} bookingID={activeEntry.bookingID} />
          : null;
      })()}
    </Box>
  );
}

