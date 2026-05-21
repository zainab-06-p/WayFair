/**
 * LiveRidePage.js — Real-time Ride Tracking
 *
 * Driver: Shares GPS location every 3 seconds via Socket.IO
 * Passenger: Sees driver moving on map with live ETA + turn-by-turn directions
 *
 * Uses OSRM for routing (no API key). Google Maps ready via mapProvider.js
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Button, CircularProgress,
  Alert, Divider, List, ListItem, ListItemText, IconButton, Tooltip,
} from '@mui/material';
import {
  Navigation, Stop, ArrowBack, DirectionsCar, LocationOn,
  Timer, Speed, MyLocation, TurnLeft, TurnRight, Straight,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { getRoute, reverseGeocode } from '../services/mapProvider';

// ─── Map Icons ────────────────────────────────────────────────────────────────
const makeSvgIcon = (svgBody, size = [36, 36], anchor = [18, 36]) =>
  new L.DivIcon({ html: svgBody, className: '', iconSize: size, iconAnchor: anchor });

const driverIcon = makeSvgIcon(`
  <div style="width:40px;height:40px;background:linear-gradient(135deg,#0891B2,#7C3AED);border-radius:50%;border:3px solid white;
    display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(8,145,178,0.5);font-size:20px;">
    🚗
  </div>`, [40, 40], [20, 40]);

const destinationIcon = makeSvgIcon(`
  <div style="width:32px;height:40px;display:flex;flex-direction:column;align-items:center;">
    <div style="width:26px;height:26px;background:#DC2626;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
  </div>`, [32, 40], [13, 40]);

// ─── Map auto-follow driver ───────────────────────────────────────────────────
function MapFollow({ position, follow }) {
  const map = useMap();
  useEffect(() => {
    if (follow && position) {
      map.setView([position.lat, position.lng], 15, { animate: true, duration: 1 });
    }
  }, [position, follow, map]);
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatETA(seconds) {
  if (!seconds) return '--';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function speedKmh(prevPos, currPos, dtMs) {
  if (!prevPos || !dtMs) return 0;
  const R = 6371000;
  const dLat = ((currPos.lat - prevPos.lat) * Math.PI) / 180;
  const dLng = ((currPos.lng - prevPos.lng) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(prevPos.lat * Math.PI / 180) * Math.cos(currPos.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((dist / (dtMs / 1000)) * 3.6);
}

export default function LiveRidePage() {
  const { rideID } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { enqueueSnackbar } = useSnackbar();

  const keyData = JSON.parse(localStorage.getItem('keyData') || '{}');
  const userRole = keyData.role || localStorage.getItem('userRole') || 'passenger';
  const isDriver = userRole === 'driver';

  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [steps, setSteps] = useState([]);
  const [eta, setEta] = useState(null);
  const [speed, setSpeed] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const [driverOnline, setDriverOnline] = useState(false);
  const [followDriver, setFollowDriver] = useState(true);

  const watchIdRef = useRef(null);
  const prevPosRef = useRef(null);
  const prevTimeRef = useRef(null);
  const etaTimerRef = useRef(null);

  // Load ride data
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/rides/${rideID}`);
        const r = res.data?.ride || res.data;
        setRide(r);

        // Load initial route from start → end
        const startLat = r.startLocation?.latitude || r.startLat;
        const startLng = r.startLocation?.longitude || r.startLng;
        const endLat = r.endLocation?.latitude || r.endLat;
        const endLng = r.endLocation?.longitude || r.endLng;

        if (startLat && endLat) {
          const route = await getRoute(startLat, startLng, endLat, endLng);
          setRouteCoords(route.polyline);
          setSteps(route.steps || []);
          setEta(route.eta_seconds);
        }
      } catch (err) {
        enqueueSnackbar('Failed to load ride', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [rideID]);

  // Socket listeners (for passenger)
  useEffect(() => {
    if (!socket) return;

    if (!isDriver) {
      // Passenger: subscribe to tracking
      socket.emit('passenger:track_ride', { rideID });

      socket.on('driver:location_update', async ({ location, speed: spd }) => {
        setDriverPos(location);
        setDriverOnline(true);
        if (spd !== undefined) setSpeed(spd);

        // Update route from driver's NEW position to destination
        if (ride) {
          const destLat = ride.endLocation?.latitude || ride.endLat;
          const destLng = ride.endLocation?.longitude || ride.endLng;
          if (destLat && destLng) {
            clearTimeout(etaTimerRef.current);
            etaTimerRef.current = setTimeout(async () => {
              try {
                const route = await getRoute(location.lat, location.lng, destLat, destLng);
                setRouteCoords(route.polyline);
                setSteps(route.steps.slice(0, 4));
                setEta(route.eta_seconds);
              } catch (_) {}
            }, 2000); // debounce route refetch
          }
        }
      });

      socket.on('driver:online', () => setDriverOnline(true));
      socket.on('driver:offline', () => setDriverOnline(false));
    }

    return () => {
      socket.off('driver:location_update');
      socket.off('driver:online');
      socket.off('driver:offline');
      clearTimeout(etaTimerRef.current);
    };
  }, [socket, isDriver, ride, rideID]);

  // Driver: GPS sharing
  const startSharing = useCallback(() => {
    if (!navigator.geolocation) {
      enqueueSnackbar('Geolocation not supported by your browser', { variant: 'error' });
      return;
    }
    setIsSharing(true);
    socket?.emit('driver:start_sharing', { rideID });

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const curr = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        const now = Date.now();
        const spd = speedKmh(prevPosRef.current, curr, now - (prevTimeRef.current || now));
        prevPosRef.current = curr;
        prevTimeRef.current = now;

        setDriverPos(curr);
        setSpeed(spd);

        socket?.emit('driver:share_location', {
          rideID,
          location: curr,
          speed: spd,
          heading: pos.coords.heading || 0,
        });
      },
      (err) => { enqueueSnackbar('GPS error: ' + err.message, { variant: 'warning' }); },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 5000 }
    );
  }, [socket, rideID]);

  const stopSharing = useCallback(() => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
    socket?.emit('driver:stop_sharing', { rideID });
  }, [socket, rideID]);

  useEffect(() => () => { stopSharing(); clearTimeout(etaTimerRef.current); }, []);

  const destLat = ride?.endLocation?.latitude || ride?.endLat;
  const destLng = ride?.endLocation?.longitude || ride?.endLng;
  const mapCenter = driverPos || (destLat ? [destLat, destLng] : [20.5937, 78.9629]);

  if (loading) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default' }}>
      <CircularProgress color="primary" />
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Top Bar */}
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1200, bgcolor: 'white', borderBottom: '1px solid', borderColor: 'divider', px: 2, py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate(-1)} size="small"><ArrowBack /></IconButton>
        <Box flex={1}>
          <Typography variant="h6" fontWeight={700} color="text.primary">
            {isDriver ? '🚗 Driver Navigation' : '📍 Live Tracking'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {ride?.startLocation?.address || 'Loading...'} → {ride?.endLocation?.address || ''}
          </Typography>
        </Box>
        <Chip
          icon={<DirectionsCar sx={{ fontSize: 14 }} />}
          label={isDriver ? (isSharing ? 'Sharing' : 'Start GPS') : (driverOnline ? 'Driver Online' : 'Waiting...')}
          color={isSharing || driverOnline ? 'success' : 'default'}
          size="small"
        />
      </Box>

      {/* Map */}
      <Box sx={{ position: 'fixed', top: 64, bottom: 0, left: 0, right: { xs: 0, md: 380 }, zIndex: 1 }}>
        <MapContainer
          center={Array.isArray(mapCenter) ? mapCenter : [mapCenter.lat, mapCenter.lng]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapFollow position={driverPos} follow={followDriver} />

          {driverPos && (
            <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon}>
              <Popup>
                🚗 Driver<br />
                Speed: {speed} km/h<br />
                ETA: {formatETA(eta)}
              </Popup>
            </Marker>
          )}

          {destLat && destLng && (
            <Marker position={[destLat, destLng]} icon={destinationIcon}>
              <Popup>🏁 Destination: {ride?.endLocation?.address}</Popup>
            </Marker>
          )}

          {routeCoords.length > 1 && (
            <Polyline
              positions={routeCoords.map(p => [p.lat, p.lng])}
              color="#0891B2"
              weight={6}
              opacity={0.8}
              dashArray={isDriver ? '10, 5' : null}
            />
          )}
        </MapContainer>

        {/* Map overlay controls */}
        <Box sx={{ position: 'absolute', bottom: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Tooltip title={followDriver ? 'Stop following driver' : 'Follow driver'}>
            <IconButton
              onClick={() => setFollowDriver(f => !f)}
              sx={{ bgcolor: 'white', boxShadow: 2, '&:hover': { bgcolor: '#E0F2FE' } }}
            >
              <MyLocation color={followDriver ? 'primary' : 'disabled'} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Side Panel */}
      <Box sx={{
        position: 'fixed', top: 64, bottom: 0, right: 0,
        width: { xs: '100%', md: 380 },
        bgcolor: 'background.paper',
        borderLeft: '1px solid', borderColor: 'divider',
        overflowY: 'auto',
        display: { xs: 'none', md: 'block' },
        zIndex: 2,
        p: 2,
      }}>
        {/* ETA + Speed Panel */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2 }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
            <Timer sx={{ color: 'primary.main', fontSize: 20 }} />
            <Typography variant="h5" fontWeight={800} color="text.primary">{formatETA(eta)}</Typography>
            <Typography variant="caption" color="text.secondary">ETA</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center' }}>
            <Speed sx={{ color: 'secondary.main', fontSize: 20 }} />
            <Typography variant="h5" fontWeight={800} color="text.primary">{speed}</Typography>
            <Typography variant="caption" color="text.secondary">km/h</Typography>
          </Paper>
        </Box>

        {/* Driver Controls */}
        {isDriver && (
          <Box sx={{ mb: 2 }}>
            <Button
              fullWidth
              variant="contained"
              color={isSharing ? 'error' : 'primary'}
              startIcon={isSharing ? <Stop /> : <Navigation />}
              onClick={isSharing ? stopSharing : startSharing}
              sx={{ borderRadius: 2, py: 1.2, fontWeight: 700 }}
            >
              {isSharing ? 'Stop Location Sharing' : 'Start Sharing Location'}
            </Button>
            {isSharing && (
              <Alert severity="success" sx={{ mt: 1, borderRadius: 2 }}>
                📡 Broadcasting location to passengers in real-time
              </Alert>
            )}
          </Box>
        )}

        {/* Passenger status */}
        {!isDriver && (
          <Alert
            severity={driverOnline ? 'success' : 'info'}
            sx={{ mb: 2, borderRadius: 2 }}
          >
            {driverOnline
              ? `🚗 Driver is ${speed > 0 ? `moving at ${speed} km/h` : 'nearby'}`
              : '⏳ Waiting for driver to start sharing location...'}
          </Alert>
        )}

        {/* Turn-by-turn directions */}
        {steps.length > 0 && (
          <>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" sx={{ mb: 1 }}>
              Turn-by-turn Directions
            </Typography>
            <List dense disablePadding>
              {steps.slice(0, 6).map((step, i) => (
                <ListItem key={i} disableGutters sx={{ py: 0.5, alignItems: 'flex-start' }}>
                  <Box sx={{ mr: 1.5, mt: 0.3 }}>
                    {step.instruction?.includes('left') ? (
                      <TurnLeft sx={{ color: 'primary.main', fontSize: 20 }} />
                    ) : step.instruction?.includes('right') ? (
                      <TurnRight sx={{ color: 'secondary.main', fontSize: 20 }} />
                    ) : (
                      <Straight sx={{ color: 'success.main', fontSize: 20 }} />
                    )}
                  </Box>
                  <ListItemText
                    primary={
                      <Typography variant="body2" color="text.primary" fontWeight={i === 0 ? 700 : 400}>
                        {step.instruction}{step.name ? ` on ${step.name}` : ''}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary">
                        {step.distance} · {step.duration}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Route info */}
        {routeCoords.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<LocationOn sx={{ fontSize: 14 }} />}
                label={`${ride?.startLocation?.address?.split(',')[0] || 'Start'} → ${ride?.endLocation?.address?.split(',')[0] || 'End'}`}
                size="small"
                variant="outlined"
              />
              <Chip icon={<Timer sx={{ fontSize: 14 }} />} label={formatETA(eta)} size="small" color="primary" variant="outlined" />
            </Box>
          </>
        )}
      </Box>

      {/* Mobile Bottom Sheet (ETA + controls) */}
      <Paper
        elevation={8}
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed', bottom: 0, left: 0, right: 0,
          borderRadius: '20px 20px 0 0', p: 2, zIndex: 1100,
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={800} color="text.primary">{formatETA(eta)}</Typography>
            <Typography variant="caption" color="text.secondary">ETA · {speed} km/h</Typography>
          </Box>
          {isDriver && (
            <Button
              variant="contained"
              color={isSharing ? 'error' : 'primary'}
              startIcon={isSharing ? <Stop /> : <Navigation />}
              onClick={isSharing ? stopSharing : startSharing}
              sx={{ borderRadius: 3, fontWeight: 700 }}
            >
              {isSharing ? 'Stop' : 'Share GPS'}
            </Button>
          )}
        </Box>
        {steps[0] && (
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            Next: {steps[0].instruction}{steps[0].name ? ` on ${steps[0].name}` : ''} ({steps[0].distance})
          </Typography>
        )}
      </Paper>
    </Box>
  );
}
