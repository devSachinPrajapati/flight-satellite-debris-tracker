/**
 * Airport Service - ALL DATA FROM BACKEND ONLY
 * ✅ NO DIRECT CALLS TO AIRLABS
 * ✅ CACHING: Airport info cached, schedules refreshed
 */
import type {
  Airport,
  AirportSchedule,
  AirportStats,
  APIResponse,
} from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// ============================================
// IN-MEMORY CACHE FOR STATIC AIRPORT DATA
// ============================================

interface CachedAirport {
  data: Airport;
  timestamp: number;
}

const airportCache = new Map<string, CachedAirport>();
const AIRPORT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours (airport info rarely changes)

/**
 * Get cached airport data if valid
 */
const getCachedAirport = (code: string): Airport | null => {
  const cached = airportCache.get(code.toUpperCase());
  
  if (!cached) {
    return null;
  }
  
  const age = Date.now() - cached.timestamp;
  if (age > AIRPORT_CACHE_TTL) {
    airportCache.delete(code.toUpperCase());
    return null;
  }
  
  console.log(`✅ Cache HIT for airport ${code} (age: ${Math.round(age / 1000 / 60)}min)`);
  return cached.data;
};

/**
 * Cache airport data
 */
const cacheAirport = (code: string, data: Airport): void => {
  airportCache.set(code.toUpperCase(), {
    data,
    timestamp: Date.now(),
  });
  console.log(`💾 Cached airport ${code}`);
};

/**
 * Clear all cached airport data (useful for debugging)
 */
export const clearAirportCache = (): void => {
  airportCache.clear();
  console.log("🗑️ Airport cache cleared");
};

// ============================================
// AIRPORT DATA FETCHING (FROM BACKEND)
// ============================================

export const fetchAirportByCode = async (
  code: string,
  useCache: boolean = true
): Promise<APIResponse<Airport>> => {
  // ✅ VALIDATION: Check for empty/invalid code
  if (!code || code.trim().length === 0) {
    console.error("❌ Airport code is empty or invalid");
    return {
      success: false,
      error: "Airport code is required",
      timestamp: Date.now(),
    };
  }

  const normalizedCode = code.trim().toUpperCase();

  // ✅ Check cache first (if enabled)
  if (useCache) {
    const cached = getCachedAirport(normalizedCode);
    if (cached) {
      return {
        success: true,
        data: cached,
        timestamp: Date.now(),
      };
    }
  }

  try {
    console.log(`🌐 Fetching airport ${normalizedCode} from API...`);
    const response = await fetch(`${API_BASE_URL}/api/airports/${normalizedCode}`);

    if (!response.ok) {
      throw new Error(`Airport API error: ${response.status}`);
    }

    const data = await response.json();

    // ✅ Cache the result
    if (useCache) {
      cacheAirport(normalizedCode, data as Airport);
    }

    return {
      success: true,
      data: data as Airport,
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
// AIRPORT SCHEDULES (FROM BACKEND)
// ============================================

export const fetchAirportSchedules = async (
  iataCode: string,
  type: "arrivals" | "departures" = "arrivals"
): Promise<APIResponse<AirportSchedule[]>> => {
  // ✅ VALIDATION: Check for empty/invalid code
  if (!iataCode || iataCode.trim().length === 0) {
    console.error("❌ Airport IATA code is empty or invalid");
    return {
      success: false,
      error: "Airport IATA code is required",
      timestamp: Date.now(),
      data: [],
    };
  }

  try {
    const endpoint = `${API_BASE_URL}/api/airports/${iataCode.trim()}/schedules/${type}`;
    const response = await fetch(endpoint);

    if (!response.ok) {
      throw new Error(`Schedules API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data.schedules as AirportSchedule[],
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
// DELAYED FLIGHTS (FROM BACKEND)
// ============================================

export const fetchDelayedFlights = async (
  iataCode: string
): Promise<APIResponse<AirportSchedule[]>> => {
  // ✅ VALIDATION: Check for empty/invalid code
  if (!iataCode || iataCode.trim().length === 0) {
    console.error("❌ Airport IATA code is empty or invalid");
    return {
      success: false,
      error: "Airport IATA code is required",
      timestamp: Date.now(),
      data: [],
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/airports/${iataCode.trim()}/delays`);

    if (!response.ok) {
      throw new Error(`Delays API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data.delayed_flights as AirportSchedule[],
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
// AIRPORT STATISTICS (FROM BACKEND)
// ============================================

export const calculateAirportStats = async (
  iataCode: string
): Promise<AirportStats> => {
  // ✅ VALIDATION: Check for empty/invalid code
  if (!iataCode || iataCode.trim().length === 0) {
    console.error("❌ Airport IATA code is empty or invalid for stats");
    // Return default stats instead of making invalid API call
    return {
      total_arrivals_today: 0,
      total_departures_today: 0,
      delayed_flights: 0,
      cancelled_flights: 0,
      active_flights: 0,
    };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/airports/${iataCode.trim()}/stats`);

    if (!response.ok) {
      throw new Error(`Stats API error: ${response.status}`);
    }

    const stats = await response.json();
    return stats as AirportStats;
  } catch (error) {
    console.error("Error fetching airport stats:", error);
    // Return default stats on error
    return {
      total_arrivals_today: 0,
      total_departures_today: 0,
      delayed_flights: 0,
      cancelled_flights: 0,
      active_flights: 0,
    };
  }
};

// ============================================
// UTILITY: Calculate bearing (client-side)
// ============================================

export const calculateBearing = (
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