import Phaser from 'phaser';
import { PlacedItemManager } from '../managers/PlacedItemManager';
import { PlacedNPCManager } from '../managers/PlacedNPCManager';
import { GameSocialManager } from '../managers/GameSocialManager';
import { BuilderSocialsController } from '../managers/builder/BuilderSocialsController';
import { BuilderNPCsController } from '../managers/builder/BuilderNPCsController';
import { preloadSkins } from './skinLoader';

/**
 * AssetPreloader - Centralized asset loading for scenes
 * 
 * Consolidates all static preloadAssets() calls into a single place.
 * Ensures consistent asset loading between GameScene and BuilderScene.
 * 
 * @responsibilities
 * - Preloading items, NPCs, socials, and player skins
 * - Providing mode-specific preload methods
 * - Avoiding duplicate asset loading
 */
export const AssetPreloader = {
  /**
   * Preload all assets needed for GameScene.
   * 
   * @param scene - The Phaser scene to preload into
   * @param includePlayerSkins - Whether to load player skins (default true)
   */
  preloadForGame(scene: Phaser.Scene, includePlayerSkins: boolean = true): void {
    // Player skins (optional, might use modular player instead)
    if (includePlayerSkins) {
      preloadSkins(scene);
    }
    
    // Placed items (furniture, decorations, etc.)
    PlacedItemManager.preloadAssets(scene);
    
    // NPCs
    PlacedNPCManager.preloadAssets(scene);
    
    // Social icons
    GameSocialManager.preloadAssets(scene);
  },

  /**
   * Preload all assets needed for BuilderScene.
   * 
   * @param scene - The Phaser scene to preload into
   */
  preloadForBuilder(scene: Phaser.Scene): void {
    // Player skins (always needed for preview)
    preloadSkins(scene);
    
    // Placed items
    PlacedItemManager.preloadAssets(scene);
    
    // Social icons (uses builder-specific controller)
    BuilderSocialsController.preloadAssets(scene);
    
    // NPCs (uses builder-specific controller)
    BuilderNPCsController.preloadAssets(scene);
  },

  /**
   * Preload only item assets.
   * Useful for lazy loading or partial updates.
   */
  preloadItems(scene: Phaser.Scene): void {
    PlacedItemManager.preloadAssets(scene);
  },

  /**
   * Preload only NPC assets.
   */
  preloadNPCs(scene: Phaser.Scene): void {
    PlacedNPCManager.preloadAssets(scene);
  },

  /**
   * Preload only social icon assets.
   */
  preloadSocials(scene: Phaser.Scene): void {
    GameSocialManager.preloadAssets(scene);
  },
};
