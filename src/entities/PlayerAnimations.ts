/**
 * PlayerAnimations - Manages all player animation creation and playback
 * 
 * Handles:
 * - Animation creation for all skins
 * - Animation state transitions
 * - Jump animation with rotation
 */

import Phaser from 'phaser';
import { catSkinManager, CatSkin } from '../data/catSkin';

// Jump animation constants
export const JUMP_ANIMATION_CONFIG = {
  FAST_VELOCITY_THRESHOLD: 100,
  SLOW_VELOCITY_THRESHOLD: 20,
  ROTATION_FULL: 15,
  ROTATION_SLIGHT: 8,
} as const;

export type AnimationState = 'idle' | 'running' | 'jumping';

/**
 * PlayerAnimations - Factory for creating and managing player animations
 */
export class PlayerAnimations {
  private scene: Phaser.Scene;
  private currentSkin: CatSkin;
  
  constructor(scene: Phaser.Scene, initialSkin: CatSkin = 'white') {
    this.scene = scene;
    this.currentSkin = initialSkin;
  }

  /**
   * Create all animations for all available skins
   */
  createAll(): void {
    const skins = catSkinManager.getAllSkins();
    
    skins.forEach(skin => {
      this.createAnimationsForSkin(skin);
    });
  }

  /**
   * Create animations for a specific skin
   */
  private createAnimationsForSkin(skin: CatSkin): void {
    const scene = this.scene;
    
    // Idle animation (4 frames)
    if (!scene.anims.exists(`cat-idle-${skin}`)) {
      scene.anims.create({
        key: `cat-idle-${skin}`,
        frames: scene.anims.generateFrameNumbers(`cat-idle-${skin}`, { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      });
    }

    // Walk animation (6 frames)
    if (!scene.anims.exists(`cat-walk-${skin}`)) {
      scene.anims.create({
        key: `cat-walk-${skin}`,
        frames: scene.anims.generateFrameNumbers(`cat-walk-${skin}`, { start: 0, end: 5 }),
        frameRate: 12,
        repeat: -1
      });
    }

    // Jump animations (single frames from walk spritesheet)
    const jumpAnimations = [
      { key: `cat-jump-up-${skin}`, frame: 2 },
      { key: `cat-jump-peak-up-${skin}`, frame: 3 },
      { key: `cat-jump-peak-down-${skin}`, frame: 3 },
      { key: `cat-jump-down-${skin}`, frame: 4 },
    ];

    jumpAnimations.forEach(({ key, frame }) => {
      if (!scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: [{ key: `cat-walk-${skin}`, frame }],
          frameRate: 1,
          repeat: 0
        });
      }
    });
  }

  /**
   * Get current skin
   */
  getSkin(): CatSkin {
    return this.currentSkin;
  }

  /**
   * Set current skin
   */
  setSkin(skin: CatSkin): void {
    this.currentSkin = skin;
  }

  /**
   * Get animation key for current skin
   */
  getAnimationKey(type: 'idle' | 'walk' | 'jump-up' | 'jump-peak-up' | 'jump-peak-down' | 'jump-down'): string {
    return `cat-${type}-${this.currentSkin}`;
  }

  /**
   * Play animation on sprite
   */
  play(sprite: Phaser.GameObjects.Sprite, type: 'idle' | 'walk' | 'jump-up' | 'jump-peak-up' | 'jump-peak-down' | 'jump-down'): void {
    const key = this.getAnimationKey(type);
    if (sprite.anims.currentAnim?.key !== key) {
      sprite.play(key);
    }
  }

  /**
   * Get appropriate jump animation and rotation based on velocity
   */
  getJumpAnimationState(velocityY: number): { animation: string; rotation: number; flipMultiplier: number } {
    const { FAST_VELOCITY_THRESHOLD, SLOW_VELOCITY_THRESHOLD, ROTATION_FULL, ROTATION_SLIGHT } = JUMP_ANIMATION_CONFIG;
    
    if (velocityY < -FAST_VELOCITY_THRESHOLD) {
      return {
        animation: this.getAnimationKey('jump-up'),
        rotation: ROTATION_FULL,
        flipMultiplier: 1
      };
    } else if (velocityY < -SLOW_VELOCITY_THRESHOLD) {
      return {
        animation: this.getAnimationKey('jump-peak-up'),
        rotation: ROTATION_SLIGHT,
        flipMultiplier: 1
      };
    } else if (velocityY <= FAST_VELOCITY_THRESHOLD) {
      return {
        animation: this.getAnimationKey('jump-peak-down'),
        rotation: ROTATION_SLIGHT,
        flipMultiplier: -1
      };
    } else {
      return {
        animation: this.getAnimationKey('jump-down'),
        rotation: ROTATION_FULL,
        flipMultiplier: -1
      };
    }
  }

  /**
   * Handle skin change - update animation on sprite
   */
  handleSkinChange(sprite: Phaser.GameObjects.Sprite, newSkin: CatSkin): void {
    const oldSkin = this.currentSkin;
    this.currentSkin = newSkin;
    
    // Get current animation type and replay with new skin
    const currentAnim = sprite.anims.currentAnim?.key;
    if (currentAnim) {
      // Extract animation type (e.g., "idle", "walk", "jump-up")
      const animType = currentAnim.replace(`cat-`, '').replace(`-${oldSkin}`, '');
      const newAnimKey = `cat-${animType}-${newSkin}`;
      
      if (this.scene.anims.exists(newAnimKey)) {
        sprite.play(newAnimKey);
      }
    }
  }
}
