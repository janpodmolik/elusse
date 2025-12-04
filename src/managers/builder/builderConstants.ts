/**
 * Shared constants for Builder mode
 * 
 * Note: Player constants (PLAYER_SPRITE, PLAYER_SIZE, GROUND_HEIGHT) are in
 * src/constants/playerConstants.ts for shared use across GameScene and BuilderScene.
 */

import { DEPTH_LAYERS } from '../../constants/depthLayers';
import { DRAG_TINT as CENTRALIZED_DRAG_TINT } from '../../constants/colors';

// Re-export player constants for convenience
export { GROUND_HEIGHT, PLAYER_SPRITE, PLAYER_SIZE } from '../../constants/playerConstants';

// Grid overlay
export const GRID_SIZE = 50;
export const GRID_LINE_COLOR = 0x4a5568;  // Gray-blue for subtle grid
export const GRID_LINE_ALPHA = 0.4;
export const GRID_LINE_WIDTH = 1;
export const OVERLAY_DEPTH = DEPTH_LAYERS.GRID_OVERLAY;

// Ground visualization
export const GROUND_LINE_COLOR = 0xff0000;
export const GROUND_LINE_WIDTH = 2;
export const GROUND_LINE_ALPHA = 0.6;
export const GROUND_AREA_ALPHA = 0.1;
export const GROUND_AREA_LINE_WIDTH = 1;
export const GROUND_AREA_LINE_ALPHA = 0.2;

// Ground reference area
export const GROUND_COLOR = 0x8b7355;
export const GROUND_ALPHA = 0.3;

// Drag constraints
export const DRAG_MARGIN_HORIZONTAL = 50;
export const DRAG_MARGIN_TOP = 50;
export const DRAG_MARGIN_BOTTOM = 10;

// Visual feedback - use centralized color
export const DRAG_TINT = CENTRALIZED_DRAG_TINT;

// Debug mode - enable hit area visualization in development
// Uses try-catch to handle cases where import.meta.env is not available
const isDevelopment = (): boolean => {
  try {
    // Vite provides import.meta.env
    return (import.meta as { env?: { DEV?: boolean } }).env?.DEV ?? false;
  } catch {
    return false;
  }
};

// Debug flags - all gated behind development mode
export const DEBUG_HIT_AREAS = isDevelopment();
export const DEBUG_INTERACTION = false; // Set to true when debugging interaction issues
export const DEBUG_HIT_AREA_COLOR = 0x00ff00;
export const DEBUG_HIT_AREA_ALPHA = 0.3;
export const DEBUG_HIT_AREA_STROKE_WIDTH = 2;
export const DEBUG_HIT_AREA_STROKE_ALPHA = 0.8;
