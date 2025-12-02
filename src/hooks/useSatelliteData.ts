import { useState, useEffect, useCallback } from "react";
import type { SatelliteObject } from "../types";
import { fetchSatelliteData } from "../services/satelliteService";

export const useSatelliteData = (updateInterval = 10000) => {
  const [satellites, setSatellites] = useState<SatelliteObject[]>([]);
  const [debris, setDebris] = useState<SatelliteObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSatelliteData = useCallback(async () => {
    try {
      const data = await fetchSatelliteData();
      setSatellites(data.satellites);
      setDebris(data.debris);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load satellite data"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSatelliteData();

    const interval = setInterval(loadSatelliteData, updateInterval);

    return () => clearInterval(interval);
  }, [loadSatelliteData, updateInterval]);

  return { satellites, debris, isLoading, error, refresh: loadSatelliteData };
};
