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

export interface TLEData {
  name: string;
  line1: string;
  line2: string;
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
  object_type: 'satellite' | 'debris';
  visible: boolean;
  epoch?: string;
  conjunction_risk?: boolean;
  tle?: TLEData;
}

export type ViewMode = 'all' | 'aircraft' | 'satellite' | 'debris';

export interface SelectedObject {
  type: 'aircraft' | 'satellite' | 'debris';
  data: Aircraft | SatelliteObject;
}

export interface AirLabsResponse {
  response: Aircraft[];
}

export interface CelesTrakTLE {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;
  ECCENTRICITY: number;
  INCLINATION: number;
  RA_OF_ASC_NODE: number;
  ARG_OF_PERICENTER: number;
  MEAN_ANOMALY: number;
  EPHEMERIS_TYPE: number;
  CLASSIFICATION_TYPE: string;
  NORAD_CAT_ID: string;
  ELEMENT_SET_NO: number;
  REV_AT_EPOCH: number;
  BSTAR: number;
  MEAN_MOTION_DOT: number;
  MEAN_MOTION_DDOT: number;
}