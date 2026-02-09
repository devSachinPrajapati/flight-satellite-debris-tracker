/**
 * Aircraft Data Hook - FIXED WITH SMARTER RECONNECTION
 * 
 * Keeps data on temporary disconnects
 * Only clears on prolonged connection loss
 * Better status tracking
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { api } from '../services/api';
import type { Aircraft } from '../types';

const transformFlightToAircraft = (flight: any): Aircraft => {
  return {
    hex: flight.hex || 'UNKNOWN',
    flight_icao: flight.flight_icao || undefined,
    flight_number: flight.flight_number || undefined,
    
    lat: flight.lat || 0,
    lng: flight.lng || 0,
    alt: flight.alt || 0,
    dir: flight.dir || 0,
    speed: flight.speed || 0,
    v_speed: flight.v_speed || undefined,
    
    aircraft_icao: flight.aircraft_icao || undefined,
    airline_icao: flight.airline_icao || undefined,
    flag: flight.flag || undefined,
    
    dep_iata: flight.dep_iata || undefined,
    dep_icao: flight.dep_icao || undefined,
    arr_iata: flight.arr_iata || undefined,
    arr_icao: flight.arr_icao || undefined,
    
    updated: flight.updated || Date.now() / 1000,
  };
};

export function useAircraftData(_refreshInterval: number = 5000) {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  
  const hasReceivedDataRef = useRef(false);
  const lastConnectionStateRef = useRef(false);
  const disconnectTimeRef = useRef<number | null>(null); // ✅ Track when disconnected

  // Initial data load
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

  // Set initial aircraft
  useEffect(() => {
    if (initialData?.data && initialData.data.length > 0) {
      const transformedAircraft = initialData.data.map(transformFlightToAircraft);
      setAircraft(transformedAircraft);
      setLastFetchTime(new Date());
      setStatus('ok');
      hasReceivedDataRef.current = true;
      console.log(`📦 Loaded ${transformedAircraft.length} aircraft initially`);
      
      const withAirports = transformedAircraft.filter(a => a.dep_iata || a.arr_iata);
      console.log(`✅ ${withAirports.length} flights have airport codes`);
    }
  }, [initialData]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'initial_data' && message.data?.flights) {
      const transformedAircraft = message.data.flights.map(transformFlightToAircraft);
      setAircraft(transformedAircraft);
      setLastFetchTime(new Date());
      setStatus('ok');
      hasReceivedDataRef.current = true;
      disconnectTimeRef.current = null; // ✅ Clear disconnect timer
      console.log(`📡 Received initial data: ${transformedAircraft.length} aircraft`);
    } else if (message.type === 'position_update' && message.data?.flights) {
      const transformedAircraft = message.data.flights.map(transformFlightToAircraft);
      setAircraft(transformedAircraft);
      setLastFetchTime(new Date());
      setStatus('ok');
      hasReceivedDataRef.current = true;
      disconnectTimeRef.current = null; // ✅ Clear disconnect timer
      
      // Log occasionally
      if (Math.random() < 0.033) {
        console.log(`📡 Position update: ${transformedAircraft.length} aircraft`);
      }
    }
  }, []);

  const { isConnected, connectionQuality, forceReconnect } = useWebSocket(handleWebSocketMessage);

  // ✅ IMPROVED: Handle disconnection with grace period
  useEffect(() => {
    const wasConnected = lastConnectionStateRef.current;
    const isNowConnected = isConnected;

    if (wasConnected !== isNowConnected) {
      if (isNowConnected) {
        // Reconnected
        console.log('🔄 WebSocket reconnected - refreshing aircraft data');
        disconnectTimeRef.current = null;
        refetch();
      } else {
        // Disconnected - start timer
        console.log('⚠️ WebSocket disconnected - starting grace period');
        disconnectTimeRef.current = Date.now();
        
        // ✅ Only mark as error after prolonged disconnect (30 seconds)
        setTimeout(() => {
          if (disconnectTimeRef.current && 
              Date.now() - disconnectTimeRef.current > 30000) {
            console.log('❌ Prolonged disconnection - marking data as stale');
            setStatus('error');
          }
        }, 30000);
      }
    }

    lastConnectionStateRef.current = isNowConnected;
  }, [isConnected, refetch]);

  // ✅ IMPROVED: Monitor connection quality with grace period
  useEffect(() => {
    if (connectionQuality === 'lost') {
      // Only clear if disconnected for >30s
      if (disconnectTimeRef.current && 
          Date.now() - disconnectTimeRef.current > 30000) {
        console.log('❌ Connection lost for >30s - clearing stale data');
        setStatus('error');
      } else {
        console.log('⚠️ Connection lost - keeping data for now');
        setStatus('error'); // Mark as error but keep data
      }
    } else if (connectionQuality === 'good' && hasReceivedDataRef.current) {
      setStatus('ok');
      disconnectTimeRef.current = null;
    }
  }, [connectionQuality]);

  // Update status
  useEffect(() => {
    if (isLoading) {
      setStatus('idle');
    } else if (error) {
      setStatus('error');
      console.error('❌ Error loading aircraft:', error);
    } else if (isConnected && hasReceivedDataRef.current) {
      setStatus('ok');
    }
  }, [isLoading, error, isConnected]);

  // Manual refresh
  const refresh = useCallback(() => {
    console.log('🔄 Manually refreshing aircraft data...');
    hasReceivedDataRef.current = false;
    disconnectTimeRef.current = null;
    refetch();
  }, [refetch]);

  // Force reconnect
  const reconnect = useCallback(() => {
    console.log('🔄 Forcing WebSocket reconnection...');
    hasReceivedDataRef.current = false;
    disconnectTimeRef.current = null;
    forceReconnect();
  }, [forceReconnect]);

  return {
    aircraft,
    isLoading: isLoading && aircraft.length === 0,
    error: error ? (error as Error).message : null,
    lastFetchTime,
    status,
    isConnected,
    connectionQuality,
    refresh,
    reconnect,
  };
}