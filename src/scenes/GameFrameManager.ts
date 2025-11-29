import Phaser from 'phaser';
import type { PlacedFrame } from '../types/FrameTypes';
import { DEFAULT_FRAME_SCALE, DEFAULT_FRAME_COLOR } from '../types/FrameTypes';
import { DEPTH_LAYERS } from '../constants/depthLayers';
import { getFrameDimensions } from '../data/frames';
import { type FrameContainer, drawFrameBackground } from '../utils/frameUtils';
import { blockFrameClick } from '../stores';

/**
 * GameFrameManager - Manages clickable frames in game mode
 * Frames with URL open in new tab when clicked
 * Note: Text is rendered via Svelte FrameContent component
 */
export class GameFrameManager {
  private scene: Phaser.Scene;
  private frames: Map<string, FrameContainer> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Preload frame assets
   * Call this in scene's preload() method
   */
  static preloadAssets(scene: Phaser.Scene): void {
    // Load all frame images
    for (let i = 1; i <= 25; i++) {
      scene.load.image(`frame_base_${i}`, `assets/frames/base ${i}.png`);
    }
  }

  /**
   * Create frames from data
   */
  createFrames(frames: PlacedFrame[]): void {
    frames.forEach(frameData => {
      this.createFrame(frameData);
    });
  }

  /**
   * Create a single frame with background
   * Note: Text is rendered via Svelte overlay
   */
  private createFrame(frameData: PlacedFrame): void {
    const textureKey = `frame_${frameData.frameKey}`;
    
    // Check if texture exists
    if (!this.scene.textures.exists(textureKey)) {
      console.warn(`[GameFrameManager] Frame texture not found: ${textureKey}`);
      return;
    }
    
    const scale = frameData.scale ?? DEFAULT_FRAME_SCALE;
    const depth = frameData.depth ?? DEPTH_LAYERS.ITEMS_FRONT;
    const rotation = (frameData.rotation ?? 0) * (Math.PI / 180);
    const isRotated = frameData.rotation === 90;
    
    // Get dimensions using centralized utility
    const { innerWidth, innerHeight } = getFrameDimensions(scale, isRotated);
    
    // Create background graphics (below sprite)
    const background = this.scene.add.graphics();
    background.setDepth(depth - 0.1);
    drawFrameBackground(background, frameData.x, frameData.y, innerWidth, innerHeight, frameData.backgroundColor || DEFAULT_FRAME_COLOR);
    
    // Create sprite
    const sprite = this.scene.add.sprite(frameData.x, frameData.y, textureKey);
    sprite.setScale(scale);
    sprite.setDepth(depth);
    sprite.setOrigin(0.5, 0.5);
    sprite.setRotation(rotation);
    
    // Store frame container (text is rendered via Svelte overlay)
    const container: FrameContainer = { sprite, background, data: frameData };
    this.frames.set(frameData.id, container);
    
    // Make interactive if frame has URL
    if (frameData.url) {
      this.makeClickable(container);
    }
  }

  /**
   * Make frame clickable to open URL
   */
  private makeClickable(container: FrameContainer): void {
    const { sprite, data: frameData } = container;
    
    sprite.setInteractive({ useHandCursor: true });
    
    // Visual feedback on hover
    sprite.on('pointerover', () => {
      sprite.setScale((frameData.scale ?? DEFAULT_FRAME_SCALE) * 1.05);
    });
    
    sprite.on('pointerout', () => {
      sprite.setScale(frameData.scale ?? DEFAULT_FRAME_SCALE);
    });
    
    // Open URL on click
    sprite.on('pointerdown', () => {
      if (frameData.url) {
        // Block player input using store (prevents jump loop on redirect)
        blockFrameClick();
        
        window.open(frameData.url, '_blank', 'noopener,noreferrer');
      }
    });
  }

  /**
   * Cleanup all frames
   */
  destroy(): void {
    this.frames.forEach(({ sprite, background }) => {
      sprite.destroy();
      background.destroy();
    });
    this.frames.clear();
  }
}
