/**
 * Hook for spatial viewport queries
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { spatialApi, type ViewportQuery } from '../services/spatialApi';
import type { Aircraft, SatelliteObject } from '../types';

export function useSpatialViewport(mapRef: React.MutableRefObject<any>) {
    const [objects, setObjects] = useState<{
        aircraft: Aircraft[];
        satellites: SatelliteObject[];
        debris: SatelliteObject[];
    }>({
        aircraft: [],
        satellites: [],
        debris: []
    });

    const [queryStats, setQueryStats] = useState({
        queryTimeMs: 0,
        count: 0,
        truncated: false
    });

    const [isQuerying, setIsQuerying] = useState(false);
    const lastQueryRef = useRef<string>('');
    const [dataStatus, setDataStatus] = useState<'loading' | 'partial' | 'complete'>('loading');

    useEffect(() => {
        // Check backend health endpoint
        console.log(`Checking spatial data status... ${dataStatus}`);
        const checkDataStatus = async () => {
            const health = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/health`).then(r => r.json());

            if (health.spatial.store.aircraft > 0) {
                setDataStatus('partial'); // Show map with aircraft
            }

            if (health.spatial.store.satellites > 0) {
                setDataStatus('complete'); // All data loaded
            }
        };

        const interval = setInterval(checkDataStatus, 1000);
        return () => clearInterval(interval);
    }, []);

    const queryViewport = useCallback(async (
        bounds: { north: number; south: number; east: number; west: number },
        zoom: number
    ) => {
        if (!mapRef.current) return;

        // Debounce - skip if same query
        const queryKey = `${bounds.north},${bounds.south},${bounds.east},${bounds.west},${zoom}`;
        if (queryKey === lastQueryRef.current) {
            return;
        }
        lastQueryRef.current = queryKey;

        setIsQuerying(true);

        try {
            const query: ViewportQuery = {
                minLat: bounds.south,
                maxLat: bounds.north,
                minLng: bounds.west,
                maxLng: bounds.east,
                zoom,
                limit: 2000
            };

            const response = await spatialApi.queryViewport(query);

            // Expand compact objects
            const expanded = response.objects.map(obj => spatialApi.expandObject(obj));

            // Separate by type
            const aircraft = expanded.filter(obj => obj.type === 'aircraft');
            const satellites = expanded.filter(obj => obj.type === 'satellite');
            const debris = expanded.filter(obj => obj.type === 'debris');

            setObjects({ aircraft, satellites, debris });
            setQueryStats({
                queryTimeMs: response.meta.query_time_ms,
                count: response.meta.count,
                truncated: response.meta.truncated
            });

            console.log(`⚡ Spatial query: ${response.meta.count} objects in ${response.meta.query_time_ms}ms`);
        } catch (error) {
            console.error('Spatial query failed:', error);
        } finally {
            setIsQuerying(false);
        }
    }, [mapRef]);

    // Query on map movement (debounced)
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;
        let timeout: ReturnType<typeof setTimeout>;

        const handleMapMove = () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                const bounds = map.getBounds();
                const zoom = map.getZoom();

                queryViewport(
                    {
                        north: bounds.getNorth(),
                        south: bounds.getSouth(),
                        east: bounds.getEast(),
                        west: bounds.getWest()
                    },
                    zoom
                );
            }, 300);  // 300ms debounce
        };

        map.on('moveend', handleMapMove);
        map.on('zoomend', handleMapMove);

        // Initial query
        handleMapMove();

        return () => {
            map.off('moveend', handleMapMove);
            map.off('zoomend', handleMapMove);
            clearTimeout(timeout);
        };
    }, [mapRef, queryViewport]);

    return {
        aircraft: objects.aircraft,
        satellites: objects.satellites,
        debris: objects.debris,
        queryStats,
        isQuerying,
        queryViewport
    };
}