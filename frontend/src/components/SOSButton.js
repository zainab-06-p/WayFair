import React, { useState, useEffect } from 'react';
import { Fab, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { Warning } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';
import { getActiveUser } from '../utils/authUtils';

// Inject pulse keyframe once via a real <style> tag (not JSX `global`)
const injectPulseStyle = () => {
  if (document.getElementById('sos-pulse-style')) return;
  const style = document.createElement('style');
  style.id = 'sos-pulse-style';
  style.textContent = `
    @keyframes sos-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(211,47,47,0.4); }
      50% { transform: scale(1.08); box-shadow: 0 0 0 12px rgba(211,47,47,0); }
    }
  `;
  document.head.appendChild(style);
};

const SOSButton = ({ rideID, bookingID }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { injectPulseStyle(); }, []);

  const handleSOSTrigger = async () => {
    setLoading(true);
    try {
      const keyData = getActiveUser();

      const sendSOS = async (location = null) => {
        await api.post('/api/sos/trigger', {
          rideID,
          bookingID,
          passengerID: keyData.userID,
          location: location || { latitude: 0, longitude: 0, address: 'Location unavailable' },
        });
        enqueueSnackbar('🚨 SOS Alert triggered! Authorities have been notified.', {
          variant: 'error',
          persist: true,
        });
        setOpenDialog(false);
      };

      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            await sendSOS({
              latitude:  position.coords.latitude,
              longitude: position.coords.longitude,
              address:   `${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`,
            });
            setLoading(false);
          },
          async () => {
            await sendSOS();
            setLoading(false);
          }
        );
      } else {
        await sendSOS();
        setLoading(false);
      }
    } catch (error) {
      enqueueSnackbar('Failed to trigger SOS alert', { variant: 'error' });
      setLoading(false);
    }
  };

  return (
    <>
      <Fab
        color="error"
        size="medium"
        title="Emergency SOS"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 9999,
          animation: 'sos-pulse 2s infinite',
          boxShadow: '0 4px 20px rgba(211,47,47,0.5)',
        }}
        onClick={() => setOpenDialog(true)}
      >
        <Warning />
      </Fab>

      <Dialog open={openDialog} onClose={() => !loading && setOpenDialog(false)}
        PaperProps={{ sx: { borderRadius: '20px', border: '2px solid #EF4444' } }}>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white', fontWeight: 700 }}>
          🚨 Emergency SOS
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom sx={{ color: '#0F172A', fontWeight: 600 }}>
            Are you in danger? Triggering SOS will:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, color: '#334155' }}>
            <li>🚨 Alert authorities immediately</li>
            <li>📍 Share your current GPS location</li>
            <li>📱 <strong>Alert your emergency contact</strong> with your live location</li>
            <li>🚗 Send driver's name, vehicle & license plate to your emergency contact</li>
            <li>⛓️ Record the alert on blockchain</li>
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 700 }}>
            ⚠️ Only use this in real emergencies!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} disabled={loading} sx={{ color: '#475569' }}>
            Cancel
          </Button>
          <Button onClick={handleSOSTrigger} color="error" variant="contained"
            disabled={loading}
            sx={{ borderRadius: '50px', fontWeight: 700, px: 3 }}>
            {loading ? 'Sending...' : '🚨 Trigger SOS Alert'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SOSButton;

