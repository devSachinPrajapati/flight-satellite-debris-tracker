import { useState, useCallback, useMemo } from "react";
import type { Aircraft, SatelliteObject } from "../types";
import type { FilterOptions } from "../components/UI/SearchPanel";

export const useSearch = (
  aircraft: Aircraft[],
  satellites: SatelliteObject[],
  debris: SatelliteObject[]
) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterOptions>({ objectType: "all" });

  const handleSearch = useCallback(
    (query: string, newFilters: FilterOptions) => {
      setSearchQuery(query.toLowerCase());
      setFilters(newFilters);
    },
    []
  );

  const filteredResults = useMemo(() => {
    const results = {
      aircraft: [...aircraft],
      satellites: [...satellites],
      debris: [...debris],
    };

    // Apply search query
    if (searchQuery) {
      results.aircraft = results.aircraft.filter(
        (ac) =>
          ac.flight_icao?.toLowerCase().includes(searchQuery) ||
          ac.hex.toLowerCase().includes(searchQuery) ||
          ac.airline_icao?.toLowerCase().includes(searchQuery)
      );

      results.satellites = results.satellites.filter(
        (sat) =>
          sat.name.toLowerCase().includes(searchQuery) ||
          sat.norad_id.toLowerCase().includes(searchQuery) ||
          sat.operator?.toLowerCase().includes(searchQuery)
      );

      results.debris = results.debris.filter(
        (deb) =>
          deb.name.toLowerCase().includes(searchQuery) ||
          deb.norad_id.toLowerCase().includes(searchQuery)
      );
    }

    // Apply filters
    if (filters.objectType && filters.objectType !== "all") {
      if (filters.objectType !== "aircraft") results.aircraft = [];
      if (filters.objectType !== "satellite") results.satellites = [];
      if (filters.objectType !== "debris") results.debris = [];
    }

    // Altitude filter
    if (filters.minAltitude !== undefined) {
      results.aircraft = results.aircraft.filter(
        (ac) => ac.alt / 3.281 >= filters.minAltitude!
      );
      results.satellites = results.satellites.filter(
        (sat) => sat.altitude >= filters.minAltitude!
      );
      results.debris = results.debris.filter(
        (deb) => deb.altitude >= filters.minAltitude!
      );
    }

    if (filters.maxAltitude !== undefined) {
      results.aircraft = results.aircraft.filter(
        (ac) => ac.alt / 3.281 <= filters.maxAltitude!
      );
      results.satellites = results.satellites.filter(
        (sat) => sat.altitude <= filters.maxAltitude!
      );
      results.debris = results.debris.filter(
        (deb) => deb.altitude <= filters.maxAltitude!
      );
    }

    // Operator filter
    if (filters.operator) {
      results.satellites = results.satellites.filter(
        (sat) => sat.operator === filters.operator
      );
      results.debris = results.debris.filter(
        (deb) => deb.operator === filters.operator
      );
    }

    // Speed filter
    if (filters.minSpeed !== undefined) {
      results.satellites = results.satellites.filter(
        (sat) => sat.velocity >= filters.minSpeed!
      );
      results.debris = results.debris.filter(
        (deb) => deb.velocity >= filters.minSpeed!
      );
    }

    return results;
  }, [aircraft, satellites, debris, searchQuery, filters]);

  return {
    searchQuery,
    filters,
    handleSearch,
    filteredAircraft: filteredResults.aircraft,
    filteredSatellites: filteredResults.satellites,
    filteredDebris: filteredResults.debris,
  };
};
