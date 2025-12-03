// import { useRef, useEffect } from 'react';
// import { Map } from '@maptiler/sdk';
// import * as maptilersdk from '@maptiler/sdk';
// import '@maptiler/sdk/dist/maptiler-sdk.css';

// interface MapContainerProps {
//   onMapLoad: (map: Map) => void;
// }

// const MapContainer = ({ onMapLoad }: MapContainerProps) => {
//   const mapContainerRef = useRef<HTMLDivElement>(null);
//   const mapRef = useRef<Map | null>(null);

//   useEffect(() => {
//     if (!mapContainerRef.current || mapRef.current) return;

//     const map = new Map({
//       container: mapContainerRef.current,
//       apiKey: import.meta.env.VITE_MAPTILER_API_KEY,
//       style: maptilersdk.MapStyle.HYBRID,
//       // apiKey: apiConfig.mapTiler.apiKey,
//       // style: maptilersdk.MapStyle.SATELLITE,
//       // style: 'https://api.maptiler.com/maps/hybrid/style.json',
//       center: [0, 20],
//       zoom: 2,
//       pitch: 0,
//       bearing: 0,
//     });

//     map.on('load', () => {
//       console.log('✅ Map loaded successfully');
//       mapRef.current = map;
//       onMapLoad(map);
//     });
//     map.on('error', (e) => {
//       console.error('❌ Map error:', e);
//     });

//     return () => {
//       if (mapRef.current) {
//         mapRef.current.remove();
//         mapRef.current = null;
//       }
//     };
//   }, [onMapLoad]);

//   return <div ref={mapContainerRef} className="absolute inset-0" />;
// };

// export default MapContainer;


import { useRef, useEffect } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

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
      console.error('❌ MapTiler API key is missing!');
      return;
    }

    console.log('🌍 Initializing Globe View...');

    // Create map with Globe projection
    const map = new maptilersdk.Map({
      container: mapContainerRef.current,
      apiKey: apiKey,
      style: maptilersdk.MapStyle.SATELLITE, // Best for globe view
      center: [0, 20],
      zoom: 1.5, // Lower zoom for better globe view
      pitch: 0,
      bearing: 0,
      projection: 'globe', // 🌐 Enable Globe View
    });

    map.on('load', () => {
      console.log('✅ Globe View loaded successfully');

      mapRef.current = map;
      onMapLoad(map);
    });

    map.on('error', (e) => {
      console.error('❌ Map error:', e);
    });

    // Optional: Add rotation animation
    let userInteracting = false;
    const rotationSpeed = 0.5; // degrees per frame

    const spinGlobe = () => {
      if (!userInteracting && mapRef.current) {
        const center = mapRef.current.getCenter();
        center.lng -= rotationSpeed;
        mapRef.current.easeTo({ center, duration: 1000, easing: (t) => t });
      }
    };

    // Start rotation after 3 seconds of inactivity
    let rotationTimeout: ReturnType<typeof setTimeout>;
    const startRotation = () => {
      rotationTimeout = setTimeout(() => {
        if (!userInteracting) {
          setInterval(spinGlobe, 1000);
        }
      }, 3000);
    };

    map.on('mousedown', () => {
      userInteracting = true;
      clearTimeout(rotationTimeout);
    });

    map.on('mouseup', () => {
      userInteracting = false;
      startRotation();
    });

    map.on('touchstart', () => {
      userInteracting = true;
      clearTimeout(rotationTimeout);
    });

    map.on('touchend', () => {
      userInteracting = false;
      startRotation();
    });

    // Uncomment to enable auto-rotation
    // startRotation();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      clearTimeout(rotationTimeout);
    };
  }, [onMapLoad]);

  return (
    <div 
      ref={mapContainerRef} 
      className="absolute inset-0"
      style={{ background: '#0B1026' }} // Space background
    />
  );
};

export default MapContainer;