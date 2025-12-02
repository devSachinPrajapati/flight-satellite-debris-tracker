import type { TLEData } from '../types';

/**
 * Parse TLE text format into structured data
 */
export const parseTLEText = (tleText: string): TLEData[] => {
  const lines = tleText.trim().split('\n').map(line => line.trim());
  const tleObjects: TLEData[] = [];

  for (let i = 0; i < lines.length; i += 3) {
    if (i + 2 >= lines.length) break;

    const name = lines[i];
    const line1 = lines[i + 1];
    const line2 = lines[i + 2];

    // Validate TLE format
    if (line1.startsWith('1 ') && line2.startsWith('2 ')) {
      tleObjects.push({ name, line1, line2 });
    }
  }

  return tleObjects;
};

/**
 * Extract NORAD ID from TLE line 1
 */
export const extractNoradId = (line1: string): string => {
  return line1.substring(2, 7).trim();
};

/**
 * Extract epoch from TLE line 1
 */
export const extractEpoch = (line1: string): Date => {
  const year = parseInt(line1.substring(18, 20), 10);
  const fullYear = year < 57 ? 2000 + year : 1900 + year;
  const dayOfYear = parseFloat(line1.substring(20, 32));
  
  const epoch = new Date(fullYear, 0, 1);
  epoch.setDate(dayOfYear);
  
  return epoch;
};

/**
 * Extract inclination from TLE line 2
 */
export const extractInclination = (line2: string): number => {
  return parseFloat(line2.substring(8, 16));
};

/**
 * Extract RAAN (Right Ascension of Ascending Node) from TLE line 2
 */
export const extractRAAN = (line2: string): number => {
  return parseFloat(line2.substring(17, 25));
};

/**
 * Extract eccentricity from TLE line 2
 */
export const extractEccentricity = (line2: string): number => {
  return parseFloat('0.' + line2.substring(26, 33));
};

/**
 * Extract argument of perigee from TLE line 2
 */
export const extractArgumentOfPerigee = (line2: string): number => {
  return parseFloat(line2.substring(34, 42));
};

/**
 * Extract mean anomaly from TLE line 2
 */
export const extractMeanAnomaly = (line2: string): number => {
  return parseFloat(line2.substring(43, 51));
};

/**
 * Extract mean motion from TLE line 2
 */
export const extractMeanMotion = (line2: string): number => {
  return parseFloat(line2.substring(52, 63));
};

/**
 * Calculate orbital period from mean motion
 */
export const calculateOrbitalPeriod = (meanMotion: number): number => {
  return 1440 / meanMotion; // Period in minutes
};

/**
 * Validate TLE checksum
 */
export const validateTLEChecksum = (line: string): boolean => {
  const chars = line.substring(0, 68);
  let sum = 0;

  for (const char of chars) {
    if (char >= '0' && char <= '9') {
      sum += parseInt(char, 10);
    } else if (char === '-') {
      sum += 1;
    }
  }

  const checksum = sum % 10;
  const expectedChecksum = parseInt(line.charAt(68), 10);

  return checksum === expectedChecksum;
};

/**
 * Get full TLE information as object
 */
export const parseTLEInfo = (tle: TLEData) => {
  return {
    name: tle.name,
    noradId: extractNoradId(tle.line1),
    epoch: extractEpoch(tle.line1),
    inclination: extractInclination(tle.line2),
    raan: extractRAAN(tle.line2),
    eccentricity: extractEccentricity(tle.line2),
    argumentOfPerigee: extractArgumentOfPerigee(tle.line2),
    meanAnomaly: extractMeanAnomaly(tle.line2),
    meanMotion: extractMeanMotion(tle.line2),
    orbitalPeriod: calculateOrbitalPeriod(extractMeanMotion(tle.line2)),
  };
};