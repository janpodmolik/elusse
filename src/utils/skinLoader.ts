/**
 * Skin Loader - Unified loader for player skins
 * 
 * Handles PNG spritesheets (horizontal strip format).
 * 
 * Animation naming convention:
 * - {skinId}-idle : Standing/breathing animation
 * - {skinId}-run  : Running animation
 */

import type { SkinConfig } from '../data/skinConfig';
import { AVAILABLE_SKINS, getSkinAssetPath } from '../data/skinConfig';

// Default frame dimensions
const DEFAULT_FRAME_WIDTH = 48;
const DEFAULT_FRAME_HEIGHT = 48;

/**
 * Preload all skin assets (called in scene preload)
 */
export function preloadSkins(scene: Phaser.Scene): void {
  AVAILABLE_SKINS.forEach(skin => {
    const frameWidth = skin.frameWidth ?? DEFAULT_FRAME_WIDTH;
    const frameHeight = skin.frameHeight ?? DEFAULT_FRAME_HEIGHT;
    const basePath = getSkinAssetPath(skin);
    
    scene.load.spritesheet(`${skin.id}-idle`, `${basePath}/idle.png`, {
      frameWidth,
      frameHeight,
    });
    scene.load.spritesheet(`${skin.id}-run`, `${basePath}/run.png`, {
      frameWidth,
      frameHeight,
    });
    scene.load.spritesheet(`${skin.id}-jump`, `${basePath}/jump.png`, {
      frameWidth,
      frameHeight,
    });
    scene.load.spritesheet(`${skin.id}-fall`, `${basePath}/fall.png`, {
      frameWidth,
      frameHeight,
    });
  });
}

/**
 * Get skin configuration by ID
 */
export function getSkinConfig(skinId: string): SkinConfig | undefined {
  return AVAILABLE_SKINS.find(s => s.id === skinId);
}

/**
 * Create animations for a specific skin
 */
export function createSkinAnimations(scene: Phaser.Scene, skin: SkinConfig): void {
  const skinId = skin.id;
  
  // Remove existing animations to recreate with fresh textures
  if (scene.anims.exists(`${skinId}-idle`)) {
    scene.anims.remove(`${skinId}-idle`);
  }
  if (scene.anims.exists(`${skinId}-run`)) {
    scene.anims.remove(`${skinId}-run`);
  }
  if (scene.anims.exists(`${skinId}-jump`)) {
    scene.anims.remove(`${skinId}-jump`);
  }
  if (scene.anims.exists(`${skinId}-fall`)) {
    scene.anims.remove(`${skinId}-fall`);
  }
  
  // Get texture to determine frame count
  const idleTexture = scene.textures.get(`${skinId}-idle`);
  const runTexture = scene.textures.get(`${skinId}-run`);
  const jumpTexture = scene.textures.get(`${skinId}-jump`);
  const fallTexture = scene.textures.get(`${skinId}-fall`);
  
  const idleFrameCount = idleTexture.frameTotal - 1; // Subtract 1 for __BASE frame
  const runFrameCount = runTexture.frameTotal - 1;
  const jumpFrameCount = jumpTexture.key !== '__MISSING' ? jumpTexture.frameTotal - 1 : 0;
  const fallFrameCount = fallTexture.key !== '__MISSING' ? fallTexture.frameTotal - 1 : 0;
  
  // Default frame rates
  const idleFps = skin.frameRates?.idle ?? 6;
  const runFps = skin.frameRates?.run ?? 12;
  const jumpFps = skin.frameRates?.jump ?? 10;
  const fallFps = skin.frameRates?.fall ?? 10;
  
  // Idle animation
  scene.anims.create({
    key: `${skinId}-idle`,
    frames: scene.anims.generateFrameNumbers(`${skinId}-idle`, { start: 0, end: idleFrameCount - 1 }),
    frameRate: idleFps,
    repeat: -1
  });

  // Run animation
  scene.anims.create({
    key: `${skinId}-run`,
    frames: scene.anims.generateFrameNumbers(`${skinId}-run`, { start: 0, end: runFrameCount - 1 }),
    frameRate: runFps,
    repeat: -1
  });

  // Jump animation
  if (jumpFrameCount > 0) {
    scene.anims.create({
      key: `${skinId}-jump`,
      frames: scene.anims.generateFrameNumbers(`${skinId}-jump`, { start: 0, end: jumpFrameCount - 1 }),
      frameRate: jumpFps,
      repeat: -1
    });
  }

  // Fall animation
  if (fallFrameCount > 0) {
    scene.anims.create({
      key: `${skinId}-fall`,
      frames: scene.anims.generateFrameNumbers(`${skinId}-fall`, { start: 0, end: fallFrameCount - 1 }),
      frameRate: fallFps,
      repeat: -1
    });
  }
}

/**
 * Create animations for all loaded skins
 */
export function createAllSkinAnimations(scene: Phaser.Scene): void {
  AVAILABLE_SKINS.forEach(skin => {
    createSkinAnimations(scene, skin);
  });
}
