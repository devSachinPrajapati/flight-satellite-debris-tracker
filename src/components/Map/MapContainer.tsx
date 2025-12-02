import { useRef, useEffect } from 'react';
import { Map } from '@maptiler/sdk';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';

interface MapContainerProps {
  onMapLoad: (map: Map) => void;
}

const MapContainer = ({ onMapLoad }: MapContainerProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new Map({
      container: mapContainerRef.current,
      apiKey: import.meta.env.VITE_MAPTILER_API_KEY,
      style: maptilersdk.MapStyle.HYBRID,
      // apiKey: apiConfig.mapTiler.apiKey,
      // style: maptilersdk.MapStyle.SATELLITE,
      // style: 'https://api.maptiler.com/maps/hybrid/style.json',
      center: [0, 20],
      zoom: 2,
      pitch: 0,
      bearing: 0,
    });

    map.on('load', () => {
      console.log('✅ Map loaded successfully');
      mapRef.current = map;
      onMapLoad(map);
    });
    map.on('error', (e) => {
      console.error('❌ Map error:', e);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onMapLoad]);

  return <div ref={mapContainerRef} className="absolute inset-0" />;
};

export default MapContainer;