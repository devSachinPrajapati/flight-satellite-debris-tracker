/**
 * ❌ THIS FILE IS DEPRECATED
 * 
 * All aircraft data now comes from the backend via:
 * - useAircraftData hook (uses WebSocket + REST API)
 * - api.getFlights() for initial load
 * 
 * DO NOT import or use this file.
 * 
 * The backend (FastAPI) fetches from AirLabs and provides:
 * - Real-time updates via WebSocket
 * - Interpolated positions
 * - All aircraft data with proper types
 * 
 * If you need aircraft data, use:
 * 
 * import { useAircraftData } from '../hooks/useAircraftData';
 * 
 * const { aircraft, isLoading, error } = useAircraftData();
 */

export const DEPRECATED_MESSAGE = `
This service is deprecated. Use useAircraftData hook instead.
All data now comes from the backend.
`;

// Export empty functions to prevent build errors
export const fetchAircraftData = async () => {
  console.error(DEPRECATED_MESSAGE);
  return [];
};