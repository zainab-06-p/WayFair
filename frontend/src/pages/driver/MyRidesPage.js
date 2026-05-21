import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Alert, Card, CardContent,
  CardActions, Chip, Button, Grid, CircularProgress, Divider,
  List, ListItem, ListItemText, ListItemAvatar, Avatar, Collapse
} from '@mui/material';
import {
  DirectionsCar, LocationOn, AccessTime, EventSeat, AttachMoney, Add,
  PlayArrow, Stop, Cancel, Person, ExpandMore, ExpandLess, Chat, GpsFixed, Lock
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import OTPVerifyDialog from '../../components/OTPVerifyDialog';

const statusColor = (s) => ({ scheduled:'primary', created:'primary', 'in-progress':'warning', started:'warning', completed:'success', cancelled:'error' }[s] || 'default');
const statusStyle = (s) => {
  const map = {
    scheduled: { bg: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: 'rgba(6,182,212,0.3)' },
    created: { bg: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: 'rgba(6,182,212,0.3)' },
    'in-progress': { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: 'rgba(251,191,36,0.3)' },
    started: { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: 'rgba(251,191,36,0.3)' },
    completed: { bg: 'rgba(52,211,153,0.15)', color: '#34D399', border: 'rgba(52,211,153,0.3)' },
    cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#F87171', border: 'rgba(239,68,68,0.3)' },
  };
  return map[s] || { bg: 'rgba(100,116,139,0.15)', color: '#475569', border: 'rgba(100,116,139,0.3)' };
};

const cleanAddr = (v) => (!v || v === 'undefined' || v === 'null' ? null : v);
const normalizeRide = (ride) => ({
  ...ride,
  startAddress: cleanAddr(ride.startLocation?.address) || cleanAddr(ride.startAddress) || 'Address not available',
  endAddress: cleanAddr(ride.endLocation?.address) || cleanAddr(ride.endAddress) || 'Address not available',
  startLat: ride.startLocation?.latitude ?? ride.startLat,
  startLng: ride.startLocation?.longitude ?? ride.startLng,
  endLat: ride.endLocation?.latitude ?? ride.endLat,
  endLng: ride.endLocation?.longitude ?? ride.endLng,
  availableSeats: ride.availableSeats ?? ride.AvailableSeats ?? 0,
  pricePerSeat: ride.pricePerSeat ?? ride.PricePerSeat ?? 0,
  status: ride.status || ride.Status || 'scheduled',
  rideType: ride.rideType || ride.RideType || 'solo',
  bookings: ride.bookings || ride.Passengers || [],
});

const MyRidesPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rideBookings, setRideBookings] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [expandedRide, setExpandedRide] = useState(null);

  // OTP dialog state
  const [otpDialog, setOtpDialog] = useState({ open: false, rideID: null, bookingID: null });

  // Passenger profiles: passengerID → { name, profilePic }
  const [passengerProfiles, setPassengerProfiles] = useState({});


  const getToken = () => localStorage.getItem('token');
  const getDriverID = () => {
    try { return JSON.parse(localStorage.getItem('user') || '{}').userID; } catch { return null; }
  };

  const fetchMyRides = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await api.get('/api/rides/my-rides', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const raw = Array.isArray(response.data) ? response.data : [];
      const normalized = raw.map(normalizeRide);
      setRides(normalized);

      // Fetch passenger bookings for each ride
      const bookingsMap = {};
      await Promise.all(normalized.map(async (ride) => {
        try {
          const br = await api.get(`/api/bookings/ride/${ride.rideID}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          bookingsMap[ride.rideID] = br.data?.bookings || br.data || [];
        } catch (_) {
          bookingsMap[ride.rideID] = [];
        }
      }));
      setRideBookings(bookingsMap);

      // Fetch passenger public profiles
      const allPassengerIDs = [...new Set(
        Object.values(bookingsMap).flat().map(b => b.passengerID).filter(Boolean)
      )];
      const profileMap = {};
      await Promise.all(allPassengerIDs.map(async (pID) => {
        try {
          const pRes = await api.get(`/api/users/${pID}/public`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          profileMap[pID] = pRes.data;
        } catch (_) { profileMap[pID] = null; }
      }));
      setPassengerProfiles(profileMap);

    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load your rides');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMyRides(); }, [fetchMyRides]);

  const handleRideAction = async (rideID, action) => {
    setActionLoading(prev => ({ ...prev, [rideID]: action }));
    try {
      const token = getToken();
      const driverID = getDriverID();
      await api.post(`/api/rides/${action}`, { rideID, driverID }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const msgs = { end: 'Ride ended! 🏁', cancel: 'Ride cancelled.' };
      enqueueSnackbar(msgs[action] || `Ride ${action}ed`, { variant: 'success' });
      fetchMyRides();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || `Failed to ${action} ride`, { variant: 'error' });
    } finally {
      setActionLoading(prev => ({ ...prev, [rideID]: null }));
    }
  };

  // Opens OTP dialog — driver must pick which booking's OTP to verify
  const handleStartRide = (rideID) => {
    const bookings = rideBookings[rideID] || [];
    // Use first active booking for OTP
    const activeBooking = bookings.find(b => !['cancelled'].includes(b.status)) || bookings[0];
    if (!activeBooking) {
      enqueueSnackbar('No active passenger booking found for this ride.', { variant: 'warning' });
      return;
    }
    setOtpDialog({ open: true, rideID, bookingID: activeBooking.bookingID });
  };

  const handleOtpVerified = () => {
    setOtpDialog({ open: false, rideID: null, bookingID: null });
    fetchMyRides();
  };


  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ color: '#06B6D4' }} />
          <Typography sx={{ color: '#334155', mt: 2 }}>Loading your rides...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', pt: 11, pb: 8, position: 'relative' }}>
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '10%', right: '5%', width: 450, height: 450, background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '15%', left: '5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 4 }}>
          {/* Header */}
          <Box sx={{
            p: 3, mb: 4,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)',
            borderRadius: '24px', border: '1px solid rgba(139,92,246,0.3)',
            position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2
          }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #06B6D4, #8B5CF6, #EC4899)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', boxShadow: '0 0 20px rgba(6,182,212,0.4)' }}>{`\u{1F697}`}</Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>My Rides</Typography>
                <Typography variant="body2" sx={{ color: '#334155' }}>{rides.length} ride{rides.length !== 1 ? 's' : ''} created</Typography>
              </Box>
            </Box>
            <Button
              variant="contained" startIcon={<Add />} onClick={() => navigate('/driver/create-ride')}
              sx={{ borderRadius: '14px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700, px: 3, boxShadow: '0 8px 24px rgba(6,182,212,0.35)', '&:hover': { transform: 'scale(1.02)' } }}
            >
              Create New Ride
            </Button>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3, borderRadius: '14px' }}>{error}</Alert>}

          {rides.length === 0 ? (
            <Box sx={{
              p: 6, textAlign: 'center', borderRadius: '24px',
              background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
              border: '2px dashed rgba(139,92,246,0.25)',
            }}>
              <Box sx={{ fontSize: '4rem', mb: 2 }}>{`\u{1F697}`}</Box>
              <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700, mb: 1, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>No rides yet</Typography>
              <Typography sx={{ color: '#334155', mb: 3 }}>Create your first ride to start offering transportation!</Typography>
              <Button variant="contained" size="large" startIcon={<Add />} onClick={() => navigate('/driver/create-ride')}
                sx={{ borderRadius: '14px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700, px: 4, boxShadow: '0 8px 24px rgba(6,182,212,0.35)' }}>
                Create First Ride
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {rides.map((ride) => (
                <Grid item xs={12} md={6} key={ride.rideID}>
                  <Card elevation={0} sx={{
                    borderRadius: '20px',
                    background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    transition: 'all 0.3s',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 20px 60px rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.4)' }
                  }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Chip label={ride.status || 'scheduled'} size="small" sx={{
                        textTransform: 'capitalize', fontWeight: 700, fontSize: '0.7rem',
                        background: statusStyle(ride.status).bg,
                        color: statusStyle(ride.status).color,
                        border: `1px solid ${statusStyle(ride.status).border}`,
                      }} />
                      <Chip label={ride.rideType === 'carpool' ? `\u{1F3CE}\uFE0F Carpool` : `\u{1F697} Solo`} variant="outlined" size="small"
                        sx={{ borderColor: 'rgba(139,92,246,0.3)', color: '#475569' }} />
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ mb: 1.5, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LocationOn color="primary" sx={{ mt: 0.3, flexShrink: 0 }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">FROM</Typography>
                        <Typography variant="body2" fontWeight={600}>{ride.startAddress}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                      <LocationOn color="secondary" sx={{ mt: 0.3, flexShrink: 0 }} />
                      <Box>
                        <Typography variant="caption" color="text.secondary">TO</Typography>
                        <Typography variant="body2" fontWeight={600}>{ride.endAddress}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTime fontSize="small" sx={{ color: '#94A3B8' }} />
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          {ride.departureTime ? new Date(ride.departureTime).toLocaleString() : 'N/A'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EventSeat fontSize="small" sx={{ color: '#94A3B8' }} />
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          {ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AttachMoney fontSize="small" sx={{ color: '#059669' }} />
                        <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600 }}>
                          ₹{ride.pricePerSeat}/seat
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                  {/* Passenger bookings list */}
                  {(() => {
                    const bookings = rideBookings[ride.rideID] || [];
                    if (bookings.length === 0) return null;
                    const isExpanded = expandedRide === ride.rideID;
                    return (
                      <Box sx={{ px: 2, pb: 1 }}>
                        <Divider sx={{ mb: 1 }} />
                        <Button
                          size="small"
                          startIcon={<Person />}
                          endIcon={isExpanded ? <ExpandLess /> : <ExpandMore />}
                          onClick={() => setExpandedRide(isExpanded ? null : ride.rideID)}
                          color="info"
                          variant="text"
                        >
                          {bookings.length} Passenger{bookings.length !== 1 ? 's' : ''}
                        </Button>
                        <Collapse in={isExpanded}>
                          <List dense disablePadding sx={{ mt: 1 }}>
                            {bookings.map((b, idx) => {
                              const pID = b.passengerID;
                              const pp = pID ? passengerProfiles[pID] : null;
                              const passengerName = pp?.name || b.passengerName || 'Passenger';
                              const passengerPic = pp?.profilePic
                                ? `https://gateway.pinata.cloud/ipfs/${pp.profilePic}`
                                : null;
                              return (
                              <ListItem key={b.bookingID || idx} disableGutters sx={{ py: 0.5 }}>
                                <ListItemAvatar sx={{ minWidth: 44 }}>
                                  <Avatar
                                    src={passengerPic}
                                    sx={{ width: 34, height: 34, fontSize: 13,
                                      bgcolor: 'primary.main',
                                      border: '2px solid rgba(139,92,246,0.3)'
                                    }}
                                  >
                                    {!passengerPic && (passengerName?.[0]?.toUpperCase() || 'P')}
                                  </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                  primary={passengerName}
                                  secondary={`${b.seatsBooked || 1} seat${(b.seatsBooked || 1) !== 1 ? 's' : ''} · ${b.status || 'confirmed'}`}
                                  primaryTypographyProps={{ variant: 'body2', fontWeight: 600, sx: { color: '#0F172A' } }}
                                  secondaryTypographyProps={{ variant: 'caption', sx: { color: '#475569' } }}
                                />
                              </ListItem>
                              );
                            })}

                          </List>
                        </Collapse>
                      </Box>
                    );
                  })()}
                  <CardActions sx={{ px: 2, pb: 2, pt: 0, flexWrap: 'wrap', gap: 0.5 }}>
                    <Button size="small" variant="outlined" onClick={() => navigate(`/ride/${ride.rideID}`)}>
                      Details
                    </Button>
                    {/* Start button — requires OTP verification */}
                    {(['scheduled', 'created'].includes(ride.status)) && (
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<Lock />}
                        onClick={() => handleStartRide(ride.rideID)}
                        sx={{
                          background: 'linear-gradient(135deg, #34D399, #059669)',
                          fontWeight: 700,
                          boxShadow: '0 4px 12px rgba(52,211,153,0.4)',
                          '&:hover': { transform: 'scale(1.03)' }
                        }}
                      >
                        🔐 Start via OTP
                      </Button>
                    )}
                    {/* Chat button ? shown when ride is in progress */}
                    {(['in-progress', 'started'].includes(ride.status)) && (
                      <Button
                        size="small"
                        variant="text"
                        color="info"
                        startIcon={<Chat />}
                        onClick={() => navigate(`/chat/${ride.rideID}`)}
                      >
                        Chat
                      </Button>
                    )}
                    {/* Navigate / Live Share button */}
                    {(['in-progress', 'started'].includes(ride.status)) && (
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<GpsFixed />}
                        onClick={() => navigate(/live/)}
                        sx={{ background: 'linear-gradient(135deg, #059669, #0891B2)', fontWeight: 700 }}
                      >
                        Navigate
                      </Button>
                    )}
                    {/* End button - shown when ride is in progress */}
                    {(['in-progress', 'started'].includes(ride.status)) && (
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        startIcon={<Stop />}
                        disabled={actionLoading[ride.rideID] === 'end'}
                        onClick={() => handleRideAction(ride.rideID, 'end')}
                      >
                        {actionLoading[ride.rideID] === 'end' ? 'Ending...' : 'End Ride'}
                      </Button>
                    )}
                    {/* Cancel button ? shown when not already done */}
                    {!(['completed', 'cancelled'].includes(ride.status)) && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<Cancel />}
                        disabled={actionLoading[ride.rideID] === 'cancel'}
                        onClick={() => handleRideAction(ride.rideID, 'cancel')}
                      >
                        {actionLoading[ride.rideID] === 'cancel' ? 'Cancelling...' : 'Cancel'}
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        </Box>
      </Container>

      {/* OTP Verify Dialog */}
      <OTPVerifyDialog
        open={otpDialog.open}
        onClose={() => setOtpDialog({ open: false, rideID: null, bookingID: null })}
        rideID={otpDialog.rideID}
        bookingID={otpDialog.bookingID}
        onVerified={handleOtpVerified}
      />
    </Box>
  );
};

export default MyRidesPage;
