import { useRef, useEffect } from 'react';
import { Map } from '@maptiler/sdk';
import { apiConfig } from '../../services/api';
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
      apiKey: apiConfig.mapTiler.apiKey,
      style: 'https://api.maptiler.com/maps/hybrid/style.json',
      center: [0, 20],
      zoom: 2,
      pitch: 0,
      bearing: 0,
    });

    map.on('load', () => {
      mapRef.current = map;
      onMapLoad(map);
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