/**
 * API Service - HTTP requests to backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface ApiResponse<T> {
  data?: T;
  count?: number;
  last_update?: string;
  api_calls_made?: number;
  error?: string;
}

// ✅ API Configuration (for legacy airportService compatibility)
export const apiConfig = {
  airLabs: {
    apiKey: import.meta.env.VITE_AIRLABS_API_KEY || '',
  },
  celestrak: {
    baseUrl: 'https://celestrak.org/NORAD/elements/gp.php'
  }
};

// ✅ Fetch with timeout utility (for legacy airportService compatibility)
export const fetchWithTimeout = async (
  url: string,
  options?: RequestInit,
  timeout: number = 10000
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export const api = {
  /**
   * Fetch all flights (initial load only)
   */
  async getFlights(): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flights`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        data: data.flights || [],
        count: data.count || 0,
        last_update: data.last_update,
        api_calls_made: data.api_calls_made
      };
    } catch (error) {
      console.error('Error fetching flights:', error);
      return { data: [], error: (error as Error).message };
    }
  },

  /**
   * Fetch all satellites (initial load only)
   */
  async getSatellites(): Promise<ApiResponse<any[]>> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/satellites`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return {
        data: data.satellites || [],
        count: data.count || 0,
        last_update: data.last_update
      };
    } catch (error) {
      console.error('Error fetching satellites:', error);
      return { data: [], error: (error as Error).message };
    }
  },

  /**
   * Health check
   */
  async getHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error checking health:', error);
      throw error;
    }
  },

  /**
   * Get specific flight
   */
  async getFlight(flightId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/flights/${flightId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching flight:', error);
      throw error;
    }
  },

  /**
   * Get specific satellite
   */
  async getSatellite(noradId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/satellites/${noradId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching satellite:', error);
      throw error;
    }
  }
};