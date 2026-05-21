import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Refresh,
  Storage,
  People,
  DirectionsCar,
  Receipt,
  BookOnline,
  Star,
  Search,
  TrendingUp,
  AccountBalanceWallet,
  Warning
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE = 'http://localhost:5000';
const api = axios.create({ baseURL: API_BASE });

const TabPanel = ({ value, index, children }) => (
  <div hidden={value !== index}>
    {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
  </div>
);

const StatCard = ({ icon, label, value, color }) => (
  <Box sx={{ background: 'rgba(255,255,255,0.92)', border: `1px solid ${color}33`, borderRadius: '14px', p: 2.5 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      <Avatar sx={{ background: `linear-gradient(135deg, ${color}AA, ${color})`, width: 48, height: 48 }}>
        {icon}
      </Avatar>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 900, fontFamily: '"Plus Jakarta Sans", sans-serif', color }}>{value}</Typography>
        <Typography variant="body2" sx={{ color: '#334155' }}>{label}</Typography>
      </Box>
    </Box>
  </Box>
);

const SearchBar = ({ value, onChange, placeholder }) => (
  <TextField size="small" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
    sx={{ mb: 2, minWidth: 260, '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(139,92,246,0.3)' }, '&:hover fieldset': { borderColor: 'rgba(6,182,212,0.5)' }, '&.Mui-focused fieldset': { borderColor: '#06B6D4' }, color: 'text.primary' }, '& input::placeholder': { color: '#334155' } }}
    InputProps={{ startAdornment: (<InputAdornment position="start"><Search fontSize="small" sx={{ color: '#334155' }} /></InputAdornment>) }}
  />
);

const getChipStyle = (status) => {
  const map = {
    completed: { bg: 'rgba(52,211,153,0.15)', color: '#34D399', border: 'rgba(52,211,153,0.3)' },
    confirmed: { bg: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: 'rgba(6,182,212,0.3)' },
    active:    { bg: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: 'rgba(6,182,212,0.3)' },
    started:   { bg: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: 'rgba(139,92,246,0.3)' },
    pending:   { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: 'rgba(251,191,36,0.3)' },
    created:   { bg: 'rgba(56,189,248,0.15)', color: '#38BDF8', border: 'rgba(56,189,248,0.3)' },
    cancelled: { bg: 'rgba(239,68,68,0.15)', color: '#F87171', border: 'rgba(239,68,68,0.3)' },
    resolved:  { bg: 'rgba(52,211,153,0.15)', color: '#34D399', border: 'rgba(52,211,153,0.3)' },
  };
  const s = map[(status || '').toLowerCase()] || { bg: 'rgba(100,116,139,0.15)', color: '#475569', border: 'rgba(100,116,139,0.3)' };
  return { background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 700 };
};

const BlockchainExplorer = () => {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [rides, setRides] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [search, setSearch] = useState('');

  const fetchData = useCallback(async (tabIndex) => {
    setLoading(true);
    setError('');
    try {
      switch (tabIndex) {
        case 0: {
          const r = await api.get('/api/explorer/stats');
          setStats(r.data.stats || r.data);
          break;
        }
        case 1: {
          const r = await api.get('/api/explorer/all');
          setRides(r.data.rides || []);
          break;
        }
        case 2: {
          const r = await api.get('/api/explorer/transactions');
          setTransactions(r.data.transactions || []);
          break;
        }
        case 3: {
          const r = await api.get('/api/explorer/bookings');
          setBookings(r.data.bookings || []);
          break;
        }
        case 4: {
          const r = await api.get('/api/explorer/feedback');
          setFeedbacks(r.data.feedbacks || r.data.feedback || []);
          break;
        }
        case 5: {
          const r = await api.get('/api/explorer/sos');
          setSosAlerts(r.data.alerts || []);
          break;
        }
        default: break;
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(tab); }, [tab, fetchData]);

  const filteredRides = rides.filter(r =>
    !search || JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
  );
  const filteredTx = transactions.filter(t =>
    !search || JSON.stringify(t).toLowerCase().includes(search.toLowerCase())
  );
  const filteredBookings = bookings.filter(b =>
    !search || JSON.stringify(b).toLowerCase().includes(search.toLowerCase())
  );
  const filteredFeedbacks = feedbacks.filter(f =>
    !search || JSON.stringify(f).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Paper
        elevation={4}
        sx={{
          p: 3, mb: 3,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: 'white', borderRadius: 3
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Storage sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                Blockchain Explorer
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Real-time view of all on-chain data ? rides, bookings, transactions & feedback
              </Typography>
            </Box>
          </Box>
          <Button
            variant="outlined"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Refresh />}
            onClick={() => fetchData(tab)}
            disabled={loading}
            sx={{ color: 'white', borderColor: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ borderRadius: '12px', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)', border: '1px solid rgba(139,92,246,0.2)' }}>
        <Tabs
          value={tab}
          onChange={(e, v) => { setTab(v); setSearch(''); }}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<TrendingUp />} iconPosition="start" label="Stats" />
          <Tab icon={<DirectionsCar />} iconPosition="start" label="Rides" />
          <Tab icon={<AccountBalanceWallet />} iconPosition="start" label="Transactions" />
          <Tab icon={<BookOnline />} iconPosition="start" label="Bookings" />
          <Tab icon={<Star />} iconPosition="start" label="Feedback" />
          <Tab icon={<Warning />} iconPosition="start" label="SOS Alerts" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* -- STATS TAB -- */}
          <TabPanel value={tab} index={0}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: '#06B6D4' }} /></Box>
            ) : stats ? (
              <>
                <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                  Network Statistics
                </Typography>
                <Grid container spacing={3} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<People />} label="Total Users" value={stats.totalUsers ?? 0} color="#8B5CF6" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<DirectionsCar />} label="Total Rides" value={stats.totalRides ?? 0} color="#EC4899" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<BookOnline />} label="Total Bookings" value={stats.totalBookings ?? 0} color="#06B6D4" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<Receipt />} label="Transactions" value={stats.totalTransactions ?? 0} color="#34D399" />
                  </Grid>
                </Grid>
                <Box sx={{ height: 1, background: 'rgba(139,92,246,0.15)', my: 2 }} />
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<People />} label="Drivers" value={stats.driverCount ?? 0} color="#FBBF24" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<People />} label="Passengers" value={stats.passengerCount ?? 0} color="#A78BFA" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<Star />} label="Feedbacks" value={stats.totalFeedback ?? 0} color="#F472B6" />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <StatCard icon={<Warning />} label="SOS Alerts" value={stats.totalSOS ?? 0} color="#F87171" />
                  </Grid>
                </Grid>
              </>
            ) : (
              <Alert severity="info" sx={{ background: 'rgba(6,182,212,0.1)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)' }}>Click Refresh to load stats</Alert>
            )}
          </TabPanel>

          {/* -- RIDES TAB -- */}
          <TabPanel value={tab} index={1}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                All Rides ({filteredRides.length})
              </Typography>
              <SearchBar value={search} onChange={setSearch} placeholder="Search rides..." />
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: '#06B6D4' }} /></Box>
            ) : (
              <TableContainer component={Paper} sx={{ background: 'rgba(255,255,255,0.82)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Table size="small">
                  <TableHead sx={{ background: 'rgba(139,92,246,0.1)' }}>
                    <TableRow>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Ride ID</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>From ? To</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Driver</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Departure</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Seats</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Price/Seat</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Type</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Status</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredRides.length === 0 && (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ color: '#334155', borderColor: 'rgba(139,92,246,0.1)' }}>No rides found</TableCell></TableRow>
                    )}
                    {filteredRides.map((ride) => (
                      <TableRow key={ride.rideID} sx={{ '& td': { borderColor: 'rgba(139,92,246,0.1)', color: '#475569' }, '&:hover': { background: 'rgba(139,92,246,0.05)' } }}>
                        <TableCell>
                          <Tooltip title={ride.rideID}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {(ride.rideID || '').substring(0, 12)}...
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 220 }}>
                            {ride.startLocation?.address || ride.startAddress || 'N/A'}
                            <span style={{ color: '#999', margin: '0 4px' }}>{`\u2192`}</span>
                            {ride.endLocation?.address || ride.endAddress || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(ride.driverID || '').substring(0, 12)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {ride.departureTime ? new Date(ride.departureTime).toLocaleString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{ride.availableSeats ?? ride.AvailableSeats ?? '-'}</TableCell>
                        <TableCell>{`\u20B9`}{ride.pricePerSeat ?? ride.PricePerSeat ?? '-'}</TableCell>
                        <TableCell>
                          <Chip label={ride.rideType || 'solo'} size="small" sx={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)' }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={(ride.status || 'created').toUpperCase()} size="small" sx={getChipStyle(ride.status)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* -- TRANSACTIONS TAB -- */}
          <TabPanel value={tab} index={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                All Transactions ({filteredTx.length})
              </Typography>
              <SearchBar value={search} onChange={setSearch} placeholder="Search transactions..." />
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: '#06B6D4' }} /></Box>
            ) : (
              <TableContainer component={Paper} sx={{ background: 'rgba(255,255,255,0.82)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Table size="small">
                  <TableHead sx={{ background: 'rgba(139,92,246,0.1)' }}>
                    <TableRow>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Tx ID</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>From</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>To</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Amount</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Method</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Ride ID</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Timestamp</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Status</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredTx.length === 0 && (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ color: '#334155', borderColor: 'rgba(139,92,246,0.1)' }}>No transactions found</TableCell></TableRow>
                    )}
                    {filteredTx.map((tx) => (
                      <TableRow key={tx.transactionID || tx.txID} sx={{ '& td': { borderColor: 'rgba(139,92,246,0.1)', color: '#475569' }, '&:hover': { background: 'rgba(139,92,246,0.05)' } }}>
                        <TableCell>
                          <Tooltip title={tx.transactionID || tx.txID || ''}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {(tx.transactionID || tx.txID || '').substring(0, 12)}...
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(tx.fromUserID || tx.senderID || '').substring(0, 12)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(tx.toUserID || tx.receiverID || '').substring(0, 12)}...
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#34D399' }}>
                          {`\u20B9`}{tx.amount ?? '-'}
                        </TableCell>
                        <TableCell>
                          <Chip label={tx.paymentMethod || 'cash'} size="small"
                            sx={tx.paymentMethod === 'ETH' ? { background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)' } : tx.paymentMethod === 'UPI' ? { background: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.3)' } : { background: 'rgba(100,116,139,0.15)', color: '#475569', border: '1px solid rgba(100,116,139,0.3)' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(tx.rideID || '').substring(0, 12)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={(tx.status || 'completed').toUpperCase()} size="small" sx={getChipStyle(tx.status)} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* -- BOOKINGS TAB -- */}
          <TabPanel value={tab} index={3}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                All Bookings ({filteredBookings.length})
              </Typography>
              <SearchBar value={search} onChange={setSearch} placeholder="Search bookings..." />
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: '#06B6D4' }} /></Box>
            ) : (
              <TableContainer component={Paper} sx={{ background: 'rgba(255,255,255,0.82)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Table size="small">
                  <TableHead sx={{ background: 'rgba(139,92,246,0.1)' }}>
                    <TableRow>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Booking ID</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Passenger</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Ride ID</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Seats</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Total Price</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Payment</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Status</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Booked At</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBookings.length === 0 && (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ color: '#334155', borderColor: 'rgba(139,92,246,0.1)' }}>No bookings found</TableCell></TableRow>
                    )}
                    {filteredBookings.map((b) => (
                      <TableRow key={b.bookingID} sx={{ '& td': { borderColor: 'rgba(139,92,246,0.1)', color: '#475569' }, '&:hover': { background: 'rgba(139,92,246,0.05)' } }}>
                        <TableCell>
                          <Tooltip title={b.bookingID}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {(b.bookingID || '').substring(0, 12)}...
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(b.passengerID || '').substring(0, 14)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(b.rideID || '').substring(0, 12)}...
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{b.seatsBooked ?? b.seats ?? '-'}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#34D399' }}>{`\u20B9`}{b.totalPrice ?? '-'}</TableCell>
                        <TableCell>
                          <Chip label={b.paymentMethod || 'cash'} size="small" sx={{ background: 'rgba(100,116,139,0.15)', color: '#475569', border: '1px solid rgba(100,116,139,0.3)' }} />
                        </TableCell>
                        <TableCell>
                          <Chip label={(b.status || 'confirmed').toUpperCase()} size="small" sx={getChipStyle(b.status)} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {b.bookingTime ? new Date(b.bookingTime).toLocaleString() : 'N/A'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* -- FEEDBACK TAB -- */}
          <TabPanel value={tab} index={4}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: 'text.primary' }}>
                All Feedback ({filteredFeedbacks.length})
              </Typography>
              <SearchBar value={search} onChange={setSearch} placeholder="Search feedback..." />
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: '#06B6D4' }} /></Box>
            ) : (
              <TableContainer component={Paper} sx={{ background: 'rgba(255,255,255,0.82)', borderRadius: '12px', border: '1px solid rgba(139,92,246,0.2)' }}>
                <Table size="small">
                  <TableHead sx={{ background: 'rgba(139,92,246,0.1)' }}>
                    <TableRow>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Feedback ID</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>From</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>To</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Ride ID</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Rating</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Comment</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>XP Awarded</b></TableCell>
                      <TableCell sx={{ color: '#475569', fontWeight: 700, borderColor: 'rgba(139,92,246,0.2)' }}><b>Date</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredFeedbacks.length === 0 && (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ color: '#334155', borderColor: 'rgba(139,92,246,0.1)' }}>No feedback found</TableCell></TableRow>
                    )}
                    {filteredFeedbacks.map((f) => (
                      <TableRow key={f.feedbackID} sx={{ '& td': { borderColor: 'rgba(139,92,246,0.1)', color: '#475569' }, '&:hover': { background: 'rgba(139,92,246,0.05)' } }}>
                        <TableCell>
                          <Tooltip title={f.feedbackID}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {(f.feedbackID || '').substring(0, 12)}...
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(f.reviewerID || f.fromUserID || '').substring(0, 14)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(f.targetUserID || f.toUserID || '').substring(0, 14)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(f.rideID || '').substring(0, 12)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Star sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {f.rating ?? '-'}/5
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ maxWidth: 150, display: 'block' }} noWrap>
                            {f.comment || f.review || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={`+${f.xpAwarded ?? 10} XP`} size="small" sx={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {f.timestamp ? new Date(f.timestamp).toLocaleString() : 'N/A'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* -- SOS ALERTS TAB -- */}
          <TabPanel value={tab} index={5}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#F87171' }}>
                {`\u{1F6A8}`} SOS Alerts ({sosAlerts.filter(a => !search || JSON.stringify(a).toLowerCase().includes(search.toLowerCase())).length})
              </Typography>
              <SearchBar value={search} onChange={setSearch} placeholder="Search SOS alerts..." />
            </Box>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress sx={{ color: '#F87171' }} /></Box>
            ) : (
              <TableContainer component={Paper} sx={{ background: 'rgba(255,255,255,0.82)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                <Table size="small">
                  <TableHead sx={{ background: 'rgba(239,68,68,0.08)' }}>
                    <TableRow>
                      <TableCell sx={{ color: '#F87171', fontWeight: 700, borderColor: 'rgba(239,68,68,0.2)' }}><b>Alert ID</b></TableCell>
                      <TableCell sx={{ color: '#F87171', fontWeight: 700, borderColor: 'rgba(239,68,68,0.2)' }}><b>Passenger</b></TableCell>
                      <TableCell sx={{ color: '#F87171', fontWeight: 700, borderColor: 'rgba(239,68,68,0.2)' }}><b>Ride ID</b></TableCell>
                      <TableCell sx={{ color: '#F87171', fontWeight: 700, borderColor: 'rgba(239,68,68,0.2)' }}><b>Booking ID</b></TableCell>
                      <TableCell sx={{ color: '#F87171', fontWeight: 700, borderColor: 'rgba(239,68,68,0.2)' }}><b>Location</b></TableCell>
                      <TableCell sx={{ color: '#F87171', fontWeight: 700, borderColor: 'rgba(239,68,68,0.2)' }}><b>Lat / Lng</b></TableCell>
                      <TableCell sx={{ color: '#F87171', fontWeight: 700, borderColor: 'rgba(239,68,68,0.2)' }}><b>Timestamp</b></TableCell>
                      <TableCell sx={{ color: '#F87171', fontWeight: 700, borderColor: 'rgba(239,68,68,0.2)' }}><b>Status</b></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sosAlerts.filter(a => !search || JSON.stringify(a).toLowerCase().includes(search.toLowerCase())).length === 0 && (
                      <TableRow><TableCell colSpan={8} align="center" sx={{ color: '#334155', borderColor: 'rgba(239,68,68,0.1)' }}>No SOS alerts found</TableCell></TableRow>
                    )}
                    {sosAlerts.filter(a => !search || JSON.stringify(a).toLowerCase().includes(search.toLowerCase())).map((a) => (
                      <TableRow key={a.alertID || a.sosID} sx={{ '& td': { borderColor: 'rgba(239,68,68,0.1)', color: '#475569' }, background: a.status === 'active' ? 'rgba(239,68,68,0.05)' : 'transparent', '&:hover': { background: 'rgba(239,68,68,0.08)' } }}>
                        <TableCell>
                          <Tooltip title={a.alertID || a.sosID || ''}>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                              {(a.alertID || a.sosID || '').substring(0, 14)}...
                            </Typography>
                          </Tooltip>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(a.passengerID || a.userID || '').substring(0, 14)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(a.rideID || '').substring(0, 12)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                            {(a.bookingID || '').substring(0, 12)}...
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" sx={{ maxWidth: 160, display: 'block' }} noWrap>
                            {a.location?.address || a.address || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {a.location?.latitude ?? a.latitude ?? '-'} / {a.location?.longitude ?? a.longitude ?? '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={(a.status || 'active').toUpperCase()} size="small" sx={getChipStyle(a.status === 'resolved' ? 'resolved' : 'cancelled')} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Box>
      </Box>
      </Container>
  );
};

export default BlockchainExplorer;
