import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Autocomplete,
  InputAdornment,
  Chip,
  Avatar,
  Tooltip
} from '@mui/material';
import { LocationOn, Person } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

/* -- Leaflet SVG icon factory ----------------------------------- */
const makeSvgIcon = (color) => new L.DivIcon({
  html: `<svg width="25" height="41" viewBox="0 0 25 41" xmlns="http://www.w3.org/2000/svg">
    <path fill="${color}" stroke="#fff" stroke-width="2"
      d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
    <circle fill="white" cx="12.5" cy="12.5" r="5"/>
  </svg>`,
  className: '',
  iconSize:    [25, 41],
  iconAnchor:  [12, 41],
  popupAnchor: [1, -34],
});
const startIcon = makeSvgIcon('#22c55e');
const endIcon   = makeSvgIcon('#ef4444');

/* -- Map helper: auto-fit bounds -------------------------------- */
function MapAutoFit({ startLoc, endLoc }) {
  const map = useMap();
  useEffect(() => {
    if (startLoc && endLoc) {
      map.fitBounds(
        [[startLoc.lat, startLoc.lng], [endLoc.lat, endLoc.lng]],
        { padding: [50, 50] }
      );
    } else if (startLoc) {
      map.setView([startLoc.lat, startLoc.lng], 13);
    } else if (endLoc) {
      map.setView([endLoc.lat, endLoc.lng], 13);
    }
  }, [startLoc, endLoc, map]);
  return null;
}

/* -- Map helper: click to set location ------------------------- */
function MapClickHandler({ onSet }) {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const r = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const d = await r.json();
        onSet({ address: d.display_name, lat, lng });
      } catch {
        onSet({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
      }
    },
  });
  return null;
}

const CreateRidePage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // Load user info for profile avatar
  const storedUserStr = localStorage.getItem('user');
  const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
  const storedKeyStr = localStorage.getItem('keyData');
  const storedKey = storedKeyStr ? JSON.parse(storedKeyStr) : {};
  const userName = storedUser?.name || storedKey?.name || 'Driver';
  const profilePicHash = storedUser?.profilePic || storedKey?.profilePic || null;
  const profilePicUrl = profilePicHash
    ? `https://gateway.pinata.cloud/ipfs/${profilePicHash}`
    : null;
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startLocation: null,
    endLocation: null,
    departureTime: '',
    availableSeats: 1,
    pricePerSeat: '',
    rideType: 'solo'
  });

  // Autocomplete states
  const [startOptions, setStartOptions] = useState([]);
  const [endOptions, setEndOptions] = useState([]);
  const [startSearch, setStartSearch] = useState('');
  const [endSearch, setEndSearch] = useState('');
  const [searchingStart, setSearchingStart] = useState(false);
  const [searchingEnd, setSearchingEnd] = useState(false);

  // Map state
  const [routeCoords, setRouteCoords] = useState([]);
  const [mapMode, setMapMode] = useState('start'); // 'start' | 'end'

  // Debounced search for start location
  useEffect(() => {
    if (startSearch.length < 3) {
      setStartOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingStart(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(startSearch)}&limit=5`
        );
        const data = await response.json();
        setStartOptions(data.map(item => ({
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        })));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchingStart(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [startSearch]);

  // Debounced search for end location
  useEffect(() => {
    if (endSearch.length < 3) {
      setEndOptions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearchingEnd(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endSearch)}&limit=5`
        );
        const data = await response.json();
        setEndOptions(data.map(item => ({
          address: item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon)
        })));
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchingEnd(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [endSearch]);

  // Fetch OSRM route when both locations are selected
  useEffect(() => {
    const s = formData.startLocation;
    const e = formData.endLocation;
    if (!s || !e) { setRouteCoords([]); return; }
    const url = `https://router.project-osrm.org/route/v1/driving/${s.lng},${s.lat};${e.lng},${e.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          setRouteCoords(data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        }
      })
      .catch(() => {});
  }, [formData.startLocation, formData.endLocation]);

  const handleMapClick = (loc) => {
    if (mapMode === 'start') {
      setFormData(prev => ({ ...prev, startLocation: loc }));
      setStartSearch(loc.address.slice(0, 60));
    } else {
      setFormData(prev => ({ ...prev, endLocation: loc }));
      setEndSearch(loc.address.slice(0, 60));
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const keyData = userStr ? JSON.parse(userStr) : null;
      const storedKeyData = localStorage.getItem('keyData');
      const parsedKeyData = storedKeyData ? JSON.parse(storedKeyData) : null;
      
      const userID = keyData?.userID || parsedKeyData?.userID;
      
      if (!formData.startLocation || !formData.endLocation) {
        throw new Error('Please select both start and end locations');
      }

      await api.post('/api/rides/create', {
        driverID: userID,
        ...formData
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      enqueueSnackbar('Ride created successfully!', { variant: 'success' });
      navigate('/dashboard');
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || err.message || 'Failed to create ride', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', pt: 10, pb: 8, position: 'relative' }}>
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '5%', right: '5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '10%', left: '5%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>
      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 4 }}>
          {/* Header */}
          <Box sx={{
            p: { xs: 2.5, md: 4 }, mb: 3,
            background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(24px)',
            borderRadius: '24px', border: '1px solid rgba(139,92,246,0.3)',
            position: 'relative', overflow: 'hidden',
          }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #06B6D4, #8B5CF6, #EC4899)' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 0.5 }}>
                  {`\u{1F697}`} Create a New Ride
                </Typography>
                <Typography variant="body2" sx={{ color: '#334155' }}>
                  Share your journey and earn while helping others reach their destination
                </Typography>
              </Box>
              <Tooltip title="View Profile">
                <Avatar
                  src={profilePicUrl}
                  onClick={() => navigate('/profile')}
                  sx={{
                    width: 64, height: 64, cursor: 'pointer',
                    background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                    border: '2px solid rgba(139,92,246,0.5)',
                    boxShadow: '0 0 20px rgba(139,92,246,0.4)',
                    fontSize: '1.6rem', fontWeight: 800,
                    '&:hover': { transform: 'scale(1.08)' }, transition: 'transform 0.2s',
                  }}
                >
                  {!profilePicUrl && (userName.charAt(0).toUpperCase() || <Person />)}
                </Avatar>
              </Tooltip>
            </Box>
          </Box>

          <Box sx={{
            p: { xs: 2.5, md: 4 }, borderRadius: '24px',
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}>
            <form onSubmit={handleSubmit}>
              {/* Start Location Autocomplete */}
              <Box sx={{ mt: 2 }}>
                <Typography variant="body1" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {`\u{1F4CD}`} Pick-up Location *
                </Typography>
                <Autocomplete
                  freeSolo
                  options={startOptions}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.address}
                  loading={searchingStart}
                  onInputChange={(e, value) => setStartSearch(value)}
                  onChange={(e, value) => {
                    if (value && typeof value === 'object') {
                      setFormData({ ...formData, startLocation: value });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Type your starting location..."
                      variant="outlined"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOn color="primary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <>
                            {searchingStart ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      helperText="Start typing to search locations (minimum 3 characters)"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">{option.address}</Typography>
                    </Box>
                  )}
                />
                {formData.startLocation && (
                  <Chip 
                    label={formData.startLocation.address} 
                    onDelete={() => setFormData({ ...formData, startLocation: null })}
                    color="primary"
                    sx={{ mt: 1 }}
                    icon={<LocationOn />}
                  />
                )}
              </Box>

              {/* End Location Autocomplete */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="body1" gutterBottom sx={{ fontWeight: 600, color: 'secondary.main' }}>
                  {`\u{1F3C1}`} Drop-off Location *
                </Typography>
                <Autocomplete
                  freeSolo
                  options={endOptions}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.address}
                  loading={searchingEnd}
                  onInputChange={(e, value) => setEndSearch(value)}
                  onChange={(e, value) => {
                    if (value && typeof value === 'object') {
                      setFormData({ ...formData, endLocation: value });
                    }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      placeholder="Type your destination..."
                      variant="outlined"
                      fullWidth
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <LocationOn color="secondary" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <>
                            {searchingEnd ? <CircularProgress size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                      helperText="Start typing to search destinations (minimum 3 characters)"
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">{option.address}</Typography>
                    </Box>
                  )}
                />
                {formData.endLocation && (
                  <Chip 
                    label={formData.endLocation.address} 
                    onDelete={() => setFormData({ ...formData, endLocation: null })}
                    color="secondary"
                    sx={{ mt: 1 }}
                    icon={<LocationOn />}
                  />
                )}
              </Box>

              {/* -- Map Route Preview -- */}
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body1" fontWeight={600}>{`\u{1F5FA}\uFE0F`} Route Preview</Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip
                      label={`\u{1F7E2} Set Pickup`}
                      size="small"
                      onClick={() => setMapMode('start')}
                      color={mapMode === 'start' ? 'success' : 'default'}
                      variant={mapMode === 'start' ? 'filled' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip
                      label={`\u{1F534} Set Destination`}
                      size="small"
                      onClick={() => setMapMode('end')}
                      color={mapMode === 'end' ? 'error' : 'default'}
                      variant={mapMode === 'end' ? 'filled' : 'outlined'}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  Click on the map to {mapMode === 'start' ? 'set your pickup location' : 'set your destination'}
                </Typography>
                <Box sx={{ border: '1px solid #e0e0e0', borderRadius: 2, overflow: 'hidden' }}>
                  <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: 320 }} scrollWheelZoom>
                    <TileLayer
                      attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapClickHandler onSet={handleMapClick} />
                    <MapAutoFit startLoc={formData.startLocation} endLoc={formData.endLocation} />
                    {formData.startLocation && (
                      <Marker
                        position={[formData.startLocation.lat, formData.startLocation.lng]}
                        icon={startIcon}
                      >
                        <Popup>{`\u{1F4CD}`} Pickup<br />{formData.startLocation.address}</Popup>
                      </Marker>
                    )}
                    {formData.endLocation && (
                      <Marker
                        position={[formData.endLocation.lat, formData.endLocation.lng]}
                        icon={endIcon}
                      >
                        <Popup>{`\u{1F3C1}`} Drop-off<br />{formData.endLocation.address}</Popup>
                      </Marker>
                    )}
                    {routeCoords.length > 1 && (
                      <Polyline positions={routeCoords} color="#667eea" weight={5} opacity={0.85} />
                    )}
                  </MapContainer>
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Departure Time"
                name="departureTime"
                type="datetime-local"
                value={formData.departureTime}
                onChange={handleChange}
                margin="normal"
                InputLabelProps={{ shrink: true }}
                required
                sx={{ mt: 3 }}
              />

              <TextField
                fullWidth
                label="Available Seats"
                name="availableSeats"
                type="number"
                value={formData.availableSeats}
                onChange={handleChange}
                margin="normal"
                inputProps={{ min: 1, max: 8 }}
                required
                helperText="How many passengers can you accommodate?"
              />

              <TextField
                fullWidth
                label={`Price Per Seat (₹)`}
                name="pricePerSeat"
                type="number"
                value={formData.pricePerSeat}
                onChange={handleChange}
                margin="normal"
                inputProps={{ min: 1, max: 10000, step: 1 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
                required
                helperText="Enter any fare from ₹1 to ₹10,000 per seat"
              />

              <FormControl fullWidth margin="normal" required>
                <InputLabel>Ride Type</InputLabel>
                <Select
                  name="rideType"
                  value={formData.rideType}
                  onChange={handleChange}
                  label="Ride Type"
                >
                  <MenuItem value="solo">Solo (One Passenger Only)</MenuItem>
                  <MenuItem value="carpool">Carpooling (Multiple Passengers)</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || !formData.startLocation || !formData.endLocation}
                  sx={{
                    py: 1.5, fontSize: '1.05rem', fontWeight: 700, borderRadius: '14px',
                    background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)',
                    boxShadow: '0 8px 24px rgba(6,182,212,0.35)',
                    '&:hover': { transform: 'scale(1.02)', boxShadow: '0 12px 32px rgba(6,182,212,0.45)' },
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Create Ride'}
                </Button>
                <Button
                  fullWidth variant="outlined" size="large"
                  onClick={() => navigate('/dashboard')}
                  sx={{ py: 1.5, fontSize: '1.05rem', fontWeight: 700, borderRadius: '14px', borderColor: 'rgba(139,92,246,0.4)', color: '#8B5CF6', '&:hover': { background: 'rgba(139,92,246,0.08)' } }}
                >
                  Cancel
                </Button>
              </Box>
            </form>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default CreateRidePage;
