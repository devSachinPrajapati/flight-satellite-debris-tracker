import { useRef, useEffect } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

interface MapContainerProps {
  onMapLoad: (map: maptilersdk.Map) => void;
}

const MapContainer = ({ onMapLoad }: MapContainerProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

    if (!apiKey) {
      console.error("❌ MapTiler API key is missing!");
      return;
    }

    console.log("🌍 Initializing Globe View...");

    // ✅ FIX: Create map with proper projection
    const map = new maptilersdk.Map({
      container: mapContainerRef.current,
      apiKey: apiKey,
      style: maptilersdk.MapStyle.SATELLITE,
      center: [0, 20],
      zoom: 1.5,
      pitch: 0,
      bearing: 0,
      // ✅ CRITICAL: Use correct projection type string
      projection: "globe",
      maxPitch: 85,
      renderWorldCopies: false,
      attributionControl: false,
      clickTolerance: 3,
      minZoom: 1.5,
      maxZoom: 7.5
    });

    map.on("load", () => {
      console.log("✅ Globe View loaded successfully");
      mapRef.current = map;
      onMapLoad(map);
    });

    map.on("error", (e) => {
      console.error("❌ Map error:", e);
    });

    // 🚀 SMOOTH ROTATION: Use requestAnimationFrame for smoother rotation
    let userInteracting = false;
    let rotationFrameId: number | null = null;
    let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastRotationTime = 0;
    const rotationSpeed = 0.05;
    const ZOOM_THRESHOLD = 3;
    const ROTATION_FPS = 60;
    const FRAME_DURATION = 1000 / ROTATION_FPS;

    /**
     * Check if map should rotate
     */
    const shouldRotate = (): boolean => {
      if (!mapRef.current) return false;
      const currentZoom = mapRef.current.getZoom();
      // ✅ FIX: Only rotate in globe view
      const projection = mapRef.current.getProjection();
      return currentZoom <= ZOOM_THRESHOLD && projection.type === 'globe';
    };

    /**
     * Smooth globe rotation
     */
    const rotateGlobe = (timestamp: number) => {
      if (!mapRef.current || userInteracting || !shouldRotate()) {
        rotationFrameId = null;
        return;
      }

      if (timestamp - lastRotationTime >= FRAME_DURATION) {
        const center = mapRef.current.getCenter();
        center.lng -= rotationSpeed;
        
        mapRef.current.jumpTo({ center });
        
        lastRotationTime = timestamp;
      }

      rotationFrameId = requestAnimationFrame(rotateGlobe);
    };

    /**
     * Start rotation
     */
    const startRotation = () => {
      if (rotationFrameId !== null) {
        cancelAnimationFrame(rotationFrameId);
        rotationFrameId = null;
      }

      if (shouldRotate()) {
        lastRotationTime = performance.now();
        rotationFrameId = requestAnimationFrame(rotateGlobe);
        console.log("🔄 Rotation started");
      }
    };

    /**
     * Stop rotation
     */
    const stopRotation = () => {
      if (rotationFrameId !== null) {
        cancelAnimationFrame(rotationFrameId);
        rotationFrameId = null;
      }
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
      }
    };

    /**
     * Schedule rotation after inactivity
     */
    const scheduleRotation = () => {
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }

      inactivityTimeout = setTimeout(() => {
        if (!userInteracting && shouldRotate()) {
          startRotation();
        }
      }, 2000);
    };

    // Zoom handling
    map.on("zoom", () => {
      const currentZoom = map.getZoom();
      
      if (currentZoom > ZOOM_THRESHOLD) {
        stopRotation();
      } else if (currentZoom <= ZOOM_THRESHOLD && !userInteracting) {
        scheduleRotation();
      }
    });

    // ✅ NEW: Stop rotation when projection changes to mercator
    map.on("projectionchange", () => {
      const projection = map.getProjection();
      console.log(`📐 Projection changed to: ${projection.type}`);
      
      if (projection.type === 'mercator') {
        stopRotation();
      } else if (projection.type === 'globe' && !userInteracting) {
        scheduleRotation();
      }
    });

    // Interaction handling
    let interactionTimer: ReturnType<typeof setTimeout> | null = null;

    const handleInteractionStart = () => {
      userInteracting = true;
      stopRotation();
      
      if (interactionTimer) {
        clearTimeout(interactionTimer);
        interactionTimer = null;
      }
    };

    const handleInteractionEnd = () => {
      if (interactionTimer) {
        clearTimeout(interactionTimer);
      }
      
      interactionTimer = setTimeout(() => {
        userInteracting = false;
        scheduleRotation();
        interactionTimer = null;
      }, 100);
    };

    // Mouse events
    map.on("mousedown", handleInteractionStart);
    map.on("mouseup", handleInteractionEnd);

    // Touch events
    map.on("touchstart", handleInteractionStart);
    map.on("touchend", handleInteractionEnd);

    // Drag events
    map.on("dragstart", handleInteractionStart);
    map.on("dragend", handleInteractionEnd);

    // Wheel events
    map.on("wheel", handleInteractionStart);
    map.on("zoomend", () => {
      if (!userInteracting) {
        scheduleRotation();
      }
    });

    // Pause rotation on marker clicks
    map.on("click", () => {
      handleInteractionStart();
      handleInteractionEnd();
    });

    // Start initial rotation
    scheduleRotation();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      stopRotation();
      if (interactionTimer) {
        clearTimeout(interactionTimer);
      }
    };
  }, [onMapLoad]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0"
      style={{ 
        background: "#0B1026",
        pointerEvents: "auto"
      }}
    />
  );
};

export default MapContainer;