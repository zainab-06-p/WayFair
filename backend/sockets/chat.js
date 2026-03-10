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

    // Join user to their personal room
    socket.join(socket.user.pseudoID);

    // Handle joining ride chat room
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

    // Handle leaving ride chat room
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

    // Handle sending messages
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

      // Broadcast to all users in the ride chat room (including sender)
      io.to(`ride_${rideID}`).emit('new_message', messageData);

      console.log(`Message sent in ride ${rideID} by ${senderID}`);
    });

    // Handle typing indicator
    socket.on('typing', ({ rideID, userID, isTyping }) => {
      socket.to(`ride_${rideID}`).emit('user_typing', {
        userID,
        pseudoID: socket.user.pseudoID,
        isTyping
      });
    });

    // Handle ride location updates (for real-time tracking)
    socket.on('update_location', ({ rideID, location }) => {
      socket.to(`ride_${rideID}`).emit('location_update', {
        rideID,
        location,
        timestamp: new Date().toISOString()
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.pseudoID}`);
      activeConnections.delete(socket.user.pseudoID);

      // Remove from all chat rooms
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

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  console.log('✅ Chat socket handlers initialized');
};
