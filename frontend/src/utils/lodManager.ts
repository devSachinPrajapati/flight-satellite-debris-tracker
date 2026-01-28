/**
 * LOD (Level of Detail) Manager
 * Determines rendering complexity based on zoom level
 */

export const LODLevel = {
  FAR: 0,      // Zoom 0-3: Minimal dots
  MEDIUM: 1,   // Zoom 4-6: Small icons
  NEAR: 2,     // Zoom 7-9: Icons + labels
  CLOSE: 3     // Zoom 10+: Full details
} as const;

export type LODLevel = typeof LODLevel[keyof typeof LODLevel];

// Helper function to get LOD level name
const LOD_LEVEL_NAMES: Record<LODLevel, string> = {
  [LODLevel.FAR]: 'FAR',
  [LODLevel.MEDIUM]: 'MEDIUM',
  [LODLevel.NEAR]: 'NEAR',
  [LODLevel.CLOSE]: 'CLOSE'
};

function getLODLevelName(level: LODLevel): string {
  return LOD_LEVEL_NAMES[level];
}

export interface LODConfig {
  level: LODLevel;
  markerSize: number;
  showIcon: boolean;
  showLabel: boolean;
  showDetails: boolean;
  batchSize: number;
  enableInteraction: boolean;
}

export class LODManager {
  private currentZoom: number = 1.5;
  private currentLOD: LODLevel = LODLevel.FAR;
  
  // LOD transition thresholds
  private readonly LOD_THRESHOLDS = {
    [LODLevel.FAR]: { min: 0, max: 3 },
    [LODLevel.MEDIUM]: { min: 3, max: 6 },
    [LODLevel.NEAR]: { min: 6, max: 9 },
    [LODLevel.CLOSE]: { min: 9, max: 20 }
  };

  // LOD configurations
  private readonly LOD_CONFIGS: Record<LODLevel, LODConfig> = {
    [LODLevel.FAR]: {
      level: LODLevel.FAR,
      markerSize: 4,
      showIcon: false,
      showLabel: false,
      showDetails: false,
      batchSize: 100,  // Larger batches for simple markers
      enableInteraction: false
    },
    [LODLevel.MEDIUM]: {
      level: LODLevel.MEDIUM,
      markerSize: 16,
      showIcon: true,
      showLabel: false,
      showDetails: false,
      batchSize: 50,
      enableInteraction: false
    },
    [LODLevel.NEAR]: {
      level: LODLevel.NEAR,
      markerSize: 24,
      showIcon: true,
      showLabel: true,
      showDetails: false,
      batchSize: 30,
      enableInteraction: true
    },
    [LODLevel.CLOSE]: {
      level: LODLevel.CLOSE,
      markerSize: 32,
      showIcon: true,
      showLabel: true,
      showDetails: true,
      batchSize: 20,
      enableInteraction: true
    }
  };

  /**
   * Update zoom level and determine if LOD changed
   */
  public updateZoom(zoom: number): { changed: boolean; newLOD: LODLevel } {
    this.currentZoom = zoom;
    const newLOD = this.determineLOD(zoom);
    const changed = newLOD !== this.currentLOD;
    
    if (changed) {
      console.log(`🔄 LOD transition: ${getLODLevelName(this.currentLOD)} → ${getLODLevelName(newLOD)}`);
      this.currentLOD = newLOD;
    }
    
    return { changed, newLOD };
  }

  /**
   * Determine LOD level from zoom
   */
  private determineLOD(zoom: number): LODLevel {
    if (zoom <= 3) return LODLevel.FAR;
    if (zoom <= 6) return LODLevel.MEDIUM;
    if (zoom <= 9) return LODLevel.NEAR;
    return LODLevel.CLOSE;
  }

  /**
   * Get current LOD configuration
   */
  public getCurrentConfig(): LODConfig {
    return this.LOD_CONFIGS[this.currentLOD];
  }

  /**
   * Get LOD for specific zoom
   */
  public getLODForZoom(zoom: number): LODLevel {
    return this.determineLOD(zoom);
  }

  /**
   * Check if transition should be smooth
   */
  public shouldSmoothTransition(fromLOD: LODLevel, toLOD: LODLevel): boolean {
    // Only smooth transition between adjacent LOD levels
    return Math.abs(fromLOD - toLOD) === 1;
  }

  /**
   * Get performance metrics for current LOD
   */
  public getPerformanceMetrics(): {
    estimatedNodesPerMarker: number;
    cpuCost: string;
    memoryFootprint: string;
  } {
    const config = this.getCurrentConfig();
    
    const metrics = {
      [LODLevel.FAR]: {
        estimatedNodesPerMarker: 1,
        cpuCost: 'Minimal',
        memoryFootprint: '~100 bytes'
      },
      [LODLevel.MEDIUM]: {
        estimatedNodesPerMarker: 2,
        cpuCost: 'Low',
        memoryFootprint: '~300 bytes'
      },
      [LODLevel.NEAR]: {
        estimatedNodesPerMarker: 4,
        cpuCost: 'Medium',
        memoryFootprint: '~600 bytes'
      },
      [LODLevel.CLOSE]: {
        estimatedNodesPerMarker: 6,
        cpuCost: 'High',
        memoryFootprint: '~1KB'
      }
    };

    return metrics[config.level];
  }
}

// Singleton instance
export const lodManager = new LODManager();