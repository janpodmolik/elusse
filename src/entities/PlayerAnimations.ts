/**
 * PlayerAnimations - Manages player animation playback
 * 
 * Handles animation state transitions for idle and run animations.
 * Animation naming: {skinId}-idle, {skinId}-run
 * 
 * Note: Animation creation is handled by skinLoader.ts
 * which supports both PNG spritesheets and GIF animations.
 */

import Phaser from 'phaser';
import { DEFAULT_SKIN_ID } from '../data/skinConfig';

export type AnimationState = 'idle' | 'running' | 'jumping' | 'falling';

/**
 * PlayerAnimations - Manager for player animation playback
 */
export class PlayerAnimations {
  private scene: Phaser.Scene;
  private currentSkinId: string;
  
  constructor(scene: Phaser.Scene, initialSkinId: string = DEFAULT_SKIN_ID) {
    this.scene = scene;
    this.currentSkinId = initialSkinId;
  }

  /**
   * Create all animations for all available skins
   * @deprecated Animations are now created by skinLoader.ts - this is kept for backwards compatibility
   */
  createAll(): void {
    // Animations are now created by createAllSkinAnimations() in skinLoader.ts
    // This method is kept for backwards compatibility but does nothing
    console.log('PlayerAnimations.createAll() is deprecated - animations created by skinLoader');
  }

  /**
   * Get current skin ID
   */
  getSkinId(): string {
    return this.currentSkinId;
  }

  /**
   * Set current skin ID
   */
  setSkinId(skinId: string): void {
    this.currentSkinId = skinId;
  }

  /**
   * Get animation key for current skin
   */
  getAnimationKey(type: 'idle' | 'run' | 'jump' | 'fall'): string {
    return `${this.currentSkinId}-${type}`;
  }

  /**
   * Play animation on sprite
   */
  play(sprite: Phaser.GameObjects.Sprite, type: 'idle' | 'run' | 'jump' | 'fall'): void {
    const key = this.getAnimationKey(type);
    
    // Skip if already playing this animation
    if (sprite.anims.currentAnim?.key === key) {
      return;
    }
    
    // Check if animation exists before playing
    if (!this.scene.anims.exists(key)) {
      // Fallback for jump/fall if they don't exist (e.g. for some skins)
      if (type === 'jump' || type === 'fall') {
        // Try to play idle or run instead if jump/fall missing
        const fallbackKey = this.getAnimationKey('idle');
        if (this.scene.anims.exists(fallbackKey)) {
           sprite.play(fallbackKey);
           return;
        }
      }
      console.warn(`[PlayerAnimations] Animation not found: ${key}`);
      return;
    }
    
    sprite.play(key);
  }

  /**
   * Handle skin change - update animation on sprite
   */
  handleSkinChange(sprite: Phaser.GameObjects.Sprite, newSkinId: string): void {
    const oldSkinId = this.currentSkinId;
    this.currentSkinId = newSkinId;
    
    // Get current animation type and replay with new skin
    const currentAnim = sprite.anims.currentAnim?.key;
    if (currentAnim) {
      // Extract animation type (e.g., "idle", "run", "jump", "fall")
      const animType = currentAnim.replace(`${oldSkinId}-`, '') as 'idle' | 'run' | 'jump' | 'fall';
      const newAnimKey = `${newSkinId}-${animType}`;
      
      if (this.scene.anims.exists(newAnimKey)) {
        sprite.play(newAnimKey);
      } else {
        // Fallback to idle if animation doesn't exist
        const idleKey = `${newSkinId}-idle`;
        if (this.scene.anims.exists(idleKey)) {
          sprite.play(idleKey);
        }
      }
    }
  }
}
