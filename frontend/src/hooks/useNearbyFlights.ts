import { useState, useEffect } from "react";
import type { Aircraft, NearbyFlight, UserLocation } from "../types";
import {
  findNearbyFlights,
  findLowestAltitudeAircraft,
  findFastestAircraft,
  findClosestAircraft,
  getUserLocation,
} from "../services/nearbyFlightsService";

export const useNearbyFlights = (
  allAircraft: Aircraft[],
  radiusKm: number = 500
) => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [nearbyFlights, setNearbyFlights] = useState<NearbyFlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initLocation = async () => {
      setLoading(true);
      const result = await getUserLocation();

      if (result.success && result.data) {
        setUserLocation(result.data);
        setError(null);
      } else {
        setError(result.error || "Location unavailable");
      }

      setLoading(false);
    };

    initLocation();
  }, []);

  useEffect(() => {
    if (!userLocation) return;

    const result = findNearbyFlights(allAircraft, userLocation, radiusKm);

    if (result.success && result.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNearbyFlights(result.data);
    }
  }, [userLocation, allAircraft, radiusKm]);

  const closest =
    nearbyFlights.length > 0 ? findClosestAircraft(nearbyFlights) : null;
  const fastest =
    nearbyFlights.length > 0 ? findFastestAircraft(nearbyFlights) : null;
  const lowest =
    nearbyFlights.length > 0 ? findLowestAltitudeAircraft(nearbyFlights) : null;

  return {
    userLocation,
    nearbyFlights,
    closest,
    fastest,
    lowest,
    loading,
    error,
  };
};
