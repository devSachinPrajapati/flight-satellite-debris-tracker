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
//       style: maptilersdk.MapStyle.SATELLITE, // Best for globe view
//       center: [0, 20],
//       zoom: 1.5, // Lower zoom for better globe view
//       pitch: 0,
//       bearing: 0,
//       projection: "globe", // 🌐 Enable Globe View
//       // ✅ Performance optimizations
//       maxPitch: 85,
//       renderWorldCopies: false,
//       attributionControl: false
//     });

//     map.on("load", () => {
//       console.log("✅ Globe View loaded successfully");
//       mapRef.current = map;
//       onMapLoad(map);
//     });

//     map.on("error", (e) => {
//       console.error("❌ Map error:", e);
//     });

//     // Add rotation animation
//     let userInteracting = false;
//     const rotationSpeed = 0.5; // degrees per frame

//     const spinGlobe = () => {
//       if (!userInteracting && mapRef.current) {
//         const center = mapRef.current.getCenter();
//         center.lng -= rotationSpeed;
//         mapRef.current.easeTo({ center, duration: 1000, easing: (t) => t });
//       }
//     };

//     // Start rotation after 3 seconds of inactivity
//     let rotationTimeout: ReturnType<typeof setTimeout>;
//     const startRotation = () => {
//       rotationTimeout = setTimeout(() => {
//         if (!userInteracting) {
//           setInterval(spinGlobe, 1000);
//         }
//       }, 3000);
//     };

//     map.on("mousedown", () => {
//       userInteracting = true;
//       clearTimeout(rotationTimeout);
//     });

//     map.on("mouseup", () => {
//       userInteracting = false;
//       startRotation();
//     });

//     map.on("touchstart", () => {
//       userInteracting = true;
//       clearTimeout(rotationTimeout);
//     });

//     map.on("touchend", () => {
//       userInteracting = false;
//       startRotation();
//     });

//     // To Enable auto-rotation
//     startRotation();

//     return () => {
//       if (mapRef.current) {
//         mapRef.current.remove();
//         mapRef.current = null;
//       }
//       clearTimeout(rotationTimeout);
//     };
//   }, [onMapLoad]);

//   return (
//     <div
//       ref={mapContainerRef}
//       className="absolute inset-0"
//       style={{ background: "#0B1026" }} // Space background color
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
      attributionControl: false
    });

    map.on("load", () => {
      console.log("✅ Globe View loaded successfully");
      mapRef.current = map;
      onMapLoad(map);
    });

    map.on("error", (e) => {
      console.error("❌ Map error:", e);
    });

    // 🚀 FIXED: Rotation control with zoom awareness
    let userInteracting = false;
    let rotationInterval: ReturnType<typeof setInterval> | null = null;
    let inactivityTimeout: ReturnType<typeof setTimeout> | null = null;
    const rotationSpeed = 0.5; // degrees per second
    // const INITIAL_ZOOM = 1.5;
    const ZOOM_THRESHOLD = 3; // Stop rotation if zoom > 3

    /**
     * Check if map should rotate based on zoom level
     */
    const shouldRotate = (): boolean => {
      if (!mapRef.current) return false;
      const currentZoom = mapRef.current.getZoom();
      return currentZoom <= ZOOM_THRESHOLD;
    };

    /**
     * Spin globe smoothly
     */
    const spinGlobe = () => {
      if (!userInteracting && mapRef.current && shouldRotate()) {
        const center = mapRef.current.getCenter();
        center.lng -= rotationSpeed;
        mapRef.current.easeTo({ 
          center, 
          duration: 1000, 
          easing: (t) => t 
        });
      }
    };

    /**
     * Start rotation
     */
    const startRotation = () => {
      // Clear existing interval
      if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = null;
      }

      // Only start if zoom is appropriate
      if (shouldRotate()) {
        rotationInterval = setInterval(spinGlobe, 10);
        console.log("🔄 Globe rotation started");
      } else {
        console.log("⏸️ Rotation disabled - zoom too high");
      }
    };

    /**
     * Stop rotation
     */
    const stopRotation = () => {
      if (rotationInterval) {
        clearInterval(rotationInterval);
        rotationInterval = null;
        console.log("⏸️ Globe rotation stopped");
      }
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = null;
      }
    };

    /**
     * Schedule rotation to start after inactivity
     */
    const scheduleRotation = () => {
      // Clear any pending timeout
      if (inactivityTimeout) {
        clearTimeout(inactivityTimeout);
      }

      // Schedule rotation after 3 seconds of inactivity
      inactivityTimeout = setTimeout(() => {
        if (!userInteracting) {
          startRotation();
        }
      }, 3000);
    };

    // 🚀 FIXED: Handle zoom events
    map.on("zoom", () => {
      const currentZoom = map.getZoom();
      
      // Stop rotation if zoomed in beyond threshold
      if (currentZoom > ZOOM_THRESHOLD) {
        stopRotation();
      } 
      // Restart rotation if zoomed back to world view and not interacting
      else if (currentZoom <= ZOOM_THRESHOLD && !userInteracting) {
        scheduleRotation();
      }
    });

    // Handle user interactions
    map.on("mousedown", () => {
      userInteracting = true;
      stopRotation();
    });

    map.on("mouseup", () => {
      userInteracting = false;
      scheduleRotation();
    });

    map.on("touchstart", () => {
      userInteracting = true;
      stopRotation();
    });

    map.on("touchend", () => {
      userInteracting = false;
      scheduleRotation();
    });

    // Handle wheel zoom (important for stopping rotation during zoom)
    map.on("wheel", () => {
      userInteracting = true;
      stopRotation();
    });

    // Reset interaction flag when wheel zoom ends
    map.on("zoomend", () => {
      userInteracting = false;
      scheduleRotation();
    });

    // Handle drag events
    map.on("dragstart", () => {
      userInteracting = true;
      stopRotation();
    });

    map.on("dragend", () => {
      userInteracting = false;
      scheduleRotation();
    });

    // 🚀 Start initial rotation after 3 seconds
    scheduleRotation();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      stopRotation();
    };
  }, [onMapLoad]);

  return (
    <div
      ref={mapContainerRef}
      className="absolute inset-0"
      style={{ background: "#0B1026" }}
    />
  );
};

export default MapContainer;