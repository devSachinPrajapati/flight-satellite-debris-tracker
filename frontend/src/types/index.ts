export interface AirLabsResponse {
  response: Aircraft[];
}

export interface Aircraft {
  hex: string;
  flag?: string;
  lat: number;
  lng: number;
  alt: number;
  dir: number;
  speed: number;
  v_speed?: number;
  flight_number?: string;
  flight_icao?: string;
  arr_iata?: string;
  arr_icao?: string;
  dep_iata?: string;
  dep_icao?: string;
  aircraft_icao?: string;
  airline_icao?: string;
  updated: number;
}

export interface SatelliteObject {
  norad_id: string;
  name: string;
  lat: number;
  lng: number;
  altitude: number;
  velocity: number;
  inclination?: number;
  period_minutes?: number;
  operator?: string;
  object_type: "satellite" | "debris";
  orbit_type?: 'LEO' | 'MEO' | 'GEO' | 'HEO'; // Added orbit_type
  visible: boolean;
  epoch?: string;
  conjunction_risk?: boolean;
  tle?: TLEData;
}

export interface TLEData {
  name: string;
  line1: string;
  line2: string;
  satelliteNumber?: string;
  classification?: string;
  epochYear?: number;
  epochDay?: number;
  meanMotion?: number;
  inclination?: number;
  eccentricity?: number;
  meanAnomaly?: number;
  rightAscension?: number;
  argumentOfPerigee?: number;
}

export type ViewMode = "all" | "aircraft" | "satellite" | "debris";
export type MapProjection = "mercator" | "globe";

export interface SelectedObject {
  type: "aircraft" | "satellite" | "debris";
  data: Aircraft | SatelliteObject;
}

// ============================================
// NEW FEATURE TYPES
// ============================================

// Flight History & Replay Feature
export interface FlightHistoryPoint {
  timestamp: number;
  lat: number;
  lng: number;
  alt: number;
  speed: number;
  dir: number;
}

export interface FlightHistory {
  hex: string;
  flight_icao?: string;
  points: FlightHistoryPoint[];
  startTime: number;
  endTime: number;
}

export interface ReplayState {
  isPlaying: boolean;
  currentTime: number;
  speed: number;
  selectedFlightHex?: string;
}

// Airport Features
export interface Airport {
  iata_code: string;
  icao_code: string;
  name: string;
  city: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  timezone: string;
  gmt_offset?: number;
}

export interface AirportSchedule {
  flight_iata?: string;
  flight_icao?: string;
  airline_iata?: string;
  airline_icao?: string;
  dep_iata?: string;
  dep_icao?: string;
  dep_time?: string;
  dep_time_ts?: number;
  arr_iata?: string;
  arr_icao?: string;
  arr_time?: string;
  arr_time_ts?: number;
  status:
    | "scheduled"
    | "active"
    | "landed"
    | "cancelled"
    | "incident"
    | "diverted";
  delayed?: number;
  arr_terminal?: string;
  arr_gate?: string;
  dep_terminal?: string;
  dep_gate?: string;
  aircraft_icao?: string;
  duration?: number;
}

export interface AirportWeather {
  temp: number;
  temp_unit: "C" | "F";
  wind_speed: number;
  wind_dir: number;
  wind_unit: "kts" | "mph" | "kmh";
  visibility: number;
  visibility_unit: "km" | "mi";
  clouds: string;
  pressure: number;
  pressure_unit: "mb" | "inHg";
  humidity: number;
  dewpoint?: number;
  metar?: string;
}

export interface AirportStats {
  total_arrivals_today: number;
  total_departures_today: number;
  delayed_flights: number;
  cancelled_flights: number;
  active_flights: number;
}

// Nearby Flights Feature
export interface NearbyFlight extends Aircraft {
  distance_km: number;
  bearing: number;
}

export interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp: number;
}

export interface NearbyAirport extends Airport {
  distance_km: number;
  bearing: number;
}

// Aircraft Performance Dashboard
export interface PerformanceDataPoint {
  timestamp: number;
  speed: number;
  altitude: number;
  v_speed?: number;
}

export interface AircraftPerformance {
  hex: string;
  flight_icao?: string;
  data_points: PerformanceDataPoint[];
  avg_speed: number;
  max_speed: number;
  min_speed: number;
  avg_altitude: number;
  max_altitude: number;
  climb_rate_avg?: number;
  descent_rate_avg?: number;
  fuel_efficiency_estimate?: number;
}

// Satellite Enhanced Features
export interface SatelliteTrail {
  norad_id: string;
  positions: Array<{
    lat: number;
    lng: number;
    altitude: number;
    timestamp: number;
  }>;
}

export interface OrbitalPrediction {
  norad_id: string;
  future_positions: Array<{
    lat: number;
    lng: number;
    altitude: number;
    timestamp: number;
    velocity: number;
  }>;
  orbit_type: "LEO" | "MEO" | "GEO" | "HEO";
  next_pass?: {
    aos: number;
    los: number;
    max_elevation: number;
  };
}

export interface GroundFootprint {
  center: { lat: number; lng: number };
  radius_km: number;
  coverage_area_km2: number;
}

export interface SatelliteLookAngle {
  azimuth: number;
  elevation: number;
  range_km: number;
}

// Filter & Search
export interface FilterOptions {
  minAltitude?: number;
  maxAltitude?: number;
  minSpeed?: number;
  maxSpeed?: number;
  airline?: string;
  aircraft_type?: string;
  origin_airport?: string;
  destination_airport?: string;
  satellite_operator?: string;
  orbit_type?: string;
}

export interface SearchResult {
  type: "aircraft" | "satellite" | "debris" | "airport";
  id: string;
  name: string;
  data: Aircraft | SatelliteObject | Airport;
}

// Stats & Analytics
export interface GlobalStats {
  total_aircraft: number;
  total_satellites: number;
  total_debris: number;
  total_airports_nearby: number;
  busiest_airport?: Airport;
  highest_aircraft?: Aircraft;
  fastest_aircraft?: Aircraft;
  lowest_satellite?: SatelliteObject;
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  has_more: boolean;
}

// Chart Data Types
export interface ChartDataPoint {
  x: number | string;
  y: number;
  label?: string;
}

export interface TimeSeriesData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }>;
}

// Notification System
export interface Notification {
  id: string;
  type: "info" | "warning" | "error" | "success";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
}

// Settings & Preferences
export interface UserPreferences {
  units: {
    speed: "kts" | "mph" | "kmh";
    altitude: "ft" | "m";
    distance: "km" | "mi" | "nm";
    temperature: "C" | "F";
  };
  map: {
    default_zoom: number;
    default_center: [number, number];
    default_projection: MapProjection;
    show_labels: boolean;
    show_trails: boolean;
    trail_length_minutes: number;
  };
  notifications: {
    enabled: boolean;
    sound: boolean;
    flight_alerts: boolean;
    satellite_pass_alerts: boolean;
  };
  theme: "light" | "dark" | "auto";
}

// New Loading Status types
export interface LoadingStatus {
  flights_ready: boolean;
  flights_loading: boolean;
  satellites_ready: boolean;
  satellites_loading: boolean;
}

export interface WebSocketMessage {
  type: 'initial_data' | 'position_update';
  status: 'loading' | 'ready';
  loading_status: LoadingStatus;
  data: {
    flights: Aircraft[];
    satellites: SatelliteObject[];
  };
  metadata?: {
    flights_count: number;
    satellites_count: number;
  };
}