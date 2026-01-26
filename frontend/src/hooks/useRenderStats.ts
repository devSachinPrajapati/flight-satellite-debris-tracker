import { useState, useMemo, useEffect } from "react";
import type { Aircraft, SatelliteObject } from "../types";
import { viewportManager } from "../utils/viewportManager";

interface RenderStats {
  totalAircraft: number;
  totalSatellites: number;
  totalDebris: number;
  renderedAircraft: number;
  renderedSatellites: number;
  renderedDebris: number;
}

export const useRenderStats = (
  aircraft: Aircraft[],
  satellites: SatelliteObject[],
  debris: SatelliteObject[],
  currentZoom: number,
  isZooming: boolean
) => {
  const [renderStats, setRenderStats] = useState<RenderStats>({
    totalAircraft: 0,
    totalSatellites: 0,
    totalDebris: 0,
    renderedAircraft: 0,
    renderedSatellites: 0,
    renderedDebris: 0,
  });

  // Filter objects by viewport
  const filteredByViewport = useMemo(() => {
    // Don't filter during zoom transitions to prevent flickering
    if (isZooming) {
      return {
        aircraft: viewportManager.filterAircraft(aircraft),
        satellites: viewportManager.filterSatellites(satellites),
        debris: viewportManager.filterDebris(debris),
      };
    }

    const visibleAircraft = viewportManager.filterAircraft(aircraft);
    const visibleSatellites = viewportManager.filterSatellites(satellites);
    const visibleDebris = viewportManager.filterDebris(debris);

    setRenderStats({
      totalAircraft: aircraft.length,
      totalSatellites: satellites.length,
      totalDebris: debris.length,
      renderedAircraft: visibleAircraft.length,
      renderedSatellites: visibleSatellites.length,
      renderedDebris: visibleDebris.length,
    });

    return {
      aircraft: visibleAircraft,
      satellites: visibleSatellites,
      debris: visibleDebris,
    };
  }, [aircraft, satellites, debris, currentZoom, isZooming]);

  // Log viewport stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (renderStats.totalAircraft > 0 || renderStats.totalSatellites > 0) {
        const stats = viewportManager.getStats(
          renderStats.totalAircraft,
          renderStats.totalSatellites,
          renderStats.totalDebris,
          renderStats.renderedAircraft,
          renderStats.renderedSatellites,
          renderStats.renderedDebris
        );
        console.log(stats);

        const totalRendered = renderStats.renderedAircraft +
          renderStats.renderedSatellites +
          renderStats.renderedDebris;

        if (totalRendered > 1000) {
          console.warn(`⚠️ Performance warning: Rendering ${totalRendered} objects!`);
        }

        if (totalRendered > 2000) {
          console.error(`🔥 CRITICAL: Rendering ${totalRendered} objects - expect lag!`);
        }
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [renderStats]);

  return {
    renderStats,
    filteredByViewport,
  };
};