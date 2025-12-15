import { apiConfig, fetchWithTimeout } from "./api";
import type {
  Airport,
  AirportSchedule,
  AirportStats,
  NearbyAirport,
  APIResponse,
} from "../types";
import { calculateDistance } from "../utils/coordinates";

const AIRLABS_BASE_URL = "https://airlabs.co/api/v9";

// API Key
const getApiKey = () =>
  apiConfig.airLabs.apiKey || apiConfig.airLabs.apiKey || "";

// ============================================
// AIRPORT DATA FETCHING
// ============================================

export const fetchAirportByCode = async (
  code: string
): Promise<APIResponse<Airport>> => {
  try {
    const response = await fetchWithTimeout(
      `${AIRLABS_BASE_URL}/airports?iata_code=${code}&api_key=${getApiKey()}`,
      { timeout: 10000 }
    );

    if (!response.ok) {
      throw new Error(`Airport API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.response && data.response.length > 0) {
      return {
        success: true,
        data: data.response[0] as Airport,
        timestamp: Date.now(),
      };
    }

    return {
      success: false,
      error: "Airport not found",
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error fetching airport:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
    };
  }
};

// ============================================
// AIRPORT SCHEDULES
// ============================================

export const fetchAirportSchedules = async (
  iataCode: string,
  type: "arrivals" | "departures" = "arrivals"
): Promise<APIResponse<AirportSchedule[]>> => {
  try {
    const endpoint =
      type === "arrivals"
        ? `${AIRLABS_BASE_URL}/schedules?arr_iata=${iataCode}&api_key=${getApiKey()}`
        : `${AIRLABS_BASE_URL}/schedules?dep_iata=${iataCode}&api_key=${getApiKey()}`;

    const response = await fetchWithTimeout(endpoint, undefined, 15000);

    if (!response.ok) {
      throw new Error(`Schedules API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.response) {
      return {
        success: true,
        data: data.response as AirportSchedule[],
        timestamp: Date.now(),
      };
    }

    return {
      success: false,
      error: "No schedules found",
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error fetching schedules:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
      data: [],
    };
  }
};

// ============================================
// DELAYED FLIGHTS
// ============================================

export const fetchDelayedFlights = async (
  iataCode: string
): Promise<APIResponse<AirportSchedule[]>> => {
  try {
    const [arrivals, departures] = await Promise.all([
      fetchAirportSchedules(iataCode, "arrivals"),
      fetchAirportSchedules(iataCode, "departures"),
    ]);

    const allFlights = [...(arrivals.data || []), ...(departures.data || [])];

    const delayedFlights = allFlights.filter(
      (flight) => flight.delayed && flight.delayed > 0
    );

    return {
      success: true,
      data: delayedFlights,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error fetching delayed flights:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
      data: [],
    };
  }
};

// ============================================
// AIRPORT STATISTICS
// ============================================

export const calculateAirportStats = (
  arrivals: AirportSchedule[],
  departures: AirportSchedule[]
): AirportStats => {
  const delayed = [...arrivals, ...departures].filter(
    (f) => f.delayed && f.delayed > 0
  ).length;

  const cancelled = [...arrivals, ...departures].filter(
    (f) => f.status === "cancelled"
  ).length;

  const active = [...arrivals, ...departures].filter(
    (f) => f.status === "active"
  ).length;

  return {
    total_arrivals_today: arrivals.length,
    total_departures_today: departures.length,
    delayed_flights: delayed,
    cancelled_flights: cancelled,
    active_flights: active,
  };
};

// ============================================
// NEARBY AIRPORTS
// ============================================

export const findNearbyAirports = async (
  userLat: number,
  userLng: number,
  radiusKm: number = 100
): Promise<APIResponse<NearbyAirport[]>> => {
  try {
    const response = await fetchWithTimeout(
      `${AIRLABS_BASE_URL}/airports?api_key=${getApiKey()}`,
      { timeout: 15000 }
    );

    if (!response.ok) {
      throw new Error(`Airports API error: ${response.status}`);
    }

    const data = await response.json();
    const airports = data.response as Airport[];

    const nearbyAirports: NearbyAirport[] = airports
      .map((airport) => {
        const distance = calculateDistance(
          userLat,
          userLng,
          airport.lat,
          airport.lng
        );

        const bearing = calculateBearing(
          userLat,
          userLng,
          airport.lat,
          airport.lng
        );

        return {
          ...airport,
          distance_km: distance,
          bearing,
        };
      })
      .filter((airport) => airport.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);

    return {
      success: true,
      data: nearbyAirports.slice(0, 10),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error finding nearby airports:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
      data: [],
    };
  }
};

const calculateBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const toDegrees = (rad: number) => (rad * 180) / Math.PI;

  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLng = toRadians(lng2 - lng1);

  const y = Math.sin(dLng) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

  const bearing = toDegrees(Math.atan2(y, x));
  return (bearing + 360) % 360;
};
