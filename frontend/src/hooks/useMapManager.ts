import { useState, useRef, useCallback } from "react";
import * as maptilersdk from "@maptiler/sdk";
import { viewportManager } from "../utils/viewportManager";

export const useMapManager = () => {
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isGlobeView, setIsGlobeView] = useState(true);
  const [currentZoom, setCurrentZoom] = useState(1.5);
  const [isZooming, setIsZooming] = useState(false);

  const handleMapLoad = useCallback((map: maptilersdk.Map) => {
    mapRef.current = map;
    setIsMapLoaded(true);

    // Initialize viewport manager with map
    viewportManager.setMap(map);

    // Track zoom with debouncing
    let zoomTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastZoomUpdate = Date.now();

    map.on('zoomstart', () => {
      setIsZooming(true);
    });

    map.on('zoom', () => {
      const now = Date.now();

      // Only update zoom every 500ms to prevent thrashing
      if (now - lastZoomUpdate < 500) return;

      lastZoomUpdate = now;
      const newZoom = map.getZoom();
      setCurrentZoom(newZoom);

      if (zoomTimeout) {
        clearTimeout(zoomTimeout);
      }

      zoomTimeout = setTimeout(() => {
        setIsZooming(false);
      }, 800);
    });

    map.on('zoomend', () => {
      setIsZooming(false);
      setCurrentZoom(map.getZoom());
    });

    setCurrentZoom(map.getZoom());
    console.log("✅ Map ready for markers");
  }, []);

  // const toggleGlobeView = useCallback(() => {
  //   if (mapRef.current) {
  //     const newProjection = isGlobeView ? "mercator" : "globe";
  //     mapRef.current.setProjection(newProjection as maptilersdk.ProjectionSpecification);
  //     setIsGlobeView(!isGlobeView);
  //     console.log(`🌍 Switched to ${newProjection} view`);
  //   }
  // }, [isGlobeView]);

  const toggleGlobeView = useCallback(() => {
    if (!mapRef.current) {
      console.warn("⚠️ Map reference not available");
      return;
    }

    try {
      // Properly toggle between globe and mercator projections
      const newProjection = isGlobeView ? "mercator" : "globe";

      console.log(`🌍 Switching projection from ${isGlobeView ? 'globe' : 'mercator'} to ${newProjection}`);

      // Use correct MapTiler SDK projection method with string type
      mapRef.current.setProjection({
        type: newProjection,
      });

      // Update state
      setIsGlobeView(!isGlobeView);

      // Adjust zoom levels for better UX when switching
      if (newProjection === "mercator") {
        // When switching to flat map, zoom in slightly for better view
        const currentZoom = mapRef.current.getZoom();
        if (currentZoom < 2) {
          mapRef.current.setZoom(2);
        }
      } else {
        // When switching to globe, zoom out for full globe view
        const currentZoom = mapRef.current.getZoom();
        if (currentZoom > 3) {
          mapRef.current.setZoom(2);
        }
      }

      console.log(`✅ Projection switched to ${newProjection}`);
    } catch (error) {
      console.error("❌ Error toggling projection:", error);
    }
  }, [isGlobeView]);

  return {
    mapRef,
    isMapLoaded,
    isGlobeView,
    currentZoom,
    isZooming,
    handleMapLoad,
    toggleGlobeView,
  };
};