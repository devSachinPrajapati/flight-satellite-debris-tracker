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

  // ✅ FIXED: Always filter by viewport - no exceptions!
  const filteredByViewport = useMemo(() => {
    // ✅ CRITICAL FIX: Filter ALWAYS, even during zoom
    // The "flickering" concern is handled by the marker pool reuse
    const visibleAircraft = viewportManager.filterAircraft(aircraft);
    const visibleSatellites = viewportManager.filterSatellites(satellites);
    const visibleDebris = viewportManager.filterDebris(debris);

    // Update stats
    setRenderStats({
      totalAircraft: aircraft.length,
      totalSatellites: satellites.length,
      totalDebris: debris.length,
      renderedAircraft: visibleAircraft.length,
      renderedSatellites: visibleSatellites.length,
      renderedDebris: visibleDebris.length,
    });

    // ✅ Log viewport filtering effectiveness
    if (Math.random() < 0.1) { // 10% sampling to avoid spam
      const totalObjects = aircraft.length + satellites.length + debris.length;
      const renderedObjects = visibleAircraft.length + visibleSatellites.length + visibleDebris.length;
      const culled = totalObjects - renderedObjects;
      const culledPercent = ((culled / totalObjects) * 100).toFixed(1);
      
      console.log(`🎯 Viewport Culling: ${culled} objects culled (${culledPercent}%) | Zoom: ${currentZoom.toFixed(1)}`);
    }

    return {
      aircraft: visibleAircraft,
      satellites: visibleSatellites,
      debris: visibleDebris,
    };
  }, [aircraft, satellites, debris, currentZoom, isZooming]); // ✅ Keep isZooming for reactivity

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