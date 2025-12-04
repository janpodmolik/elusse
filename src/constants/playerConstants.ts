/**
 * Player Constants
 * 
 * Centralized player sprite configuration used across GameScene and BuilderScene.
 * Ensures consistency in player size, scale, and positioning calculations.
 * 
 * Note: Player scale is now dynamic based on skin frame dimensions.
 * Use getPlayerScale() and getPlayerSize() for current skin values.
 * 
 * Supports two player types with different origin conventions:
 * - Static players (succubus, etc.): origin (0, 0) at top-left
 * - Modular players: origin (0.5, 0.5) at center via child sprites
 */

import { DEPTH_LAYERS } from './depthLayers';
import { skinManager, getSkinScale, getSkinFrameDimensions, TARGET_PLAYER_HEIGHT, type SkinConfig, AVAILABLE_SKINS } from '../data/skinConfig';
import { MODULAR_FRAME } from '../data/modularConfig';
import { MODULAR_SCALE } from '../utils/ModularCharacterBuilder';

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
// Modular Player Configuration
// ============================================================================

/** Modular player dimensions after scaling */
export const MODULAR_PLAYER_SIZE = {
  /** Frame width before scale */
  FRAME_WIDTH: MODULAR_FRAME.WIDTH,
  /** Frame height before scale */
  FRAME_HEIGHT: MODULAR_FRAME.HEIGHT,
  /** Scale factor */
  SCALE: MODULAR_SCALE,
  /** Rendered width after scale */
  WIDTH: MODULAR_FRAME.WIDTH * MODULAR_SCALE,
  /** Rendered height after scale */
  HEIGHT: MODULAR_FRAME.HEIGHT * MODULAR_SCALE,
  /** Half height for center-origin positioning */
  HALF_HEIGHT: (MODULAR_FRAME.HEIGHT * MODULAR_SCALE) / 2,
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

// ============================================================================
// Modular Player Ground Positioning
// ============================================================================

/**
 * Calculate modular player Y position so they stand on ground
 * 
 * Modular players use center origin (0.5, 0.5) so we need to offset by half height.
 * This is different from static players which use top-left origin (0, 0).
 * 
 * @param worldHeight - Total world height
 * @returns Y coordinate for modular player container center
 */
export function getModularPlayerGroundY(worldHeight: number): number {
  const groundY = getGroundY(worldHeight);
  return groundY - MODULAR_PLAYER_SIZE.HALF_HEIGHT;
}

/**
 * Ensure modular player Y position is not below ground level
 */
export function clampModularPlayerY(y: number, worldHeight: number): number {
  const maxY = getModularPlayerGroundY(worldHeight);
  return Math.min(y, maxY);
}

/**
 * Check if modular player position is below ground
 */
export function isModularPlayerBelowGround(playerY: number, worldHeight: number): boolean {
  const maxY = getModularPlayerGroundY(worldHeight);
  return playerY > maxY;
}

// ============================================================================
// Physics Body Configuration
// ============================================================================

/** Physics body size ratios for static (sprite) players */
export const STATIC_BODY_RATIOS = {
  WIDTH: 0.33,
  HEIGHT: 0.25,
  OFFSET_Y: 0.75, // Y offset as ratio of frame height
} as const;

/** Physics body size ratios for modular (container) players */
export const MODULAR_BODY_RATIOS = {
  WIDTH: 0.4,
  HEIGHT: 0.3,
} as const;

/** Selection hitbox width ratio for static (sprite) players */
export const STATIC_SELECTION_RATIOS = {
  WIDTH: 0.6,
} as const;

export interface PhysicsBodyConfig {
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
}

/**
 * Calculate physics body dimensions for static (sprite) player
 * 
 * Static players use frame dimensions before scale.
 * Offset is from top-left corner (sprite origin 0.5, 0.5 is handled by Phaser).
 */
export function getStaticPlayerPhysicsBody(frameWidth: number, frameHeight: number): PhysicsBodyConfig {
  const bodyWidth = Math.round(frameWidth * STATIC_BODY_RATIOS.WIDTH);
  const bodyHeight = Math.round(frameHeight * STATIC_BODY_RATIOS.HEIGHT);
  const offsetX = Math.round((frameWidth - bodyWidth) / 2);
  const offsetY = Math.round(frameHeight * STATIC_BODY_RATIOS.OFFSET_Y);
  
  return { width: bodyWidth, height: bodyHeight, offsetX, offsetY };
}

/**
 * Calculate physics body dimensions for modular (container) player
 * 
 * Modular players use SCALED dimensions since container doesn't auto-scale body.
 * Offset is from center (container origin 0,0 with centered child sprites).
 */
export function getModularPlayerPhysicsBody(): PhysicsBodyConfig {
  const bodyWidth = Math.round(MODULAR_PLAYER_SIZE.WIDTH * MODULAR_BODY_RATIOS.WIDTH);
  const bodyHeight = Math.round(MODULAR_PLAYER_SIZE.HEIGHT * MODULAR_BODY_RATIOS.HEIGHT);
  
  // Offset from center to position body at feet
  const offsetX = -bodyWidth / 2;
  const offsetY = MODULAR_PLAYER_SIZE.HEIGHT / 2 - bodyHeight;
  
  return { width: bodyWidth, height: bodyHeight, offsetX, offsetY };
}
