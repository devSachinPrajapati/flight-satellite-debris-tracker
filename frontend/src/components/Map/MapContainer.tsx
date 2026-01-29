// import { useRef, useEffect } from "react";
// import * as maptilersdk from "@maptiler/sdk";
// import "@maptiler/sdk/dist/maptiler-sdk.css";

// interface MapContainerProps {
//   onMapLoad: (map: maptilersdk.Map) => void;
// }

// const MapContainer = ({ onMapLoad }: MapContainerProps) => {
//   const mapContainerRef = useRef<HTMLDivElement>(null);
//   const mapRef = useRef<maptilersdk.Map | null>(null);

//   useEffect(() => {
//     if (!mapContainerRef.current || mapRef.current) return;

//     const apiKey = import.meta.env.VITE_MAPTILER_API_KEY;

//     if (!apiKey) {
//       console.error("❌ MapTiler API key is missing!");
//       return;
//     }

//     console.log("🌍 Initializing Globe View...");

//     // Create map with Globe projection
//     const map = new maptilersdk.Map({
//       container: mapContainerRef.current,
//       apiKey: apiKey,
//       style: maptilersdk.MapStyle.SATELLITE,
//       center: [0, 20],
//       zoom: 1.5,
//       pitch: 0,
//       bearing: 0,
//       projection: "globe",
//       maxPitch: 85,
//       renderWorldCopies: false,
//       attributionControl: false,
//       // 🚀 FIX: Reduce interaction delay to allow marker clicks
//       clickTolerance: 3,
//       minZoom: 1.5,  // Minimum zoom level
//       maxZoom: 7.5 // Maximum zoom level
//     });

//     map.on("load", () => {
//       console.log("✅ Globe View loaded successfully");
//       mapRef.current = map;
//       onMapLoad(map);
//     });

//     map.on("error", (e) => {
//       console.error("❌ Map error:", e);
//     });

//     // 🚀 SMOOTH ROTATION: Use requestAnimationFrame for smoother rotation
//     let userInteracting = false;
//     let rotationFrameId: number | null = null;
//     let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
//     let lastRotationTime = 0;
//     const rotationSpeed = 0.05; // Degrees per frame (very smooth)
//     const ZOOM_THRESHOLD = 3;
//     const ROTATION_FPS = 60; // Target 60 FPS
//     const FRAME_DURATION = 1000 / ROTATION_FPS;

//     /**
//      * Check if map should rotate
//      */
//     const shouldRotate = (): boolean => {
//       if (!mapRef.current) return false;
//       const currentZoom = mapRef.current.getZoom();
//       return currentZoom <= ZOOM_THRESHOLD;
//     };

//     /**
//      * Smooth globe rotation using requestAnimationFrame
//      */
//     const rotateGlobe = (timestamp: number) => {
//       if (!mapRef.current || userInteracting || !shouldRotate()) {
//         rotationFrameId = null;
//         return;
//       }

//       // Throttle to maintain consistent frame rate
//       if (timestamp - lastRotationTime >= FRAME_DURATION) {
//         const center = mapRef.current.getCenter();
//         center.lng -= rotationSpeed;
        
//         // 🚀 FIX: Use jumpTo instead of easeTo for smoother, non-blocking rotation
//         mapRef.current.jumpTo({ center });
        
//         lastRotationTime = timestamp;
//       }

//       // Continue animation
//       rotationFrameId = requestAnimationFrame(rotateGlobe);
//     };

//     /**
//      * Start smooth rotation
//      */
//     const startRotation = () => {
//       if (rotationFrameId !== null) {
//         cancelAnimationFrame(rotationFrameId);
//         rotationFrameId = null;
//       }

//       if (shouldRotate()) {
//         lastRotationTime = performance.now();
//         rotationFrameId = requestAnimationFrame(rotateGlobe);
//         console.log("🔄 Smooth rotation started");
//       }
//     };

//     /**
//      * Stop rotation
//      */
//     const stopRotation = () => {
//       if (rotationFrameId !== null) {
//         cancelAnimationFrame(rotationFrameId);
//         rotationFrameId = null;
//       }
//       if (inactivityTimeout) {
//         clearTimeout(inactivityTimeout);
//         inactivityTimeout = null;
//       }
//     };

//     /**
//      * Schedule rotation after inactivity
//      */
//     const scheduleRotation = () => {
//       if (inactivityTimeout) {
//         clearTimeout(inactivityTimeout);
//       }

//       inactivityTimeout = setTimeout(() => {
//         if (!userInteracting && shouldRotate()) {
//           startRotation();
//         }
//       }, 2000); // Reduced to 2 seconds for quicker resume
//     };

//     // 🚀 ZOOM HANDLING
//     map.on("zoom", () => {
//       const currentZoom = map.getZoom();
      
//       if (currentZoom > ZOOM_THRESHOLD) {
//         stopRotation();
//       } else if (currentZoom <= ZOOM_THRESHOLD && !userInteracting) {
//         scheduleRotation();
//       }
//     });

//     // 🚀 FIX: Improved interaction handling
//     let interactionTimer: ReturnType<typeof setTimeout> | null = null;

//     const handleInteractionStart = () => {
//       userInteracting = true;
//       stopRotation();
      
//       // Clear any pending timer
//       if (interactionTimer) {
//         clearTimeout(interactionTimer);
//         interactionTimer = null;
//       }
//     };

//     const handleInteractionEnd = () => {
//       // Debounce the interaction end to allow marker clicks
//       if (interactionTimer) {
//         clearTimeout(interactionTimer);
//       }
      
//       interactionTimer = setTimeout(() => {
//         userInteracting = false;
//         scheduleRotation();
//         interactionTimer = null;
//       }, 100); // Small delay to allow click events to complete
//     };

//     // Mouse events
//     map.on("mousedown", handleInteractionStart);
//     map.on("mouseup", handleInteractionEnd);

//     // Touch events
//     map.on("touchstart", handleInteractionStart);
//     map.on("touchend", handleInteractionEnd);

//     // Drag events
//     map.on("dragstart", handleInteractionStart);
//     map.on("dragend", handleInteractionEnd);

//     // Wheel events
//     map.on("wheel", handleInteractionStart);
//     map.on("zoomend", () => {
//       // Don't immediately resume on zoom end
//       if (!userInteracting) {
//         scheduleRotation();
//       }
//     });

//     // 🚀 IMPORTANT: Pause rotation when clicking on markers
//     map.on("click", () => {
//       handleInteractionStart();
//       handleInteractionEnd();
//     });

//     // Start initial rotation
//     scheduleRotation();

//     return () => {
//       if (mapRef.current) {
//         mapRef.current.remove();
//         mapRef.current = null;
//       }
//       stopRotation();
//       if (interactionTimer) {
//         clearTimeout(interactionTimer);
//       }
//     };
//   }, [onMapLoad]);

//   return (
//     <div
//       ref={mapContainerRef}
//       className="absolute inset-0"
//       style={{ 
//         background: "#0B1026",
//         // 🚀 FIX: Ensure markers can receive clicks
//         pointerEvents: "auto"
//       }}
//     />
//   );
// };

// export default MapContainer;

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

    // Create map with Globe projection
    const map = new maptilersdk.Map({
      container: mapContainerRef.current,
      apiKey: apiKey,
      style: maptilersdk.MapStyle.SATELLITE,
      center: [0, 20],
      zoom: 1.5,
      pitch: 0,
      bearing: 0,
      projection: "globe",
      maxPitch: 85,
      renderWorldCopies: false,
      attributionControl: false,
      // 🚀 FIX: Reduce interaction delay to allow marker clicks
      clickTolerance: 3,
      minZoom: 1.5,  // Minimum zoom level
      maxZoom: 12.5 // Maximum zoom level
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
    const rotationSpeed = 0.05; // Degrees per frame (very smooth)
    const ZOOM_THRESHOLD = 3;
    const ROTATION_FPS = 60; // Target 60 FPS
    const FRAME_DURATION = 1000 / ROTATION_FPS;

    /**
     * Check if map should rotate
     */
    const shouldRotate = (): boolean => {
      if (!mapRef.current) return false;
      const currentZoom = mapRef.current.getZoom();
      return currentZoom <= ZOOM_THRESHOLD;
    };

    /**
     * Smooth globe rotation using requestAnimationFrame
     */
    const rotateGlobe = (timestamp: number) => {
      if (!mapRef.current || userInteracting || !shouldRotate()) {
        rotationFrameId = null;
        return;
      }

      // Throttle to maintain consistent frame rate
      if (timestamp - lastRotationTime >= FRAME_DURATION) {
        const center = mapRef.current.getCenter();
        center.lng -= rotationSpeed;
        
        // 🚀 FIX: Use jumpTo instead of easeTo for smoother, non-blocking rotation
        mapRef.current.jumpTo({ center });
        
        lastRotationTime = timestamp;
      }

      // Continue animation
      rotationFrameId = requestAnimationFrame(rotateGlobe);
    };

    /**
     * Start smooth rotation
     */
    const startRotation = () => {
      if (rotationFrameId !== null) {
        cancelAnimationFrame(rotationFrameId);
        rotationFrameId = null;
      }

      if (shouldRotate()) {
        lastRotationTime = performance.now();
        rotationFrameId = requestAnimationFrame(rotateGlobe);
        console.log("🔄 Smooth rotation started");
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
      }, 2000); // Reduced to 2 seconds for quicker resume
    };

    // 🚀 ZOOM HANDLING
    map.on("zoom", () => {
      const currentZoom = map.getZoom();
      
      if (currentZoom > ZOOM_THRESHOLD) {
        stopRotation();
      } else if (currentZoom <= ZOOM_THRESHOLD && !userInteracting) {
        scheduleRotation();
      }
    });

    // 🚀 FIX: Improved interaction handling
    let interactionTimer: ReturnType<typeof setTimeout> | null = null;

    const handleInteractionStart = () => {
      userInteracting = true;
      stopRotation();
      
      // Clear any pending timer
      if (interactionTimer) {
        clearTimeout(interactionTimer);
        interactionTimer = null;
      }
    };

    const handleInteractionEnd = () => {
      // Debounce the interaction end to allow marker clicks
      if (interactionTimer) {
        clearTimeout(interactionTimer);
      }
      
      interactionTimer = setTimeout(() => {
        userInteracting = false;
        scheduleRotation();
        interactionTimer = null;
      }, 100); // Small delay to allow click events to complete
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
      // Don't immediately resume on zoom end
      if (!userInteracting) {
        scheduleRotation();
      }
    });

    // 🚀 IMPORTANT: Pause rotation when clicking on markers
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
        // 🚀 FIX: Ensure markers can receive clicks
        pointerEvents: "auto"
      }}
    />
  );
};

export default MapContainer;