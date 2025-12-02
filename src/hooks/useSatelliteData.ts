// import { useState, useEffect, useCallback } from "react";
// import type { SatelliteObject } from "../types";
// import { fetchSatelliteData } from "../services/satelliteService";

// export const useSatelliteData = (updateInterval = 10000) => {
//   const [satellites, setSatellites] = useState<SatelliteObject[]>([]);
//   const [debris, setDebris] = useState<SatelliteObject[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const loadSatelliteData = useCallback(async () => {
//     try {
//       const data = await fetchSatelliteData();
//       setSatellites(data.satellites);
//       setDebris(data.debris);
//       setError(null);
//     } catch (err) {
//       setError(
//         err instanceof Error ? err.message : "Failed to load satellite data"
//       );
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadSatelliteData();

//     const interval = setInterval(loadSatelliteData, updateInterval);

//     return () => clearInterval(interval);
//   }, [loadSatelliteData, updateInterval]);

//   return { satellites, debris, isLoading, error, refresh: loadSatelliteData };
// };


import { useState, useEffect, useCallback } from 'react';
import type { SatelliteObject } from '../types';
import { fetchSatelliteData, updateSatellitePositions } from '../services/satelliteService';

export const useSatelliteData = (updateInterval = 5000) => {
  const [satellites, setSatellites] = useState<SatelliteObject[]>([]);
  const [debris, setDebris] = useState<SatelliteObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());

  const loadSatelliteData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchSatelliteData();
      setSatellites(data.satellites);
      setDebris(data.debris);
      setLastFetchTime(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load satellite data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    loadSatelliteData();

    // Fetch new TLE data every 6 hours (TLE data doesn't change frequently)
    const tleInterval = setInterval(loadSatelliteData, 6 * 60 * 60 * 1000);

    return () => clearInterval(tleInterval);
  }, [loadSatelliteData]);

  // Update positions more frequently using existing TLE data
  useEffect(() => {
    const positionInterval = setInterval(() => {
      const currentTime = new Date();
      
      setSatellites(prev => updateSatellitePositions(prev, currentTime));
      setDebris(prev => updateSatellitePositions(prev, currentTime));
    }, updateInterval);

    return () => clearInterval(positionInterval);
  }, [updateInterval]);

  return { 
    satellites, 
    debris, 
    isLoading, 
    error, 
    lastFetchTime,
    refresh: loadSatelliteData 
  };
};