/**
 * Satellite Data Hook - Combines initial REST load with WebSocket updates
 * This hook maintains compatibility with your existing codebase
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { api } from '../services/api';
import type { SatelliteObject } from '../types';

// Transform backend satellite data to your SatelliteObject type
const transformSatelliteData = (satellite: any): SatelliteObject => {
  return {
    norad_id: satellite.norad_id || satellite.id || 'UNKNOWN',
    name: satellite.name || 'Unknown Satellite',
    lat: satellite.lat || 0,
    lng: satellite.lng || 0,
    altitude: satellite.alt || satellite.altitude || 0, // ✅ FIXED: Handle both 'alt' and 'altitude'
    velocity: satellite.velocity || 0,
    inclination: satellite.inclination,
    period_minutes: satellite.period_minutes,
    operator: satellite.operator,
    object_type: satellite.object_type || 'satellite', // ✅ FIXED: Use 'object_type' not 'type'
    visible: satellite.visible !== undefined ? satellite.visible : true,
    epoch: satellite.epoch,
    conjunction_risk: satellite.conjunction_risk,
    tle: satellite.tle,
  };
};

export function useSatelliteData(_refreshInterval: number = 2000): {
  satellites: SatelliteObject[];
  debris: SatelliteObject[];
  isLoading: boolean;
  error: string | null;
  lastFetchTime: Date | null;
  status: 'idle' | 'ok' | 'error'; // ✅ EXPLICIT RETURN TYPE
  isConnected: boolean;
  refresh: () => void;
} {
  const [satellites, setSatellites] = useState<SatelliteObject[]>([]);
  const [debris, setDebris] = useState<SatelliteObject[]>([]);
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
    queryKey: ['satellites'],
    queryFn: api.getSatellites,
    staleTime: Infinity, // Never auto-refetch
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 3,
    retryDelay: 1000,
  });

  // Set initial satellites when loaded
  useEffect(() => {
    if (initialData?.data && initialData.data.length > 0) {
      const transformedSatellites = initialData.data.map(transformSatelliteData);
      
      // Separate satellites and debris (you can customize this logic)
      const sats = transformedSatellites.filter(s => 
        s.object_type === 'satellite' || (
          !s.name.toLowerCase().includes('debris') && 
          !s.name.toLowerCase().includes('rocket body')
        )
      );
      const deb = transformedSatellites.filter(s => 
        s.object_type === 'debris' || (
          s.name.toLowerCase().includes('debris') || 
          s.name.toLowerCase().includes('rocket body')
        )
      );
      
      setSatellites(sats);
      setDebris(deb);
      setLastFetchTime(new Date());
      setStatus('ok'); // ✅ FIXED: Use 'ok' instead of 'success'
      console.log(`📦 Loaded ${sats.length} satellites and ${deb.length} debris initially`);
    }
  }, [initialData]);

  // Real-time updates via WebSocket
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'initial_data' && message.data?.satellites) {
      const transformedSatellites = message.data.satellites.map(transformSatelliteData);
      
      // Separate satellites and debris
      const sats = transformedSatellites.filter((s: SatelliteObject) => 
        s.object_type === 'satellite' || (
          !s.name.toLowerCase().includes('debris') && 
          !s.name.toLowerCase().includes('rocket body')
        )
      );
      const deb = transformedSatellites.filter((s: SatelliteObject) => 
        s.object_type === 'debris' || (
          s.name.toLowerCase().includes('debris') || 
          s.name.toLowerCase().includes('rocket body')
        )
      );
      
      setSatellites(sats);
      setDebris(deb);
      setLastFetchTime(new Date());
      setStatus('ok'); // ✅ FIXED: Use 'ok' instead of 'success'
      console.log(`📡 Received initial data: ${sats.length} satellites, ${deb.length} debris`);
      wsConnectedRef.current = true;
    } else if (message.type === 'position_update' && message.data?.satellites) {
      const transformedSatellites = message.data.satellites.map(transformSatelliteData);
      
      // Separate satellites and debris
      const sats = transformedSatellites.filter((s: SatelliteObject) => 
        s.object_type === 'satellite' || (
          !s.name.toLowerCase().includes('debris') && 
          !s.name.toLowerCase().includes('rocket body')
        )
      );
      const deb = transformedSatellites.filter((s: SatelliteObject) => 
        s.object_type === 'debris' || (
          s.name.toLowerCase().includes('debris') || 
          s.name.toLowerCase().includes('rocket body')
        )
      );
      
      setSatellites(sats);
      setDebris(deb);
      setLastFetchTime(new Date());
      setStatus('ok'); // ✅ FIXED: Use 'ok' instead of 'success'
      // Only log every 30 updates to avoid console spam
      if (Math.random() < 0.033) {
        console.log(`📡 Position update: ${sats.length} satellites, ${deb.length} debris`);
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
      console.error('❌ Error loading satellites:', error);
    } else if (isConnected || wsConnectedRef.current) {
      setStatus('ok');
    }
  }, [isLoading, error, isConnected]);

  // Manual refresh function (refetches from REST API)
  const refresh = useCallback(() => {
    console.log('🔄 Manually refreshing satellite data...');
    refetch();
  }, [refetch]);

  return {
    satellites,
    debris,
    isLoading: isLoading && satellites.length === 0 && debris.length === 0,
    error: error ? (error as Error).message : null,
    lastFetchTime,
    status,
    isConnected,
    refresh,
  };
}