/**
 * Centralized depth layer constants
 * All depth values should be referenced from here to ensure consistency
 * 
 * Depth order (lower = further back):
 * - Background layers: -99 onwards (up to -90)
 * - Ground reference: -1
 * - Dynamic objects (items, NPCs, player): 100-999 based on Y position
 * - Foreground layers: 1000+ (in front of all game objects)
 * - Selection graphics: 1999
 * - Grid overlay: 2000
 */

export const DEPTH_LAYERS = {
  // Background parallax layers (starting depth, each layer increments by 1)
  BACKGROUND_LAYER_START: -99,
  
  // Ground reference (builder mode)
  GROUND_REFERENCE: -1,
  
  // Dynamic objects base (items, NPCs, player) - actual depth calculated from Y
  // Range: 100-999, where higher Y = higher depth (closer to camera)
  DYNAMIC_BASE: 100,
  DYNAMIC_MAX: 999,
  
  // Legacy constants for backwards compatibility
  ITEMS_BEHIND: 5,
  PLAYER: 10,
  ITEMS_FRONT: 15,
  
  // Foreground parallax layers (in front of all game objects)
  FOREGROUND_LAYER_START: 1000,
  
  // UI overlays
  SELECTION_GRAPHICS: 1999,
  GRID_OVERLAY: 2000,
} as const;

export type DepthLayer = typeof DEPTH_LAYERS[keyof typeof DEPTH_LAYERS];

/**
 * Calculate depth from bottomY position
 * Objects lower on screen (higher Y) have higher depth (closer to camera)
 * 
 * @param bottomY - The bottom Y position of the object
 * @param worldHeight - The total world height for normalization
 * @returns Depth value in range DYNAMIC_BASE to DYNAMIC_MAX
 */
export function calculateDepthFromY(bottomY: number, worldHeight: number): number {
  // Normalize bottomY to 0-1 range, clamp to valid range
  const normalized = Math.max(0, Math.min(1, bottomY / worldHeight));
  // Map to depth range: higher Y = higher depth
  const depthRange = DEPTH_LAYERS.DYNAMIC_MAX - DEPTH_LAYERS.DYNAMIC_BASE;
  return Math.round(DEPTH_LAYERS.DYNAMIC_BASE + normalized * depthRange);
}

/**
 * Get depth value for item based on layer preference
 * @deprecated Use calculateDepthFromY for dynamic depth sorting
 */
export function getItemDepth(layer: 'behind' | 'front'): number {
  return layer === 'behind' ? DEPTH_LAYERS.ITEMS_BEHIND : DEPTH_LAYERS.ITEMS_FRONT;
}

/**
 * Check if item is behind player
 * @deprecated Use Y-based comparison instead
 */
export function isItemBehindPlayer(depth: number): boolean {
  return depth < DEPTH_LAYERS.PLAYER;
}
