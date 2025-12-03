/**
 * Player Constants
 * 
 * Centralized player sprite configuration used across GameScene and BuilderScene.
 * Ensures consistency in player size, scale, and positioning calculations.
 * 
 * Note: Player scale is now dynamic based on skin frame dimensions.
 * Use getPlayerScale() and getPlayerSize() for current skin values.
 */

import { DEPTH_LAYERS } from './depthLayers';
import { skinManager, getSkinScale, getSkinFrameDimensions, TARGET_PLAYER_HEIGHT, type SkinConfig, AVAILABLE_SKINS } from '../data/skinConfig';

// ============================================================================
// Sprite Configuration (static/default values for reference)
// ============================================================================

/** Default sprite configuration (for cat/dog skins) */
export const PLAYER_SPRITE = {
  /** Default width of single animation frame */
  FRAME_WIDTH: 48,
  /** Default height of single animation frame */
  FRAME_HEIGHT: 48,
  /** Default scale multiplier for rendering (48 * 5 = 240px) */
  SCALE: 5,
  /** Depth layer for rendering order */
  DEPTH: DEPTH_LAYERS.PLAYER,
} as const;

/** Target rendered height for all player sprites */
export const PLAYER_TARGET_HEIGHT = TARGET_PLAYER_HEIGHT;

/** Calculated player dimensions after scaling (based on target height) */
export const PLAYER_SIZE = {
  /** Target rendered height (same for all skins) */
  HEIGHT: TARGET_PLAYER_HEIGHT,
  /** Half of target height (for center-to-bottom calculations) */
  HALF_HEIGHT: TARGET_PLAYER_HEIGHT / 2,
} as const;

// ============================================================================
// Dynamic Helpers (skin-dependent)
// ============================================================================

/**
 * Get current skin configuration
 */
export function getCurrentSkin(): SkinConfig {
  const skinId = skinManager.getSkinId();
  return AVAILABLE_SKINS.find(s => s.id === skinId) ?? AVAILABLE_SKINS[0];
}

/**
 * Get scale for current skin
 */
export function getPlayerScale(): number {
  return getSkinScale(getCurrentSkin());
}

/**
 * Get frame dimensions for current skin
 */
export function getPlayerFrameDimensions(): { width: number; height: number } {
  return getSkinFrameDimensions(getCurrentSkin());
}

/**
 * Get rendered size for current skin (after scaling)
 */
export function getPlayerSize(): { width: number; height: number; halfHeight: number } {
  const skin = getCurrentSkin();
  const scale = getSkinScale(skin);
  const { width, height } = getSkinFrameDimensions(skin);
  return {
    width: width * scale,
    height: height * scale,
    halfHeight: (height * scale) / 2,
  };
}

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
