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
  object_type: 'satellite' | 'debris';
  visible: boolean;
  epoch?: string;
  conjunction_risk?: boolean;
}

export type ViewMode = 'all' | 'aircraft' | 'satellite' | 'debris';

export interface SelectedObject {
  type: 'aircraft' | 'satellite' | 'debris';
  data: Aircraft | SatelliteObject;
}

export interface AirLabsResponse {
  response: Aircraft[];
}

export interface LEOLabsResponse {
  satellites: SatelliteObject[];
  debris: SatelliteObject[];
}