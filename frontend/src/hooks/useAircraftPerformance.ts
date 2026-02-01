import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Aircraft,
  AircraftPerformance,
  PerformanceDataPoint,
} from "../types";

const performanceCache = new Map<string, AircraftPerformance>();
const MAX_DATA_POINTS = 200;

export const useAircraftPerformance = (aircraftHex?: string) => {
  const [performance, setPerformance] = useState<AircraftPerformance | null>(null);
  const prevHexRef = useRef<string | undefined>(undefined);

  const recordPerformanceData = useCallback((aircraft: Aircraft) => {
    const hex = aircraft.hex;
    let perfData = performanceCache.get(hex);

    if (!perfData) {
      perfData = {
        hex,
        flight_icao: aircraft.flight_icao,
        data_points: [],
        avg_speed: 0,
        max_speed: 0,
        min_speed: Infinity,
        avg_altitude: 0,
        max_altitude: 0,
        climb_rate_avg: 0,
        descent_rate_avg: 0,
      };
      performanceCache.set(hex, perfData);
    }

    const newPoint: PerformanceDataPoint = {
      timestamp: Date.now(),
      speed: aircraft.speed,
      altitude: aircraft.alt,
      v_speed: aircraft.v_speed,
    };

    perfData.data_points.push(newPoint);

    if (perfData.data_points.length > MAX_DATA_POINTS) {
      perfData.data_points = perfData.data_points.slice(-MAX_DATA_POINTS);
    }

    const speeds = perfData.data_points.map((p) => p.speed);
    const altitudes = perfData.data_points.map((p) => p.altitude);

    perfData.avg_speed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    perfData.max_speed = Math.max(...speeds);
    perfData.min_speed = Math.min(...speeds);
    perfData.avg_altitude =
      altitudes.reduce((a, b) => a + b, 0) / altitudes.length;
    perfData.max_altitude = Math.max(...altitudes);

    const vSpeeds = perfData.data_points
      .map((p) => p.v_speed)
      .filter((v): v is number => v !== undefined);

    if (vSpeeds.length > 0) {
      const climbRates = vSpeeds.filter((v) => v > 0);
      const descentRates = vSpeeds.filter((v) => v < 0);

      perfData.climb_rate_avg =
        climbRates.length > 0
          ? climbRates.reduce((a, b) => a + b, 0) / climbRates.length
          : 0;
      perfData.descent_rate_avg =
        descentRates.length > 0
          ? descentRates.reduce((a, b) => a + b, 0) / descentRates.length
          : 0;
    }

    performanceCache.set(hex, perfData);
    
    // ✅ FIX: Update state immediately if this is the current aircraft
    if (hex === aircraftHex) {
      setPerformance({ ...perfData });
    }
  }, [aircraftHex]);

  // ✅ FIX: React to aircraft changes and update performance data
  useEffect(() => {
    if (!aircraftHex) {
      setPerformance(null);
      return;
    }

    // Check if aircraft actually changed
    const hexChanged = prevHexRef.current !== aircraftHex;
    prevHexRef.current = aircraftHex;

    if (hexChanged) {
      console.log('🔄 Aircraft changed in useAircraftPerformance:', aircraftHex);
    }

    // Get cached performance data
    const perfData = performanceCache.get(aircraftHex);
    
    if (perfData) {
      // Data exists in cache - use it immediately
      console.log('✅ Found cached performance data for:', aircraftHex, perfData.data_points.length, 'points');
      setPerformance({ ...perfData });
    } else {
      // No data yet - set to null (will show "Collecting data...")
      console.log('⏳ No cached data yet for:', aircraftHex);
      setPerformance(null);
    }
  }, [aircraftHex]);

  const getPerformance = useCallback(
    (hex: string): AircraftPerformance | null => {
      return performanceCache.get(hex) || null;
    },
    []
  );

  const clearPerformance = useCallback((hex: string) => {
    performanceCache.delete(hex);
  }, []);

  return {
    performance,
    recordPerformanceData,
    getPerformance,
    clearPerformance,
  };
};