/**
 * Routing Service — OSRM (Open Source) now, Google Maps ready for future
 *
 * To switch to Google Maps:
 *   1. Add GOOGLE_MAPS_KEY=your_key to .env
 *   2. Set MAP_PROVIDER=google in .env
 *   Everything else stays the same — same endpoint, same response format.
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');

const MAP_PROVIDER = process.env.MAP_PROVIDER || 'osrm';
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_KEY || '';

// ─── OSRM Route (open source, no key) ────────────────────────────────────────
async function getOSRMRoute(originLng, originLat, destLng, destLat) {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true&annotations=true`;
  const { data } = await axios.get(url, { timeout: 8000 });

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No route found');
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  const coords = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

  const steps = (leg.steps || []).map(step => ({
    instruction: step.maneuver?.type
      ? `${step.maneuver.type} ${step.maneuver.modifier || ''}`.trim()
      : step.name || 'Continue',
    distance: (step.distance / 1000).toFixed(1) + ' km',
    duration: Math.round(step.duration / 60) + ' min',
    name: step.name || '',
    coordinates: step.geometry?.coordinates?.map(([lng, lat]) => ({ lat, lng })) || [],
  }));

  return {
    provider: 'osrm',
    distance_km: (route.distance / 1000).toFixed(2),
    duration_min: Math.round(route.duration / 60),
    eta_seconds: route.duration,
    polyline: coords,
    steps,
    raw: null, // don't expose raw for bandwidth
  };
}

// ─── Google Maps Route (future integration) ───────────────────────────────────
async function getGoogleRoute(originLat, originLng, destLat, destLng) {
  if (!GOOGLE_MAPS_KEY) throw new Error('Google Maps API key not configured');

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&mode=driving&key=${GOOGLE_MAPS_KEY}`;
  const { data } = await axios.get(url, { timeout: 8000 });

  if (data.status !== 'OK' || !data.routes.length) {
    throw new Error(`Google Maps error: ${data.status}`);
  }

  const route = data.routes[0];
  const leg = route.legs[0];

  // Decode Google's polyline
  const polyline = decodeGooglePolyline(route.overview_polyline.points);

  const steps = leg.steps.map(step => ({
    instruction: step.html_instructions.replace(/<[^>]*>/g, ''),
    distance: step.distance.text,
    duration: step.duration.text,
    name: '',
    coordinates: [],
  }));

  return {
    provider: 'google',
    distance_km: (leg.distance.value / 1000).toFixed(2),
    duration_min: Math.round(leg.duration.value / 60),
    eta_seconds: leg.duration.value,
    polyline,
    steps,
  };
}

// Google encoded polyline decoder
function decodeGooglePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1; lat += dlat;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1; lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// ─── Unified Route Endpoint ───────────────────────────────────────────────────
/**
 * GET /api/routing/route?originLat=&originLng=&destLat=&destLng=
 */
router.get('/route', async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;

    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Missing coordinates: originLat, originLng, destLat, destLng required' });
    }

    let route;
    if (MAP_PROVIDER === 'google' && GOOGLE_MAPS_KEY) {
      route = await getGoogleRoute(originLat, originLng, destLat, destLng);
    } else {
      route = await getOSRMRoute(originLng, originLat, destLng, destLat);
    }

    res.json({ success: true, route });
  } catch (error) {
    console.error('Routing error:', error.message);
    res.status(500).json({ error: 'Failed to fetch route', details: error.message });
  }
});

/**
 * GET /api/routing/eta?originLat=&originLng=&destLat=&destLng=
 * Quick ETA-only endpoint for live tracking
 */
router.get('/eta', async (req, res) => {
  try {
    const { originLat, originLng, destLat, destLng } = req.query;
    if (!originLat || !originLng || !destLat || !destLng) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    let route;
    if (MAP_PROVIDER === 'google' && GOOGLE_MAPS_KEY) {
      route = await getGoogleRoute(originLat, originLng, destLat, destLng);
    } else {
      route = await getOSRMRoute(originLng, originLat, destLng, destLat);
    }

    res.json({
      success: true,
      eta_seconds: route.eta_seconds,
      eta_min: route.duration_min,
      distance_km: route.distance_km,
      provider: route.provider,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compute ETA', details: error.message });
  }
});

module.exports = router;
