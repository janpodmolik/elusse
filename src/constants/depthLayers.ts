/**
 * Centralized depth layer constants
 * All depth values should be referenced from here to ensure consistency
 * 
 * Depth order (lower = further back):
 * - Background layers: -99 onwards (up to -90)
 * - Ground reference: -1
 * - Items behind player: 5
 * - Player: 10
 * - Items in front of player: 15
 * - Foreground layers: 50 onwards
 * - Selection graphics: 999
 * - Grid overlay: 1000
 */

export const DEPTH_LAYERS = {
  // Background parallax layers (starting depth, each layer increments by 1)
  BACKGROUND_LAYER_START: -99,
  
  // Ground reference (builder mode)
  GROUND_REFERENCE: -1,
  
  // Game objects
  ITEMS_BEHIND: 5,
  PLAYER: 10,
  ITEMS_FRONT: 15,
  
  // Foreground parallax layers (in front of player)
  FOREGROUND_LAYER_START: 50,
  
  // UI overlays
  SELECTION_GRAPHICS: 999,
  GRID_OVERLAY: 1000,
} as const;

export type DepthLayer = typeof DEPTH_LAYERS[keyof typeof DEPTH_LAYERS];

/**
 * Get depth value for item based on layer preference
 */
export function getItemDepth(layer: 'behind' | 'front'): number {
  return layer === 'behind' ? DEPTH_LAYERS.ITEMS_BEHIND : DEPTH_LAYERS.ITEMS_FRONT;
}

/**
 * Check if item is behind player
 */
export function isItemBehindPlayer(depth: number): boolean {
  return depth < DEPTH_LAYERS.PLAYER;
}
