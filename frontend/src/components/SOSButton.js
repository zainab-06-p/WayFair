import React, { useState } from 'react';
import { Fab, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { Warning } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../services/api';

const SOSButton = ({ rideID, bookingID }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSOSTrigger = async () => {
    setLoading(true);
    
    try {
      // Get current location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const keyData = JSON.parse(localStorage.getItem('keyData'));
            
            await api.post('/api/sos/trigger', {
              rideID,
              bookingID,
              passengerID: keyData.userID,
              location: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                address: `${position.coords.latitude}, ${position.coords.longitude}`
              }
            });

            enqueueSnackbar('SOS Alert triggered! Authorities have been notified.', { 
              variant: 'error',
              persist: true
            });
            setOpenDialog(false);
          },
          (error) => {
            enqueueSnackbar('Failed to get location. SOS alert sent without location.', { 
              variant: 'warning' 
            });
          }
        );
      }
    } catch (error) {
      enqueueSnackbar('Failed to trigger SOS alert', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Fab
        color="error"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          animation: 'pulse 2s infinite'
        }}
        onClick={() => setOpenDialog(true)}
      >
        <Warning />
      </Fab>

      <Dialog open={openDialog} onClose={() => !loading && setOpenDialog(false)}>
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          {`\u{1F6A8}`} Emergency SOS
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body1" gutterBottom>
            Are you in danger? Triggering SOS will:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2 }}>
            <li>Alert authorities</li>
            <li>Notify the driver</li>
            <li>Share your current location</li>
            <li>Record the alert on blockchain</li>
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 2, fontWeight: 'bold' }}>
            Only use this in real emergencies!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSOSTrigger} color="error" variant="contained" disabled={loading}>
            Trigger SOS Alert
          </Button>
        </DialogActions>
      </Dialog>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  );
};

export default SOSButton;
