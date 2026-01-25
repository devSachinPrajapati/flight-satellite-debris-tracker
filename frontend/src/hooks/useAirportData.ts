// import { useState, useEffect, useCallback } from "react";
// import type { Airport, AirportSchedule, AirportStats } from "../types";
// import {
//   fetchAirportByCode,
//   fetchAirportSchedules,
//   fetchDelayedFlights,
//   calculateAirportStats,
// } from "../services/airportService";

// export const useAirportData = (iataCode?: string) => {
//   const [airport, setAirport] = useState<Airport | null>(null);
//   const [arrivals, setArrivals] = useState<AirportSchedule[]>([]);
//   const [departures, setDepartures] = useState<AirportSchedule[]>([]);
//   const [delayed, setDelayed] = useState<AirportSchedule[]>([]);
//   const [stats, setStats] = useState<AirportStats | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   const loadAirportData = useCallback(async (code: string) => {
//     setLoading(true);
//     setError(null);

//     try {
//       const [airportRes, arrivalsRes, departuresRes, delayedRes] =
//         await Promise.all([
//           fetchAirportByCode(code),
//           fetchAirportSchedules(code, "arrivals"),
//           fetchAirportSchedules(code, "departures"),
//           fetchDelayedFlights(code),
//         ]);

//       if (airportRes.success && airportRes.data) {
//         setAirport(airportRes.data);
//       }

//       const arrivalsData = arrivalsRes.data || [];
//       const departuresData = departuresRes.data || [];

//       setArrivals(arrivalsData);
//       setDepartures(departuresData);
//       setDelayed(delayedRes.data || []);

//       const calculatedStats = calculateAirportStats(
//         arrivalsData,
//         departuresData
//       );
//       setStats(calculatedStats);
//     } catch (err) {
//       setError(
//         err instanceof Error ? err.message : "Failed to load airport data"
//       );
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     if (iataCode) {
//       loadAirportData(iataCode);
//     }
//   }, [iataCode, loadAirportData]);

//   const refresh = useCallback(() => {
//     if (iataCode) {
//       loadAirportData(iataCode);
//     }
//   }, [iataCode, loadAirportData]);

//   return {
//     airport,
//     arrivals,
//     departures,
//     delayed,
//     stats,
//     loading,
//     error,
//     loadAirportData,
//     refresh,
//   };
// };


/**
 * Airport Data Hook - Uses Backend Exclusively
 */
import { useState, useEffect, useCallback } from "react";
import type { Airport, AirportSchedule, AirportStats } from "../types";
import {
  fetchAirportByCode,
  fetchAirportSchedules,
  fetchDelayedFlights,
  calculateAirportStats,
} from "../services/airportService";

export const useAirportData = (iataCode?: string) => {
  const [airport, setAirport] = useState<Airport | null>(null);
  const [arrivals, setArrivals] = useState<AirportSchedule[]>([]);
  const [departures, setDepartures] = useState<AirportSchedule[]>([]);
  const [delayed, setDelayed] = useState<AirportSchedule[]>([]);
  const [stats, setStats] = useState<AirportStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAirportData = useCallback(async (code: string) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel from backend
      const [airportRes, arrivalsRes, departuresRes, delayedRes] =
        await Promise.all([
          fetchAirportByCode(code),
          fetchAirportSchedules(code, "arrivals"),
          fetchAirportSchedules(code, "departures"),
          fetchDelayedFlights(code),
        ]);

      if (airportRes.success && airportRes.data) {
        setAirport(airportRes.data);
      }

      const arrivalsData = arrivalsRes.data || [];
      const departuresData = departuresRes.data || [];

      setArrivals(arrivalsData);
      setDepartures(departuresData);
      setDelayed(delayedRes.data || []);

      // Get stats from backend
      const statsData = await calculateAirportStats(code);
      setStats(statsData);
      
      console.log(`✅ Loaded airport data for ${code}:`, {
        arrivals: arrivalsData.length,
        departures: departuresData.length,
        delayed: delayedRes.data?.length || 0,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load airport data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (iataCode) {
      loadAirportData(iataCode);
    }
  }, [iataCode, loadAirportData]);

  const refresh = useCallback(() => {
    if (iataCode) {
      loadAirportData(iataCode);
    }
  }, [iataCode, loadAirportData]);

  return {
    airport,
    arrivals,
    departures,
    delayed,
    stats,
    loading,
    error,
    loadAirportData,
    refresh,
  };
};