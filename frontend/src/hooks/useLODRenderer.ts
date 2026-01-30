/**
 * ❌ THIS FILE IS DEPRECATED
 * 
 */ 
// /**
//  * React Hook for LOD + Pooling Integration
//  */

// import { useEffect, useCallback, useRef } from 'react';
// import { markerRenderer } from '../utils/markerRenderer';
// import { markerPool } from '../utils/markerPool';
// import type { Aircraft, SatelliteObject } from '../types';

// export function useLODRenderer(
//   mapRef: React.MutableRefObject<any>,
//   currentZoom: number,
//   isZooming: boolean
// ) {
//   const rendererInitialized = useRef(false);

//   // Initialize renderer
//   useEffect(() => {
//     if (!mapRef.current || rendererInitialized.current) return;

//     const container = document.createElement('div');
//     container.id = 'marker-container';
//     container.style.position = 'absolute';
//     container.style.top = '0';
//     container.style.left = '0';
//     container.style.width = '100%';
//     container.style.height = '100%';
//     container.style.pointerEvents = 'none';

//     mapRef.current.getContainer().appendChild(container);
//     markerRenderer.initialize(container);
//     rendererInitialized.current = true;

//     console.log('✅ LOD Renderer initialized');
//   }, [mapRef]);

//   // Handle zoom changes
//   useEffect(() => {
//     if (!rendererInitialized.current) return;

//     markerRenderer.onZoomChange(currentZoom);
//   }, [currentZoom]);

//   // Queue marker for rendering
//   const queueMarker = useCallback((
//     id: string,
//     data: Aircraft | SatelliteObject,
//     type: 'aircraft' | 'satellite' | 'debris',
//     lat: number,
//     lng: number
//   ) => {
//     markerRenderer.queueMarker(id, data, type, lat, lng);
//   }, []);

//   // Process queued markers
//   const processQueue = useCallback(() => {
//     if (!isZooming) {
//       markerRenderer.processQueue();
//     }
//   }, [isZooming]);

//   // Clear outside viewport
//   const clearOutsideViewport = useCallback((validIds: Set<string>) => {
//     markerRenderer.clearOutsideViewport(validIds);
//   }, []);

//   // Cleanup
//   useEffect(() => {
//     return () => {
//       markerPool.clearAll();
//     };
//   }, []);

//   return {
//     queueMarker,
//     processQueue,
//     clearOutsideViewport,
//     getStats: () => markerRenderer.getStats()
//   };
// }