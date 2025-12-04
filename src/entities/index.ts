/**
 * Player entity index
 * Re-exports all player-related modules
 */

export { PlayerAnimations, type AnimationState } from './PlayerAnimations';
export { PlayerInputController, TOUCH_CONFIG, MOVEMENT_CONFIG, type InputState, type PlayerInputControllerOptions } from './PlayerInputController';
export { Player } from './Player';
export { ModularPlayer } from './ModularPlayer';

// ============================================================================
// IPlayer Interface - Common abstraction for all player types
// ============================================================================

/**
 * Player type discriminator for positioning calculations
 */
export type PlayerType = 'static' | 'modular';

/**
 * Position with x and y coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Hit bounds for interaction/selection
 */
export interface HitBounds {
  /** World-space X coordinate of bounds left edge */
  x: number;
  /** World-space Y coordinate of bounds top edge */
  y: number;
  /** Width in world pixels (after scale) */
  width: number;
  /** Height in world pixels (after scale) */
  height: number;
}

/**
 * IPlayer - Common interface for all player implementations
 * 
 * Abstracts visual representation (sprite vs container) from behavior.
 * Implementations:
 * - Player (static skins, extends Phaser.Physics.Arcade.Sprite)
 * - ModularPlayer (layered skins, extends Phaser.GameObjects.Container)
 * 
 * Note: Some method names differ from Phaser's to avoid return type conflicts
 * (Phaser methods return `this` for chaining, interface methods return void).
 */
export interface IPlayer {
  // ========== Core Positioning ==========
  
  /** Get current world position */
  getPosition(): Position;
  
  /** 
   * Set world position 
   * Note: Named setPlayerPosition to avoid conflict with Phaser's chainable setPosition
   */
  setPlayerPosition(x: number, y: number): void;
  
  /** Get the Y coordinate for standing on ground */
  getGroundY(worldHeight: number, groundHeight?: number): number;
  
  /** Get player type for positioning calculations */
  getPlayerType(): PlayerType;
  
  // ========== Interaction ==========
  
  /** Get world-space hit bounds for selection/interaction */
  getHitBounds(): HitBounds;
  
  // ========== Visual State ==========
  
  /** Set facing direction */
  setFacing(direction: 'left' | 'right'): void;
  
  /** Play animation by name (idle, run, etc.) */
  playAnimation(animName: string): void;
  
  /** Apply tint color to all sprites */
  setTint(tint: number): void;
  
  /** Clear tint from all sprites */
  clearTint(): void;
  
  /** Set alpha/opacity */
  setAlpha(alpha: number): void;
  
  // ========== Update ==========
  
  /** Update player state (call from scene update loop) */
  update(): void;
  
  // ========== Lifecycle ==========
  
  /** Get underlying Phaser game object */
  getGameObject(): Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  
  /** Cleanup and destroy */
  destroy(): void;
}
