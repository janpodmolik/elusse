import Phaser from 'phaser';
import type { PlacedSocial } from '../types/SocialTypes';
import { DEFAULT_SOCIAL_SCALE } from '../types/SocialTypes';
import { DEPTH_LAYERS } from '../constants/depthLayers';
import { SOCIALS } from '../data/socials';
import { blockFrameClick } from '../stores';

/**
 * GameSocialManager - Manages clickable social icons in game mode
 * Social icons with URL open in new tab when clicked
 */
export class GameSocialManager {
  private scene: Phaser.Scene;
  private socials: Map<string, Phaser.GameObjects.Sprite> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Preload social assets
   * Call this in scene's preload() method
   */
  static preloadAssets(scene: Phaser.Scene): void {
    SOCIALS.forEach(social => {
      scene.load.image(`social_${social.key}`, social.path);
    });
  }

  /**
   * Create socials from data
   */
  createSocials(socials: PlacedSocial[]): void {
    socials.forEach(socialData => {
      this.createSocial(socialData);
    });
  }

  /**
   * Create a single social icon
   */
  private createSocial(socialData: PlacedSocial): void {
    const textureKey = `social_${socialData.socialKey}`;
    
    // Check if texture exists
    if (!this.scene.textures.exists(textureKey)) {
      console.warn(`[GameSocialManager] Social texture not found: ${textureKey}`);
      return;
    }
    
    const scale = socialData.scale ?? DEFAULT_SOCIAL_SCALE;
    const depth = socialData.depth ?? DEPTH_LAYERS.ITEMS_FRONT;
    
    // Create sprite
    const sprite = this.scene.add.sprite(socialData.x, socialData.y, textureKey);
    sprite.setScale(scale);
    sprite.setDepth(depth);
    sprite.setOrigin(0.5, 0.5);
    
    // Store sprite
    this.socials.set(socialData.id, sprite);
    
    // Make interactive if social has URL
    if (socialData.url) {
      this.makeClickable(sprite, socialData);
    }
  }

  /**
   * Make social icon clickable to open URL
   */
  private makeClickable(sprite: Phaser.GameObjects.Sprite, socialData: PlacedSocial): void {
    const scale = socialData.scale ?? DEFAULT_SOCIAL_SCALE;
    
    sprite.setInteractive({ useHandCursor: true });
    
    // Visual feedback on hover
    sprite.on('pointerover', () => {
      sprite.setScale(scale * 1.1);
    });
    
    sprite.on('pointerout', () => {
      sprite.setScale(scale);
    });
    
    // Open URL on click
    sprite.on('pointerdown', () => {
      if (socialData.url) {
        // Block player input using store (prevents jump loop on redirect)
        blockFrameClick();
        
        window.open(socialData.url, '_blank', 'noopener,noreferrer');
      }
    });
  }

  /**
   * Cleanup all socials
   */
  destroy(): void {
    this.socials.forEach(sprite => {
      sprite.destroy();
    });
    this.socials.clear();
  }
}
