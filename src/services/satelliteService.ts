// import type { SatelliteObject } from "../types";
// import { apiConfig, fetchWithTimeout } from "./api";

// export const fetchSatelliteData = async (): Promise<{
//   satellites: SatelliteObject[];
//   debris: SatelliteObject[];
// }> => {
//   try {
//     const { apiKey, baseUrl } = apiConfig.leoLabs;

//     if (!apiKey) {
//       console.warn("LEOLabs API key not configured");
//       return getMockSatelliteData();
//     }

//     // LEOLabs API endpoint
//     const url = `${baseUrl}/objects?api_key=${apiKey}`;
//     const response = await fetchWithTimeout(url);

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     const data = await response.json();

//     // Process and separate satellites from debris
//     const satellites = data.satellites || [];
//     const debris = data.debris || [];

//     return { satellites, debris };
//   } catch (error) {
//     console.error("Error fetching satellite data:", error);
//     return getMockSatelliteData();
//   }
// };

// // Mock data for development/testing
// const getMockSatelliteData = (): {
//   satellites: SatelliteObject[];
//   debris: SatelliteObject[];
// } => {
//   const satellites: SatelliteObject[] = [
//     {
//       norad_id: "25544",
//       name: "ISS (ZARYA)",
//       lat: 51.6,
//       lng: 112.8,
//       altitude: 408,
//       velocity: 7.66,
//       inclination: 51.64,
//       period_minutes: 92.68,
//       operator: "International Space Station",
//       object_type: "satellite",
//       visible: true,
//       conjunction_risk: false,
//     },
//     {
//       norad_id: "43013",
//       name: "STARLINK-30",
//       lat: 45.2,
//       lng: -93.4,
//       altitude: 550,
//       velocity: 7.5,
//       inclination: 53.0,
//       operator: "SpaceX",
//       object_type: "satellite",
//       visible: true,
//       conjunction_risk: false,
//     },
//     {
//       norad_id: "48274",
//       name: "STARLINK-1600",
//       lat: -33.8,
//       lng: 151.2,
//       altitude: 540,
//       velocity: 7.52,
//       inclination: 53.2,
//       operator: "SpaceX",
//       object_type: "satellite",
//       visible: true,
//       conjunction_risk: false,
//     },
//     {
//       norad_id: "37820",
//       name: "SENTINEL-2A",
//       lat: 12.5,
//       lng: 45.3,
//       altitude: 786,
//       velocity: 7.45,
//       inclination: 98.6,
//       operator: "ESA",
//       object_type: "satellite",
//       visible: true,
//       conjunction_risk: false,
//     },
//     {
//       norad_id: "41866",
//       name: "LANDSAT 9",
//       lat: -8.2,
//       lng: -65.8,
//       altitude: 705,
//       velocity: 7.48,
//       inclination: 98.2,
//       operator: "NASA/USGS",
//       object_type: "satellite",
//       visible: true,
//       conjunction_risk: false,
//     },
//   ];

//   const debris: SatelliteObject[] = [
//     {
//       norad_id: "D001",
//       name: "DEBRIS-FRAG-001",
//       lat: 28.5,
//       lng: 77.2,
//       altitude: 650,
//       velocity: 7.4,
//       object_type: "debris",
//       visible: true,
//       conjunction_risk: true,
//     },
//     {
//       norad_id: "D002",
//       name: "DEBRIS-FRAG-002",
//       lat: -15.8,
//       lng: -47.9,
//       altitude: 720,
//       velocity: 7.38,
//       object_type: "debris",
//       visible: true,
//       conjunction_risk: false,
//     },
//     {
//       norad_id: "D003",
//       name: "COSMOS-1408 DEB",
//       lat: 62.4,
//       lng: 88.5,
//       altitude: 485,
//       velocity: 7.55,
//       object_type: "debris",
//       visible: true,
//       conjunction_risk: true,
//     },
//   ];

//   return { satellites, debris };
// };



import type { SatelliteObject, TLEData } from '../types';
import { apiConfig, fetchWithTimeout } from './api';
import * as satellite from 'satellite.js';

/**
 * Parse TLE text data into structured format
 */
const parseTLEData = (tleText: string): TLEData[] => {
  const lines = tleText.trim().split('\n');
  const tleObjects: TLEData[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 < lines.length) {
      const name = lines[i].trim();
      const line1 = lines[i + 1].trim();
      const line2 = lines[i + 2].trim();

      if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
        tleObjects.push({ name, line1, line2 });
      }
    }
  }

  return tleObjects;
};

/**
 * Calculate satellite position from TLE data
 */
const calculateSatellitePosition = (tle: TLEData, date: Date = new Date()) => {
  try {
    // Initialize satellite record
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

    // ❗️If TLE is invalid, skip it
    if (satrec.error !== 0) {
      console.warn("Bad TLE, skipping:", tle.name, "Error code:", satrec.error);
      return null;
    }

    // Propagate satellite using current time
    const positionAndVelocity = satellite.propagate(satrec, date);

    // ❗️Check if propagation failed
    if (!positionAndVelocity?.position || typeof positionAndVelocity.position === "boolean") return null;

    if (positionAndVelocity?.position && typeof positionAndVelocity.position !== 'boolean') {
      const positionEci = positionAndVelocity.position;

      // Get GMST for current time
      const gmst = satellite.gstime(date);

      // Convert ECI to geographic coordinates
      const positionGd = satellite.eciToGeodetic(positionEci, gmst);

       // Invalid radian range: must be between -π/2 and π/2
    if (
      positionGd.latitude > Math.PI / 2 ||
      positionGd.latitude < -Math.PI / 2
    ) {
      console.warn("Invalid geodetic latitude", tle.name, positionGd);
      return null;
    }

      const latitude = satellite.degreesLat(positionGd.latitude);
      const longitude = satellite.degreesLong(positionGd.longitude);
      const altitude = positionGd.height; // in km

      // Calculate velocity
      let velocity = 0;
      if (positionAndVelocity.velocity && typeof positionAndVelocity.velocity !== 'boolean') {
        const vel = positionAndVelocity.velocity;
        velocity = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
      }

      // Extract orbital elements
      const inclination = satellite.degreesLat(satrec.inclo);
      const period = (2 * Math.PI) / satrec.no; // Period in minutes

      return {
        lat: latitude,
        lng: longitude,
        altitude,
        velocity,
        inclination,
        period_minutes: period,
      };
    }
  } catch (error) {
    console.error('Error calculating satellite position:', error);
    return null;
  }

  return null;
};

/**
 * Determine if object is a satellite or debris
 */
const categorizeObject = (name: string): 'satellite' | 'debris' => {
  const debrisKeywords = ['DEB', 'DEBRIS', 'FRAG', 'R/B', 'ROCKET BODY', 'PAYLOAD'];
  const nameUpper = name.toUpperCase();

  for (const keyword of debrisKeywords) {
    if (nameUpper.includes(keyword)) {
      return 'debris';
    }
  }

  return 'satellite';
};

/**
 * Get operator/owner from satellite name
 */
const getOperator = (name: string): string => {
  if (name.includes('STARLINK')) return 'SpaceX';
  if (name.includes('ONEWEB')) return 'OneWeb';
  if (name.includes('ISS') || name.includes('ZARYA')) return 'International Space Station';
  if (name.includes('COSMOS')) return 'Russia';
  if (name.includes('GPS')) return 'USA (GPS)';
  if (name.includes('GALILEO')) return 'European Union';
  if (name.includes('GLONASS')) return 'Russia';
  if (name.includes('BEIDOU')) return 'China';
  if (name.includes('SENTINEL')) return 'ESA';
  if (name.includes('LANDSAT')) return 'NASA/USGS';
  if (name.includes('NOAA')) return 'NOAA';
  if (name.includes('GOES')) return 'NOAA';
  if (name.includes('IRIDIUM')) return 'Iridium Communications';
  return 'Unknown';
};

/**
 * Check if object is in sunlight (simplified)
 */
const isInSunlight = (altitude: number): boolean => {
  // Simple heuristic: objects above 500km are more likely in sunlight
  return altitude > 500;
};

/**
 * Fetch TLE data from CelesTrak
 */
const fetchTLEFromCelesTrak = async (group: string): Promise<TLEData[]> => {
  try {
    const { baseUrl } = apiConfig.celestrak;
    const url = `${baseUrl}?GROUP=${group}&FORMAT=TLE`;
    
    const response = await fetchWithTimeout(url, {}, 15000);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const text = await response.text();
    return parseTLEData(text);
  } catch (error) {
    console.error(`Error fetching TLE data for ${group}:`, error);
    return [];
  }
};

/**
 * Main function to fetch and process satellite data
 */
export const fetchSatelliteData = async (): Promise<{
  satellites: SatelliteObject[];
  debris: SatelliteObject[];
}> => {
  try {
    // Fetch TLE data from multiple CelesTrak groups
    const [stationsTLE, starlink30TLE, debrisTLE, activesTLE] = await Promise.all([
      fetchTLEFromCelesTrak('stations'),      // ISS and space stations
      fetchTLEFromCelesTrak('starlink'),      // Starlink satellites (limited)
      fetchTLEFromCelesTrak('cosmos-2251-debris'), // Debris
      fetchTLEFromCelesTrak('active'),        // Active satellites
    ]);

    const allTLEs = [...stationsTLE, ...starlink30TLE.slice(0, 30), ...debrisTLE.slice(0, 20), ...activesTLE.slice(0, 50)];
    const currentTime = new Date();

    const processedObjects: SatelliteObject[] = [];

    for (const tle of allTLEs) {
      const position = calculateSatellitePosition(tle, currentTime);

      if (position) {
        const objectType = categorizeObject(tle.name);
        const noradId = tle.line2.substring(2, 7).trim();

        const satelliteObj: SatelliteObject = {
          norad_id: noradId,
          name: tle.name,
          lat: position.lat,
          lng: position.lng,
          altitude: position.altitude,
          velocity: position.velocity,
          inclination: position.inclination,
          period_minutes: position.period_minutes,
          operator: getOperator(tle.name),
          object_type: objectType,
          visible: isInSunlight(position.altitude),
          conjunction_risk: Math.random() > 0.8, // Simplified risk assessment
          tle: tle,
        };

        processedObjects.push(satelliteObj);
      }
    }

    // Separate satellites from debris
    const satellites = processedObjects.filter(obj => obj.object_type === 'satellite');
    const debris = processedObjects.filter(obj => obj.object_type === 'debris');

    console.log(`Fetched ${satellites.length} satellites and ${debris.length} debris objects from CelesTrak`);

    return { satellites, debris };
  } catch (error) {
    console.error('Error fetching satellite data from CelesTrak:', error);
    return getMockSatelliteData();
  }
};

/**
 * Mock data for development/testing (fallback)
 */
const getMockSatelliteData = (): {
  satellites: SatelliteObject[];
  debris: SatelliteObject[];
} => {
  console.warn('Using mock satellite data - CelesTrak API unavailable');
  
  const satellites: SatelliteObject[] = [
    {
      norad_id: '25544',
      name: 'ISS (ZARYA)',
      lat: 51.6,
      lng: 112.8,
      altitude: 408,
      velocity: 7.66,
      inclination: 51.64,
      period_minutes: 92.68,
      operator: 'International Space Station',
      object_type: 'satellite',
      visible: true,
      conjunction_risk: false
    },
    {
      norad_id: '43013',
      name: 'STARLINK-30',
      lat: 45.2,
      lng: -93.4,
      altitude: 550,
      velocity: 7.5,
      inclination: 53.0,
      operator: 'SpaceX',
      object_type: 'satellite',
      visible: true,
      conjunction_risk: false
    },
    {
      norad_id: '48274',
      name: 'STARLINK-1600',
      lat: -33.8,
      lng: 151.2,
      altitude: 540,
      velocity: 7.52,
      inclination: 53.2,
      operator: 'SpaceX',
      object_type: 'satellite',
      visible: true,
      conjunction_risk: false
    },
    {
      norad_id: '37820',
      name: 'SENTINEL-2A',
      lat: 12.5,
      lng: 45.3,
      altitude: 786,
      velocity: 7.45,
      inclination: 98.6,
      operator: 'ESA',
      object_type: 'satellite',
      visible: true,
      conjunction_risk: false
    },
    {
      norad_id: '41866',
      name: 'LANDSAT 9',
      lat: -8.2,
      lng: -65.8,
      altitude: 705,
      velocity: 7.48,
      inclination: 98.2,
      operator: 'NASA/USGS',
      object_type: 'satellite',
      visible: true,
      conjunction_risk: false
    }
  ];

  const debris: SatelliteObject[] = [
    {
      norad_id: 'D001',
      name: 'DEBRIS-FRAG-001',
      lat: 28.5,
      lng: 77.2,
      altitude: 650,
      velocity: 7.4,
      object_type: 'debris',
      visible: true,
      conjunction_risk: true
    },
    {
      norad_id: 'D002',
      name: 'DEBRIS-FRAG-002',
      lat: -15.8,
      lng: -47.9,
      altitude: 720,
      velocity: 7.38,
      object_type: 'debris',
      visible: true,
      conjunction_risk: false
    },
    {
      norad_id: 'D003',
      name: 'COSMOS-1408 DEB',
      lat: 62.4,
      lng: 88.5,
      altitude: 485,
      velocity: 7.55,
      object_type: 'debris',
      visible: true,
      conjunction_risk: true
    }
  ];

  return { satellites, debris };
};

/**
 * Update satellite positions in real-time
 * This function can be called periodically to update positions
 */
export const updateSatellitePositions = (
  satellites: SatelliteObject[],
  currentTime: Date = new Date()
): SatelliteObject[] => {
  return satellites.map(sat => {
    if (sat.tle) {
      const position = calculateSatellitePosition(sat.tle, currentTime);
      if (position) {
        return {
          ...sat,
          lat: position.lat,
          lng: position.lng,
          altitude: position.altitude,
          velocity: position.velocity,
        };
      }
    }
    return sat;
  });
};