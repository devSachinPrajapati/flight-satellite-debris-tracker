import * as satellite from 'satellite.js';
import type { TLEData } from '../types';

/**
 * Convert TLE to GeoJSON Feature
 */
export const tleToGeoJSON = (
  tle: TLEData,
  objectType: 'satellite' | 'debris',
  date: Date = new Date()
): GeoJSON.Feature | null => {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    
    if (satrec.error !== 0) {
      return null;
    }

    const positionAndVelocity = satellite.propagate(satrec, date);

    if (positionAndVelocity?.position && typeof positionAndVelocity.position !== 'boolean') {
      const positionEci = positionAndVelocity.position;
      const gmst = satellite.gstime(date);
      const positionGd = satellite.eciToGeodetic(positionEci, gmst);


      if (positionGd.latitude > Math.PI / 2 || positionGd.latitude < -Math.PI / 2) {
        return null;
      }

      const latitude = satellite.degreesLat(positionGd.latitude);
      const longitude = satellite.degreesLong(positionGd.longitude);
      const altitude = positionGd.height;

      let velocity = 0;
      if (positionAndVelocity.velocity && typeof positionAndVelocity.velocity !== 'boolean') {
        const vel = positionAndVelocity.velocity;
        velocity = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
      }

      const noradId = tle.line2.substring(2, 7).trim();
      const inclination = (satrec.inclo * 180) / Math.PI;

      return {
        type: 'Feature',
        properties: {
          norad_id: noradId,
          name: tle.name,
          object_type: objectType,
          altitude: altitude,
          velocity: velocity,
          inclination: inclination,
          period_minutes: (2 * Math.PI) / satrec.no,
          visible: altitude > 500,
        },
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude, altitude * 1000], // altitude in meters
        },
      };
    }
  } catch (error) {
    console.error('Error converting TLE to GeoJSON:', error);
  }

  return null;
};

/**
 * Generate orbital path for visualization
 */
export const generateOrbitPath = (
  tle: TLEData,
  numPoints: number = 100
): [number, number][] => {
  const points: [number, number][] = [];
  
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    
    if (satrec.error !== 0) {
      return points;
    }

    const period = (2 * Math.PI) / satrec.no; // Period in minutes
    const startTime = new Date();

    for (let i = 0; i < numPoints; i++) {
      const timeOffset = (period * i) / numPoints;
      const time = new Date(startTime.getTime() + timeOffset * 60 * 1000);
      
      const positionAndVelocity = satellite.propagate(satrec, time);

      if (positionAndVelocity?.position && typeof positionAndVelocity.position !== 'boolean') {
        const positionEci = positionAndVelocity.position;
        const gmst = satellite.gstime(time);
        const positionGd = satellite.eciToGeodetic(positionEci, gmst);

        if (positionGd.latitude <= Math.PI / 2 && positionGd.latitude >= -Math.PI / 2) {
          const latitude = satellite.degreesLat(positionGd.latitude);
          const longitude = satellite.degreesLong(positionGd.longitude);
          points.push([longitude, latitude]);
        }
      }
    }
  } catch (error) {
    console.error('Error generating orbit path:', error);
  }

  return points;
};

/**
 * Calculate look angles (azimuth, elevation) from observer to satellite
 */
export const calculateLookAngles = (
  tle: TLEData,
  observerLat: number,
  observerLng: number,
  observerAlt: number = 0,
  date: Date = new Date()
) => {
  try {
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);
    
    if (satrec.error !== 0) {
      return null;
    }

    const positionAndVelocity = satellite.propagate(satrec, date);

    if (positionAndVelocity?.position && typeof positionAndVelocity.position !== 'boolean') {
      const positionEci = positionAndVelocity.position;
      const gmst = satellite.gstime(date);

      const observerGd = {
        latitude: satellite.degreesToRadians(observerLat),
        longitude: satellite.degreesToRadians(observerLng),
        height: observerAlt,
      };

      const positionEcf = satellite.eciToEcf(positionEci, gmst);
      const lookAngles = satellite.ecfToLookAngles(observerGd, positionEcf);

      return {
        azimuth: satellite.degreesLat(lookAngles.azimuth),
        elevation: satellite.degreesLat(lookAngles.elevation),
        rangeSat: lookAngles.rangeSat,
      };
    }
  } catch (error) {
    console.error('Error calculating look angles:', error);
  }

  return null;
};

/**
 * Check if satellite is visible from observer location
 */
export const isSatelliteVisible = (
  tle: TLEData,
  observerLat: number,
  observerLng: number,
  minElevation: number = 10,
  date: Date = new Date()
): boolean => {
  const lookAngles = calculateLookAngles(tle, observerLat, observerLng, 0, date);
  
  if (lookAngles) {
    return lookAngles.elevation >= minElevation;
  }

  return false;
};