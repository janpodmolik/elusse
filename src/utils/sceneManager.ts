/**
 * Scene Manager - Centralized scene switching logic
 * Handles transitions between GameScene and BuilderScene
 */

import type { MapConfig } from '../data/mapConfig';
import { enterBuilderMode, exitBuilderMode } from '../stores/builderStores';

let gameInstance: Phaser.Game | null = null;

/**
 * Initialize scene manager with game instance
 */
export function initSceneManager(game: Phaser.Game): void {
  gameInstance = game;
}

/**
 * Get current map config from GameScene
 */
export function getCurrentMapConfig(): MapConfig | null {
  if (!gameInstance) {
    console.error('Scene manager not initialized');
    return null;
  }

  try {
    const gameScene = gameInstance.scene.getScene('GameScene') as any;
    return gameScene?.mapConfig || null;
  } catch (error) {
    console.error('Failed to get map config:', error);
    return null;
  }
}

/**
 * Switch from GameScene to BuilderScene
 */
export function switchToBuilder(mapConfig: MapConfig): boolean {
  if (!gameInstance) {
    console.error('Scene manager not initialized');
    return false;
  }

  try {
    const gameScene = gameInstance.scene.getScene('GameScene');
    if (!gameScene) {
      console.error('GameScene not found');
      return false;
    }

    // Stop game scene
    gameInstance.scene.stop('GameScene');
    
    // Enter builder mode with current config
    enterBuilderMode(mapConfig);
    
    // Start builder scene
    gameInstance.scene.start('BuilderScene', { config: mapConfig });
    
    return true;
  } catch (error) {
    console.error('Failed to switch to builder:', error);
    return false;
  }
}

/**
 * Switch from BuilderScene to GameScene
 */
export function switchToGame(): boolean {
  if (!gameInstance) {
    console.error('Scene manager not initialized');
    return false;
  }

  try {
    // Stop builder scene
    gameInstance.scene.stop('BuilderScene');
    
    // Exit builder mode
    exitBuilderMode();
    
    // Start game scene with builder config
    gameInstance.scene.start('GameScene', { useBuilderConfig: true });
    
    return true;
  } catch (error) {
    console.error('Failed to switch to game:', error);
    return false;
  }
}
