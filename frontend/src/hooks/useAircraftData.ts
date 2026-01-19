// import { useState, useEffect, useCallback } from "react";
// import type { Aircraft } from "../types";
// import { fetchAircraftData } from "../services/aircraftService";

// export const useAircraftData = (updateInterval = 5000) => {
//   const [aircraft, setAircraft] = useState<Aircraft[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);
//   const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
//   const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

//   const loadAircraftData = useCallback(async () => {
//     try {
//       const data = await fetchAircraftData();
//       setAircraft(data);
//       setLastFetchTime(new Date());
//       setStatus("ok");
//       setError(null);
//       console.log(`✈️ Loaded ${data.length} aircraft`);
//     } catch (err) {
//       setError(
//         err instanceof Error ? err.message : "Failed to load aircraft data"
//       );
//       setStatus("error");
//       console.error("Aircraft fetch error:", err);
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     console.log(`🔄 Aircraft data refresh interval: ${updateInterval}ms`);
//     loadAircraftData();

//     const interval = setInterval(loadAircraftData, updateInterval);

//     return () => clearInterval(interval);
//   }, [loadAircraftData, updateInterval]);

//   return {
//     aircraft,
//     isLoading,
//     error,
//     lastFetchTime,
//     status,
//     refresh: loadAircraftData,
//   };
// };


// ********************************************************

// /**
//  * Aircraft Data Hook - Combines initial REST load with WebSocket updates
//  * This hook maintains compatibility with your existing codebase
//  */
// import { useState, useCallback, useEffect, useRef } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import { useWebSocket } from './useWebSocket';
// import { api } from '../services/api';
// import type { Aircraft } from '../types';

// // Transform backend flight data to your Aircraft type
// const transformFlightToAircraft = (flight: any): Aircraft => {
//   return {
//     hex: flight.id || flight.hex || flight.callsign || 'UNKNOWN',
//     flight_icao: flight.callsign || flight.flight_icao || null,
//     lat: flight.lat || 0,
//     lng: flight.lng || 0,
//     alt: flight.alt || 0,
//     dir: flight.heading || flight.dir || 0,
//     speed: flight.speed || 0,
//     aircraft_icao: flight.aircraft || flight.aircraft_icao || null,
//     airline_icao: flight.airline_icao || null,
//     flag: flight.flag || null,
//     dep_icao: flight.dep_icao || null,
//     arr_icao: flight.arr_icao || null,
//     dep_iata: flight.dep_iata || null,
//     arr_iata: flight.arr_iata || null,
//     // status: flight.status || 'en-route',
//     updated: flight.updated_at ? new Date(flight.updated_at).getTime() : Date.now(),
//   };
// };

// export function useAircraftData(_refreshInterval: number = 5000) {
//   const [aircraft, setAircraft] = useState<Aircraft[]>([]);
//   const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
//   const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
//   const wsConnectedRef = useRef(false);

//   // Initial data load via TanStack Query (NO POLLING!)
//   const { 
//     data: initialData, 
//     isLoading, 
//     error,
//     refetch 
//   } = useQuery({
//     queryKey: ['aircraft'],
//     queryFn: api.getFlights,
//     staleTime: Infinity, // Never auto-refetch
//     refetchOnWindowFocus: false,
//     refetchOnMount: false,
//     refetchOnReconnect: false,
//     retry: 3,
//     retryDelay: 1000,
//   });

//   // Set initial aircraft when loaded
//   useEffect(() => {
//     if (initialData?.data && initialData.data.length > 0) {
//       const transformedAircraft = initialData.data.map(transformFlightToAircraft);
//       setAircraft(transformedAircraft);
//       setLastFetchTime(new Date());
//       setStatus('success');
//       console.log(`📦 Loaded ${transformedAircraft.length} aircraft initially`);
//     }
//   }, [initialData]);

//   // Real-time updates via WebSocket
//   const handleWebSocketMessage = useCallback((message: any) => {
//     if (message.type === 'initial_data' && message.data?.flights) {
//       const transformedAircraft = message.data.flights.map(transformFlightToAircraft);
//       setAircraft(transformedAircraft);
//       setLastFetchTime(new Date());
//       setStatus('success');
//       console.log(`📡 Received initial data: ${transformedAircraft.length} aircraft`);
//       wsConnectedRef.current = true;
//     } else if (message.type === 'position_update' && message.data?.flights) {
//       const transformedAircraft = message.data.flights.map(transformFlightToAircraft);
//       setAircraft(transformedAircraft);
//       setLastFetchTime(new Date());
//       setStatus('success');
//       // Only log every 30 updates to avoid console spam
//       if (Math.random() < 0.033) {
//         console.log(`📡 Position update: ${transformedAircraft.length} aircraft`);
//       }
//     }
//   }, []);

//   const { isConnected } = useWebSocket(handleWebSocketMessage);

//   // Update status based on loading and connection state
//   useEffect(() => {
//     if (isLoading) {
//       setStatus('loading');
//     } else if (error) {
//       setStatus('error');
//       console.error('❌ Error loading aircraft:', error);
//     } else if (isConnected || wsConnectedRef.current) {
//       setStatus('success');
//     }
//   }, [isLoading, error, isConnected]);

//   // Manual refresh function (refetches from REST API)
//   const refresh = useCallback(() => {
//     console.log('🔄 Manually refreshing aircraft data...');
//     refetch();
//   }, [refetch]);

//   return {
//     aircraft,
//     isLoading: isLoading && aircraft.length === 0,
//     error: error ? (error as Error).message : null,
//     lastFetchTime,
//     status,
//     isConnected,
//     refresh,
//   };
// }


// /**
//  * Aircraft Data Hook - Combines initial REST load with WebSocket updates
//  * This hook maintains compatibility with your existing codebase
//  */
// import { useState, useCallback, useEffect, useRef } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import { useWebSocket } from './useWebSocket';
// import { api } from '../services/api';
// import type { Aircraft } from '../types';

// // Transform backend flight data to your Aircraft type
// const transformFlightToAircraft = (flight: any): Aircraft => {
//   return {
//     hex: flight.id || flight.hex || flight.callsign || 'UNKNOWN',
//     flight_icao: flight.callsign || flight.flight_icao || undefined,
//     lat: flight.lat || 0,
//     lng: flight.lng || 0,
//     alt: flight.alt || 0,
//     dir: flight.heading || flight.dir || 0,
//     speed: flight.speed || 0,
//     aircraft_icao: flight.aircraft || flight.aircraft_icao || undefined,
//     airline_icao: flight.airline_icao || undefined,
//     flag: flight.flag || undefined,
//     dep_icao: flight.dep_icao || undefined,
//     arr_icao: flight.arr_icao || undefined,
//     dep_iata: flight.dep_iata || undefined,
//     arr_iata: flight.arr_iata || undefined,
//     // status: flight.status || undefined,
//     updated: flight.updated_at ? new Date(flight.updated_at).getTime() : Date.now(),
//     v_speed: flight.v_speed || undefined,
//     flight_number: flight.flight_number || undefined,
//   };
// };

// export function useAircraftData(_refreshInterval: number = 5000) {
//   const [aircraft, setAircraft] = useState<Aircraft[]>([]);
//   const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
//   const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle'); // ✅ FIXED: Match StatsPanel type
//   const wsConnectedRef = useRef(false);

//   // Initial data load via TanStack Query (NO POLLING!)
//   const { 
//     data: initialData, 
//     isLoading, 
//     error,
//     refetch 
//   } = useQuery({
//     queryKey: ['aircraft'],
//     queryFn: api.getFlights,
//     staleTime: Infinity, // Never auto-refetch
//     refetchOnWindowFocus: false,
//     refetchOnMount: false,
//     refetchOnReconnect: false,
//     retry: 3,
//     retryDelay: 1000,
//   });

//   // Set initial aircraft when loaded
//   useEffect(() => {
//     if (initialData?.data && initialData.data.length > 0) {
//       const transformedAircraft = initialData.data.map(transformFlightToAircraft);
//       setAircraft(transformedAircraft);
//       setLastFetchTime(new Date());
//       setStatus('ok'); // ✅ FIXED: Use 'ok' instead of 'success'
//       console.log(`📦 Loaded ${transformedAircraft.length} aircraft initially`);
//     }
//   }, [initialData]);

//   // Real-time updates via WebSocket
//   const handleWebSocketMessage = useCallback((message: any) => {
//     if (message.type === 'initial_data' && message.data?.flights) {
//       const transformedAircraft = message.data.flights.map(transformFlightToAircraft);
//       setAircraft(transformedAircraft);
//       setLastFetchTime(new Date());
//       setStatus('ok'); // ✅ FIXED: Use 'ok' instead of 'success'
//       console.log(`📡 Received initial data: ${transformedAircraft.length} aircraft`);
//       wsConnectedRef.current = true;
//     } else if (message.type === 'position_update' && message.data?.flights) {
//       const transformedAircraft = message.data.flights.map(transformFlightToAircraft);
//       setAircraft(transformedAircraft);
//       setLastFetchTime(new Date());
//       setStatus('ok'); // ✅ FIXED: Use 'ok' instead of 'success'
//       // Only log every 30 updates to avoid console spam
//       if (Math.random() < 0.033) {
//         console.log(`📡 Position update: ${transformedAircraft.length} aircraft`);
//       }
//     }
//   }, []);

//   const { isConnected } = useWebSocket(handleWebSocketMessage);

//   // Update status based on loading and connection state
//   useEffect(() => {
//     if (isLoading) {
//       setStatus('idle');
//     } else if (error) {
//       setStatus('error');
//       console.error('❌ Error loading aircraft:', error);
//     } else if (isConnected || wsConnectedRef.current) {
//       setStatus('ok');
//     }
//   }, [isLoading, error, isConnected]);

//   // Manual refresh function (refetches from REST API)
//   const refresh = useCallback(() => {
//     console.log('🔄 Manually refreshing aircraft data...');
//     refetch();
//   }, [refetch]);

//   return {
//     aircraft,
//     isLoading: isLoading && aircraft.length === 0,
//     error: error ? (error as Error).message : null,
//     lastFetchTime,
//     status,
//     isConnected,
//     refresh,
//   };
// }



// hooks/useAircraftData.ts - FIXED TO PRESERVE AIRPORT CODES
/**
 * Aircraft Data Hook - WITH AIRPORT CODE PRESERVATION
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { api } from '../services/api';
import type { Aircraft } from '../types';

// ✅ FIXED: Transform backend flight data - PRESERVE ALL FIELDS
const transformFlightToAircraft = (flight: any): Aircraft => {
  return {
    hex: flight.id || flight.hex || flight.callsign || 'UNKNOWN',
    flight_icao: flight.callsign || flight.flight_icao || undefined,
    lat: flight.lat || 0,
    lng: flight.lng || 0,
    alt: flight.alt || 0,
    dir: flight.heading || flight.dir || 0,
    speed: flight.speed || 0,
    aircraft_icao: flight.aircraft || flight.aircraft_icao || undefined,
    airline_icao: flight.airline_icao || undefined,
    flag: flight.flag || undefined,
    // ✅ PRESERVE AIRPORT CODES
    dep_icao: flight.dep_icao || undefined,
    arr_icao: flight.arr_icao || undefined,
    dep_iata: flight.dep_iata || undefined,
    arr_iata: flight.arr_iata || undefined,
    updated: flight.updated_at ? new Date(flight.updated_at).getTime() : Date.now(),
    v_speed: flight.v_speed || undefined,
    flight_number: flight.flight_number || undefined,
  };
};

export function useAircraftData(_refreshInterval: number = 5000) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const wsConnectedRef = useRef(false);

  // Initial data load via TanStack Query (NO POLLING!)
  const { 
    data: initialData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['aircraft'],
    queryFn: api.getFlights,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 3,
    retryDelay: 1000,
  });

  // Set initial aircraft when loaded
  useEffect(() => {
    if (initialData?.data && initialData.data.length > 0) {
      const transformedAircraft = initialData.data.map(transformFlightToAircraft);
      setAircraft(transformedAircraft);
      setLastFetchTime(new Date());
      setStatus('ok');
      console.log(`📦 Loaded ${transformedAircraft.length} aircraft initially`);
      
      // ✅ DEBUG: Log first aircraft to verify airport codes
      if (transformedAircraft[0]) {
        console.log('Sample aircraft with airport codes:', {
          callsign: transformedAircraft[0].flight_icao,
          dep_iata: transformedAircraft[0].dep_iata,
          arr_iata: transformedAircraft[0].arr_iata,
          dep_icao: transformedAircraft[0].dep_icao,
          arr_icao: transformedAircraft[0].arr_icao
        });
      }
    }
  }, [initialData]);

  // Real-time updates via WebSocket
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'initial_data' && message.data?.flights) {
      const transformedAircraft = message.data.flights.map(transformFlightToAircraft);
      setAircraft(transformedAircraft);
      setLastFetchTime(new Date());
      setStatus('ok');
      console.log(`📡 Received initial data: ${transformedAircraft.length} aircraft`);
      wsConnectedRef.current = true;
    } else if (message.type === 'position_update' && message.data?.flights) {
      const transformedAircraft = message.data.flights.map(transformFlightToAircraft);
      setAircraft(transformedAircraft);
      setLastFetchTime(new Date());
      setStatus('ok');
      // Only log every 30 updates to avoid console spam
      if (Math.random() < 0.033) {
        console.log(`📡 Position update: ${transformedAircraft.length} aircraft`);
      }
    }
  }, []);

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  // Update status based on loading and connection state
  useEffect(() => {
    if (isLoading) {
      setStatus('idle');
    } else if (error) {
      setStatus('error');
      console.error('❌ Error loading aircraft:', error);
    } else if (isConnected || wsConnectedRef.current) {
      setStatus('ok');
    }
  }, [isLoading, error, isConnected]);

  // Manual refresh function (refetches from REST API)
  const refresh = useCallback(() => {
    console.log('🔄 Manually refreshing aircraft data...');
    refetch();
  }, [refetch]);

  return {
    aircraft,
    isLoading: isLoading && aircraft.length === 0,
    error: error ? (error as Error).message : null,
    lastFetchTime,
    status,
    isConnected,
    refresh,
  };
}