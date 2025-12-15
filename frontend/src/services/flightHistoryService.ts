// Flight Timeline & Replay Feature

import type {
  Aircraft,
  FlightHistory,
  FlightHistoryPoint,
  APIResponse,
} from "../types";

// ============================================
// FLIGHT HISTORY STORAGE 
// ============================================

const flightHistoryCache = new Map<string, FlightHistory>();
const MAX_HISTORY_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const MAX_POINTS_PER_FLIGHT = 500;

// ============================================
// RECORD FLIGHT POSITION
// ============================================

export const recordFlightPosition = (aircraft: Aircraft): void => {
  const hex = aircraft.hex;
  const now = Date.now();

  let history = flightHistoryCache.get(hex);

  if (!history) {
    history = {
      hex,
      flight_icao: aircraft.flight_icao,
      points: [],
      startTime: now,
      endTime: now,
    };
    flightHistoryCache.set(hex, history);
  }

  const newPoint: FlightHistoryPoint = {
    timestamp: now,
    lat: aircraft.lat,
    lng: aircraft.lng,
    alt: aircraft.alt,
    speed: aircraft.speed,
    dir: aircraft.dir,
  };

  history.points.push(newPoint);
  history.endTime = now;
  history.flight_icao = aircraft.flight_icao || history.flight_icao;

  const cutoffTime = now - MAX_HISTORY_DURATION;
  history.points = history.points.filter((p) => p.timestamp >= cutoffTime);

  if (history.points.length > MAX_POINTS_PER_FLIGHT) {
    const recentPoints = history.points.slice(-200);
    const olderPoints = history.points.slice(0, -200);
    const downsampledOlder = downsamplePoints(olderPoints, 100);
    history.points = [...downsampledOlder, ...recentPoints];
  }

  if (history.points.length > 0) {
    history.startTime = history.points[0].timestamp;
  }
};

// ============================================
// GET FLIGHT HISTORY
// ============================================

export const getFlightHistory = (hex: string): APIResponse<FlightHistory> => {
  const history = flightHistoryCache.get(hex);

  if (!history || history.points.length < 2) {
    return {
      success: false,
      error: "No history available for this flight",
      timestamp: Date.now(),
    };
  }

  return {
    success: true,
    data: history,
    timestamp: Date.now(),
  };
};

// ============================================
// GET POSITION AT SPECIFIC TIME
// ============================================

export const getFlightPositionAtTime = (
  hex: string,
  timestamp: number
): APIResponse<FlightHistoryPoint> => {
  const history = flightHistoryCache.get(hex);

  if (!history || history.points.length === 0) {
    return {
      success: false,
      error: "No history available",
      timestamp: Date.now(),
    };
  }

  const points = history.points;

  if (timestamp <= points[0].timestamp) {
    return {
      success: true,
      data: points[0],
      timestamp: Date.now(),
    };
  }

  if (timestamp >= points[points.length - 1].timestamp) {
    return {
      success: true,
      data: points[points.length - 1],
      timestamp: Date.now(),
    };
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];

    if (timestamp >= p1.timestamp && timestamp <= p2.timestamp) {
      const ratio = (timestamp - p1.timestamp) / (p2.timestamp - p1.timestamp);

      const interpolated: FlightHistoryPoint = {
        timestamp,
        lat: p1.lat + (p2.lat - p1.lat) * ratio,
        lng: p1.lng + (p2.lng - p1.lng) * ratio,
        alt: p1.alt + (p2.alt - p1.alt) * ratio,
        speed: p1.speed + (p2.speed - p1.speed) * ratio,
        dir: interpolateAngle(p1.dir, p2.dir, ratio),
      };

      return {
        success: true,
        data: interpolated,
        timestamp: Date.now(),
      };
    }
  }

  return {
    success: false,
    error: "Could not interpolate position",
    timestamp: Date.now(),
  };
};

// ============================================
// GET ALL AVAILABLE FLIGHT HISTORIES
// ============================================

export const getAllFlightHistories = (): APIResponse<FlightHistory[]> => {
  const histories = Array.from(flightHistoryCache.values()).filter(
    (h) => h.points.length >= 2
  );

  return {
    success: true,
    data: histories,
    timestamp: Date.now(),
  };
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const interpolateAngle = (a1: number, a2: number, ratio: number): number => {
  let diff = a2 - a1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  let result = a1 + diff * ratio;
  if (result < 0) result += 360;
  if (result >= 360) result -= 360;

  return result;
};

const downsamplePoints = (
  points: FlightHistoryPoint[],
  targetCount: number
): FlightHistoryPoint[] => {
  if (points.length <= targetCount) return points;

  const step = points.length / targetCount;
  const downsampled: FlightHistoryPoint[] = [];

  for (let i = 0; i < targetCount; i++) {
    const index = Math.floor(i * step);
    downsampled.push(points[index]);
  }

  return downsampled;
};

// ============================================
// CLEANUP OLD HISTORIES
// ============================================

export const cleanupOldHistories = (): void => {
  const now = Date.now();
  const cutoffTime = now - MAX_HISTORY_DURATION;

  for (const [hex, history] of flightHistoryCache.entries()) {
    if (history.endTime < cutoffTime) {
      flightHistoryCache.delete(hex);
    }
  }
};

setInterval(cleanupOldHistories, 60 * 60 * 1000);
