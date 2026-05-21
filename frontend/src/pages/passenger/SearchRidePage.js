import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container, Box, Typography, Grid, Button, Chip, Avatar, TextField,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Tooltip, Paper
} from '@mui/material';
import {
  Search, Schedule, EventSeat, AttachMoney, DirectionsCar, ArrowForward, Chat, Star
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';
import LocationAutocomplete from '../../components/LocationAutocomplete';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

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

function MapAutoFit({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length >= 2) map.fitBounds(points, { padding: [40, 40] });
    else if (points.length === 1) map.setView(points[0], 13);
  }, [points, map]);
  return null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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
  const [bookDialog,    setBookDialog]    = useState(false);
  const [selectedRide,  setSelectedRide]  = useState(null);
  const [seatsToBook,   setSeatsToBook]   = useState(1);
  const [bookingInProg, setBookingInProg] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/explorer/all');
        const rides = (res.data.rides || [])
          .map(normalizeRide)
          .filter(r => ['scheduled', 'created'].includes(r.status) && r.availableSeats > 0);
        setAllRides(rides);
        const driverIDs = [...new Set(rides.map(r => r.driverID).filter(Boolean))];
        const ratingsMap = {};
        await Promise.all(driverIDs.map(async (dID) => {
          try {
            const rRes = await api.get(`/api/feedback/user/${dID}`);
            ratingsMap[dID] = { avg: rRes.data.averageRating || 0, count: rRes.data.totalReviews || 0 };
          } catch (_) { ratingsMap[dID] = { avg: 0, count: 0 }; }
        }));
        setDriverRatings(ratingsMap);
      } catch (e) { console.error('Failed to load rides', e); }
    })();
  }, []);

  useEffect(() => {
    if (!from || !to) { setRouteCoords([]); return; }
    const fLat = from.latitude ?? from.lat ?? 0;
    const fLon = from.longitude ?? from.lon ?? 0;
    const tLat = to.latitude ?? to.lat ?? 0;
    const tLon = to.longitude ?? to.lon ?? 0;
    if (!fLat || !fLon || !tLat || !tLon) return;
    fetch(`https://router.project-osrm.org/route/v1/driving/${fLon},${fLat};${tLon},${tLat}?overview=full&geometries=geojson`)
      .then(r => r.json())
      .then(data => {
        if (data.routes?.[0]?.geometry?.coordinates)
          setRouteCoords(data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]));
      }).catch(() => {});
  }, [from, to]);

  const mapPoints = useMemo(() => {
    const pts = [];
    if (from?.latitude) pts.push([from.latitude, from.longitude ?? from.lon ?? 0]);
    if (to?.latitude)   pts.push([to.latitude,   to.longitude   ?? to.lon   ?? 0]);
    results.forEach(r => { if (r.startLat && r.startLng) pts.push([r.startLat, r.startLng]); });
    return pts;
  }, [from, to, results]);

  const handleSearch = () => {
    if (!from || !to) { enqueueSnackbar('Please select both source and destination', { variant: 'warning' }); return; }
    setSearched(true); setLoading(true);
    const MAX_KM = 20;
    const fromLat = from.lat ?? from.latitude ?? 0;
    const fromLon = from.lon ?? from.longitude ?? 0;
    const toLat   = to.lat   ?? to.latitude   ?? 0;
    const toLon   = to.lon   ?? to.longitude  ?? 0;
    const filtered = allRides.filter(r => {
      if ((r.startLat === 0 && r.startLng === 0) || (fromLat === 0 && fromLon === 0)) {
        return r.startAddress.toLowerCase().includes((from.address||'').toLowerCase().slice(0,10)) &&
               r.endAddress.toLowerCase().includes((to.address||'').toLowerCase().slice(0,10));
      }
      return haversineKm(fromLat, fromLon, r.startLat, r.startLng) <= MAX_KM &&
             haversineKm(toLat, toLon, r.endLat, r.endLng) <= MAX_KM;
    }).filter(r => !date || r.departureTime?.startsWith(date))
      .filter(r => r.availableSeats >= seats);
    setResults(filtered); setLoading(false);
  };

  const openBook = (ride) => {
    setSelectedRide(ride); setSeatsToBook(1); setBookDialog(true);
  };

  // Book immediately — no payment at this step
  const handleConfirmBooking = async () => {
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
        paymentMethod:     'pending',
        totalPrice,
      };
      await api.post('/api/bookings/create', payload);
      enqueueSnackbar('Ride booked! Pay the driver after the ride starts.', { variant: 'success' });
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

  return (
    <Box sx={{ minHeight: '100vh', background: '#F8FAFC', pt: 11, pb: 8, position: 'relative' }}>
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box sx={{ position: 'absolute', top: '8%', right: '8%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
        <Box sx={{ position: 'absolute', bottom: '10%', left: '5%', width: 350, height: 350, background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)' }} />
      </Box>
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: '16px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', boxShadow: '0 0 20px rgba(139,92,246,0.3)' }}>🔍</Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Search Rides</Typography>
              <Typography variant="body2" sx={{ color: '#475569' }}>Find the perfect ride for your journey</Typography>
            </Box>
          </Box>

          <Box sx={{ p: 3, mb: 4, borderRadius: '22px', background: '#fff', border: '1px solid rgba(139,92,246,0.2)' }}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} md={4}>
                <Typography variant="body2" sx={{ color: '#475569', mb: 0.5, fontWeight: 600 }}>From *</Typography>
                <LocationAutocomplete placeholder="Search pickup location" label="Pickup Location" onLocationSelect={loc => setFrom(loc)} />
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2" sx={{ color: '#475569', mb: 0.5, fontWeight: 600 }}>To *</Typography>
                <LocationAutocomplete placeholder="Search drop location" label="Drop Location" onLocationSelect={loc => setTo(loc)} />
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
                  sx={{ height: 48, borderRadius: '12px', background: 'linear-gradient(135deg, #8B5CF6, #EC4899)', fontWeight: 700 }}>
                  {loading ? <CircularProgress size={20} color="inherit" /> : 'Search'}
                </Button>
              </Grid>
            </Grid>
          </Box>

          {/* Map Panel */}
          {(from || to || results.length > 0) && (
            <Box sx={{ mb: 3, borderRadius: '18px', overflow: 'hidden', border: '1px solid rgba(139,92,246,0.2)', background: '#fff' }}>
              {/* FIX: use Box not Typography to avoid <div> inside <p> */}
              <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" component="span" sx={{ fontWeight: 700, color: '#0F172A' }}>🗺️ Route Map</Typography>
                {routeCoords.length > 1 && (
                  <Chip label="Route loaded" size="small" sx={{ ml: 1, background: 'rgba(52,211,153,0.15)', color: '#059669', border: '1px solid rgba(52,211,153,0.3)' }} />
                )}
              </Box>
              <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: 380 }} scrollWheelZoom>
                <TileLayer attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapAutoFit points={mapPoints} />
                {from?.latitude && (<Marker position={[from.latitude, from.longitude ?? from.lon ?? 0]} icon={fromIcon}><Popup>📍 Pickup<br />{from.address}</Popup></Marker>)}
                {to?.latitude && (<Marker position={[to.latitude, to.longitude ?? to.lon ?? 0]} icon={toIcon}><Popup>🏁 Drop-off<br />{to.address}</Popup></Marker>)}
                {routeCoords.length > 1 && (<Polyline positions={routeCoords} color="#06B6D4" weight={5} opacity={0.85} />)}
                {results.map(ride => ride.startLat && ride.startLng ? (
                  <Marker key={ride.rideID} position={[ride.startLat, ride.startLng]} icon={rideIcon}>
                    <Popup>
                      <strong>🚗 {ride.startAddress}</strong><br />
                      → {ride.endAddress}<br />
                      ₹{ride.pricePerSeat}/seat · {ride.availableSeats} seat(s)
                    </Popup>
                  </Marker>
                ) : null)}
              </MapContainer>
            </Box>
          )}

          {searched && !loading && (
            <>
              <Typography variant="h6" sx={{ mb: 2, color: '#0F172A', fontWeight: 700 }}>
                {results.length > 0 ? `${results.length} ride(s) found` : 'No rides found for your route. Try a different location or date.'}
              </Typography>
              <Grid container spacing={2}>
                {results.map(ride => {
                  const rating = driverRatings[ride.driverID] || { avg: 0, count: 0 };
                  return (
                    <Grid item xs={12} key={ride.rideID}>
                      <Box sx={{ borderRadius: '20px', overflow: 'hidden', background: '#fff', border: '1px solid rgba(139,92,246,0.2)', transition: 'all 0.3s', '&:hover': { border: '1px solid rgba(6,182,212,0.4)', boxShadow: '0 12px 40px rgba(6,182,212,0.1)', transform: 'translateY(-2px)' } }}>
                        <Box sx={{ p: 3 }}>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={5}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }} noWrap>{ride.startAddress}</Typography>
                              </Box>
                              <Box sx={{ pl: 0.5 }}><ArrowForward fontSize="small" sx={{ color: '#475569' }} /></Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                                <Typography variant="body1" sx={{ fontWeight: 600, color: '#0F172A' }} noWrap>{ride.endAddress}</Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                <Chip icon={<Schedule sx={{ fontSize: '0.85rem !important' }} />}
                                  label={ride.departureTime ? new Date(ride.departureTime).toLocaleString() : 'TBD'}
                                  size="small" sx={{ background: 'rgba(100,116,139,0.1)', color: '#334155', border: '1px solid rgba(100,116,139,0.2)' }} />
                                <Chip icon={<EventSeat sx={{ fontSize: '0.85rem !important' }} />} label={`${ride.availableSeats} seat(s)`} size="small"
                                  sx={{ background: 'rgba(6,182,212,0.1)', color: '#0891B2', border: '1px solid rgba(6,182,212,0.2)' }} />
                                <Chip icon={<AttachMoney sx={{ fontSize: '0.85rem !important' }} />} label={`₹${ride.pricePerSeat}/seat`} size="small"
                                  sx={{ background: 'rgba(16,185,129,0.1)', color: '#059669', border: '1px solid rgba(16,185,129,0.2)' }} />
                                <Chip icon={<DirectionsCar sx={{ fontSize: '0.85rem !important' }} />} label={ride.rideType} size="small"
                                  sx={{ background: 'rgba(139,92,246,0.1)', color: '#7C3AED', border: '1px solid rgba(139,92,246,0.2)' }} />
                              </Box>
                            </Grid>
                            <Grid item xs={12} md={3}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Avatar sx={{ background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', width: 36, height: 36, fontSize: '1rem' }}>👤</Avatar>
                                <Box>
                                  <Typography variant="caption" sx={{ color: '#475569' }}>Driver</Typography>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Star sx={{ fontSize: 13, color: '#F59E0B' }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                                      {rating.avg > 0 ? `${rating.avg} (${rating.count})` : 'New'}
                                    </Typography>
                                  </Box>
                                  <Tooltip title="Experience points based on completed rides & reviews">
                                    <Typography variant="caption" sx={{ color: '#8B5CF6', fontWeight: 700, cursor: 'help' }}>
                                      ⚡ {rating.count * 10} XP
                                    </Typography>
                                  </Tooltip>
                                </Box>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                        <Box sx={{ px: 3, py: 1.5, borderTop: '1px solid rgba(139,92,246,0.1)', display: 'flex', gap: 1, flexWrap: 'wrap', background: 'rgba(248,250,252,0.8)' }}>
                          <Button variant="contained" size="small" onClick={() => openBook(ride)}
                            sx={{ borderRadius: '10px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700 }}>
                            Book Now
                          </Button>
                          <Button variant="outlined" size="small" onClick={() => navigate(`/ride/${ride.rideID}`)}
                            sx={{ borderRadius: '10px', borderColor: 'rgba(6,182,212,0.4)', color: '#0891B2' }}>
                            Details
                          </Button>
                          <Button variant="text" size="small" startIcon={<Chat />} onClick={() => navigate(`/chat/${ride.rideID}`)}
                            sx={{ borderRadius: '10px', color: '#475569' }}>
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
            <Box sx={{ p: 3, borderRadius: '14px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <Typography variant="body2" sx={{ color: '#0891B2', fontWeight: 500 }}>
                Select pickup &amp; drop locations above and click <strong>Search</strong> to find rides within 20 km.
              </Typography>
            </Box>
          )}
        </Box>
      </Container>

      {/* Booking Confirmation Dialog — no payment required at booking */}
      <Dialog open={bookDialog} onClose={() => setBookDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: '20px', border: '1px solid rgba(139,92,246,0.2)' } }}>
        <DialogTitle sx={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ fontSize: '1.3rem' }}>🚗</Box>
            <Typography variant="h6" fontWeight={700} color="#0F172A">Confirm Booking</Typography>
          </Box>
        </DialogTitle>
        {selectedRide && (
          <DialogContent sx={{ pt: 3 }}>
            <Paper variant="outlined" sx={{ p: 2, mb: 2.5, borderRadius: 2, background: 'rgba(248,250,252,0.8)' }}>
              <Typography variant="caption" sx={{ color: '#475569', textTransform: 'uppercase', fontWeight: 600 }}>Route</Typography>
              <Typography variant="body1" color="#0F172A" sx={{ mt: 0.5, fontWeight: 600 }}>{selectedRide.startAddress} → {selectedRide.endAddress}</Typography>
              <Typography variant="body2" sx={{ color: '#475569', mt: 1 }}>
                Available: <strong>{selectedRide.availableSeats}</strong> seats · ₹{selectedRide.pricePerSeat}/seat
              </Typography>
            </Paper>

            <TextField fullWidth label="Seats to book" type="number" size="small"
              inputProps={{ min: 1, max: selectedRide.availableSeats }}
              value={seatsToBook}
              onChange={e => setSeatsToBook(Math.min(selectedRide.availableSeats, Math.max(1, parseInt(e.target.value)||1)))}
              sx={{ mb: 2 }} />

            <Typography variant="h6" sx={{ color: '#0891B2', fontWeight: 700, mb: 2 }}>
              Total: ₹{seatsToBook * selectedRide.pricePerSeat}
            </Typography>

            <Box sx={{ p: 2, borderRadius: '12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <Typography variant="body2" sx={{ color: '#059669', fontWeight: 600 }}>
                💡 No payment needed now!
              </Typography>
              <Typography variant="caption" sx={{ color: '#047857', display: 'block', mt: 0.5 }}>
                Pay the driver directly (Cash / UPI / ETH) once the ride has started. 
                You'll see a "Pay Now" button on your bookings page.
              </Typography>
            </Box>
          </DialogContent>
        )}
        <DialogActions sx={{ borderTop: '1px solid rgba(139,92,246,0.1)', p: 2, gap: 1 }}>
          <Button onClick={() => setBookDialog(false)} sx={{ color: '#475569' }}>Cancel</Button>
          <Button variant="contained" disabled={bookingInProg} onClick={handleConfirmBooking}
            sx={{ borderRadius: '12px', background: 'linear-gradient(135deg, #06B6D4, #8B5CF6)', fontWeight: 700, px: 3 }}>
            {bookingInProg ? <CircularProgress size={20} color="inherit" /> : 'Confirm Booking'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
