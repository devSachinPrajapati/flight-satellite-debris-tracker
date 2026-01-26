/**
 * Aircraft Data Hook
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { api } from '../services/api';
import type { Aircraft } from '../types';

// ✅ FIXED: Transform backend flight data to match frontend Aircraft type exactly
const transformFlightToAircraft = (flight: any): Aircraft => {
  return {
    // Backend sends these fields directly - no transformation needed!
    hex: flight.hex || 'UNKNOWN',
    flight_icao: flight.flight_icao || undefined,
    flight_number: flight.flight_number || undefined,
    
    // Position
    lat: flight.lat || 0,
    lng: flight.lng || 0,
    alt: flight.alt || 0,
    dir: flight.dir || 0,  // Backend sends 'dir', not 'heading'
    speed: flight.speed || 0,
    v_speed: flight.v_speed || undefined,
    
    // Aircraft info
    aircraft_icao: flight.aircraft_icao || undefined,
    airline_icao: flight.airline_icao || undefined,
    flag: flight.flag || undefined,
    
    // ✅ Airport codes - backend now preserves these!
    dep_iata: flight.dep_iata || undefined,
    dep_icao: flight.dep_icao || undefined,
    arr_iata: flight.arr_iata || undefined,
    arr_icao: flight.arr_icao || undefined,
    
    // Timestamp
    updated: flight.updated || Date.now() / 1000,
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
      
      // Debug: Verify airport codes
      const withAirports = transformedAircraft.filter(a => a.dep_iata || a.arr_iata);
      console.log(`✅ ${withAirports.length} flights have airport codes`);
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
      
      // Log every 30 updates
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

  // Manual refresh function
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