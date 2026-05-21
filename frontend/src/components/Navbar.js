import React, { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, Avatar, Tooltip, IconButton, Drawer, List, ListItem, ListItemText, useMediaQuery, useTheme } from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const NavLink = ({ to, children, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Button
      component={RouterLink}
      to={to}
      onClick={onClick}
      sx={{
        color: isActive ? '#06B6D4' : '#334155',
        fontWeight: isActive ? 700 : 500,
        fontSize: '0.9rem',
        borderRadius: '8px',
        px: 1.5,
        py: 0.75,
        position: 'relative',
        transition: 'color 0.2s',
        '&:hover': { color: '#06B6D4', background: 'rgba(6,182,212,0.08)' },
        '&::after': isActive ? {
          content: '""',
          position: 'absolute',
          bottom: 2,
          left: '20%',
          right: '20%',
          height: '2px',
          background: 'linear-gradient(90deg, #06B6D4, #8B5CF6)',
          borderRadius: '2px',
        } : {},
      }}
    >
      {children}
    </Button>
  );
};

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const storedUserStr = localStorage.getItem('user');
  const storedUser = storedUserStr ? (() => { try { return JSON.parse(storedUserStr); } catch { return {}; } })() : {};
  const storedKeyStr = localStorage.getItem('keyData');
  const storedKey = storedKeyStr ? (() => { try { return JSON.parse(storedKeyStr); } catch { return {}; } })() : {};
  const userName = storedUser?.name || storedKey?.name || 'U';
  const profilePicHash = storedUser?.profilePic || storedKey?.profilePic || null;
  const profilePicUrl = profilePicHash ? `https://gateway.pinata.cloud/ipfs/${profilePicHash}` : null;

  const handleLogout = () => {
    logout();
    setDrawerOpen(false);
    navigate('/');
  };

  const navLinks = isAuthenticated
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/explorer', label: 'Explorer' },
        { to: '/referral', label: 'Referral' },
      ]
    : [];

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          background: scrolled
            ? 'rgba(255, 255, 255, 0.97)'
            : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.15)',
          transition: 'all 0.3s ease',
          boxShadow: scrolled ? '0 4px 24px rgba(0,0,0,0.08)' : '0 1px 8px rgba(0,0,0,0.04)',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 4 }, minHeight: { xs: 64, md: 70 } }}>
          {/* Logo */}
          <Box
            component={RouterLink}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              textDecoration: 'none',
              flexGrow: isMobile ? 1 : 0,
              mr: isMobile ? 0 : 4,
            }}
          >
            <Box
              sx={{
                width: 36, height: 36, borderRadius: '10px',
                background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px rgba(6,182,212,0.35)',
              }}
            >
              <Typography sx={{ fontSize: '18px', lineHeight: 1 }}>🚗</Typography>
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: '1.3rem',
                background: 'linear-gradient(135deg, #06B6D4 0%, #8B5CF6 60%, #EC4899 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              WayFair
            </Typography>
          </Box>

          {/* Desktop Nav */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexGrow: 1 }}>
              {navLinks.map((link) => (
                <NavLink key={link.to} to={link.to}>{link.label}</NavLink>
              ))}
            </Box>
          )}

          {/* Desktop Auth Buttons */}
          {!isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {isAuthenticated ? (
                <>
                  <Tooltip title={`${userName}'s profile`}>
                    <IconButton onClick={() => navigate('/profile')} sx={{ p: 0.5 }}>
                      <Avatar
                        src={profilePicUrl}
                        sx={{
                          width: 38,
                          height: 38,
                          background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                          border: '2px solid rgba(6,182,212,0.5)',
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          '&:hover': { transform: 'scale(1.1)', boxShadow: '0 0 15px rgba(6,182,212,0.5)' },
                        }}
                      >
                        {!profilePicUrl && userName.charAt(0).toUpperCase()}
                      </Avatar>
                    </IconButton>
                  </Tooltip>
                  <Button
                    variant="outlined"
                    color="primary"
                    size="small"
                    onClick={handleLogout}
                    sx={{ borderRadius: '50px', px: 2.5, fontSize: '0.85rem' }}
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    component={RouterLink}
                    to="/login"
                    variant="text"
                    sx={{ color: '#334155', fontWeight: 500, '&:hover': { color: '#06B6D4' } }}
                  >
                    Sign In
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/register"
                    variant="contained"
                    color="primary"
                    sx={{
                      borderRadius: '50px',
                      px: 3,
                      background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                      boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
                      '&:hover': {
                        boxShadow: '0 6px 30px rgba(6,182,212,0.55)',
                        transform: 'translateY(-1px)',
                      },
                    }}
                  >
                    Get Started
                  </Button>
                </>
              )}
            </Box>
          )}

          {/* Mobile Hamburger */}
          {isMobile && (
            <IconButton
              onClick={() => setDrawerOpen(true)}
              sx={{ color: '#475569', ml: 1 }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            background: 'rgba(248, 250, 252, 0.96)',
            backdropFilter: 'blur(30px)',
            borderLeft: '1px solid rgba(139, 92, 246, 0.3)',
            p: 2,
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, mt: 1 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: '1.3rem',
              background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            WayFair
          </Typography>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: '#475569' }}>
            <CloseIcon />
          </IconButton>
        </Box>
        <List>
          {navLinks.map((link) => (
            <ListItem
              key={link.to}
              component={RouterLink}
              to={link.to}
              onClick={() => setDrawerOpen(false)}
              sx={{
                borderRadius: '10px',
                mb: 0.5,
                color: '#475569',
                fontWeight: 600,
                '&:hover': { background: 'rgba(6,182,212,0.1)', color: '#06B6D4' },
              }}
            >
              <ListItemText primary={link.label} primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItem>
          ))}
          {isAuthenticated && (
            <ListItem
              component={RouterLink}
              to="/profile"
              onClick={() => setDrawerOpen(false)}
              sx={{ borderRadius: '10px', mb: 0.5, color: '#475569', '&:hover': { background: 'rgba(6,182,212,0.1)', color: '#06B6D4' } }}
            >
              <ListItemText primary="Profile" primaryTypographyProps={{ fontWeight: 600 }} />
            </ListItem>
          )}
        </List>
        <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {isAuthenticated ? (
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              onClick={handleLogout}
              sx={{ borderRadius: '50px', py: 1 }}
            >
              Sign Out
            </Button>
          ) : (
            <>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                color="primary"
                fullWidth
                onClick={() => setDrawerOpen(false)}
                sx={{ borderRadius: '50px', py: 1 }}
              >
                Sign In
              </Button>
              <Button
                component={RouterLink}
                to="/register"
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => setDrawerOpen(false)}
                sx={{
                  borderRadius: '50px',
                  py: 1,
                  background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                  boxShadow: '0 4px 20px rgba(6,182,212,0.35)',
                }}
              >
                Get Started
              </Button>
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;


