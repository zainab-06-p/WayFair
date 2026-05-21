import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Grid,
  Button,
  List,
  ListItem,
  Chip,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const PassengerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalBookings: 0,
    upcomingRides: 0,
    completedRides: 0,
    totalSpent: 0
  });
  const [upcomingBookings, setUpcomingBookings] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [bookingsRes, statsRes] = await Promise.allSettled([
          api.get('/api/bookings/my/bookings'),
          api.get('/api/users/stats')
        ]);

        let totalBookings = 0, upcomingRides = 0, completedRides = 0, totalSpent = 0;

        if (bookingsRes.status === 'fulfilled') {
          const bookings = Array.isArray(bookingsRes.value.data) ? bookingsRes.value.data : [];
          totalBookings = bookings.length;
          completedRides = bookings.filter(b => b.status === 'completed').length;
          upcomingRides  = bookings.filter(b => !['cancelled', 'completed'].includes(b.status)).length;
          totalSpent     = bookings.reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);
          setUpcomingBookings(bookings.filter(b => !['cancelled', 'completed'].includes(b.status)));
        }

        if (statsRes.status === 'fulfilled') {
          const s = statsRes.value.data;
          // Use server stats if available, else fallback to computed above
          totalBookings  = s.totalBookings  ?? totalBookings;
          completedRides = s.completedBookings ?? completedRides;
        }

        setStats({ totalBookings, upcomingRides, completedRides, totalSpent });
      } catch (_) { /* keep zeros on error */ }
    };
    fetchStats();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', pt: 11, pb: 8, position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '10%', left: '5%', width: 450, height: 450, background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '15%', right: '5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 5, gap: 2.5 }}>
            <Box sx={{
              width: 70, height: 70, borderRadius: '20px', flexShrink: 0,
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(139,92,246,0.4)', fontSize: '2rem',
            }}>{`\u{1F9CD}`}</Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: { xs: '1.6rem', md: '2rem' } }}>
                Passenger Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: '#334155', mt: 0.25 }}>
                Welcome back, {user?.name || 'Passenger'}! Ready to ride?
              </Typography>
            </Box>
          </Box>
        </motion.div>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {[
            { icon: '\u{1F4C3}', value: stats.totalBookings, label: 'Total Bookings', gradient: 'linear-gradient(135deg, #06B6D4, #0284C7)', delay: 0 },
            { icon: '\u{1F697}', value: stats.upcomingRides, label: 'Upcoming Rides', gradient: 'linear-gradient(135deg, #34D399, #059669)', delay: 0.1 },
            { icon: '\u2705', value: stats.completedRides, label: 'Completed Rides', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', delay: 0.2 },
            { icon: '\u{1F4B0}', value: `\u20B9${stats.totalSpent.toFixed(0)}`, label: 'Total Spent', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', delay: 0.3 },
          ].map((stat, i) => (
            <Grid item xs={6} md={3} key={i}>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: stat.delay }}>
                <Box sx={{
                  p: 3, borderRadius: '20px', textAlign: 'center',
                  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  transition: 'all 0.3s',
                  '&:hover': { border: '1px solid rgba(139,92,246,0.5)', boxShadow: '0 10px 40px rgba(139,92,246,0.1)', transform: 'translateY(-4px)' },
                }}>
                  <Box sx={{ fontSize: '1.8rem', mb: 1 }}>{stat.icon}</Box>
                  <Typography variant="h4" sx={{
                    fontWeight: 900, mb: 0.5,
                    background: stat.gradient,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    fontSize: { xs: '1.5rem', md: '1.8rem' },
                  }}>{stat.value}</Typography>
                  <Typography variant="caption" sx={{ color: '#334155', fontWeight: 500 }}>{stat.label}</Typography>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Quick Actions */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {[
            { icon: '\u{1F50D}', title: 'Search Rides', desc: 'Find available rides matching your route and schedule. Book instantly!', label: 'Search for Rides', path: '/passenger/search', gradient: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', delay: 0 },
            { icon: '\u{1F4C3}', title: 'My Bookings', desc: 'View your booking history, upcoming rides, and past trips.', label: 'View Bookings', path: '/passenger/bookings', gradient: 'linear-gradient(135deg, #8B5CF6, #EC4899)', delay: 0.1 },
          ].map((item, i) => (
            <Grid item xs={12} md={6} key={i}>
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: item.delay }}
                whileHover={{ y: -6 }}
              >
                <Box sx={{
                  p: 4, borderRadius: '24px', height: '100%',
                  background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139,92,246,0.2)', cursor: 'pointer', transition: 'all 0.3s',
                  '&:hover': { border: '1px solid rgba(139,92,246,0.5)', boxShadow: '0 20px 60px rgba(139,92,246,0.12)' },
                }}>
                  <Box sx={{
                    width: 60, height: 60, borderRadius: '16px', mb: 2,
                    background: item.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem', boxShadow: '0 8px 24px rgba(139,92,246,0.3)',
                  }}>{item.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#334155', mb: 3, lineHeight: 1.7 }}>{item.desc}</Typography>
                  <Button
                    variant="contained" fullWidth onClick={() => navigate(item.path)}
                    sx={{
                      py: 1.5, borderRadius: '12px', fontWeight: 700, background: item.gradient,
                      boxShadow: '0 8px 24px rgba(139,92,246,0.3)',
                      '&:hover': { transform: 'scale(1.02)', boxShadow: '0 12px 32px rgba(139,92,246,0.4)' },
                    }}
                  >
                    {item.label}
                  </Button>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Upcoming Rides */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Box sx={{
            p: 4, borderRadius: '24px',
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 3, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              Upcoming Rides
            </Typography>
            {upcomingBookings.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Box sx={{ fontSize: '3rem', mb: 1 }}>{`\u{1F697}`}</Box>
                <Typography sx={{ color: '#334155' }}>No upcoming rides. Search for rides to book your next trip!</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {upcomingBookings.map((booking, idx) => (
                  <ListItem
                    key={booking.bookingID}
                    sx={{
                      mb: 1.5, p: 2, borderRadius: '14px',
                      background: 'rgba(30,41,59,0.6)',
                      border: '1px solid rgba(139,92,246,0.1)',
                      alignItems: 'center',
                      '&:last-child': { mb: 0 },
                    }}
                  >
                    <Box sx={{
                      width: 40, height: 40, borderRadius: '12px', mr: 2, flexShrink: 0,
                      background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                    }}>{`\u{1F697}`}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {booking.pickupAddress || 'Pickup'} {`\u2192`} {booking.dropAddress || 'Drop'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#334155' }}>
                        Booking: {(booking.bookingID || '').substring(0, 16)}{`\u2026`} {`\u00B7`} {booking.seatsBooked ?? 1} seats {`\u00B7`} {`\u20B9`}{booking.totalPrice ?? 0}
                      </Typography>
                    </Box>
                    <Chip
                      label={(booking.status || 'confirmed').toUpperCase()}
                      size="small"
                      sx={{
                        fontWeight: 700, fontSize: '0.65rem', ml: 1, flexShrink: 0,
                        background: booking.status === 'confirmed' ? 'rgba(52,211,153,0.15)' : booking.status === 'pending' ? 'rgba(251,191,36,0.15)' : 'rgba(100,116,139,0.2)',
                        color: booking.status === 'confirmed' ? '#34D399' : booking.status === 'pending' ? '#FBBF24' : '#475569',
                        border: '1px solid',
                        borderColor: booking.status === 'confirmed' ? 'rgba(52,211,153,0.3)' : booking.status === 'pending' ? 'rgba(251,191,36,0.3)' : 'rgba(100,116,139,0.3)',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            {upcomingBookings.length > 0 && (
              <Box sx={{ mt: 2.5, textAlign: 'center' }}>
                <Button
                  variant="outlined" onClick={() => navigate('/passenger/bookings')}
                  sx={{ borderRadius: '12px', borderColor: 'rgba(139,92,246,0.4)', color: '#8B5CF6', '&:hover': { background: 'rgba(139,92,246,0.08)', borderColor: '#8B5CF6' } }}
                >
                  View All Bookings ?
                </Button>
              </Box>
            )}
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default PassengerDashboard;
