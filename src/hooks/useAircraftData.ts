import { useState, useEffect, useCallback } from "react";
import type { Aircraft } from "../types";
import { fetchAircraftData } from "../services/aircraftService";

export const useAircraftData = (updateInterval = 10000) => {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAircraftData = useCallback(async () => {
    try {
      const data = await fetchAircraftData();
      setAircraft(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load aircraft data"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAircraftData();

    const interval = setInterval(loadAircraftData, updateInterval);

    return () => clearInterval(interval);
  }, [loadAircraftData, updateInterval]);

  return { aircraft, isLoading, error, refresh: loadAircraftData };
};
