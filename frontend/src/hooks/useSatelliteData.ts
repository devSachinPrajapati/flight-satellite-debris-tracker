/**
 * Satellite Data Hook 
 * 
 * Keeps data on temporary disconnects
 * Only clears on prolonged connection loss
 * Better status tracking
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';
import { api } from '../services/api';
import type { SatelliteObject } from '../types';

const transformSatelliteData = (satellite: any): SatelliteObject => {
  return {
    norad_id: satellite.norad_id || 'UNKNOWN',
    name: satellite.name || 'Unknown Satellite',

    lat: satellite.lat || 0,
    lng: satellite.lng || 0,
    altitude: satellite.altitude || 0,
    velocity: satellite.velocity || 0,

    inclination: satellite.inclination,
    period_minutes: satellite.period_minutes,

    object_type: satellite.object_type || 'satellite',
    operator: satellite.operator,

    visible: satellite.visible !== undefined ? satellite.visible : true,
    epoch: satellite.epoch,
    conjunction_risk: satellite.conjunction_risk || false,

    tle: satellite.tle ? {
      name: satellite.tle.name,
      line1: satellite.tle.line1,
      line2: satellite.tle.line2,
    } : undefined,
  };
};

export function useSatelliteData(_refreshInterval: number = 2000): {
  satellites: SatelliteObject[];
  debris: SatelliteObject[];
  isLoading: boolean;
  error: string | null;
  lastFetchTime: Date | null;
  status: 'idle' | 'ok' | 'error';
  isConnected: boolean;
  connectionQuality: 'good' | 'unstable' | 'lost';
  refresh: () => void;
  reconnect: () => void;
} {
  const [satellites, setSatellites] = useState<SatelliteObject[]>([]);
  const [debris, setDebris] = useState<SatelliteObject[]>([]);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  
  const hasReceivedDataRef = useRef(false);
  const lastConnectionStateRef = useRef(false);
  const disconnectTimeRef = useRef<number | null>(null); //   Track when disconnected

  // Initial data load
  const { 
    data: initialData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['satellites'],
    queryFn: api.getSatellites,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    retry: 3,
    retryDelay: 1000,
  });

  // Set initial satellites
  useEffect(() => {
    if (initialData?.data && initialData.data.length > 0) {
      const transformedSatellites = initialData.data.map(transformSatelliteData);

      const sats = transformedSatellites.filter(s => s.object_type === 'satellite');
      const deb = transformedSatellites.filter(s => s.object_type === 'debris');

      setSatellites(sats);
      setDebris(deb);
      setLastFetchTime(new Date());
      setStatus('ok');
      hasReceivedDataRef.current = true;
      console.log(`📦 Loaded ${sats.length} satellites and ${deb.length} debris initially`);

      const withTLE = transformedSatellites.filter(s => s.tle);
      console.log(`  ${withTLE.length} objects have TLE data`);
    }
  }, [initialData]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: any) => {
    if (message.type === 'initial_data' && message.data?.satellites) {
      const transformedSatellites = message.data.satellites.map(transformSatelliteData);

      const sats = transformedSatellites.filter((s: SatelliteObject) => 
        s.object_type === 'satellite'
      );
      const deb = transformedSatellites.filter((s: SatelliteObject) => 
        s.object_type === 'debris'
      );

      setSatellites(sats);
      setDebris(deb);
      setLastFetchTime(new Date());
      setStatus('ok');
      hasReceivedDataRef.current = true;
      disconnectTimeRef.current = null; // Clear disconnect timer
      console.log(`📡 Received initial data: ${sats.length} satellites, ${deb.length} debris`);
    } else if (message.type === 'position_update' && message.data?.satellites) {
      const transformedSatellites = message.data.satellites.map(transformSatelliteData);

      const sats = transformedSatellites.filter((s: SatelliteObject) => 
        s.object_type === 'satellite'
      );
      const deb = transformedSatellites.filter((s: SatelliteObject) => 
        s.object_type === 'debris'
      );

      setSatellites(sats);
      setDebris(deb);
      setLastFetchTime(new Date());
      setStatus('ok');
      hasReceivedDataRef.current = true;
      disconnectTimeRef.current = null; // Clear disconnect timer

      // Log occasionally
      if (Math.random() < 0.033) {
        console.log(`📡 Position update: ${sats.length} satellites, ${deb.length} debris`);
      }
    }
  }, []);

  const { isConnected, connectionQuality, forceReconnect } = useWebSocket(handleWebSocketMessage);

  //   IMPROVED: Handle disconnection with grace period
  useEffect(() => {
    const wasConnected = lastConnectionStateRef.current;
    const isNowConnected = isConnected;

    if (wasConnected !== isNowConnected) {
      if (isNowConnected) {
        // Reconnected
        console.log('🔄 WebSocket reconnected - refreshing satellite data');
        disconnectTimeRef.current = null;
        refetch();
      } else {
        // Disconnected - start timer
        console.log('⚠️ WebSocket disconnected - starting grace period');
        disconnectTimeRef.current = Date.now();
        
        // Only mark as error after prolonged disconnect (30 seconds)
        setTimeout(() => {
          if (disconnectTimeRef.current && 
              Date.now() - disconnectTimeRef.current > 30000) {
            console.log('❌ Prolonged disconnection - marking satellite data as stale');
            setStatus('error');
          }
        }, 30000);
      }
    }

    lastConnectionStateRef.current = isNowConnected;
  }, [isConnected, refetch]);

  // Monitor connection quality with grace period
  useEffect(() => {
    if (connectionQuality === 'lost') {
      // Only clear if disconnected for >30s
      if (disconnectTimeRef.current && 
          Date.now() - disconnectTimeRef.current > 30000) {
        console.log('❌ Connection lost for >30s - clearing stale satellite data');
        setStatus('error');
      } else {
        console.log('⚠️ Connection lost - keeping satellite data for now');
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
      console.error('❌ Error loading satellites:', error);
    } else if (isConnected && hasReceivedDataRef.current) {
      setStatus('ok');
    }
  }, [isLoading, error, isConnected]);

  // Manual refresh
  const refresh = useCallback(() => {
    console.log('🔄 Manually refreshing satellite data...');
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
    satellites,
    debris,
    isLoading: isLoading && satellites.length === 0 && debris.length === 0,
    error: error ? (error as Error).message : null,
    lastFetchTime,
    status,
    isConnected,
    connectionQuality,
    refresh,
    reconnect,
  };
}