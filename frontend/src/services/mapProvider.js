/**
 * mapProvider.js — Map Services Abstraction Layer
 *
 * Currently uses: OSRM (routing) + Nominatim (geocoding) — FREE, open source
 *
 * To switch to Google Maps:
 *   1. Get API key from https://console.cloud.google.com/
 *   2. Set REACT_APP_MAP_PROVIDER=google in frontend/.env
 *   3. Set REACT_APP_GOOGLE_MAPS_KEY=AIzaSy... in frontend/.env
 *   All existing callers work unchanged — same API, same response shape.
 */

const MAP_PROVIDER = process.env.REACT_APP_MAP_PROVIDER || 'osrm';
const GOOGLE_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || '';
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ─── Route Fetching ──────────────────────────────────────────────────────────
/**
 * Get driving route between two points.
 * @returns { polyline: [{lat,lng}], steps: [], distance_km, duration_min, eta_seconds, provider }
 */
export async function getRoute(originLat, originLng, destLat, destLng) {
  try {
    // Use backend routing proxy (handles both OSRM and Google Maps)
    const res = await fetch(
      `${API_BASE}/api/routing/route?originLat=${originLat}&originLng=${originLng}&destLat=${destLat}&destLng=${destLng}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }
    );
    if (!res.ok) throw new Error('Route fetch failed');
    const data = await res.json();
    return data.route;
  } catch (err) {
    console.warn('Backend routing failed, falling back to direct OSRM:', err.message);
    // Direct OSRM fallback (no auth needed)
    return getOSRMDirect(originLat, originLng, destLat, destLng);
  }
}

/**
 * Quick ETA from driver to destination.
 */
export async function getETA(driverLat, driverLng, destLat, destLng) {
  try {
    const res = await fetch(
      `${API_BASE}/api/routing/eta?originLat=${driverLat}&originLng=${driverLng}&destLat=${destLat}&destLng=${destLng}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }
    );
    if (!res.ok) throw new Error('ETA fetch failed');
    const data = await res.json();
    return data; // { eta_seconds, eta_min, distance_km }
  } catch (err) {
    return null;
  }
}

// ─── Direct OSRM (no backend, no key) ────────────────────────────────────────
async function getOSRMDirect(originLat, originLng, destLat, destLng) {
  const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes?.length) throw new Error('No route found');
  const route = data.routes[0];

  return {
    provider: 'osrm-direct',
    distance_km: (route.distance / 1000).toFixed(2),
    duration_min: Math.round(route.duration / 60),
    eta_seconds: route.duration,
    polyline: route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
    steps: (route.legs[0]?.steps || []).map(s => ({
      instruction: `${s.maneuver?.type || ''} ${s.maneuver?.modifier || ''}`.trim() || s.name,
      distance: (s.distance / 1000).toFixed(1) + ' km',
      duration: Math.round(s.duration / 60) + ' min',
      name: s.name || '',
    })),
  };
}

// ─── Geocoding (Nominatim) ────────────────────────────────────────────────────
/**
 * Search for places by text query.
 * @returns [{ display_name, lat, lon, address }]
 */
export async function searchPlace(query) {
  if (!query || query.length < 3) return [];

  if (MAP_PROVIDER === 'google' && GOOGLE_KEY) {
    return searchPlaceGoogle(query);
  }

  // Nominatim (OpenStreetMap) — free, no key
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&countrycodes=in&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
  const data = await res.json();

  return data.map(item => ({
    display_name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    address: item.display_name,
  }));
}

async function searchPlaceGoogle(query) {
  // Google Places Autocomplete — requires GOOGLE_KEY
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  return (data.results || []).map(r => ({
    display_name: r.formatted_address,
    lat: r.geometry.location.lat,
    lon: r.geometry.location.lng,
    latitude: r.geometry.location.lat,
    longitude: r.geometry.location.lng,
    address: r.formatted_address,
  }));
}

// ─── Reverse Geocoding ────────────────────────────────────────────────────────
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

export const currentProvider = MAP_PROVIDER;
