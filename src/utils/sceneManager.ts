/**
 * Scene Manager - Centralized scene switching logic
 * Handles transitions between GameScene and BuilderScene
 */

import type { MapConfig } from '../data/mapConfig';
import { enterBuilderMode, exitBuilderMode } from '../stores/builderStores';
import { saveBuilderCameraPosition, consumeSavedBuilderCameraPosition, resetGameWorldDimensions } from '../stores/gameStores';
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
    if (typeof gameScene.getMapConfig === 'function') {
      return gameScene.getMapConfig();
    }
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
    const gameScene = gameInstance.scene.getScene(SCENE_KEYS.GAME) as any;
    if (!gameScene) {
      console.error('GameScene not found');
      return false;
    }

    // Stop game scene
    gameInstance.scene.stop(SCENE_KEYS.GAME);
    
    // Reset game world dimensions (hides GameFrame)
    resetGameWorldDimensions();
    
    // Check if there's a saved builder camera position to restore
    const savedBuilderPos = consumeSavedBuilderCameraPosition();
    
    // Enter builder mode with current config
    enterBuilderMode(mapConfig);
    
    // Start builder scene with saved position
    gameInstance.scene.start(SCENE_KEYS.BUILDER, { 
      config: mapConfig,
      savedCameraPosition: savedBuilderPos
    });
    
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
  console.log('[SceneManager] switchToGame called');
  if (!gameInstance) {
    console.error('Scene manager not initialized');
    return false;
  }

  try {
    // Save BuilderScene camera position before switching
    const builderScene = gameInstance.scene.getScene(SCENE_KEYS.BUILDER) as BuilderScene;
    if (builderScene) {
      const pos = builderScene.getCameraPosition();
      if (pos) {
        saveBuilderCameraPosition(pos.scrollX, pos.scrollY, pos.zoom);
      }
    }

    console.log('[SceneManager] Stopping builder scene...');
    // Stop builder scene
    gameInstance.scene.stop(SCENE_KEYS.BUILDER);
    
    console.log('[SceneManager] Exiting builder mode...');
    // Exit builder mode
    exitBuilderMode();
    
    console.log('[SceneManager] Starting game scene...');
    // Start game scene with builder config
    gameInstance.scene.start(SCENE_KEYS.GAME, { useBuilderConfig: true });
    
    console.log('[SceneManager] switchToGame completed successfully');
    return true;
  } catch (error) {
    console.error('Failed to switch to game:', error);
    return false;
  }
}

/**
 * Reset builder camera zoom to fit-to-screen
 */
export function resetBuilderZoom(): void {
  if (!gameInstance) return;
  
  try {
    const builderScene = gameInstance.scene.getScene(SCENE_KEYS.BUILDER) as BuilderScene;
    builderScene?.resetZoom();
  } catch (error) {
    console.error('Failed to reset zoom:', error);
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
