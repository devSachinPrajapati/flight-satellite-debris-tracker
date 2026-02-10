import { useState, useEffect, useCallback, useRef } from "react";
import type {
  Aircraft,
  AircraftPerformance,
  PerformanceDataPoint,
} from "../types";

// Global cache to store performance data for ALL aircraft
const performanceCache = new Map<string, AircraftPerformance>();
const MAX_DATA_POINTS = 200;

export const useAircraftPerformance = (aircraftHex?: string) => {
  const [performance, setPerformance] = useState<AircraftPerformance | null>(null);
  const prevHexRef = useRef<string | undefined>(undefined);

  /**
   * Record performance data with PROPER v_speed calculation
   */
  const recordPerformanceData = useCallback((aircraft: Aircraft) => {
    const hex = aircraft.hex;
    const now = Date.now();

    let perfData = performanceCache.get(hex);

    // Initialize new performance record if doesn't exist
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
      console.log(`🆕 Created new performance record for ${hex}`);
    }

    // Calculate v_speed from CONSECUTIVE altitude changes
    let v_speed = aircraft.v_speed;
    
    if (perfData.data_points.length > 0) {
      const lastPoint = perfData.data_points[perfData.data_points.length - 1];
      const timeDiffSeconds = (now - lastPoint.timestamp) / 1000;
      
      // Only calculate if less than 10 seconds elapsed (avoid huge gaps)
      if (timeDiffSeconds > 0 && timeDiffSeconds < 10) {
        const altDiff = aircraft.alt - lastPoint.altitude;
        const timeDiffMinutes = timeDiffSeconds / 60;
        const calculated_v_speed = altDiff / timeDiffMinutes; // ft/min
        
        // Use calculated v_speed if API doesn't provide it OR if it's more accurate
        if (v_speed === undefined || v_speed === null) {
          v_speed = calculated_v_speed;
          console.log(`🔧 Calculated v_speed for ${hex}: ${v_speed.toFixed(0)} ft/min (Δalt: ${altDiff.toFixed(0)} ft over ${timeDiffSeconds.toFixed(1)}s)`);
        }
      }
    }

    // Create new data point with timestamp
    const newPoint: PerformanceDataPoint = {
      timestamp: now,
      speed: aircraft.speed,
      altitude: aircraft.alt,
      v_speed: v_speed !== undefined && v_speed !== null ? v_speed : 0,
    };

    // Add to data points array
    perfData.data_points.push(newPoint);

    // Maintain maximum data points limit (FIFO - remove oldest)
    if (perfData.data_points.length > MAX_DATA_POINTS) {
      perfData.data_points = perfData.data_points.slice(-MAX_DATA_POINTS);
    }

    // Calculate SPEED statistics (TRUE AVERAGE)
    const allSpeeds = perfData.data_points
      .map(p => p.speed)
      .filter(s => !isNaN(s) && s > 0);

    if (allSpeeds.length > 0) {
      perfData.avg_speed = allSpeeds.reduce((sum, s) => sum + s, 0) / allSpeeds.length;
      perfData.max_speed = Math.max(...allSpeeds);
      perfData.min_speed = Math.min(...allSpeeds);
    }

    // Calculate ALTITUDE statistics (TRUE AVERAGE)
    const allAltitudes = perfData.data_points
      .map(p => p.altitude)
      .filter(a => !isNaN(a) && a >= 0);

    if (allAltitudes.length > 0) {
      perfData.avg_altitude = allAltitudes.reduce((sum, a) => sum + a, 0) / allAltitudes.length;
      perfData.max_altitude = Math.max(...allAltitudes);
    }

    // Calculate CLIMB/DESCENT rates (from consecutive points)
    if (perfData.data_points.length >= 3) {
      const climbRates: number[] = [];
      const descentRates: number[] = [];
      
      // Calculate v_speed between consecutive points
      for (let i = 1; i < perfData.data_points.length; i++) {
        const prev = perfData.data_points[i - 1];
        const curr = perfData.data_points[i];
        
        const timeDiffSeconds = (curr.timestamp - prev.timestamp) / 1000;
        
        // Only use if time difference is reasonable (1-10 seconds)
        if (timeDiffSeconds > 0 && timeDiffSeconds < 10) {
          const altDiff = curr.altitude - prev.altitude;
          const rate = (altDiff / timeDiffSeconds) * 60; // Convert to ft/min
          
          // Classify as climb or descent (ignore small fluctuations)
          if (rate > 100) {
            climbRates.push(rate);
          } else if (rate < -100) {
            descentRates.push(rate);
          }
        }
      }
      
      // Calculate averages
      perfData.climb_rate_avg = climbRates.length > 0
        ? climbRates.reduce((a, b) => a + b, 0) / climbRates.length
        : 0;
      
      perfData.descent_rate_avg = descentRates.length > 0
        ? descentRates.reduce((a, b) => a + b, 0) / descentRates.length
        : 0;
      
      console.log(`📊 V-Speed analysis for ${hex}:`, {
        total_points: perfData.data_points.length,
        climb_samples: climbRates.length,
        descent_samples: descentRates.length,
        avg_climb: perfData.climb_rate_avg.toFixed(1),
        avg_descent: perfData.descent_rate_avg.toFixed(1),
      });
    }

    // Update cache
    performanceCache.set(hex, perfData);

    // Console log for debugging (throttled)
    if (perfData.data_points.length % 5 === 0) {
      console.log(`📊 Performance for ${hex}:`, {
        points: perfData.data_points.length,
        current_speed: aircraft.speed.toFixed(0),
        avg_speed: perfData.avg_speed.toFixed(1),
        max_speed: perfData.max_speed.toFixed(0),
        current_alt: aircraft.alt.toFixed(0),
        avg_alt: perfData.avg_altitude.toFixed(1),
        max_alt: perfData.max_altitude.toFixed(0),
        current_v_speed: v_speed?.toFixed(0) || 'N/A',
      });
    }

    return perfData;
  }, []);

  /**
   *   React to aircraft changes and update performance data display
   */
  useEffect(() => {
    if (!aircraftHex) {
      setPerformance(null);
      return;
    }

    // Check if aircraft actually changed
    const hexChanged = prevHexRef.current !== aircraftHex;
    prevHexRef.current = aircraftHex;

    if (hexChanged) {
      console.log('🔄 Aircraft changed to:', aircraftHex);
    }

    // Get cached performance data
    const perfData = performanceCache.get(aircraftHex);

    if (perfData) {
      console.log('  Loading cached data:', aircraftHex, perfData.data_points.length, 'points');
      setPerformance({ ...perfData });
    } else {
      console.log('⏳ No cached data for:', aircraftHex);
      setPerformance(null);
    }

    // Set up polling to update state when cache changes
    const interval = setInterval(() => {
      const updatedPerfData = performanceCache.get(aircraftHex);
      if (updatedPerfData) {
        setPerformance({ ...updatedPerfData });
      }
    }, 500); // Check every 500ms for updates

    return () => clearInterval(interval);
  }, [aircraftHex]);

  /**
   * Get performance data for any aircraft
   */
  const getPerformance = useCallback(
    (hex: string): AircraftPerformance | null => {
      return performanceCache.get(hex) || null;
    },
    []
  );

  /**
   * Clear performance data for specific aircraft
   */
  const clearPerformance = useCallback((hex: string) => {
    performanceCache.delete(hex);
    console.log(`🗑️ Cleared performance data for ${hex}`);
    if (hex === aircraftHex) {
      setPerformance(null);
    }
  }, [aircraftHex]);

  /**
   * Clear all performance data
   */
  const clearAllPerformance = useCallback(() => {
    performanceCache.clear();
    setPerformance(null);
    console.log('🗑️ Cleared ALL performance data');
  }, []);

  /**
   * Get statistics about cache
   */
  const getCacheStats = useCallback(() => {
    return {
      total_aircraft: performanceCache.size,
      total_data_points: Array.from(performanceCache.values())
        .reduce((sum, perf) => sum + perf.data_points.length, 0),
      cache_size_mb: (performanceCache.size * MAX_DATA_POINTS * 50) / (1024 * 1024),
    };
  }, []);

  return {
    performance,
    recordPerformanceData,
    getPerformance,
    clearPerformance,
    clearAllPerformance,
    getCacheStats,
  };
};
