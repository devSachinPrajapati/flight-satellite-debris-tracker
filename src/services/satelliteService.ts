import type { SatelliteObject } from "../types";
import { apiConfig, fetchWithTimeout } from "./api";

export const fetchSatelliteData = async (): Promise<{
  satellites: SatelliteObject[];
  debris: SatelliteObject[];
}> => {
  try {
    const { apiKey, baseUrl } = apiConfig.leoLabs;

    if (!apiKey) {
      console.warn("LEOLabs API key not configured");
      return getMockSatelliteData();
    }

    // LEOLabs API endpoint
    const url = `${baseUrl}/objects?api_key=${apiKey}`;
    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Process and separate satellites from debris
    const satellites = data.satellites || [];
    const debris = data.debris || [];

    return { satellites, debris };
  } catch (error) {
    console.error("Error fetching satellite data:", error);
    return getMockSatelliteData();
  }
};

// Mock data for development/testing
const getMockSatelliteData = (): {
  satellites: SatelliteObject[];
  debris: SatelliteObject[];
} => {
  const satellites: SatelliteObject[] = [
    {
      norad_id: "25544",
      name: "ISS (ZARYA)",
      lat: 51.6,
      lng: 112.8,
      altitude: 408,
      velocity: 7.66,
      inclination: 51.64,
      period_minutes: 92.68,
      operator: "International Space Station",
      object_type: "satellite",
      visible: true,
      conjunction_risk: false,
    },
    {
      norad_id: "43013",
      name: "STARLINK-30",
      lat: 45.2,
      lng: -93.4,
      altitude: 550,
      velocity: 7.5,
      inclination: 53.0,
      operator: "SpaceX",
      object_type: "satellite",
      visible: true,
      conjunction_risk: false,
    },
    {
      norad_id: "48274",
      name: "STARLINK-1600",
      lat: -33.8,
      lng: 151.2,
      altitude: 540,
      velocity: 7.52,
      inclination: 53.2,
      operator: "SpaceX",
      object_type: "satellite",
      visible: true,
      conjunction_risk: false,
    },
    {
      norad_id: "37820",
      name: "SENTINEL-2A",
      lat: 12.5,
      lng: 45.3,
      altitude: 786,
      velocity: 7.45,
      inclination: 98.6,
      operator: "ESA",
      object_type: "satellite",
      visible: true,
      conjunction_risk: false,
    },
    {
      norad_id: "41866",
      name: "LANDSAT 9",
      lat: -8.2,
      lng: -65.8,
      altitude: 705,
      velocity: 7.48,
      inclination: 98.2,
      operator: "NASA/USGS",
      object_type: "satellite",
      visible: true,
      conjunction_risk: false,
    },
  ];

  const debris: SatelliteObject[] = [
    {
      norad_id: "D001",
      name: "DEBRIS-FRAG-001",
      lat: 28.5,
      lng: 77.2,
      altitude: 650,
      velocity: 7.4,
      object_type: "debris",
      visible: true,
      conjunction_risk: true,
    },
    {
      norad_id: "D002",
      name: "DEBRIS-FRAG-002",
      lat: -15.8,
      lng: -47.9,
      altitude: 720,
      velocity: 7.38,
      object_type: "debris",
      visible: true,
      conjunction_risk: false,
    },
    {
      norad_id: "D003",
      name: "COSMOS-1408 DEB",
      lat: 62.4,
      lng: 88.5,
      altitude: 485,
      velocity: 7.55,
      object_type: "debris",
      visible: true,
      conjunction_risk: true,
    },
  ];

  return { satellites, debris };
};
