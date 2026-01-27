/**
 * Spatial Viewport API Client
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ViewportQuery {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  types?: string[];
  minAlt?: number;
  maxAlt?: number;
  limit?: number;
  zoom?: number;
}

export interface CompactObject {
  i: string;  // id
  t: number;  // type
  p: number[];  // [lat, lng, alt]
  v: number[];  // [velocity, heading]
  n: string;  // name
  o?: string;  // operator
  x?: any;  // extra
}

export interface ViewportResponse {
  objects: CompactObject[];
  meta: {
    count: number;
    truncated: boolean;
    query_time_ms: number;
    viewport: {
      min_lat: number;
      max_lat: number;
      min_lng: number;
      max_lng: number;
    };
    data_age: {
      celestrak: number;
      airlabs: number;
    };
  };
}

export const spatialApi = {
  /**
   * Query viewport using spatial index (FAST!)
   */
  async queryViewport(query: ViewportQuery): Promise<ViewportResponse> {
    const params = new URLSearchParams({
      min_lat: query.minLat.toString(),
      max_lat: query.maxLat.toString(),
      min_lng: query.minLng.toString(),
      max_lng: query.maxLng.toString(),
    });

    if (query.types && query.types.length > 0) {
      params.append('types', query.types.join(','));
    }
    if (query.minAlt !== undefined) params.append('min_alt', query.minAlt.toString());
    if (query.maxAlt !== undefined) params.append('max_alt', query.maxAlt.toString());
    if (query.limit) params.append('limit', query.limit.toString());
    if (query.zoom) params.append('zoom', query.zoom.toString());

    const response = await fetch(`${API_BASE_URL}/api/v1/viewport?${params}`);
    
    if (!response.ok) {
      throw new Error(`Spatial query failed: ${response.status}`);
    }

    return response.json();
  },

  /**
   * Convert compact object to full Aircraft/Satellite type
   */
  expandObject(compact: CompactObject): any {
    const typeMap = ['aircraft', 'satellite', 'debris'];
    
    return {
      id: compact.i,
      type: typeMap[compact.t] || 'unknown',
      lat: compact.p[0],
      lng: compact.p[1],
      alt: compact.p[2],
      velocity: compact.v[0],
      heading: compact.v[1],
      name: compact.n,
      operator: compact.o,
      ...compact.x  // Spread extra data
    };
  }
};