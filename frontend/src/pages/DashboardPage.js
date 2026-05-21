import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Typography, Grid } from '@mui/material';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const ActionCard = ({ icon, title, description, buttonLabel, onClick, gradient, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    whileHover={{ y: -6 }}
    style={{ height: '100%' }}
  >
    <Box
      onClick={onClick}
      sx={{
        height: '100%', p: 3.5, borderRadius: '20px', cursor: 'pointer',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139,92,246,0.2)',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        '&:hover': {
          border: '1px solid rgba(6,182,212,0.5)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 0 40px rgba(6,182,212,0.1)',
        },
        '&::before': {
          content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: gradient, opacity: 0, transition: 'opacity 0.3s',
        },
        '&:hover::before': { opacity: 1 },
      }}
    >
      <Box sx={{
        width: 56, height: 56, borderRadius: '14px', mb: 2.5,
        background: gradient.replace('linear-gradient', 'linear-gradient').replace(')', ', 0.15)').replace('135deg,', '135deg,').split(',').map((s, i) => i === 0 ? s : s.replace(')', '/0.15)')).join(','),
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem',
        border: '1px solid rgba(255,255,255,0.1)',
      }}>
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1, fontSize: '1rem', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.7, flex: 1, fontSize: '0.88rem' }}>
        {description}
      </Typography>
      <Button
        variant="outlined"
        size="small"
        sx={{
          mt: 2.5, borderRadius: '50px', fontWeight: 600, fontSize: '0.82rem',
          borderColor: 'rgba(6,182,212,0.3)', color: '#06B6D4', alignSelf: 'flex-start',
          px: 2.5,
          '&:hover': { borderColor: '#06B6D4', background: 'rgba(6,182,212,0.1)' },
        }}
      >
        {buttonLabel} ?
      </Button>
    </Box>
  </motion.div>
);

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const keyData = JSON.parse(localStorage.getItem('keyData') || '{}');
  const role = keyData.role || localStorage.getItem('userRole') || 'passenger';
  const displayName = user?.name || keyData?.name || 'Rider';

  const driverCards = [
    { icon: '\u{1F697}', title: 'Create a Ride', description: 'Offer a ride to passengers. Set your route, price per seat, and departure time.', buttonLabel: 'Create Ride', onClick: () => navigate('/driver/create-ride'), gradient: 'linear-gradient(135deg, #06B6D4, #0284C7)', delay: 0 },
    { icon: '\u{1F4CB}', title: 'My Rides', description: 'View and manage your created rides, incoming bookings, and ride history.', buttonLabel: 'View Rides', onClick: () => navigate('/driver/my-rides'), gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', delay: 0.1 },
    { icon: '\u{1F464}', title: 'Profile', description: 'View and update your profile. Manage your driver documents stored on IPFS.', buttonLabel: 'View Profile', onClick: () => navigate('/profile'), gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', delay: 0.2 },
    { icon: '\u{1F381}', title: 'Referrals & Rewards', description: 'Share your referral code, earn XP, and unlock driver sponsorship levels.', buttonLabel: 'View Referrals', onClick: () => navigate('/referral'), gradient: 'linear-gradient(135deg, #FBBF24, #D97706)', delay: 0.3 },
  ];

  const passengerCards = [
    { icon: '\u{1F50D}', title: 'Search Rides', description: 'Find available rides matching your route, schedule, and budget in real time.', buttonLabel: 'Search Now', onClick: () => navigate('/passenger/search'), gradient: 'linear-gradient(135deg, #06B6D4, #0284C7)', delay: 0 },
    { icon: '\u{1F4C3}', title: 'My Bookings', description: 'View your upcoming trips, booking history, and manage active reservations.', buttonLabel: 'View Bookings', onClick: () => navigate('/passenger/bookings'), gradient: 'linear-gradient(135deg, #34D399, #059669)', delay: 0.1 },
    { icon: '\u{1F464}', title: 'Profile', description: 'View and update your profile, account info, and documents stored on IPFS.', buttonLabel: 'View Profile', onClick: () => navigate('/profile'), gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', delay: 0.2 },
    { icon: '\u{1F381}', title: 'Referrals & Rewards', description: 'Share your referral code, earn XP, and get discount benefits.', buttonLabel: 'View Referrals', onClick: () => navigate('/referral'), gradient: 'linear-gradient(135deg, #FBBF24, #D97706)', delay: 0.3 },
  ];

  const cards = role === 'driver' ? driverCards : passengerCards;

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', pt: 12, pb: 8, position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '10%', right: '5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '20%', left: '5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Box sx={{ mb: 6 }}>
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 1,
              px: 2, py: 0.75, mb: 3, borderRadius: '50px',
              background: role === 'driver' ? 'rgba(6,182,212,0.1)' : 'rgba(52,211,153,0.1)',
              border: `1px solid ${role === 'driver' ? 'rgba(6,182,212,0.3)' : 'rgba(52,211,153,0.3)'}`,
            }}>
              <Typography variant="caption" sx={{ color: role === 'driver' ? '#06B6D4' : '#34D399', fontWeight: 700, letterSpacing: '0.08em' }}>
                {role === 'driver' ? '\u{1F697} DRIVER ACCOUNT' : '\u{1F9CD} PASSENGER ACCOUNT'}
              </Typography>
            </Box>
            <Typography variant="h3" sx={{
              fontWeight: 800, color: 'text.primary', mb: 1,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              fontSize: { xs: '1.8rem', md: '2.5rem' },
            }}>
              Welcome back,{' '}
              <Box component="span" sx={{
                background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{displayName}</Box> {'\u{1F44B}'}
            </Typography>
            <Typography variant="body1" sx={{ color: '#334155', fontWeight: 400 }}>
              {role === 'driver'
                ? 'Manage your rides and grow your earnings on WayFair.'
                : 'Find your next ride or manage your upcoming trips.'}
            </Typography>
          </Box>
        </motion.div>

        {/* Action Cards */}
        <Grid container spacing={3}>
          {cards.map((card, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <ActionCard {...card} />
            </Grid>
          ))}
        </Grid>

        {/* Quick links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <Box sx={{
            mt: 5, p: 3, borderRadius: '20px',
            background: 'rgba(255,255,255,0.82)',
            border: '1px solid rgba(139,92,246,0.15)',
            backdropFilter: 'blur(20px)',
            display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center',
          }}>
            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600, mr: 1 }}>Quick access:</Typography>
            {[
              { label: '\u{26D3}\uFE0F Blockchain Explorer', path: '/explorer' },
              { label: '\u{1F381} Referral Program', path: '/referral' },
              { label: '\u{1F464} My Profile', path: '/profile' },
            ].map((link) => (
              <Button
                key={link.path}
                size="small"
                onClick={() => navigate(link.path)}
                sx={{
                  borderRadius: '50px', fontWeight: 600, fontSize: '0.8rem',
                  color: '#475569', px: 2, py: 0.7,
                  border: '1px solid rgba(139,92,246,0.2)',
                  '&:hover': { color: '#06B6D4', border: '1px solid rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.08)' },
                }}
              >
                {link.label}
              </Button>
            ))}
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default DashboardPage;
