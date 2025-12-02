/**
 * Format altitude for display
 */
export const formatAltitude = (
  altitude: number,
  unit: "ft" | "km" = "ft"
): string => {
  return `${altitude.toLocaleString()} ${unit}`;
};

/**
 * Format speed for display
 */
export const formatSpeed = (
  speed: number,
  unit: "knots" | "km/h" | "km/s" = "knots"
): string => {
  return `${speed.toFixed(2)} ${unit}`;
};

/**
 * Format coordinates for display
 */
export const formatCoordinates = (
  lat: number,
  lng: number,
  precision: number = 4
): string => {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(precision)}° ${latDir}, ${Math.abs(
    lng
  ).toFixed(precision)}° ${lngDir}`;
};

/**
 * Format timestamp to readable time
 */
export const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleTimeString();
};

/**
 * Format duration in minutes
 */
export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

/**
 * Format heading/direction
 */
export const formatHeading = (degrees: number): string => {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return `${degrees}° ${directions[index]}`;
};
