import type { Aircraft, AirLabsResponse } from "../types";
import { apiConfig, fetchWithTimeout } from "./api";

export const fetchAircraftData = async (): Promise<Aircraft[]> => {
  try {
    const { apiKey, baseUrl } = apiConfig.airLabs;

    if (!apiKey) {
      console.warn("AirLabs API key not configured");
      return getMockAircraftData();
    }

    const url = `${baseUrl}/flights?api_key=${apiKey}`;
    const response = await fetchWithTimeout(url);

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
          Math.abs(aircraft.lat) <= 90 &&
          Math.abs(aircraft.lng) <= 180
      )
      .slice(0, 200); // Limit to first 200 valid entries

    return validAircraft;
  } catch (error) {
    console.error("Error fetching aircraft data:", error);
    return getMockAircraftData();
  }
};

// Mock data for development/testing
const getMockAircraftData = (): Aircraft[] => {
  return [
    {
      hex: "a4b5c6",
      flag: "US",
      lat: 37.7749,
      lng: -122.4194,
      alt: 35000,
      dir: 245,
      speed: 450,
      v_speed: 1200,
      flight_icao: "UAL456",
      aircraft_icao: "B787",
      airline_icao: "UAL",
      dep_iata: "SFO",
      arr_iata: "LAS",
      updated: Date.now() / 1000,
    },
    {
      hex: "b5c6d7",
      flag: "GB",
      lat: 51.5074,
      lng: -0.1278,
      alt: 38000,
      dir: 90,
      speed: 480,
      flight_icao: "BAW123",
      aircraft_icao: "A350",
      airline_icao: "BAW",
      dep_iata: "LHR",
      arr_iata: "JFK",
      updated: Date.now() / 1000,
    },
    {
      hex: "c6d7e8",
      flag: "DE",
      lat: 48.1351,
      lng: 11.582,
      alt: 33000,
      dir: 180,
      speed: 420,
      flight_icao: "DLH789",
      aircraft_icao: "A320",
      airline_icao: "DLH",
      dep_iata: "MUC",
      arr_iata: "FCO",
      updated: Date.now() / 1000,
    },
    {
      hex: "d7e8f9",
      flag: "FR",
      lat: 48.8566,
      lng: 2.3522,
      alt: 36000,
      dir: 270,
      speed: 460,
      flight_icao: "AFR234",
      aircraft_icao: "B777",
      airline_icao: "AFR",
      dep_iata: "CDG",
      arr_iata: "DXB",
      updated: Date.now() / 1000,
    },
    {
      hex: "e8f9a0",
      flag: "JP",
      lat: 35.6762,
      lng: 139.6503,
      alt: 39000,
      dir: 45,
      speed: 490,
      flight_icao: "JAL567",
      aircraft_icao: "B787",
      airline_icao: "JAL",
      dep_iata: "NRT",
      arr_iata: "LAX",
      updated: Date.now() / 1000,
    },
  ];
};
