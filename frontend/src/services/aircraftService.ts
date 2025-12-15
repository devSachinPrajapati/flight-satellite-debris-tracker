import type { Aircraft, AirLabsResponse } from "../types";
import { apiConfig, fetchWithTimeout } from "./api";

export const fetchAircraftData = async (): Promise<Aircraft[]> => {
  try {
    const { apiKey, baseUrl } = apiConfig.airLabs;

    if (!apiKey) {
      console.warn("⚠️ AirLabs API key not configured - using mock data");
      return getMockAircraftData();
    }

    const url = `${baseUrl}/flights?api_key=${apiKey}`;
    const response = await fetchWithTimeout(url, {}, 15000);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: AirLabsResponse = await response.json();

    // Filter and validate data
    const validAircraft = (data.response || [])
      .filter(
        (aircraft) =>
          aircraft.lat &&
          aircraft.lng &&
          !isNaN(aircraft.lat) &&
          !isNaN(aircraft.lng) &&
          Math.abs(aircraft.lat) <= 90 &&
          Math.abs(aircraft.lng) <= 180
      )
      .slice(0, 500); // Increased limit for better coverage

    return validAircraft;
  } catch (error) {
    console.error("❌ Error fetching aircraft data:", error);
    return getMockAircraftData();
  }
};

// Enhanced mock data with more realistic positions
const getMockAircraftData = (): Aircraft[] => {
  const mockFlights: Aircraft[] = [];

  // Generate some distributed aircraft
  const routes = [
    { lat: 40.7128, lng: -74.006, name: "JFK" }, // New York
    { lat: 51.5074, lng: -0.1278, name: "LHR" }, // London
    { lat: 35.6762, lng: 139.6503, name: "NRT" }, // Tokyo
    { lat: 1.3521, lng: 103.8198, name: "SIN" }, // Singapore
    { lat: -33.9399, lng: 18.4017, name: "CPT" }, // Cape Town
    { lat: 28.5383, lng: 77.391, name: "DEL" }, // Delhi
    { lat: -23.5558, lng: -46.6396, name: "GRU" }, // São Paulo
    { lat: 34.0522, lng: -118.2437, name: "LAX" }, // Los Angeles
  ];

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    for (let j = 0; j < 5; j++) {
      const offset = (Math.random() - 0.5) * 20;
      mockFlights.push({
        hex: `${i}${j}${Math.random().toString(36).substr(2, 4)}`,
        lat: route.lat + (Math.random() - 0.5) * 5,
        lng: route.lng + offset,
        alt: 30000 + Math.random() * 10000,
        dir: Math.floor(Math.random() * 360),
        speed: 400 + Math.random() * 100,
        flight_icao: `FL${i}${j}${Math.floor(Math.random() * 900 + 100)}`,
        aircraft_icao: ["B737", "A320", "B777", "A350"][
          Math.floor(Math.random() * 4)
        ],
        airline_icao: ["UAL", "BAW", "JAL", "SIA"][i % 4],
        updated: Date.now() / 1000,
      });
    }
  }

  console.log(`📊 Generated ${mockFlights.length} mock aircraft`);
  return mockFlights;
};
