import { useState, useEffect, useCallback } from "react";
import type { Aircraft } from "../types";
import { fetchAircraftData } from "../services/aircraftService";

export const useAircraftData = (updateInterval = 5000) => {
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const loadAircraftData = useCallback(async () => {
    try {
      const data = await fetchAircraftData();
      setAircraft(data);
      setLastFetchTime(new Date());
      setStatus("ok");
      setError(null);
      console.log(`✈️ Loaded ${data.length} aircraft`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load aircraft data"
      );
      setStatus("error");
      console.error("Aircraft fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log(`🔄 Aircraft data refresh interval: ${updateInterval}ms`);
    loadAircraftData();

    const interval = setInterval(loadAircraftData, updateInterval);

    return () => clearInterval(interval);
  }, [loadAircraftData, updateInterval]);

  return {
    aircraft,
    isLoading,
    error,
    lastFetchTime,
    status,
    refresh: loadAircraftData,
  };
};
