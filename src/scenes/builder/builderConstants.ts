/**
 * Shared constants for Builder mode
 * 
 * Note: Player constants (PLAYER_SPRITE, PLAYER_SIZE, GROUND_HEIGHT) are in
 * src/constants/playerConstants.ts for shared use across GameScene and BuilderScene.
 */

import { DEPTH_LAYERS } from '../../constants/depthLayers';

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

// Visual feedback
export const DRAG_TINT = 0x4a90e2;  // Blue accent
