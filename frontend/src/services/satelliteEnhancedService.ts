// Enhanced Satellite Features 

import * as satellite from "satellite.js";
import type {
  SatelliteObject,
  SatelliteTrail,
  OrbitalPrediction,
  GroundFootprint,
  APIResponse,
} from "../types";

// ============================================
// CALCULATE SATELLITE TRAIL
// ============================================

export const calculateSatelliteTrail = (
  sat: SatelliteObject,
  durationMinutes: number = 90
): APIResponse<SatelliteTrail> => {
  if (!sat.tle) {
    return {
      success: false,
      error: "TLE data not available",
      timestamp: Date.now(),
    };
  }

  try {
    const satrec = satellite.twoline2satrec(sat.tle.line1, sat.tle.line2);
    const positions: SatelliteTrail["positions"] = [];

    const now = new Date();
    const stepSeconds = 30;

    for (let i = -durationMinutes * 2; i <= durationMinutes * 2; i++) {
      const time = new Date(now.getTime() + i * stepSeconds * 1000);
      const positionAndVelocity = satellite.propagate(satrec, time);

      if (
        positionAndVelocity?.position &&
        typeof positionAndVelocity.position !== "boolean"
      ) {
        const gmst = satellite.gstime(time);
        const positionGd = satellite.eciToGeodetic(
          positionAndVelocity.position,
          gmst
        );

        positions.push({
          lat: satellite.degreesLat(positionGd.latitude),
          lng: satellite.degreesLong(positionGd.longitude),
          altitude: positionGd.height,
          timestamp: time.getTime(),
        });
      }
    }

    return {
      success: true,
      data: {
        norad_id: sat.norad_id,
        positions,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error calculating satellite trail:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Trail calculation failed",
      timestamp: Date.now(),
    };
  }
};

// ============================================
// CALCULATE GROUND FOOTPRINT
// ============================================

export const calculateGroundFootprint = (
  sat: SatelliteObject
): APIResponse<GroundFootprint> => {
  try {
    const earthRadius = 6371;
    const satelliteAltitude = sat.altitude;

    const horizonDistance = Math.sqrt(
      Math.pow(earthRadius + satelliteAltitude, 2) - Math.pow(earthRadius, 2)
    );

    const coverageRadiusKm = horizonDistance;
    const coverageAreaKm2 = Math.PI * Math.pow(coverageRadiusKm, 2);

    return {
      success: true,
      data: {
        center: { lat: sat.lat, lng: sat.lng },
        radius_km: coverageRadiusKm,
        coverage_area_km2: coverageAreaKm2,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Footprint calculation failed",
      timestamp: Date.now(),
    };
  }
};

// ============================================
// PREDICT ORBITAL PATH
// ============================================

export const predictOrbitalPath = (
  sat: SatelliteObject,
  durationMinutes: number = 90
): APIResponse<OrbitalPrediction> => {
  if (!sat.tle) {
    return {
      success: false,
      error: "TLE data required",
      timestamp: Date.now(),
    };
  }

  try {
    const satrec = satellite.twoline2satrec(sat.tle.line1, sat.tle.line2);
    const positions: OrbitalPrediction["future_positions"] = [];
    const now = new Date();
    const stepSeconds = 30;

    for (let i = 0; i <= durationMinutes * 2; i++) {
      const time = new Date(now.getTime() + i * stepSeconds * 1000);
      const positionAndVelocity = satellite.propagate(satrec, time);

      if (
        positionAndVelocity?.position &&
        typeof positionAndVelocity.position !== "boolean"
      ) {
        const gmst = satellite.gstime(time);
        const positionGd = satellite.eciToGeodetic(
          positionAndVelocity.position,
          gmst
        );

        const vel = positionAndVelocity.velocity;
        const velocity =
          vel && typeof vel !== "boolean"
            ? Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z)
            : 0;

        positions.push({
          lat: satellite.degreesLat(positionGd.latitude),
          lng: satellite.degreesLong(positionGd.longitude),
          altitude: positionGd.height,
          timestamp: time.getTime(),
          velocity,
        });
      }
    }

    let orbitType: OrbitalPrediction["orbit_type"] = "LEO";
    if (sat.altitude > 35786 - 500 && sat.altitude < 35786 + 500) {
      orbitType = "GEO";
    } else if (sat.altitude > 2000 && sat.altitude < 35786) {
      orbitType = "MEO";
    } else if (sat.altitude > 35786 + 1000) {
      orbitType = "HEO";
    }

    return {
      success: true,
      data: {
        norad_id: sat.norad_id,
        future_positions: positions,
        orbit_type: orbitType,
      },
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Path prediction failed",
      timestamp: Date.now(),
    };
  }
};
