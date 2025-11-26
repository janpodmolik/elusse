/**
 * Scene Data Type Definitions
 * 
 * Provides type safety for scene.data.get/set operations
 * across Builder and Game scenes.
 */

import Phaser from 'phaser';

/**
 * Builder scene data interface
 */
export interface BuilderSceneData {
  /** Currently selected item ID (null if none selected) */
  selectedItemId: string | null;
  
  /** Whether an item is currently being dragged */
  isDraggingItem: boolean;
  
  /** Whether the player or any object is being dragged */
  isDraggingObject: boolean;
  
  /** Reference to player sprite for camera centering */
  playerSprite: Phaser.GameObjects.Sprite | null;
  
  /** Index signature for Record compatibility */
  [key: string]: unknown;
}

/**
 * Game scene data interface
 */
export interface GameSceneData {
  /** Whether player has moved (for dismissing tutorials) */
  hasPlayerMoved: boolean;
  
  /** Index signature for Record compatibility */
  [key: string]: unknown;
}

/**
 * Default values for builder scene data
 */
export const DEFAULT_BUILDER_DATA: BuilderSceneData = {
  selectedItemId: null,
  isDraggingItem: false,
  isDraggingObject: false,
  playerSprite: null,
};

/**
 * Default values for game scene data
 */
export const DEFAULT_GAME_DATA: GameSceneData = {
  hasPlayerMoved: false,
};

/**
 * Helper type for typed data access
 */
export type SceneDataKey<T> = keyof T;

/**
 * Type-safe scene data getter
 */
export function getSceneData<T extends Record<string, unknown>, K extends keyof T>(
  scene: Phaser.Scene,
  key: K
): T[K] | undefined {
  return scene.data.get(key as string) as T[K] | undefined;
}

/**
 * Type-safe scene data setter
 */
export function setSceneData<T extends Record<string, unknown>, K extends keyof T>(
  scene: Phaser.Scene,
  key: K,
  value: T[K]
): void {
  scene.data.set(key as string, value);
}

/**
 * Initialize scene data with defaults
 */
export function initializeSceneData<T extends Record<string, unknown>>(
  scene: Phaser.Scene,
  defaults: T
): void {
  Object.entries(defaults).forEach(([key, value]) => {
    scene.data.set(key, value);
  });
}

// ============================================
// Builder-specific typed accessors
// ============================================

export const BuilderData = {
  getSelectedItemId(scene: Phaser.Scene): string | null {
    return getSceneData<BuilderSceneData, 'selectedItemId'>(scene, 'selectedItemId') ?? null;
  },
  
  setSelectedItemId(scene: Phaser.Scene, id: string | null): void {
    setSceneData<BuilderSceneData, 'selectedItemId'>(scene, 'selectedItemId', id);
  },
  
  getIsDraggingItem(scene: Phaser.Scene): boolean {
    return getSceneData<BuilderSceneData, 'isDraggingItem'>(scene, 'isDraggingItem') ?? false;
  },
  
  setIsDraggingItem(scene: Phaser.Scene, isDragging: boolean): void {
    setSceneData<BuilderSceneData, 'isDraggingItem'>(scene, 'isDraggingItem', isDragging);
  },
  
  getIsDraggingObject(scene: Phaser.Scene): boolean {
    return getSceneData<BuilderSceneData, 'isDraggingObject'>(scene, 'isDraggingObject') ?? false;
  },
  
  setIsDraggingObject(scene: Phaser.Scene, isDragging: boolean): void {
    setSceneData<BuilderSceneData, 'isDraggingObject'>(scene, 'isDraggingObject', isDragging);
  },
  
  getPlayerSprite(scene: Phaser.Scene): Phaser.GameObjects.Sprite | null {
    return getSceneData<BuilderSceneData, 'playerSprite'>(scene, 'playerSprite') ?? null;
  },
  
  setPlayerSprite(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite | null): void {
    setSceneData<BuilderSceneData, 'playerSprite'>(scene, 'playerSprite', sprite);
  },
  
  initialize(scene: Phaser.Scene): void {
    initializeSceneData(scene, DEFAULT_BUILDER_DATA);
  },
};

// ============================================
// Game-specific typed accessors
// ============================================

export const GameData = {
  getHasPlayerMoved(scene: Phaser.Scene): boolean {
    return getSceneData<GameSceneData, 'hasPlayerMoved'>(scene, 'hasPlayerMoved') ?? false;
  },
  
  setHasPlayerMoved(scene: Phaser.Scene, hasMoved: boolean): void {
    setSceneData<GameSceneData, 'hasPlayerMoved'>(scene, 'hasPlayerMoved', hasMoved);
  },
  
  initialize(scene: Phaser.Scene): void {
    initializeSceneData(scene, DEFAULT_GAME_DATA);
  },
};
