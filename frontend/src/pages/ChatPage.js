import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Tooltip
} from '@mui/material';
import { Send, ArrowBack } from '@mui/icons-material';
import { useSocket } from '../context/SocketContext';

const ChatPage = () => {
  const { rideID } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUser, setTypingUser] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimerRef = useRef(null);

  const keyData = JSON.parse(localStorage.getItem('keyData') || '{}');
  const userData = JSON.parse(localStorage.getItem('user') || '{}');
  const myID = keyData.userID || userData.userID || userData.walletAddress || '';
  const myRole = keyData.role || userData.role || 'user';
  const shortRide = rideID ? rideID.substring(0, 16) : '';

  useEffect(() => {
    if (socket && connected) {
      socket.emit('join_ride_chat', { rideID, userID: myID });

      socket.on('chat_history', ({ messages: history }) => {
        setMessages(history || []);
      });

      socket.on('new_message', (msg) => {
        setMessages((prev) => {
          if (prev.some(m => m.messageID === msg.messageID)) return prev;
          return [...prev, msg];
        });
      });

      socket.on('user_typing', ({ isTyping: typing, userID }) => {
        if (userID !== myID) {
          setIsTyping(typing);
          setTypingUser(userID ? userID.substring(0, 8) : '');
        }
      });

      return () => {
        socket.emit('leave_ride_chat', { rideID, userID: myID });
        socket.off('chat_history');
        socket.off('new_message');
        socket.off('user_typing');
      };
    }
  }, [socket, connected, rideID, myID]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    const trimmed = newMessage.trim();
    if (!trimmed || !socket) return;
    socket.emit('send_message', {
      rideID,
      message: trimmed,
      senderID: myID,
      senderRole: myRole
    });
    setNewMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTypingIndicator = () => {
    if (!socket) return;
    socket.emit('typing', { rideID, userID: myID, isTyping: true });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing', { rideID, userID: myID, isTyping: false });
    }, 1500);
  };

  const fmtTime = (ts) => {
    if (!ts) return '';
    try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    catch { return ''; }
  };

  // Group messages: show sender label only when sender changes
  const renderMessages = () => {
    return messages.map((msg, i) => {
      const isOwn = msg.senderID === myID;
      const prevMsg = messages[i - 1];
      const showSender = !isOwn && msg.senderID !== prevMsg?.senderID;
      const initials = (msg.senderRole || 'U').charAt(0).toUpperCase();

      return (
        <Box
          key={msg.messageID || i}
          sx={{
            display: 'flex',
            justifyContent: isOwn ? 'flex-end' : 'flex-start',
            alignItems: 'flex-end',
            gap: 0.8,
            mb: 0.5,
            px: 1,
          }}
        >
          {/* Avatar for others */}
          {!isOwn && (
            <Avatar sx={{ width: 28, height: 28, fontSize: '0.7rem', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', visibility: showSender ? 'visible' : 'hidden', flexShrink: 0 }}>
              {initials}
            </Avatar>
          )}

          {/* Bubble */}
          <Box sx={{ maxWidth: '65%', background: isOwn ? 'linear-gradient(135deg, rgba(6,182,212,0.25), rgba(139,92,246,0.2))' : 'rgba(15,23,42,0.9)', border: isOwn ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(139,92,246,0.2)', borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px', px: 1.5, py: 0.8, boxShadow: isOwn ? '0 2px 8px rgba(6,182,212,0.15)' : '0 2px 8px rgba(0,0,0,0.2)', position: 'relative' }}>
            {/* Sender role for others */}
            {showSender && !isOwn && (
              <Typography variant="caption" sx={{ color: '#06B6D4', fontWeight: 700, display: 'block', mb: 0.2, lineHeight: 1.2 }}>
                {msg.senderRole || 'User'}
              </Typography>
            )}

            {/* Message text */}
            <Typography variant="body2" sx={{ wordBreak: 'break-word', lineHeight: 1.4, color: '#F1F5F9', whiteSpace: 'pre-wrap' }}>
              {msg.message}
            </Typography>

            {/* Timestamp */}
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', color: 'rgba(148,163,184,0.6)', fontSize: '0.65rem', mt: 0.3, lineHeight: 1 }}>
              {fmtTime(msg.timestamp)}
            </Typography>
          </Box>
        </Box>
      );
    });
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#030712', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4, pb: 4 }}>
      <Container maxWidth="md" sx={{ width: '100%' }}>
      <Box sx={{ height: '82vh', display: 'flex', flexDirection: 'column', background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(24px)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '20px', overflow: 'hidden' }}>

        {/* -- Header --------------------------------------------- */}
        <Box
          sx={{
            bgcolor: '#075e54',
            color: 'white',
            px: 2,
            py: 1.2,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            flexShrink: 0,
          }}
        >
          <IconButton size="small" sx={{ color: 'white' }} onClick={() => navigate(-1)}>
            <ArrowBack />
          </IconButton>
          <Avatar sx={{ bgcolor: '#128c7e', width: 36, height: 36, fontSize: '0.9rem' }}>{`\u{1F697}`}</Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body1" fontWeight={700} lineHeight={1.2}>Ride Chat</Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {shortRide}... {`\u00B7`} {connected ? `\u{1F7E2} Online` : `\u{1F534} Offline`}
            </Typography>
          </Box>
        </Box>

        {/* -- Messages Area -------------------------------------- */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', py: 1, background: 'rgba(3,7,18,0.6)', '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(139,92,246,0.3)', borderRadius: 2 } }}>
          {messages.length === 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Box sx={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', px: 2, py: 0.8 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  {`\u{1F512}`} Visible to ride participants only
                </Typography>
              </Box>
            </Box>
          )}
          {renderMessages()}
          {isTyping && (
            <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.8, px: 2, mt: 0.5 }}>
              <Avatar sx={{ width: 26, height: 26, background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontSize: '0.6rem' }}>{`\u{1F464}`}</Avatar>
              <Box sx={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '4px 14px 14px 14px', px: 1.2, py: 0.7 }}>
                <Box sx={{ display: 'flex', gap: 0.4, alignItems: 'center' }}>
                  {[0, 180, 360].map((delay) => (
                    <Box key={delay} sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#8B5CF6',
                        animation: 'bounce 1.2s infinite',
                        animationDelay: `${delay}ms`,
                        '@keyframes bounce': {
                          '0%, 80%, 100%': { transform: 'translateY(0)' },
                          '40%': { transform: 'translateY(-5px)' },
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>

        {/* -- Input Bar ------------------------------------------- */}
        <Box sx={{ background: 'rgba(15,23,42,0.9)', px: 1.5, py: 0.8, display: 'flex', alignItems: 'flex-end', gap: 1, flexShrink: 0, borderTop: '1px solid rgba(139,92,246,0.2)' }}>
          <TextField fullWidth multiline maxRows={4} placeholder="Type a message..." value={newMessage}
            onChange={(e) => { setNewMessage(e.target.value); handleTypingIndicator(); }}
            onKeyDown={handleKeyDown} disabled={!connected} variant="outlined" size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', background: 'rgba(15,23,42,0.8)', '& fieldset': { borderColor: 'rgba(139,92,246,0.3)' }, '&:hover fieldset': { borderColor: 'rgba(6,182,212,0.5)' }, '&.Mui-focused fieldset': { borderColor: '#06B6D4' } }, '& textarea': { color: '#F1F5F9' }, '& textarea::placeholder': { color: '#64748B' } }}
          />
          <Tooltip title={connected ? 'Send' : 'Disconnected'}>
            <span>
              <IconButton onClick={handleSendMessage} disabled={!connected || !newMessage.trim()}
                sx={{ background: connected && newMessage.trim() ? 'linear-gradient(135deg, #06B6D4, #8B5CF6)' : 'rgba(100,116,139,0.3)', color: 'white', width: 40, height: 40, '&:hover': { background: 'linear-gradient(135deg, #0891B2, #7C3AED)' }, '&.Mui-disabled': { background: 'rgba(100,116,139,0.2)', color: 'rgba(255,255,255,0.3)' } }}>
                <Send fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
      </Container>
    </Box>
  );
};

export default ChatPage;
