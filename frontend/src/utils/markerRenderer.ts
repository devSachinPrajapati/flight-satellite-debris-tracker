// /**
//  * High-Performance Marker Renderer
//  * Combines LOD + Object Pooling for optimal performance
//  */

// import type { Aircraft, SatelliteObject } from '../types';
// import { lodManager, LODLevel, type LODConfig } from './lodManager';
// import { markerPool, type PooledMarker } from './markerPool';

// export class MarkerRenderer {
//   private container: HTMLElement | null = null;
//   private currentZoom: number = 1.5;
//   private animationFrameId: number | null = null;
//   private updateQueue: Map<string, { data: Aircraft | SatelliteObject; type: 'aircraft' | 'satellite' | 'debris' }> = new Map();

//   /**
//    * Initialize renderer with container
//    */
//   public initialize(container: HTMLElement): void {
//     this.container = container;
//     console.log('✅ Marker renderer initialized');
//   }

//   /**
//    * Handle zoom change
//    */
//   public onZoomChange(newZoom: number): void {
//     const { changed, newLOD } = lodManager.updateZoom(newZoom);
//     this.currentZoom = newZoom;

//     if (changed) {
//       // LOD transition - migrate all active markers
//       this.handleLODTransition(newLOD);
//     }
//   }

//   /**
//    * Handle LOD transition
//    */
//   private handleLODTransition(newLOD: LODLevel): void {
//     const lodName = Object.keys(LODLevel)[newLOD];
//     console.log(`🔄 Transitioning to LOD ${lodName}`);
    
//     // Get all active marker IDs
//     const activeIds: string[] = [];
//     this.updateQueue.forEach((_, id) => activeIds.push(id));

//     // Batch migrate to new LOD
//     const migratedMarkers = markerPool.batchMigrateLOD(activeIds, newLOD);

//     // Re-render migrated markers
//     migratedMarkers.forEach(marker => {
//       if (marker.data) {
//         this.applyLODRendering(marker, lodManager.getCurrentConfig());
//       }
//     });

//     console.log(`✅ Migrated ${migratedMarkers.length} markers to ${lodName}`);
//   }

//   /**
//    * Queue marker for rendering
//    */
//   public queueMarker(
//     id: string,
//     data: Aircraft | SatelliteObject,
//     type: 'aircraft' | 'satellite' | 'debris',
//     lat: number,
//     lng: number
//   ): void {
//     this.updateQueue.set(id, { data, type });
//   }

//   /**
//    * Process queued markers (batched)
//    */
//   public processQueue(): void {
//     if (this.updateQueue.size === 0) return;
//     if (!this.container) return;

//     // Cancel previous frame
//     if (this.animationFrameId) {
//       cancelAnimationFrame(this.animationFrameId);
//     }

//     // Schedule batch update
//     this.animationFrameId = requestAnimationFrame(() => {
//       this.batchUpdate();
//     });
//   }

//   /**
//    * Batch update markers
//    */
//   private batchUpdate(): void {
//     const config = lodManager.getCurrentConfig();
//     const currentLOD = config.level;

//     const fragment = document.createDocumentFragment();
//     let processed = 0;

//     this.updateQueue.forEach(({ data, type }, id) => {
//       // Acquire or update marker from pool
//       let marker = markerPool.get(id);

//       if (!marker) {
//         // Acquire new marker
//         marker = markerPool.acquire(id, currentLOD, type, data);
//         fragment.appendChild(marker.element);
//       } else {
//         // Update existing marker data
//         marker.data = data;
//         marker.lastUpdate = Date.now();
//       }

//       // Apply LOD-specific rendering
//       this.applyLODRendering(marker, config);

//       processed++;

//       // Batch size limit
//       if (processed >= config.batchSize) {
//         this.container!.appendChild(fragment);
//         return;
//       }
//     });

//     // Append remaining markers
//     if (fragment.childNodes.length > 0) {
//       this.container!.appendChild(fragment);
//     }

//     // Clear queue
//     this.updateQueue.clear();

//     const lodName = Object.keys(LODLevel)[Object.values(LODLevel).indexOf(currentLOD)];
//     console.log(`✅ Rendered ${processed} markers at LOD ${lodName}`);
//   }

//   /**
//    * Apply LOD-specific rendering
//    */
//   private applyLODRendering(marker: PooledMarker, config: LODConfig): void {
//     const { element, objectType, data } = marker;
//     if (!data) return;

//     // Base styling
//     element.style.display = 'block';
//     element.style.width = `${config.markerSize}px`;
//     element.style.height = `${config.markerSize}px`;

//     // Color based on type
//     const color = this.getColorForType(objectType);

//     switch (config.level) {
//       case LODLevel.FAR:
//         this.renderFar(element, color);
//         break;

//       case LODLevel.MEDIUM:
//         this.renderMedium(element, color, objectType);
//         break;

//       case LODLevel.NEAR:
//         this.renderNear(element, color, objectType, data);
//         break;

//       case LODLevel.CLOSE:
//         this.renderClose(element, color, objectType, data, config);
//         break;
//     }

//     // Position marker
//     this.positionMarker(element, data.lat, data.lng);
//   }

//   /**
//    * Render FAR LOD (simple dot)
//    */
//   private renderFar(element: HTMLElement, color: string): void {
//     element.innerHTML = '';
//     element.style.backgroundColor = color;
//     element.style.borderRadius = '50%';
//     element.style.border = 'none';
//     element.style.pointerEvents = 'none';
//   }

//   /**
//    * Render MEDIUM LOD (small icon)
//    */
//   private renderMedium(element: HTMLElement, color: string, type: string): void {
//     const icon = this.getIconForType(type);
//     element.innerHTML = `<span style="font-size: 12px; pointer-events: none;">${icon}</span>`;
//     element.style.backgroundColor = color;
//     element.style.borderRadius = '50%';
//     element.style.border = '1px solid white';
//     element.style.display = 'flex';
//     element.style.alignItems = 'center';
//     element.style.justifyContent = 'center';
//     element.style.pointerEvents = 'none';
//   }

//   /**
//    * Render NEAR LOD (icon + label)
//    */
//   private renderNear(
//     element: HTMLElement,
//     color: string,
//     type: string,
//     data: Aircraft | SatelliteObject
//   ): void {
//     const icon = this.getIconForType(type);
//     const label = this.getLabelForObject(data);

//     element.innerHTML = `
//       <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
//         <div style="
//           width: 24px;
//           height: 24px;
//           background-color: ${color};
//           border: 2px solid white;
//           border-radius: 50%;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           box-shadow: 0 2px 4px rgba(0,0,0,0.3);
//         ">
//           <span style="font-size: 14px;">${icon}</span>
//         </div>
//         <span style="
//           font-size: 10px;
//           font-weight: 600;
//           color: white;
//           text-shadow: 0 1px 2px rgba(0,0,0,0.8);
//           margin-top: 2px;
//           white-space: nowrap;
//         ">${label}</span>
//       </div>
//     `;
//     element.style.pointerEvents = 'auto';
//     element.style.cursor = 'pointer';
//   }

//   /**
//    * Render CLOSE LOD (full details)
//    */
//   private renderClose(
//     element: HTMLElement,
//     color: string,
//     type: string,
//     data: Aircraft | SatelliteObject,
//     config: LODConfig
//   ): void {
//     const icon = this.getIconForType(type);
//     const label = this.getLabelForObject(data);
//     const details = this.getDetailsForObject(data);

//     element.innerHTML = `
//       <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
//         <div style="
//           width: 32px;
//           height: 32px;
//           background-color: ${color};
//           border: 2px solid white;
//           border-radius: 50%;
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           box-shadow: 0 2px 8px rgba(0,0,0,0.4);
//         ">
//           <span style="font-size: 18px;">${icon}</span>
//         </div>
//         <div style="
//           background: rgba(0,0,0,0.8);
//           color: white;
//           padding: 4px 8px;
//           border-radius: 4px;
//           margin-top: 4px;
//           font-size: 11px;
//           white-space: nowrap;
//           box-shadow: 0 2px 4px rgba(0,0,0,0.3);
//         ">
//           <div style="font-weight: 700;">${label}</div>
//           <div style="font-size: 9px; opacity: 0.9;">${details}</div>
//         </div>
//       </div>
//     `;
//     element.style.pointerEvents = 'auto';
//     element.style.cursor = 'pointer';
//   }

//   /**
//    * Position marker on map
//    */
//   private positionMarker(element: HTMLElement, lat: number, lng: number): void {
//     // This would integrate with your map library's projection
//     // For now, placeholder implementation
//     element.style.left = `${lng}px`;
//     element.style.top = `${lat}px`;
//   }

//   /**
//    * Helper: Get color for object type
//    */
//   private getColorForType(type: string): string {
//     switch (type) {
//       case 'aircraft': return '#3b82f6';
//       case 'satellite': return '#10b981';
//       case 'debris': return '#ef4444';
//       default: return '#6b7280';
//     }
//   }

//   /**
//    * Helper: Get icon for object type
//    */
//   private getIconForType(type: string): string {
//     switch (type) {
//       case 'aircraft': return '✈️';
//       case 'satellite': return '🛰️';
//       case 'debris': return '🔴';
//       default: return '⚪';
//     }
//   }

//   /**
//    * Helper: Get label for object
//    */
//   private getLabelForObject(data: Aircraft | SatelliteObject): string {
//     if ('hex' in data) {
//       return data.flight_icao || data.hex.substring(0, 6);
//     } else {
//       return data.name.substring(0, 12);
//     }
//   }

//   /**
//    * Helper: Get details for object
//    */
//   private getDetailsForObject(data: Aircraft | SatelliteObject): string {
//     if ('hex' in data) {
//       return `${Math.round(data.alt)} ft • ${Math.round(data.speed)} kts`;
//     } else {
//       return `${Math.round(data.altitude)} km • ${data.velocity.toFixed(1)} km/s`;
//     }
//   }

//   /**
//    * Clear markers outside viewport
//    */
//   public clearOutsideViewport(validIds: Set<string>): void {
//     const toRelease: string[] = [];

//     markerPool['activeMarkers'].forEach((marker, id) => {
//       if (!validIds.has(id)) {
//         toRelease.push(id);
//       }
//     });

//     markerPool.batchRelease(toRelease);
//     console.log(`🧹 Released ${toRelease.length} markers outside viewport`);
//   }

//   /**
//    * Get performance stats
//    */
//   public getStats(): any {
//     return {
//       lod: lodManager.getCurrentConfig(),
//       pool: markerPool.getStats(),
//       queueSize: this.updateQueue.size
//     };
//   }
// }

// // Singleton instance
// export const markerRenderer = new MarkerRenderer();