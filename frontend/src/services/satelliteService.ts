/**
 * ❌ THIS FILE IS DEPRECATED
 * 
 * All satellite data now comes from the backend via:
 * - useSatelliteData hook (uses WebSocket + REST API)
 * - api.getSatellites() for initial load
 * 
 * DO NOT import or use this file.
 * 
 * The backend (FastAPI) fetches from Celestrak and provides:
 * - Real-time updates via WebSocket
 * - TLE propagation
 * - Satellite/debris classification
 * - All orbital parameters
 * 
 * If you need satellite data, use:
 * 
 * import { useSatelliteData } from '../hooks/useSatelliteData';
 * 
 * const { satellites, debris, isLoading, error } = useSatelliteData();
 */

export const DEPRECATED_MESSAGE = `
This service is deprecated. Use useSatelliteData hook instead.
All data now comes from the backend.
`;

// Export empty functions to prevent build errors
export const fetchSatelliteData = async () => {
  console.error(DEPRECATED_MESSAGE);
  return { satellites: [], debris: [] };
};

export const updateSatellitePositions = () => {
  console.error(DEPRECATED_MESSAGE);
  return [];
};