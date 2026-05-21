// Real-time chat functionality using Socket.IO

const jwt = require('jsonwebtoken');

// Store active connections
const activeConnections = new Map();
const chatRooms = new Map();
// Persist last 100 messages per ride so late-joiners see history
const chatHistory = new Map();

module.exports = (io) => {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error'));
      }
      socket.user = decoded;
      // Normalise: wallet users don't have pseudoID, fall back to userID
      if (!socket.user.pseudoID) {
        socket.user.pseudoID = socket.user.userID || socket.user.walletAddress || 'unknown';
      }
      next();
    });
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.pseudoID}`);
    
    // Store connection
    activeConnections.set(socket.user.pseudoID, socket.id);

    // Join user to their personal rooms (for direct notifications)
    socket.join(socket.user.pseudoID);
    if (socket.user.userID) socket.join(socket.user.userID);
    if (socket.user.walletAddress) socket.join(socket.user.walletAddress);

    // ─── Ride Chat ─────────────────────────────────────────────────────────
    socket.on('join_ride_chat', ({ rideID, userID }) => {
      socket.join(`ride_${rideID}`);
      
      if (!chatRooms.has(rideID)) {
        chatRooms.set(rideID, new Set());
      }
      chatRooms.get(rideID).add(userID);

      // Send chat history to the joining user
      const history = chatHistory.get(rideID) || [];
      socket.emit('chat_history', { rideID, messages: history });

      socket.to(`ride_${rideID}`).emit('user_joined_chat', {
        userID,
        pseudoID: socket.user.pseudoID,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${userID} joined ride chat: ${rideID}`);
    });

    socket.on('leave_ride_chat', ({ rideID, userID }) => {
      socket.leave(`ride_${rideID}`);
      
      if (chatRooms.has(rideID)) {
        chatRooms.get(rideID).delete(userID);
        if (chatRooms.get(rideID).size === 0) {
          chatRooms.delete(rideID);
        }
      }

      socket.to(`ride_${rideID}`).emit('user_left_chat', {
        userID,
        pseudoID: socket.user.pseudoID,
        timestamp: new Date().toISOString()
      });

      console.log(`User ${userID} left ride chat: ${rideID}`);
    });

    socket.on('send_message', ({ rideID, message, senderID, senderRole }) => {
      const messageData = {
        messageID: `MSG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rideID,
        senderID,
        senderPseudoID: socket.user.pseudoID,
        senderRole,
        message,
        timestamp: new Date().toISOString()
      };

      // Store in history (max 100 per room)
      if (!chatHistory.has(rideID)) chatHistory.set(rideID, []);
      const history = chatHistory.get(rideID);
      history.push(messageData);
      if (history.length > 100) history.shift();

      // Broadcast to all in the ride chat room
      io.to(`ride_${rideID}`).emit('new_message', messageData);

      console.log(`Message sent in ride ${rideID} by ${senderID}`);
    });

    socket.on('typing', ({ rideID, userID, isTyping }) => {
      socket.to(`ride_${rideID}`).emit('user_typing', {
        userID,
        pseudoID: socket.user.pseudoID,
        isTyping
      });
    });

    // ─── Live Driver Tracking ───────────────────────────────────────────────
    socket.on('driver:share_location', ({ rideID, location, heading, speed }) => {
      const locationData = {
        rideID,
        driverID: socket.user.userID || socket.user.pseudoID,
        location: {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy || 0,
        },
        heading: heading || 0,
        speed: speed || 0,
        timestamp: new Date().toISOString(),
      };

      socket.to(`ride_${rideID}`).emit('driver:location_update', locationData);
      socket.to(`tracking_${rideID}`).emit('driver:location_update', locationData);
    });

    socket.on('passenger:track_ride', ({ rideID }) => {
      socket.join(`tracking_${rideID}`);
      socket.join(`ride_${rideID}`);
      console.log(`Passenger ${socket.user.pseudoID} tracking ride ${rideID}`);
    });

    socket.on('driver:start_sharing', ({ rideID }) => {
      socket.join(`ride_${rideID}`);
      socket.join(`tracking_${rideID}`);
      socket.to(`ride_${rideID}`).emit('driver:online', {
        rideID,
        driverID: socket.user.userID || socket.user.pseudoID,
        timestamp: new Date().toISOString(),
      });
      console.log(`Driver ${socket.user.pseudoID} started sharing location for ride ${rideID}`);
    });

    socket.on('driver:stop_sharing', ({ rideID }) => {
      socket.to(`ride_${rideID}`).emit('driver:offline', {
        rideID,
        driverID: socket.user.userID || socket.user.pseudoID,
        timestamp: new Date().toISOString(),
      });
    });

    // ─── OTP Events ─────────────────────────────────────────────────────────
    // Driver joins ride room to receive OTP-related events
    socket.on('driver:join_ride', ({ rideID }) => {
      socket.join(`ride_${rideID}`);
      console.log(`Driver ${socket.user.pseudoID} joined ride room: ${rideID}`);
    });

    // Passenger joins ride room to receive otp_verified events
    socket.on('passenger:join_ride', ({ rideID }) => {
      socket.join(`ride_${rideID}`);
      console.log(`Passenger ${socket.user.pseudoID} joined ride room: ${rideID}`);
    });

    // ─── Referral Notifications ──────────────────────────────────────────────
    socket.on('referral:subscribe', ({ userID }) => {
      if (userID) {
        socket.join(userID);
        console.log(`User ${socket.user.pseudoID} subscribed to referral notifications`);
      }
    });

    // Legacy location update
    socket.on('update_location', ({ rideID, location }) => {
      socket.to(`ride_${rideID}`).emit('location_update', {
        rideID,
        location,
        timestamp: new Date().toISOString(),
      });
    });

    // ─── Disconnect ──────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.pseudoID}`);
      activeConnections.delete(socket.user.pseudoID);

      chatRooms.forEach((users, rideID) => {
        if (users.has(socket.user.pseudoID)) {
          users.delete(socket.user.pseudoID);
          socket.to(`ride_${rideID}`).emit('user_left_chat', {
            pseudoID: socket.user.pseudoID,
            timestamp: new Date().toISOString()
          });
        }
      });
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Chat socket handlers initialized');
};
