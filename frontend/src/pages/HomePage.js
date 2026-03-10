import React, { useState, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Button, Container, Typography, Grid } from '@mui/material';
import { motion, useScroll, useTransform } from 'framer-motion';

// --- Floating Orb Background -------------------------------------------
const FloatingOrbs = () => (
  <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
    <Box sx={{
      position: 'absolute', top: '10%', left: '5%', width: 500, height: 500,
      background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
      borderRadius: '50%', filter: 'blur(40px)',
      animation: 'float1 8s ease-in-out infinite',
    }} />
    <Box sx={{
      position: 'absolute', top: '40%', right: '5%', width: 600, height: 600,
      background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
      borderRadius: '50%', filter: 'blur(40px)',
      animation: 'float2 10s ease-in-out infinite',
    }} />
    <Box sx={{
      position: 'absolute', bottom: '10%', left: '30%', width: 400, height: 400,
      background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
      borderRadius: '50%', filter: 'blur(40px)',
      animation: 'float1 12s ease-in-out infinite reverse',
    }} />
    <style>{`
      @keyframes float1 { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-40px) scale(1.05); } }
      @keyframes float2 { 0%,100% { transform: translateY(0) scale(1.05); } 50% { transform: translateY(40px) scale(1); } }
      @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
    `}</style>
  </Box>
);

// --- Gradient Text ------------------------------------------------------
const GradientText = ({ children, gradient = 'linear-gradient(135deg, #06B6D4, #8B5CF6)', sx = {} }) => (
  <Box component="span" sx={{
    background: gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    ...sx,
  }}>
    {children}
  </Box>
);

// --- Feature Card -------------------------------------------------------
const FeatureCard = ({ icon, title, description, delay = 0, color = '#06B6D4' }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
    whileHover={{ y: -8 }}
    style={{ height: '100%' }}
  >
    <Box sx={{
      height: '100%',
      p: 3.5,
      borderRadius: '20px',
      background: 'rgba(15,23,42,0.7)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(139,92,246,0.2)',
      transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
      cursor: 'default',
      position: 'relative',
      overflow: 'hidden',
      '&:hover': {
        border: `1px solid ${color}60`,
        boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 0 40px ${color}20`,
      },
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '2px',
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: 0,
        transition: 'opacity 0.4s',
      },
      '&:hover::before': { opacity: 1 },
    }}>
      <Box sx={{
        width: 56, height: 56, borderRadius: '14px', mb: 2.5,
        background: `linear-gradient(135deg, ${color}30, ${color}10)`,
        border: `1px solid ${color}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.6rem',
        boxShadow: `0 4px 20px ${color}20`,
      }}>
        {icon}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, color: '#F1F5F9', fontSize: '1.05rem' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: '#94A3B8', lineHeight: 1.7, fontSize: '0.9rem' }}>
        {description}
      </Typography>
    </Box>
  </motion.div>
);

// --- Stat Card ----------------------------------------------------------
const StatCard = ({ value, label, suffix = '', gradient, delay = 0 }) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const end = parseFloat(value);
    const step = end / (2000 / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(parseFloat(start.toFixed(1)));
    }, 16);
    return () => clearInterval(timer);
  }, [value, started]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      viewport={{ once: true }}
      onViewportEnter={() => setStarted(true)}
      whileHover={{ scale: 1.05 }}
    >
      <Box sx={{
        textAlign: 'center', p: 3,
        borderRadius: '20px',
        background: 'rgba(15,23,42,0.6)',
        border: '1px solid rgba(139,92,246,0.15)',
        backdropFilter: 'blur(20px)',
        transition: 'all 0.3s',
        '&:hover': { border: '1px solid rgba(6,182,212,0.3)', boxShadow: '0 10px 40px rgba(6,182,212,0.1)' },
      }}>
        <Typography variant="h3" sx={{
          fontWeight: 900,
          background: gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          fontSize: { xs: '2.2rem', md: '2.8rem' },
          fontFamily: '"Plus Jakarta Sans", sans-serif',
        }}>
          {started ? count : 0}{suffix}
        </Typography>
        <Typography variant="body1" sx={{ color: '#94A3B8', fontWeight: 500, mt: 0.5 }}>
          {label}
        </Typography>
        <Box sx={{
          mt: 1.5, height: '2px', mx: 'auto', width: '60%',
          background: gradient, borderRadius: '2px', opacity: 0.5,
        }} />
      </Box>
    </motion.div>
  );
};

// --- Step Card ----------------------------------------------------------
const StepCard = ({ number, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.6, delay }}
    viewport={{ once: true }}
  >
    <Box sx={{ display: 'flex', gap: 2.5, alignItems: 'flex-start' }}>
      <Box sx={{
        width: 44, height: 44, flexShrink: 0, borderRadius: '12px',
        background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: '1rem', color: 'white',
        boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
        fontFamily: '"Plus Jakarta Sans", sans-serif',
      }}>
        {number}
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: '#F1F5F9', fontSize: '1rem' }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8', lineHeight: 1.7 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  </motion.div>
);

// --- Main HomePage ------------------------------------------------------
const HomePage = () => {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.6], [0, -80]);

  const features = [
    { icon: '\u{1F697}', title: 'Carpool & Connect', description: 'Share rides, split costs, and meet new people on your daily commute. Eco-friendly and social.', color: '#06B6D4' },
    { icon: '\u{1F517}', title: 'Blockchain Security', description: 'Every transaction recorded on Hyperledger Fabric. Transparent, immutable, and trustworthy.', color: '#8B5CF6' },
    { icon: '\u26A1', title: 'Instant Booking', description: 'Find and book rides in seconds with our smart matching algorithm and real-time availability.', color: '#EC4899' },
    { icon: '\u{1F6E1}\uFE0F', title: 'Safe & Verified', description: 'All drivers are background-checked. Real-time tracking and SOS emergency alerts keep you safe.', color: '#34D399' },
    { icon: '\u{1F4B3}', title: 'Multi-Payment', description: 'Pay your way - cash, UPI, or Ethereum crypto. Seamless and flexible payment options.', color: '#FBBF24' },
    { icon: '\u{1F4CD}', title: 'Live Tracking', description: 'Real-time GPS tracking. Share your trip with loved ones and get accurate ETAs.', color: '#F87171' },
  ];

  const steps = [
    { number: '1', title: 'Register & Verify', description: 'Create your account, upload documents to IPFS, and verify your email in minutes.' },
    { number: '2', title: 'Create or Find Rides', description: 'Drivers set up rides with routes and prices. Passengers search and book instantly.' },
    { number: '3', title: 'Ride & Pay Securely', description: 'Complete your journey with live tracking, SOS support, and blockchain-secured payments.' },
  ];

  const stats = [
    { value: 500, suffix: 'K+', label: 'Active Users', gradient: 'linear-gradient(135deg, #FBBF24, #F97316)' },
    { value: 2, suffix: 'M+', label: 'Rides Completed', gradient: 'linear-gradient(135deg, #34D399, #059669)' },
    { value: 50, suffix: 'M+', label: 'Saved by Users', gradient: 'linear-gradient(135deg, #EC4899, #F43F5E)' },
    { value: 4.9, suffix: '/5', label: 'Average Rating', gradient: 'linear-gradient(135deg, #06B6D4, #3B82F6)' },
  ];

  const testimonials = [
    { name: 'Priya Sharma', handle: '@priya_commutes', text: 'WayFair changed my commute completely. Saved \u20B94,000/month and made great friends!', avatar: 'P' },
    { name: 'Rahul Mehta', handle: '@rahul_rides', text: 'The blockchain transparency is incredible. I can see every transaction clearly. Best rideshare app!', avatar: 'R' },
    { name: 'Ananya Singh', handle: '@ananya_goes', text: 'As a driver, earning extra income has never been easier. The app is super intuitive.', avatar: 'A' },
    { name: 'Dev Patel', handle: '@dev_moves', text: 'SOS feature gave me peace of mind. Safety is clearly a priority here. Highly recommend!', avatar: 'D' },
    { name: 'Nisha Verma', handle: '@nisha_rides', text: 'Crypto payments work flawlessly. Love that I can pay with ETH. Very futuristic!', avatar: 'N' },
    { name: 'Karan Joshi', handle: '@karan_drives', text: 'Best carpooling experience. Clean UI, fast matching, and reliable drivers every time.', avatar: 'K' },
  ];

  const gradients = ['linear-gradient(135deg,#06B6D4,#8B5CF6)', 'linear-gradient(135deg,#8B5CF6,#EC4899)', 'linear-gradient(135deg,#EC4899,#F97316)', 'linear-gradient(135deg,#34D399,#06B6D4)', 'linear-gradient(135deg,#FBBF24,#EC4899)', 'linear-gradient(135deg,#8B5CF6,#34D399)'];

  return (
    <Box sx={{ background: '#030712', minHeight: '100vh', overflow: 'hidden' }}>
      <FloatingOrbs />

      {/* --- HERO --- */}
      <Box
        ref={heroRef}
        component="section"
        sx={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          pt: { xs: 10, md: 8 },
        }}
      >
        {/* Grid pattern */}
        <Box sx={{
          position: 'absolute', inset: 0, zIndex: 0,
          backgroundImage: 'linear-gradient(rgba(6,182,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,0.06) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)',
        }} />

        <motion.div style={{ opacity: heroOpacity, y: heroY, position: 'relative', zIndex: 2, width: '100%' }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
              {/* Badge */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
                <Box sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 1,
                  px: 2, py: 0.75, mb: 4,
                  borderRadius: '50px',
                  background: 'rgba(6,182,212,0.1)',
                  border: '1px solid rgba(6,182,212,0.3)',
                  backdropFilter: 'blur(10px)',
                }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#06B6D4',
                    boxShadow: '0 0 8px #06B6D4',
                    animation: 'livePulse 2s ease-in-out infinite',
                    '@keyframes livePulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
                  }} />
                  <Typography variant="caption" sx={{ color: '#06B6D4', fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.75rem' }}>
                    100% BLOCKCHAIN-SECURED RIDES
                  </Typography>
                </Box>
              </motion.div>

              {/* Headline */}
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
                <Typography variant="h1" sx={{
                  fontWeight: 900,
                  fontSize: { xs: '3.2rem', sm: '4.5rem', md: '6.5rem' },
                  lineHeight: 1.0,
                  mb: 2,
                  letterSpacing: '-0.04em',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}>
                  <GradientText gradient="linear-gradient(135deg, #06B6D4 0%, #8B5CF6 50%, #EC4899 100%)">Way</GradientText>
                  <Box component="span" sx={{ color: '#F1F5F9' }}>Fair</Box>
                </Typography>
                <Typography variant="h2" sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.6rem', sm: '2.2rem', md: '2.8rem' },
                  mb: 3,
                  color: '#94A3B8',
                  letterSpacing: '-0.02em',
                  fontFamily: '"Plus Jakarta Sans", sans-serif',
                }}>
                  Ride Smarter. Together.
                </Typography>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.2 }}>
                <Typography variant="h5" sx={{
                  color: '#64748B', mb: 5, fontWeight: 400, lineHeight: 1.7,
                  fontSize: { xs: '1rem', md: '1.1rem' },
                  maxWidth: 560, mx: 'auto',
                }}>
                  Decentralized ridesharing powered by blockchain � transparent, secure, and community-driven. Your journey, your way.
                </Typography>
              </motion.div>

              {/* CTA Buttons */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      component={RouterLink} to="/register" variant="contained" size="large"
                      sx={{
                        px: 5, py: 1.8, fontSize: '1.05rem', fontWeight: 700, borderRadius: '50px',
                        background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                        boxShadow: '0 8px 40px rgba(6,182,212,0.45)', border: 'none',
                        '&:hover': { background: 'linear-gradient(135deg, #0EA5E9, #A78BFA)', boxShadow: '0 12px 50px rgba(6,182,212,0.65)', transform: 'translateY(-2px)' },
                      }}
                    >
                      Start Riding Free
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                    <Button
                      component={RouterLink} to="/login" variant="outlined" size="large"
                      sx={{
                        px: 5, py: 1.8, fontSize: '1.05rem', fontWeight: 600, borderRadius: '50px',
                        borderColor: 'rgba(139,92,246,0.5)', color: '#A78BFA',
                        backdropFilter: 'blur(10px)', background: 'rgba(139,92,246,0.08)',
                        '&:hover': { borderColor: '#8B5CF6', background: 'rgba(139,92,246,0.15)', boxShadow: '0 0 30px rgba(139,92,246,0.3)' },
                      }}
                    >
                      Sign In
                    </Button>
                  </motion.div>
                </Box>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }}>
                <Box sx={{ mt: 5, display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {['\u{1F517} Hyperledger Fabric', '\u{1F6E1}\uFE0F End-to-End Safe', '\u{1F4B0} Save up to 70%'].map((item) => (
                    <Typography key={item} variant="caption" sx={{ color: '#475569', fontWeight: 500, fontSize: '0.82rem' }}>
                      {item}
                    </Typography>
                  ))}
                </Box>
              </motion.div>
            </Box>
          </Container>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', zIndex: 2 }}>
          <Box sx={{
            width: 28, height: 46, border: '2px solid rgba(139,92,246,0.4)', borderRadius: '14px',
            display: 'flex', justifyContent: 'center', pt: 1,
          }}>
            <Box sx={{
              width: 4, height: 10, background: 'linear-gradient(to bottom, #06B6D4, #8B5CF6)',
              borderRadius: '2px', animation: 'scrollBob 2s ease-in-out infinite',
              '@keyframes scrollBob': { '0%,100%': { transform: 'translateY(0)', opacity: 1 }, '50%': { transform: 'translateY(12px)', opacity: 0.3 } },
            }} />
          </Box>
        </motion.div>
      </Box>

      {/* --- STATS --- */}
      <Box component="section" sx={{ py: { xs: 8, md: 10 }, position: 'relative', zIndex: 1 }}>
        <Container maxWidth="lg">
          <Grid container spacing={3}>
            {stats.map((stat, i) => (
              <Grid item xs={6} md={3} key={i}><StatCard {...stat} delay={i * 0.1} /></Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* --- FEATURES --- */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, position: 'relative', zIndex: 1 }}>
        <Container maxWidth="lg">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography variant="overline" sx={{ color: '#8B5CF6', fontWeight: 700, letterSpacing: '0.15em', mb: 2, display: 'block' }}>
                WHY WAYFAIR
              </Typography>
              <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '3rem' }, mb: 2, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                <GradientText gradient="linear-gradient(135deg, #06B6D4, #8B5CF6)">Everything you need</GradientText>
                <Box component="span" sx={{ color: '#F1F5F9' }}> to ride better</Box>
              </Typography>
              <Typography variant="body1" sx={{ color: '#94A3B8', maxWidth: 500, mx: 'auto', fontSize: '1.05rem' }}>
                Combining community carpooling with blockchain security for an unmatched rideshare experience.
              </Typography>
            </Box>
          </motion.div>
          <Grid container spacing={3}>
            {features.map((feat, i) => (
              <Grid item xs={12} sm={6} md={4} key={i}><FeatureCard {...feat} delay={i * 0.1} /></Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* --- HOW IT WORKS --- */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, position: 'relative', zIndex: 1, background: 'linear-gradient(180deg, transparent 0%, rgba(139,92,246,0.04) 50%, transparent 100%)' }}>
        <Container maxWidth="lg">
          <Grid container spacing={8} alignItems="center">
            <Grid item xs={12} md={5}>
              <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
                <Typography variant="overline" sx={{ color: '#06B6D4', fontWeight: 700, letterSpacing: '0.15em', mb: 2, display: 'block' }}>HOW IT WORKS</Typography>
                <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '2.8rem' }, mb: 3, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#F1F5F9' }}>
                  Up and riding in{' '}
                  <GradientText gradient="linear-gradient(135deg, #06B6D4, #8B5CF6)">3 simple steps</GradientText>
                </Typography>
                <Typography variant="body1" sx={{ color: '#94A3B8', mb: 5, lineHeight: 1.8 }}>
                  Join thousands of riders and drivers already on the platform. It's free to get started.
                </Typography>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    component={RouterLink} to="/register" variant="contained" size="large"
                    sx={{
                      px: 4, py: 1.6, borderRadius: '50px', fontWeight: 700,
                      background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                      boxShadow: '0 6px 30px rgba(6,182,212,0.4)',
                      '&:hover': { boxShadow: '0 10px 40px rgba(6,182,212,0.6)', transform: 'translateY(-2px)' },
                    }}
                  >
                    Join WayFair Today
                  </Button>
                </motion.div>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={7}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {steps.map((step, i) => <StepCard key={i} {...step} delay={i * 0.15} />)}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* --- TESTIMONIALS --- */}
      <Box component="section" sx={{ py: { xs: 8, md: 12 }, position: 'relative', zIndex: 1, overflow: 'hidden' }}>
        <Container maxWidth="lg">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
              <Typography variant="overline" sx={{ color: '#EC4899', fontWeight: 700, letterSpacing: '0.15em', mb: 2, display: 'block' }}>COMMUNITY LOVE</Typography>
              <Typography variant="h2" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '3rem' }, color: '#F1F5F9', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                Loved by <GradientText gradient="linear-gradient(135deg, #EC4899, #8B5CF6)">thousands</GradientText>
              </Typography>
            </Box>
          </motion.div>
          <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            <Box sx={{
              display: 'flex', gap: 3, width: 'max-content',
              animation: 'marquee 30s linear infinite',
              '&:hover': { animationPlayState: 'paused' },
            }}>
              {[...testimonials, ...testimonials].map((t, i) => (
                <Box key={i} sx={{
                  width: 300, flexShrink: 0, p: 3, borderRadius: '20px',
                  background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(139,92,246,0.2)', backdropFilter: 'blur(20px)',
                  transition: 'all 0.3s',
                  '&:hover': { border: '1px solid rgba(6,182,212,0.4)', transform: 'translateY(-4px)' },
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: '50%',
                      background: gradients[i % gradients.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1rem', color: 'white', flexShrink: 0,
                    }}>{t.avatar}</Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F1F5F9', fontSize: '0.9rem' }}>{t.name}</Typography>
                      <Typography variant="caption" sx={{ color: '#64748B' }}>{t.handle}</Typography>
                    </Box>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#94A3B8', lineHeight: 1.7, fontSize: '0.88rem' }}>"{t.text}"</Typography>
                  <Box sx={{ mt: 2, display: 'flex', gap: 0.5 }}>
                    {[...Array(5)].map((_, s) => <Box key={s} component="span" sx={{ color: '#FBBF24', fontSize: '0.8rem' }}>{`\u2605`}</Box>)}
                  </Box>
                </Box>
              ))}
            </Box>
            <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 100, background: 'linear-gradient(90deg, #030712, transparent)', pointerEvents: 'none' }} />
            <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 100, background: 'linear-gradient(-90deg, #030712, transparent)', pointerEvents: 'none' }} />
          </Box>
        </Container>
      </Box>

      {/* --- CTA SECTION --- */}
      <Box component="section" sx={{ py: { xs: 10, md: 16 }, position: 'relative', zIndex: 1 }}>
        <Container maxWidth="md">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <Box sx={{
              textAlign: 'center', p: { xs: 5, md: 8 }, borderRadius: '28px',
              background: 'linear-gradient(135deg, rgba(6,182,212,0.1) 0%, rgba(139,92,246,0.1) 50%, rgba(236,72,153,0.08) 100%)',
              border: '1px solid rgba(139,92,246,0.3)', backdropFilter: 'blur(30px)',
              position: 'relative', overflow: 'hidden',
            }}>
              <Typography variant="h2" sx={{ fontWeight: 900, fontSize: { xs: '2rem', md: '3.5rem' }, mb: 3, color: '#F1F5F9', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                Ready to ride{' '}
                <GradientText gradient="linear-gradient(135deg, #06B6D4, #8B5CF6, #EC4899)">smarter?</GradientText>
              </Typography>
              <Typography variant="body1" sx={{ color: '#94A3B8', mb: 5, fontSize: '1.1rem' }}>
                Join 500,000+ users already on WayFair. Free to start, forever.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    component={RouterLink} to="/register" variant="contained" size="large"
                    sx={{
                      px: 6, py: 2, fontSize: '1.1rem', fontWeight: 700, borderRadius: '50px',
                      background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                      boxShadow: '0 8px 40px rgba(6,182,212,0.5)',
                      '&:hover': { boxShadow: '0 12px 50px rgba(6,182,212,0.7)', transform: 'translateY(-3px)' },
                    }}
                  >Create Free Account</Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Button
                    component={RouterLink} to="/login" variant="outlined" size="large"
                    sx={{
                      px: 6, py: 2, fontSize: '1.1rem', fontWeight: 600, borderRadius: '50px',
                      borderColor: 'rgba(139,92,246,0.4)', color: '#A78BFA',
                      '&:hover': { borderColor: '#8B5CF6', background: 'rgba(139,92,246,0.1)' },
                    }}
                  >Sign In</Button>
                </motion.div>
              </Box>
            </Box>
          </motion.div>
        </Container>
      </Box>

      {/* --- FOOTER --- */}
      <Box component="footer" sx={{ py: 4, textAlign: 'center', borderTop: '1px solid rgba(139,92,246,0.15)', position: 'relative', zIndex: 1 }}>
        <Typography variant="body2" sx={{ color: '#334155' }}>
          � 2026{' '}
          <Box component="span" sx={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700 }}>
            WayFair
          </Box>
          {' '}� Ride Smarter, Together.
        </Typography>
      </Box>
    </Box>
  );
};

export default HomePage;
