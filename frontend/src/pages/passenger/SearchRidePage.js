import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Paper, Grid, Card, CardContent, CardActions,
  Button, Chip, Avatar, TextField, Divider, CircularProgress, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, RadioGroup,
  FormControlLabel, Radio, FormControl, FormLabel, InputAdornment, Tooltip
} from '@mui/material';
import {
  Search, LocationOn, Schedule, EventSeat, AttachMoney, Person,
  DirectionsCar, ArrowForward, Chat, Star
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import LocationAutocomplete from '../../components/LocationAutocomplete';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
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
const fromIcon = makeSvgIcon('#22c55e');
const toIcon   = makeSvgIcon('#ef4444');
const rideIcon = makeSvgIcon('#3b82f6');

/* -- Map auto-fit bounds helper --------------------------------- */
function MapAutoFit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(points, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }
  }, [points, map]);
  return null;
}
/* -- helpers -------------------------------------------------------- */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeRide(r) {
  return {
    ...r,
    startAddress: r.startLocation?.address || r.startAddress || 'N/A',
    endAddress:   r.endLocation?.address   || r.endAddress   || 'N/A',
    startLat: parseFloat(r.startLocation?.latitude  || r.startLat  || 0),
    startLng: parseFloat(r.startLocation?.longitude || r.startLng  || 0),
    endLat:   parseFloat(r.endLocation?.latitude    || r.endLat    || 0),
    endLng:   parseFloat(r.endLocation?.longitude   || r.endLng    || 0),
    availableSeats: r.availableSeats ?? r.AvailableSeats ?? 0,
    pricePerSeat:   r.pricePerSeat   ?? r.PricePerSeat   ?? 0,
    status:    r.status    || 'scheduled',
    rideType:  r.rideType  || 'solo',
    driverID:  r.driverID  || r.DriverID  || '',
  };
}

/* -- component ----------------------------------------------------- */
export default function SearchRidePage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const keyData = JSON.parse(localStorage.getItem('keyData') || '{}');

  const [from, setFrom]   = useState(null);
  const [to,   setTo]     = useState(null);
  const [date, setDate]   = useState('');
  const [seats, setSeats] = useState(1);

  const [allRides,      setAllRides]      = useState([]);
  const [results,       setResults]       = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [searched,      setSearched]      = useState(false);
  const [driverRatings, setDriverRatings] = useState({});
  const [routeCoords,   setRouteCoords]   = useState([]);

  // Booking dialog
  const [bookDialog,   setBookDialog]   = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [seatsToBook,  setSeatsToBook]  = useState(1);
  const [payMethod,    setPayMethod]    = useState('cash');
  const [upiId,        setUpiId]        = useState('');
  const [bookingInProg, setBookingInProg] = useState(false);

  /* Load all rides once on mount */
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/explorer/all');
        const rides = (res.data.rides || [])
          .map(normalizeRide)
          .filter(r => ['scheduled', 'created'].includes(r.status) && r.availableSeats > 0);
        setAllRides(rides);

        // Pre-fetch driver ratings
        const driverIDs = [...new Set(rides.map(r => r.driverID).filter(Boolean))];
        const ratingsMap = {};
        await Promise.all(
          driverIDs.map(async (dID) => {
            try {
              const rRes = await api.get(`/api/feedback/user/${dID}`);
              ratingsMap[dID] = { avg: rRes.data.averageRating || 0, count: rRes.data.totalReviews || 0 };
            } catch (_) { ratingsMap[dID] = { avg: 0, count: 0 }; }
          })
        );
        setDriverRatings(ratingsMap);
      } catch (e) {
        console.error('Failed to load rides', e);
      }
    })();
  }, []);

  /* Fetch OSRM route when from/to change */
  useEffect(() => {
    if (!from || !to) { setRouteCoords([]); return; }
    const fLat = from.latitude ?? from.lat ?? 0;
    const fLon = from.longitude ?? from.lon ?? 0;
    const tLat = to.latitude ?? to.lat ?? 0;
    const tLon = to.longitude ?? to.lon ?? 0;
    if (!fLat || !fLon || !tLat || !tLon) return;
    const url = `https://router.project-osrm.org/route/v1/driving/${fLon},${fLat};${tLon},${tLat}?overview=full&geometries=geojson`;
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]?.geometry?.coordinates) {
          setRouteCoords(data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]));
        }
      })
      .catch(() => {});
  }, [from, to]);

  /* Map bounding-box points */
  const mapPoints = useMemo(() => {
    const pts = [];
    if (from?.latitude) pts.push([from.latitude, from.longitude ?? from.lon ?? 0]);
    if (to?.latitude)   pts.push([to.latitude,   to.longitude   ?? to.lon   ?? 0]);
    results.forEach(r => { if (r.startLat && r.startLng) pts.push([r.startLat, r.startLng]); });
    return pts;
  }, [from, to, results]);

  const handleSearch = () => {
    if (!from || !to) {
      enqueueSnackbar('Please select both source and destination', { variant: 'warning' });
      return;
    }
    setSearched(true);
    setLoading(true);
    const MAX_KM = 20;
    const fromLat = from.lat ?? from.latitude ?? 0;
    const fromLon = from.lon ?? from.longitude ?? 0;
    const toLat   = to.lat   ?? to.latitude   ?? 0;
    const toLon   = to.lon   ?? to.longitude  ?? 0;

    const filtered = allRides.filter(r => {
      // Fallback to text match if coordinates are missing
      if ((r.startLat === 0 && r.startLng === 0) || (fromLat === 0 && fromLon === 0)) {
        return (
          r.startAddress.toLowerCase().includes((from.address || '').toLowerCase().slice(0, 10)) &&
          r.endAddress.toLowerCase().includes((to.address || '').toLowerCase().slice(0, 10))
        );
      }
      return (
        haversineKm(fromLat, fromLon, r.startLat, r.startLng) <= MAX_KM &&
        haversineKm(toLat,   toLon,   r.endLat,   r.endLng)   <= MAX_KM
      );
    }).filter(r => !date || r.departureTime?.startsWith(date))
      .filter(r => r.availableSeats >= seats);
    setResults(filtered);
    setLoading(false);
  };

  const openBook = (ride) => {
    setSelectedRide(ride);
    setSeatsToBook(1);
    setPayMethod('cash');
    setUpiId('');
    setBookDialog(true);
  };

  const handleBook = async () => {
    if (!selectedRide) return;
    setBookingInProg(true);
    try {
      const totalPrice = seatsToBook * selectedRide.pricePerSeat;
      const payload = {
        rideID:            selectedRide.rideID,
        passengerID:       keyData.userID,
        passengerPseudoID: keyData.pseudoID || keyData.userID,
        seatsBooked:       seatsToBook,
        pickupAddress:     from?.address || selectedRide.startAddress,
        pickupLat:         String(from?.lat || selectedRide.startLat),
        pickupLng:         String(from?.lon || selectedRide.startLng),
        dropAddress:       to?.address || selectedRide.endAddress,
        dropLat:           String(to?.lat  || selectedRide.endLat),
        dropLng:           String(to?.lon  || selectedRide.endLng),
        paymentMethod:     payMethod,
        upiId:             payMethod === 'upi' ? upiId : undefined,
        totalPrice,
      };

      if (payMethod === 'upi' && upiId) {
        const amount   = totalPrice.toFixed(2);
        const upiLink  = `upi://pay?pa=${upiId}&pn=RideShare&am=${amount}&cu=INR&tn=RideBooking_${selectedRide.rideID}`;
        window.location.href = upiLink;
        await new Promise(r => setTimeout(r, 2000)); // give UPI app time to open
      }

      const res = await api.post('/api/bookings/create', payload);
      enqueueSnackbar(`Booking confirmed! ID: ${res.data.bookingID}`, { variant: 'success' });
      setBookDialog(false);
      setAllRides(prev => prev.map(r =>
        r.rideID === selectedRide.rideID ? { ...r, availableSeats: r.availableSeats - seatsToBook } : r
      ));
      setResults(prev => prev.map(r =>
        r.rideID === selectedRide.rideID ? { ...r, availableSeats: r.availableSeats - seatsToBook } : r
      ).filter(r => r.availableSeats > 0));
    } catch (err) {
      enqueueSnackbar(err.response?.data?.error || 'Booking failed', { variant: 'error' });
    } finally {
      setBookingInProg(false);
    }
  };

  /* -- render ------------------------------------------------------- */
  return (
    <Box sx={{ minHeight: '100vh', background: '#030712', pt: 11, pb: 8, position: 'relative' }}>
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '8%', right: '8%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '10%', left: '5%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', boxShadow: '0 0 20px rgba(139,92,246,0.4)' }}>{`\u{1F50D}`}</Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#F1F5F9', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Search Rides</Typography>
              <Typography variant="body2" sx={{ color: '#64748B' }}>Find the perfect ride for your journey</Typography>
            </Box>
          </Box>

          <Box sx={{
            p: 3, mb: 4, borderRadius: '22px',
            background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(139,92,246,0.25)',
          }}>
            <Grid container spacing={2} alignItems="flex-end">
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>From *</Typography>
              <LocationAutocomplete
                placeholder="Search pickup location"
                label="Pickup Location"
                onLocationSelect={loc => setFrom(loc)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>To *</Typography>
              <LocationAutocomplete
                placeholder="Search drop location"
                label="Drop Location"
                onLocationSelect={loc => setTo(loc)}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField fullWidth label="Date" type="date" size="small"
                InputLabelProps={{ shrink: true }} value={date}
                onChange={e => setDate(e.target.value)} />
            </Grid>
            <Grid item xs={6} md={1}>
              <TextField fullWidth label="Seats" type="number" size="small"
                inputProps={{ min: 1, max: 6 }} value={seats}
                onChange={e => setSeats(Math.max(1, parseInt(e.target.value) || 1))} />
            </Grid>
            <Grid item xs={12} md={1}>
              <Button fullWidth variant="contained" size="large" startIcon={<Search />}
                onClick={handleSearch} disabled={loading}
                sx={{ height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', fontWeight: 700, boxShadow: '0 8px 24px rgba(139,92,246,0.35)', '&:hover': { transform: 'scale(1.02)' } }}>
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Search'}
              </Button>
            </Grid>
          </Grid>
          </Box>

        {/* -- Map Panel ----------------------------------------------- */}
        {(from || to || results.length > 0) && (
          <Box sx={{ mb: 3, borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(139,92,246,0.2)', background: 'rgba(15,23,42,0.7)' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#F1F5F9' }}>
                {`\u{1F5FA}\uFE0F`} Route Map
                {routeCoords.length > 1 && (
                  <Chip label="Route loaded" size="small" sx={{ ml: 1, background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)' }} />
                )}
              </Typography>
            </Box>
            <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: 380 }} scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapAutoFit points={mapPoints} />
              {from?.latitude && (
                <Marker position={[from.latitude, from.longitude ?? from.lon ?? 0]} icon={fromIcon}>
                  <Popup>{`\u{1F4CD}`} Pickup<br />{from.address}</Popup>
                </Marker>
              )}
              {to?.latitude && (
                <Marker position={[to.latitude, to.longitude ?? to.lon ?? 0]} icon={toIcon}>
                  <Popup>{`\u{1F3C1}`} Drop-off<br />{to.address}</Popup>
                </Marker>
              )}
              {routeCoords.length > 1 && (
                <Polyline positions={routeCoords} color="#06B6D4" weight={5} opacity={0.85} />
              )}
              {results.map(ride =>
                ride.startLat && ride.startLng ? (
                  <Marker key={ride.rideID} position={[ride.startLat, ride.startLng]} icon={rideIcon}>
                    <Popup>
                      <strong>{`\u{1F697}`} {ride.startAddress}</strong><br />
                      {`\u2192`} {ride.endAddress}<br />
                      {`\u20B9`}{ride.pricePerSeat}/seat {`\u00B7`} {ride.availableSeats} seat(s)
                    </Popup>
                  </Marker>
                ) : null
              )}
            </MapContainer>
          </Box>
        )}

        {searched && !loading && (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {results.length > 0 ? `${results.length} ride(s) found` : 'No rides found for your route. Try a different location or date.'}
            </Typography>
            <Grid container spacing={2}>
              {results.map(ride => {
                const rating = driverRatings[ride.driverID] || { avg: 0, count: 0 };
                return (
                  <Grid item xs={12} key={ride.rideID}>
                    <Box sx={{
                      borderRadius: '20px', overflow: 'hidden',
                      background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      transition: 'all 0.3s',
                      '&:hover': { border: '1px solid rgba(6,182,212,0.4)', boxShadow: '0 12px 40px rgba(6,182,212,0.12)', transform: 'translateY(-2px)' }
                    }}>
                      <Box sx={{ p: 3 }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} md={5}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
                              <Typography variant="body1" sx={{ fontWeight: 600, color: '#F1F5F9' }} noWrap>{ride.startAddress}</Typography>
                            </Box>
                            <Box sx={{ pl: 0.5 }}><ArrowForward fontSize="small" sx={{ color: '#64748B' }} /></Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#F87171', flexShrink: 0 }} />
                              <Typography variant="body1" sx={{ fontWeight: 600, color: '#F1F5F9' }} noWrap>{ride.endAddress}</Typography>
                            </Box>
                          </Grid>

                          <Grid item xs={12} md={4}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                              <Chip icon={<Schedule sx={{ fontSize: '0.85rem !important' }} />}
                                label={ride.departureTime ? new Date(ride.departureTime).toLocaleString() : 'TBD'}
                                size="small" sx={{ background: 'rgba(100,116,139,0.15)', color: '#94A3B8', border: '1px solid rgba(100,116,139,0.2)' }} />
                              <Chip icon={<EventSeat sx={{ fontSize: '0.85rem !important' }} />} label={`${ride.availableSeats} seat(s)`} size="small"
                                sx={{ background: 'rgba(6,182,212,0.15)', color: '#06B6D4', border: '1px solid rgba(6,182,212,0.25)' }} />
                              <Chip icon={<AttachMoney sx={{ fontSize: '0.85rem !important' }} />} label={`\u20B9${ride.pricePerSeat}/seat`} size="small"
                                sx={{ background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.25)' }} />
                              <Chip icon={<DirectionsCar sx={{ fontSize: '0.85rem !important' }} />} label={ride.rideType} size="small"
                                sx={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.25)' }} />
                            </Box>
                          </Grid>

                          <Grid item xs={12} md={3}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', width: 36, height: 36, fontSize: '1rem' }}>{`\u{1F464}`}</Avatar>
                              <Box>
                                <Typography variant="caption" sx={{ color: '#64748B' }}>Driver</Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Star sx={{ fontSize: 13, color: '#FBBF24' }} />
                                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#F1F5F9' }}>
                                    {rating.avg > 0 ? `${rating.avg} (${rating.count})` : 'New'}
                                  </Typography>
                                </Box>
                                <Tooltip title="Experience points based on completed rides & reviews">
                                  <Typography variant="caption" sx={{ color: '#8B5CF6', fontWeight: 700, cursor: 'help' }}>
                                    {`\u26A1`} {rating.count * 10} XP
                                  </Typography>
                                </Tooltip>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                      <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid rgba(139,92,246,0.1)', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Button variant="contained" size="small" onClick={() => openBook(ride)}
                          sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700, '&:hover': { transform: 'scale(1.02)' } }}>
                          Book Now
                        </Button>
                        <Button variant="outlined" size="small" onClick={() => navigate(`/ride/${ride.rideID}`)}
                          sx={{ borderRadius: '10px', borderColor: 'rgba(6,182,212,0.4)', color: '#06B6D4', '&:hover': { background: 'rgba(6,182,212,0.08)' } }}>
                          Details
                        </Button>
                        <Button variant="text" size="small" startIcon={<Chat />} onClick={() => navigate(`/chat/${ride.rideID}`)}
                          sx={{ borderRadius: '10px', color: '#94A3B8' }}>
                          Chat
                        </Button>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}

        {!searched && (
          <Box sx={{ p: 3, borderRadius: '14px', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', color: '#06B6D4' }}>
            <Typography variant="body2">
              Select pickup &amp; drop locations above and click <strong>Search</strong> to find rides within 20 km.
            </Typography>
          </Box>
        )}
        </Box>
      </Container>

      {/* Booking Dialog */}
      <Dialog open={bookDialog} onClose={() => setBookDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: '#0F172A', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '20px' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid rgba(139,92,246,0.15)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ fontSize: '1.3rem' }}>{`\u{1F697}`}</Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#F1F5F9', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Confirm Booking</Typography>
          </Box>
        </DialogTitle>
        {selectedRide && (
          <DialogContent sx={{ pt: 3 }}>
            <Box sx={{ p: 2.5, mb: 2, borderRadius: '14px', background: 'rgba(30,41,59,0.8)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <Typography variant="caption" sx={{ color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>Route</Typography>
              <Typography variant="body1" sx={{ color: '#F1F5F9', mt: 0.5 }}>{selectedRide.startAddress} {`\u2192`} {selectedRide.endAddress}</Typography>
              <Typography variant="body2" sx={{ mt: 1, color: '#94A3B8' }}>
                Available: <strong style={{ color: '#06B6D4' }}>{selectedRide.availableSeats}</strong> seats &nbsp;|&nbsp; {`\u20B9`}{selectedRide.pricePerSeat}/seat
              </Typography>
            </Box>

            <TextField fullWidth label="Seats to book" type="number" size="small"
              inputProps={{ min: 1, max: selectedRide.availableSeats }}
              value={seatsToBook}
              onChange={e => setSeatsToBook(Math.min(selectedRide.availableSeats, Math.max(1, parseInt(e.target.value) || 1)))}
              sx={{ mb: 2 }} />

            <Typography variant="h6" sx={{ color: '#06B6D4', mb: 2, fontWeight: 700 }}>
              Total: {`\u20B9`}{seatsToBook * selectedRide.pricePerSeat}
            </Typography>

            <FormControl component="fieldset">
              <FormLabel sx={{ color: '#94A3B8 !important' }}>Payment Method</FormLabel>
              <RadioGroup row value={payMethod} onChange={e => setPayMethod(e.target.value)}>
                <FormControlLabel value="cash"     control={<Radio />} label="Cash" />
                <FormControlLabel value="upi"      control={<Radio />} label="UPI" />
                <FormControlLabel value="ethereum" control={<Radio />} label="MetaMask ETH" />
              </RadioGroup>
            </FormControl>

            {payMethod === 'upi' && (
              <Box sx={{ mt: 2 }}>
                <TextField fullWidth label="Driver's UPI ID" size="small" placeholder="driver@upi"
                  value={upiId} onChange={e => setUpiId(e.target.value)}
                  InputProps={{ endAdornment: (
                    <InputAdornment position="end">
                      <Button size="small" onClick={() => {
                        if (!upiId) return;
                        const amt = (seatsToBook * selectedRide.pricePerSeat).toFixed(2);
                        window.location.href = `upi://pay?pa=${upiId}&pn=RideShare&am=${amt}&cu=INR`;
                      }} disabled={!upiId}>Open App</Button>
                    </InputAdornment>
                  )}} />
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  Tap "Open App" to pay, then click Confirm.
                </Typography>
              </Box>
            )}
            {payMethod === 'ethereum' && (
              <Alert severity="info" sx={{ mt: 2, borderRadius: '12px' }}>
                MetaMask will prompt for {`\u20B9`}{(seatsToBook * selectedRide.pricePerSeat / 200000).toFixed(6)} ETH after confirmation.
              </Alert>
            )}
          </DialogContent>
        )}
        <DialogActions sx={{ borderTop: '1px solid rgba(139,92,246,0.15)', p: 2 }}>
          <Button onClick={() => setBookDialog(false)} disabled={bookingInProg}
            sx={{ borderRadius: '10px', color: '#64748B' }}>Cancel</Button>
          <Button variant="contained" onClick={handleBook}
            disabled={bookingInProg || (payMethod === 'upi' && !upiId)}
            sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700 }}>
            {bookingInProg ? <CircularProgress size={20} color="inherit" /> : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

