/**
 * Centralized scene key constants
 * Eliminates magic strings for scene identification
 */

export const SCENE_KEYS = {
  GAME: 'GameScene',
  BUILDER: 'BuilderScene',
} as const;

export type SceneKey = typeof SCENE_KEYS[keyof typeof SCENE_KEYS];
