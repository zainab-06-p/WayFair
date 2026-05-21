import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Chip,
  Avatar
} from '@mui/material';
import {
  DirectionsCar,
  LocalTaxi,
  TrendingUp,
  People,
  AttachMoney
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const DriverDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalRides: 0,
    activeRides: 0,
    totalEarnings: 0,
    totalPassengers: 0
  });
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  const userRole = user?.role || 'driver';

  useEffect(() => {
    const fetchMyRides = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setLoading(false);
          return;
        }

        // Fetch rides created by this driver
        const response = await api.get('/api/rides/my-rides', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const myRides = response.data || [];
        setRides(myRides);

        // Calculate stats
        const activeCount = myRides.filter(r => r.status === 'created' || r.status === 'started').length;
        const totalPassengerCount = myRides.reduce((sum, r) => sum + (r.passengers?.length || 0), 0);
        const earnings = myRides.reduce((sum, r) => {
          if (r.status === 'completed') {
            return sum + (r.pricePerSeat * (r.passengers?.length || 0));
          }
          return sum;
        }, 0);

        setStats({
          totalRides: myRides.length,
          activeRides: activeCount,
          totalPassengers: totalPassengerCount,
          totalEarnings: earnings
        });
      } catch (error) {
        console.error('Failed to fetch rides:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyRides();
  }, [user]);

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', pt: 11, pb: 8, position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs */}
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '10%', right: '5%', width: 450, height: 450, background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '15%', left: '5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 5, gap: 2.5 }}>
            <Box sx={{
              width: 70, height: 70, borderRadius: '20px', flexShrink: 0,
              background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 30px rgba(6,182,212,0.4)', fontSize: '2rem',
            }}>{`\u{1F697}`}</Box>
            <Box>
              <Typography variant="h4" sx={{
                fontWeight: 800, color: 'text.primary',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontSize: { xs: '1.6rem', md: '2rem' },
              }}>
                Driver Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: '#334155', mt: 0.25 }}>
                Welcome back, {user?.name || 'Driver'}! Here's your overview.
              </Typography>
            </Box>
          </Box>
        </motion.div>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {[
            { icon: '\u{1F697}', value: stats.totalRides, label: 'Total Rides', gradient: 'linear-gradient(135deg, #06B6D4, #0284C7)', delay: 0 },
            { icon: '\u26A1', value: stats.activeRides, label: 'Active Rides', gradient: 'linear-gradient(135deg, #34D399, #059669)', delay: 0.1 },
            { icon: '\u{1F465}', value: stats.totalPassengers, label: 'Passengers', gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', delay: 0.2 },
            { icon: '\u{1F4B0}', value: `\u20B9${stats.totalEarnings}`, label: 'Total Earnings', gradient: 'linear-gradient(135deg, #FBBF24, #D97706)', delay: 0.3 },
          ].map((stat, i) => (
            <Grid item xs={6} md={3} key={i}>
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: stat.delay }}>
                <Box sx={{
                  p: 3, borderRadius: '20px', textAlign: 'center',
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  transition: 'all 0.3s',
                  '&:hover': { border: '1px solid rgba(6,182,212,0.4)', boxShadow: '0 10px 40px rgba(6,182,212,0.1)', transform: 'translateY(-4px)' },
                }}>
                  <Box sx={{ fontSize: '1.8rem', mb: 1 }}>{stat.icon}</Box>
                  <Typography variant="h4" sx={{
                    fontWeight: 900, mb: 0.5,
                    background: stat.gradient,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    fontSize: { xs: '1.5rem', md: '1.8rem' },
                  }}>
                    {stat.value}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#334155', fontWeight: 500 }}>{stat.label}</Typography>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Quick Actions */}
        <Grid container spacing={3} sx={{ mb: 5 }}>
          {[
            { icon: '\u{1F697}', title: 'Create a Ride', desc: 'Offer a new ride and set your route, price, and available seats.', label: 'Create New Ride', path: '/driver/create-ride', gradient: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', delay: 0 },
            { icon: '\u{1F4CB}', title: 'My Rides', desc: 'View and manage all your created rides and upcoming bookings.', label: 'View All Rides', path: '/driver/my-rides', gradient: 'linear-gradient(135deg, #8B5CF6, #EC4899)', delay: 0.1 },
          ].map((item, i) => (
            <Grid item xs={12} md={6} key={i}>
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: item.delay }}
                whileHover={{ y: -6 }}
              >
                <Box sx={{
                  p: 4, borderRadius: '24px', height: '100%',
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  cursor: 'pointer', transition: 'all 0.3s',
                  '&:hover': { border: '1px solid rgba(6,182,212,0.4)', boxShadow: '0 20px 60px rgba(6,182,212,0.12)' },
                }}>
                  <Box sx={{
                    width: 60, height: 60, borderRadius: '16px', mb: 2,
                    background: item.gradient,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem', boxShadow: '0 8px 24px rgba(6,182,212,0.3)',
                  }}>{item.icon}</Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                    {item.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#334155', mb: 3, lineHeight: 1.7 }}>
                    {item.desc}
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => navigate(item.path)}
                    sx={{
                      py: 1.5, borderRadius: '12px', fontWeight: 700,
                      background: item.gradient,
                      boxShadow: '0 8px 24px rgba(6,182,212,0.3)',
                      '&:hover': { transform: 'scale(1.02)', boxShadow: '0 12px 32px rgba(6,182,212,0.4)' },
                    }}
                  >
                    {item.label}
                  </Button>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Box sx={{
            p: 4, borderRadius: '24px',
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 3, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
              Recent Rides
            </Typography>
            {rides.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 5 }}>
                <Box sx={{ fontSize: '3rem', mb: 1 }}>{`\u{1F697}`}</Box>
                <Typography sx={{ color: '#334155' }}>No rides yet. Create your first ride to get started!</Typography>
              </Box>
            ) : (
              <List disablePadding>
                {rides.slice(0, 5).map((ride, idx) => (
                  <ListItem
                    key={ride.rideID || ride.id}
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
                      background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                    }}>{`\u{1F697}`}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', mb: 0.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ride.startAddress || ride.startLocation?.address || 'Start'} {`\u2192`} {ride.endAddress || ride.endLocation?.address || 'End'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#334155' }}>
                        {ride.departureTime ? new Date(ride.departureTime).toLocaleString() : 'No time set'} {`\u00B7`} {ride.availableSeats ?? 0} seats {`\u00B7`} {`\u20B9`}{ride.pricePerSeat ?? 0}/seat
                      </Typography>
                    </Box>
                    <Chip
                      label={(ride.status || 'scheduled').toUpperCase()}
                      size="small"
                      sx={{
                        fontWeight: 700, fontSize: '0.65rem', ml: 1, flexShrink: 0,
                        background: ride.status === 'completed'
                          ? 'rgba(52,211,153,0.15)' : ['started', 'in-progress'].includes(ride.status)
                          ? 'rgba(251,191,36,0.15)' : 'rgba(100,116,139,0.2)',
                        color: ride.status === 'completed'
                          ? '#34D399' : ['started', 'in-progress'].includes(ride.status)
                          ? '#FBBF24' : '#475569',
                        border: '1px solid',
                        borderColor: ride.status === 'completed'
                          ? 'rgba(52,211,153,0.3)' : ['started', 'in-progress'].includes(ride.status)
                          ? 'rgba(251,191,36,0.3)' : 'rgba(100,116,139,0.3)',
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            )}
            {rides.length > 5 && (
              <Box sx={{ mt: 2.5, textAlign: 'center' }}>
                <Button
                  variant="outlined" onClick={() => navigate('/driver/my-rides')}
                  sx={{ borderRadius: '12px', borderColor: 'rgba(6,182,212,0.4)', color: '#06B6D4', '&:hover': { background: 'rgba(6,182,212,0.08)', borderColor: '#06B6D4' } }}
                >
                  View All Rides ?
                </Button>
              </Box>
            )}
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default DriverDashboard;
