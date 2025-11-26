/**
 * GroundManager - Centralized ground creation and management
 * 
 * Handles ground creation for both GameScene and BuilderScene
 * ensuring consistency in height, physics, and visual representation.
 */

import Phaser from 'phaser';
import { DEPTH_LAYERS } from '../../constants/depthLayers';

// Default ground configuration
export const GROUND_CONFIG = {
  HEIGHT: 40,
  // Visual appearance for builder mode
  VISUAL: {
    COLOR: 0x8b7355,
    ALPHA: 0.3,
  },
  // Physics ground (invisible in game mode)
  PHYSICS: {
    COLOR: 0x000000,
    ALPHA: 0,
  },
} as const;

export interface GroundOptions {
  worldWidth: number;
  worldHeight: number;
  height?: number;
  color?: number;
  alpha?: number;
  depth?: number;
}

export interface GroundResult {
  ground: Phaser.GameObjects.Rectangle;
  groundY: number;
}

/**
 * GroundManager - Factory for creating ground elements
 */
export const GroundManager = {
  /**
   * Calculate ground Y position from world height
   */
  getGroundY(worldHeight: number, groundHeight: number = GROUND_CONFIG.HEIGHT): number {
    return worldHeight - groundHeight;
  },

  /**
   * Create visual ground reference (for builder mode)
   * Returns a visible rectangle showing the ground area
   */
  createVisualGround(scene: Phaser.Scene, options: GroundOptions): GroundResult {
    const height = options.height ?? GROUND_CONFIG.HEIGHT;
    const groundY = GroundManager.getGroundY(options.worldHeight, height);
    
    const ground = scene.add.rectangle(
      0,
      groundY,
      options.worldWidth,
      height,
      options.color ?? GROUND_CONFIG.VISUAL.COLOR,
      options.alpha ?? GROUND_CONFIG.VISUAL.ALPHA
    );
    ground.setOrigin(0, 0);
    ground.setDepth(options.depth ?? DEPTH_LAYERS.GROUND_REFERENCE);
    
    return { ground, groundY };
  },

  /**
   * Create physics ground (for game mode)
   * Returns an invisible rectangle with physics body
   */
  createPhysicsGround(scene: Phaser.Scene, options: GroundOptions): GroundResult {
    const height = options.height ?? GROUND_CONFIG.HEIGHT;
    const groundY = GroundManager.getGroundY(options.worldHeight, height);
    
    const ground = scene.add.rectangle(
      0,
      groundY,
      options.worldWidth,
      height,
      options.color ?? GROUND_CONFIG.PHYSICS.COLOR,
      options.alpha ?? GROUND_CONFIG.PHYSICS.ALPHA
    );
    ground.setOrigin(0, 0);
    
    // Add static physics body
    scene.physics.add.existing(ground, true);
    
    return { ground, groundY };
  },

  /**
   * Add collision between player and ground
   */
  addPlayerCollision(
    scene: Phaser.Scene,
    player: Phaser.Physics.Arcade.Sprite,
    ground: Phaser.GameObjects.Rectangle
  ): Phaser.Physics.Arcade.Collider {
    return scene.physics.add.collider(player, ground);
  },
};
