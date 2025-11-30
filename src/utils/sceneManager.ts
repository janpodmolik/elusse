/**
 * Scene Manager - Centralized scene switching logic
 * Handles transitions between GameScene and BuilderScene
 */

import type { MapConfig } from '../data/mapConfig';
import { enterBuilderMode, exitBuilderMode } from '../stores/builderStores';
import { SCENE_KEYS } from '../constants/sceneKeys';
import type { BuilderScene } from '../scenes/BuilderScene';

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
    const gameScene = gameInstance.scene.getScene(SCENE_KEYS.GAME) as any;
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
    const gameScene = gameInstance.scene.getScene(SCENE_KEYS.GAME);
    if (!gameScene) {
      console.error('GameScene not found');
      return false;
    }

    // Stop game scene
    gameInstance.scene.stop(SCENE_KEYS.GAME);
    
    // Enter builder mode with current config
    enterBuilderMode(mapConfig);
    
    // Start builder scene
    gameInstance.scene.start(SCENE_KEYS.BUILDER, { config: mapConfig });
    
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
    gameInstance.scene.stop(SCENE_KEYS.BUILDER);
    
    // Exit builder mode
    exitBuilderMode();
    
    // Start game scene with builder config
    gameInstance.scene.start(SCENE_KEYS.GAME, { useBuilderConfig: true });
    
    return true;
  } catch (error) {
    console.error('Failed to switch to game:', error);
    return false;
  }
}

/**
 * Toggle builder camera zoom (fit-all / normal)
 */
export function toggleBuilderZoom(): void {
  if (!gameInstance) return;
  
  try {
    const builderScene = gameInstance.scene.getScene(SCENE_KEYS.BUILDER) as BuilderScene;
    builderScene?.toggleZoom();
  } catch (error) {
    console.error('Failed to toggle zoom:', error);
  }
}

/**
 * Start GameScene (called after background selection)
 */
export function startGameScene(): void {
  if (!gameInstance) {
    console.error('Scene manager not initialized');
    return;
  }

  try {
    gameInstance.scene.start(SCENE_KEYS.GAME);
  } catch (error) {
    console.error('Failed to start game scene:', error);
  }
}
