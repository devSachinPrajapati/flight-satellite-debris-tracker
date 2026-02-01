// // Nearby Flights Around You Feature

// import type {
//   Aircraft,
//   NearbyFlight,
//   UserLocation,
//   APIResponse,
// } from "../types";
// import { calculateDistance } from "../utils/coordinates";

// const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
// const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

// // ============================================
// // FIND NEARBY FLIGHTS
// // ============================================

// export const findNearbyFlights = (
//   allAircraft: Aircraft[],
//   userLocation: UserLocation,
//   radiusKm: number = 500
// ): APIResponse<NearbyFlight[]> => {
//   try {
//     const nearbyFlights: NearbyFlight[] = allAircraft
//       .map((aircraft) => {
//         const distance = calculateDistance(
//           userLocation.lat,
//           userLocation.lng,
//           aircraft.lat,
//           aircraft.lng
//         );

//         const bearing = calculateBearing(
//           userLocation.lat,
//           userLocation.lng,
//           aircraft.lat,
//           aircraft.lng
//         );

//         return {
//           ...aircraft,
//           distance_km: distance,
//           bearing,
//         };
//       })
//       .filter((flight) => flight.distance_km <= radiusKm)
//       .sort((a, b) => a.distance_km - b.distance_km);

//     return {
//       success: true,
//       data: nearbyFlights,
//       timestamp: Date.now(),
//     };
//   } catch (error) {
//     console.error("Error finding nearby flights:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//       timestamp: Date.now(),
//       data: [],
//     };
//   }
// };

// // ============================================
// // FIND AIRCRAFT BY CRITERIA
// // ============================================

// export const findLowestAltitudeAircraft = (
//   nearbyFlights: NearbyFlight[]
// ): NearbyFlight | null => {
//   if (nearbyFlights.length === 0) return null;
//   return nearbyFlights.reduce((lowest, current) =>
//     current.alt < lowest.alt ? current : lowest
//   );
// };

// export const findFastestAircraft = (
//   nearbyFlights: NearbyFlight[]
// ): NearbyFlight | null => {
//   if (nearbyFlights.length === 0) return null;
//   return nearbyFlights.reduce((fastest, current) =>
//     current.speed > fastest.speed ? current : fastest
//   );
// };

// export const findClosestAircraft = (
//   nearbyFlights: NearbyFlight[]
// ): NearbyFlight | null => {
//   if (nearbyFlights.length === 0) return null;
//   return nearbyFlights.reduce((closest, current) =>
//     current.distance_km < closest.distance_km ? current : closest
//   );
// };

// // ============================================
// // GET USER LOCATION
// // ============================================

// export const getUserLocation = (): Promise<APIResponse<UserLocation>> => {
//   return new Promise((resolve) => {
//     if (!navigator.geolocation) {
//       resolve({
//         success: false,
//         error: "Geolocation not supported by browser",
//         timestamp: Date.now(),
//       });
//       return;
//     }

//     navigator.geolocation.getCurrentPosition(
//       (position) => {
//         resolve({
//           success: true,
//           data: {
//             lat: position.coords.latitude,
//             lng: position.coords.longitude,
//             accuracy: position.coords.accuracy,
//             timestamp: position.timestamp,
//           },
//           timestamp: Date.now(),
//         });
//       },
//       (error) => {
//         resolve({
//           success: false,
//           error: `Geolocation error: ${error.message}`,
//           timestamp: Date.now(),
//         });
//       },
//       {
//         enableHighAccuracy: true,
//         timeout: 10000,
//         maximumAge: 60000,
//       }
//     );
//   });
// };

// // ============================================
// // UTILITY FUNCTIONS
// // ============================================

// const calculateBearing = (
//   lat1: number,
//   lng1: number,
//   lat2: number,
//   lng2: number
// ): number => {
//   const lat1Rad = toRadians(lat1);
//   const lat2Rad = toRadians(lat2);
//   const dLng = toRadians(lng2 - lng1);

//   const y = Math.sin(dLng) * Math.cos(lat2Rad);
//   const x =
//     Math.cos(lat1Rad) * Math.sin(lat2Rad) -
//     Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);

//   const bearing = toDegrees(Math.atan2(y, x));
//   return (bearing + 360) % 360;
// };

// export const bearingToCompass = (bearing: number): string => {
//   const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
//   const index = Math.round(bearing / 45) % 8;
//   return directions[index];
// };

// export const formatDistance = (
//   distanceKm: number,
//   unit: "km" | "mi" | "nm" = "km"
// ): string => {
//   switch (unit) {
//     case "mi":
//       return `${(distanceKm * 0.621371).toFixed(1)} mi`;
//     case "nm":
//       return `${(distanceKm * 0.539957).toFixed(1)} nm`;
//     default:
//       return `${distanceKm.toFixed(1)} km`;
//   }
// };


// Nearby Flights Around Selected Aircraft Feature

import type {
  Aircraft,
  NearbyFlight,
  APIResponse,
} from "../types";
import { calculateDistance } from "../utils/coordinates";

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

// ============================================
// FIND NEARBY FLIGHTS AROUND AIRCRAFT
// ============================================

/**
 * Find flights near a selected aircraft
 * @param allAircraft - All available aircraft
 * @param selectedAircraft - The aircraft to use as center point
 * @param radiusKm - Search radius in kilometers
 */
export const findNearbyFlightsAroundAircraft = (
  allAircraft: Aircraft[],
  selectedAircraft: Aircraft,
  radiusKm: number = 500
): APIResponse<NearbyFlight[]> => {
  try {
    const nearbyFlights: NearbyFlight[] = allAircraft
      // Filter out the selected aircraft itself
      .filter((aircraft) => aircraft.hex !== selectedAircraft.hex)
      .map((aircraft) => {
        const distance = calculateDistance(
          selectedAircraft.lat,
          selectedAircraft.lng,
          aircraft.lat,
          aircraft.lng
        );

        const bearing = calculateBearing(
          selectedAircraft.lat,
          selectedAircraft.lng,
          aircraft.lat,
          aircraft.lng
        );

        return {
          ...aircraft,
          distance_km: distance,
          bearing,
        };
      })
      .filter((flight) => flight.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);

    return {
      success: true,
      data: nearbyFlights,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error finding nearby flights:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: Date.now(),
      data: [],
    };
  }
};

// ============================================
// FIND AIRCRAFT BY CRITERIA (RELATIVE TO SELECTED)
// ============================================

export const findLowestAltitudeAircraft = (
  nearbyFlights: NearbyFlight[]
): NearbyFlight | null => {
  if (nearbyFlights.length === 0) return null;
  return nearbyFlights.reduce((lowest, current) =>
    current.alt < lowest.alt ? current : lowest
  );
};

export const findFastestAircraft = (
  nearbyFlights: NearbyFlight[]
): NearbyFlight | null => {
  if (nearbyFlights.length === 0) return null;
  return nearbyFlights.reduce((fastest, current) =>
    current.speed > fastest.speed ? current : fastest
  );
};

export const findClosestAircraft = (
  nearbyFlights: NearbyFlight[]
): NearbyFlight | null => {
  if (nearbyFlights.length === 0) return null;
  return nearbyFlights.reduce((closest, current) =>
    current.distance_km < closest.distance_km ? current : closest
  );
};

/**
 * Find flights flying in the same direction (within tolerance)
 */
export const findSameDirectionFlights = (
  nearbyFlights: NearbyFlight[],
  selectedAircraft: Aircraft,
  toleranceDegrees: number = 30
): NearbyFlight[] => {
  return nearbyFlights.filter((flight) => {
    const headingDiff = Math.abs(flight.dir - selectedAircraft.dir);
    // Handle 360° wrap-around
    const normalizedDiff = Math.min(headingDiff, 360 - headingDiff);
    return normalizedDiff <= toleranceDegrees;
  });
};

/**
 * Find flights at similar altitude (within tolerance)
 */
export const findSimilarAltitudeFlights = (
  nearbyFlights: NearbyFlight[],
  selectedAircraft: Aircraft,
  toleranceFeet: number = 2000
): NearbyFlight[] => {
  return nearbyFlights.filter((flight) => {
    const altDiff = Math.abs(flight.alt - selectedAircraft.alt);
    return altDiff <= toleranceFeet;
  });
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const calculateBearing = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
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

export const bearingToCompass = (bearing: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
};

export const formatDistance = (
  distanceKm: number,
  unit: "km" | "mi" | "nm" = "km"
): string => {
  switch (unit) {
    case "mi":
      return `${(distanceKm * 0.621371).toFixed(1)} mi`;
    case "nm":
      return `${(distanceKm * 0.539957).toFixed(1)} nm`;
    default:
      return `${distanceKm.toFixed(1)} km`;
  }
};

/**
 * Calculate relative position description
 */
export const getRelativePositionDescription = (
  bearing: number,
  distance: number
): string => {
  const direction = bearingToCompass(bearing);
  const distStr = formatDistance(distance);
  return `${distStr} ${direction}`;
};