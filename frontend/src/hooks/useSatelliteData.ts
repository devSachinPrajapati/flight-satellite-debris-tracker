import { useState, useEffect, useCallback, useRef } from "react";
import type { SatelliteObject } from "../types";
import {
  fetchSatelliteData,
  updateSatellitePositions,
} from "../services/satelliteService";

export const useSatelliteData = (positionUpdateInterval = 2000) => {
  const [satellites, setSatellites] = useState<SatelliteObject[]>([]);
  const [debris, setDebris] = useState<SatelliteObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const satellitesRef = useRef<SatelliteObject[]>([]);
  const debrisRef = useRef<SatelliteObject[]>([]);

  // Fetch fresh TLE data
  const loadSatelliteData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log("🛰️ Fetching fresh TLE data from CelesTrak...");
      const data = await fetchSatelliteData();

      satellitesRef.current = data.satellites;
      debrisRef.current = data.debris;

      setSatellites(data.satellites);
      setDebris(data.debris);
      setLastFetchTime(new Date());
      setStatus("ok");
      setError(null);

      console.log(
        `✅ Loaded ${data.satellites.length} satellites and ${data.debris.length} debris`
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load satellite data"
      );
      setStatus("error");
      console.error("Satellite fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update positions using existing TLE data
  const updatePositions = useCallback(() => {
    const currentTime = new Date();

    const updatedSatellites = updateSatellitePositions(
      satellitesRef.current,
      currentTime
    );
    const updatedDebris = updateSatellitePositions(
      debrisRef.current,
      currentTime
    );

    setSatellites(updatedSatellites);
    setDebris(updatedDebris);

    // Update refs
    satellitesRef.current = updatedSatellites;
    debrisRef.current = updatedDebris;
  }, []);

  // Initial fetch and periodic TLE refresh (every 6 hours)
  useEffect(() => {
    loadSatelliteData();

    const tleInterval = setInterval(loadSatelliteData, 6 * 60 * 60 * 1000);

    return () => clearInterval(tleInterval);
  }, [loadSatelliteData]);

  // Frequent position updates using SGP4 propagation
  useEffect(() => {
    if (satellitesRef.current.length === 0 && debrisRef.current.length === 0) {
      return;
    }

    console.log(
      `🔄 Satellite position update interval: ${positionUpdateInterval}ms`
    );

    const positionInterval = setInterval(
      updatePositions,
      positionUpdateInterval
    );

    return () => clearInterval(positionInterval);
  }, [positionUpdateInterval, updatePositions]);

  return {
    satellites,
    debris,
    isLoading,
    error,
    lastFetchTime,
    status, // new
    refresh: loadSatelliteData,
  };
};