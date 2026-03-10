const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const http = require('http');
const socketIO = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const bookingRoutes = require('./routes/bookings');
const sosRoutes = require('./routes/sos');
const ipfsRoutes = require('./routes/ipfs');
const adminRoutes = require('./routes/admin');
const paymentRoutes = require('./routes/payment');
const feedbackRoutes = require('./routes/feedback');
const explorerRoutes = require('./routes/explorer');
const usersRoutes = require('./routes/users');
const sponsorshipRoutes = require('./routes/sponsorship');
const referralRoutes = require('./routes/referral');
const chatHandler = require('./sockets/chat');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/explorer', explorerRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/sponsorship', sponsorshipRoutes);
app.use('/api/referral', referralRoutes);

// WebSocket for real-time chat
chatHandler(io);

// Make io available to routes
app.set('io', io);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV}`);
});

module.exports = { app, server, io };
