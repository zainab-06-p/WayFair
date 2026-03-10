import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box } from '@mui/material';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapPicker = ({ onSelect, onClose }) => {
  const [position, setPosition] = useState(null);

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
      },
    });

    return position === null ? null : (
      <Marker position={position} />
    );
  };

  const handleConfirm = async () => {
    if (position) {
      // Reverse geocoding to get address (using Nominatim)
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.lat}&lon=${position.lng}`
        );
        const data = await response.json();
        
        onSelect({
          latitude: position.lat,
          longitude: position.lng,
          address: data.display_name || `${position.lat}, ${position.lng}`
        });
      } catch (error) {
        onSelect({
          latitude: position.lat,
          longitude: position.lng,
          address: `${position.lat}, ${position.lng}`
        });
      }
    }
  };

  return (
    <Dialog open fullWidth maxWidth="md" onClose={onClose}>
      <DialogTitle>Select Location on Map</DialogTitle>
      <DialogContent>
        <Box sx={{ height: '500px', mt: 1 }}>
          <MapContainer
            center={[40.7128, -74.0060]} // Default to NYC
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url={process.env.REACT_APP_LEAFLET_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'}
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <LocationMarker />
          </MapContainer>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" disabled={!position}>
          Confirm Location
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MapPicker;
