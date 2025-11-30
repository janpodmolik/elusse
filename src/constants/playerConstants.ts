/**
 * Player Constants
 * 
 * Centralized player sprite configuration used across GameScene and BuilderScene.
 * Ensures consistency in player size, scale, and positioning calculations.
 */

import { DEPTH_LAYERS } from './depthLayers';

// ============================================================================
// Sprite Configuration
// ============================================================================

/** Original sprite frame dimensions (before scaling) */
export const PLAYER_SPRITE = {
  /** Width of single animation frame */
  FRAME_WIDTH: 48,
  /** Height of single animation frame */
  FRAME_HEIGHT: 48,
  /** Scale multiplier for rendering */
  SCALE: 5,
  /** Depth layer for rendering order */
  DEPTH: DEPTH_LAYERS.PLAYER,
} as const;

/** Calculated player dimensions after scaling */
export const PLAYER_SIZE = {
  /** Scaled width: FRAME_WIDTH * SCALE */
  WIDTH: PLAYER_SPRITE.FRAME_WIDTH * PLAYER_SPRITE.SCALE,
  /** Scaled height: FRAME_HEIGHT * SCALE */
  HEIGHT: PLAYER_SPRITE.FRAME_HEIGHT * PLAYER_SPRITE.SCALE,
  /** Half of scaled height (for center-to-bottom calculations) */
  HALF_HEIGHT: (PLAYER_SPRITE.FRAME_HEIGHT * PLAYER_SPRITE.SCALE) / 2,
} as const;

// ============================================================================
// Ground Configuration
// ============================================================================

/** Height of ground area from bottom of world */
export const GROUND_HEIGHT = 40;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate ground Y position (top of ground area)
 */
export function getGroundY(worldHeight: number): number {
  return worldHeight - GROUND_HEIGHT;
}

/**
 * Calculate player Y position so they stand on ground
 * Returns the Y coordinate for player sprite center
 */
export function getPlayerGroundY(worldHeight: number): number {
  const groundY = getGroundY(worldHeight);
  return groundY - PLAYER_SIZE.HALF_HEIGHT;
}

/**
 * Ensure player Y position is not below ground level
 * Returns corrected Y if player would be underground, otherwise returns original Y
 */
export function clampPlayerY(y: number, worldHeight: number): number {
  const maxY = getPlayerGroundY(worldHeight);
  return Math.min(y, maxY);
}

/**
 * Check if player position is below ground
 */
export function isPlayerBelowGround(playerY: number, worldHeight: number): boolean {
  const maxY = getPlayerGroundY(worldHeight);
  return playerY > maxY;
}
