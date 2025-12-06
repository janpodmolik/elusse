/**
 * ItemRenderer - Handles sprite creation and visual updates for placed items
 */

import Phaser from 'phaser';
import type { PlacedItem } from '../data/mapConfig';
import { ITEMS, isAnimatedItem, getAnimationConfig } from '../data/items/index';

/**
 * ItemRenderer - Factory for creating and updating item sprites
 */
export class ItemRenderer {
  private scene: Phaser.Scene;
  private groundY: number;

  constructor(scene: Phaser.Scene, groundY: number) {
    this.scene = scene;
    this.groundY = groundY;
  }

  /**
   * Preload all item assets
   */
  static preloadAssets(scene: Phaser.Scene): void {
    ITEMS.forEach(item => {
      if (isAnimatedItem(item.key)) {
        const config = getAnimationConfig(item.key);
        if (config) {
          scene.load.spritesheet(item.key, item.path, {
            frameWidth: config.frameWidth,
            frameHeight: config.frameHeight
          });
        }
      } else {
        scene.load.image(item.key, item.path);
      }
    });
  }

  /**
   * Create a sprite from item data
   */
  createSprite(itemData: PlacedItem): Phaser.GameObjects.Sprite {
    const { id, assetKey, x, scale = 1, depth = 5, yOffset = 0, flipX = false } = itemData;
    
    // Calculate final Y position (ground + offset)
    const finalY = this.groundY + yOffset;
    
    // Create sprite
    const sprite = this.scene.add.sprite(x, finalY, assetKey);
    sprite.setScale(scale);
    sprite.setDepth(depth);
    sprite.setFlipX(flipX);
    sprite.setData('itemId', id);
    
    // Handle animation if applicable
    if (isAnimatedItem(assetKey)) {
      const animKey = `${assetKey}_anim`;
      const config = getAnimationConfig(assetKey);
      
      if (config) {
        // Create animation if it doesn't exist
        if (!this.scene.anims.exists(animKey)) {
          this.scene.anims.create({
            key: animKey,
            frames: this.scene.anims.generateFrameNumbers(assetKey, { 
              start: config.startFrame ?? 0, 
              end: config.endFrame 
            }),
            frameRate: config.frameRate ?? 8,
            repeat: config.repeat ?? -1
          });
        }
        
        // Play animation
        sprite.play(animKey);
      }
    }
    
    return sprite;
  }

  /**
   * Update sprite position
   */
  updatePosition(sprite: Phaser.GameObjects.Sprite, x: number, yOffset: number): void {
    sprite.x = x;
    sprite.y = this.groundY + yOffset;
  }

  /**
   * Update sprite scale
   */
  updateScale(sprite: Phaser.GameObjects.Sprite, scale: number): void {
    sprite.setScale(scale);
  }

  /**
   * Update sprite depth
   */
  updateDepth(sprite: Phaser.GameObjects.Sprite, depth: number): void {
    sprite.setDepth(depth);
  }

  /**
   * Apply visual updates from partial item data
   */
  applyUpdates(sprite: Phaser.GameObjects.Sprite, updates: Partial<PlacedItem>): void {
    if (updates.x !== undefined) {
      sprite.x = updates.x;
    }
    if (updates.yOffset !== undefined) {
      sprite.y = this.groundY + updates.yOffset;
    }
    if (updates.scale !== undefined) {
      sprite.setScale(updates.scale);
    }
    if (updates.depth !== undefined) {
      sprite.setDepth(updates.depth);
    }
    if (updates.flipX !== undefined) {
      sprite.setFlipX(updates.flipX);
    }
  }

  /**
   * Calculate Y offset from world Y position
   */
  worldYToOffset(worldY: number): number {
    return worldY - this.groundY;
  }

  /**
   * Get ground Y
   */
  getGroundY(): number {
    return this.groundY;
  }
}
