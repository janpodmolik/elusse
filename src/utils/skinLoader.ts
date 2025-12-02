/**
 * Skin Loader - Unified loader for player skins
 * 
 * Handles both PNG spritesheets and GIF animations.
 * Converts GIFs to Phaser-compatible spritesheets at load time.
 * 
 * Animation naming convention:
 * - {skinId}-idle : Standing/breathing animation
 * - {skinId}-run  : Running animation
 */

import type { SkinConfig } from '../data/skinConfig';
import { AVAILABLE_SKINS } from '../data/skinConfig';
import { loadGifAsSpritesheet, calculateFrameRate, type GifFrameData } from './gifLoader';

// Store loaded GIF frame data for animation creation
const gifFrameDataCache: Map<string, { idle: GifFrameData; run: GifFrameData }> = new Map();

/**
 * Preload all skin assets (called in scene preload)
 * Only handles PNG spritesheets - GIFs are loaded async in create
 */
export function preloadSpritesheetSkins(scene: Phaser.Scene): void {
  const spritesheetSkins = AVAILABLE_SKINS.filter(skin => skin.format === 'spritesheet');
  
  spritesheetSkins.forEach(skin => {
    scene.load.spritesheet(`${skin.id}-idle`, `assets/skins/${skin.folder}/idle.png`, {
      frameWidth: 48,
      frameHeight: 48,
    });
    scene.load.spritesheet(`${skin.id}-run`, `assets/skins/${skin.folder}/run.png`, {
      frameWidth: 48,
      frameHeight: 48,
    });
  });
}

/**
 * Load all GIF skins (called in scene create, async)
 */
export async function loadGifSkins(scene: Phaser.Scene): Promise<void> {
  const gifSkins = AVAILABLE_SKINS.filter(skin => skin.format === 'gif');
  
  await Promise.all(gifSkins.map(async (skin) => {
    try {
      const basePath = `./assets/skins/${skin.folder}`;
      
      const [idle, run] = await Promise.all([
        loadGifAsSpritesheet(scene, `${skin.id}-idle`, `${basePath}/idle.gif`, 48, 48),
        loadGifAsSpritesheet(scene, `${skin.id}-run`, `${basePath}/run.gif`, 48, 48),
      ]);
      
      // Cache frame data for animation creation
      gifFrameDataCache.set(skin.id, { idle, run });
      
      // Log loaded skin info
      const idleFps = calculateFrameRate(idle.delays);
      const runFps = calculateFrameRate(run.delays);
      console.log(`Loaded GIF skin: ${skin.id} (idle: ${idle.frameCount}f@${idleFps}fps, run: ${run.frameCount}f@${runFps}fps)`);
    } catch (error) {
      console.error(`Failed to load GIF skin ${skin.id}:`, error);
    }
  }));
}

/**
 * Get cached GIF frame data for a skin
 */
export function getGifFrameData(skinId: string): { idle: GifFrameData; run: GifFrameData } | undefined {
  return gifFrameDataCache.get(skinId);
}

/**
 * Check if a skin uses GIF format
 */
export function isGifSkin(skinId: string): boolean {
  const skin = AVAILABLE_SKINS.find(s => s.id === skinId);
  return skin?.format === 'gif';
}

/**
 * Create animations for a specific skin
 * Handles both spritesheet and GIF-based skins
 */
export function createSkinAnimations(scene: Phaser.Scene, skin: SkinConfig): void {
  if (skin.format === 'gif') {
    createGifAnimations(scene, skin);
  } else {
    createSpritesheetAnimations(scene, skin);
  }
}

/**
 * Create animations from PNG spritesheets (original format)
 */
function createSpritesheetAnimations(scene: Phaser.Scene, skin: SkinConfig): void {
  const skinId = skin.id;
  
  // Remove existing animations to recreate with fresh textures
  if (scene.anims.exists(`${skinId}-idle`)) {
    scene.anims.remove(`${skinId}-idle`);
  }
  if (scene.anims.exists(`${skinId}-run`)) {
    scene.anims.remove(`${skinId}-run`);
  }
  
  // Idle animation (4 frames)
  scene.anims.create({
    key: `${skinId}-idle`,
    frames: scene.anims.generateFrameNumbers(`${skinId}-idle`, { start: 0, end: 3 }),
    frameRate: 6,
    repeat: -1
  });

  // Run animation (6 frames)
  scene.anims.create({
    key: `${skinId}-run`,
    frames: scene.anims.generateFrameNumbers(`${skinId}-run`, { start: 0, end: 5 }),
    frameRate: 12,
    repeat: -1
  });
}

/**
 * Create animations from loaded GIF data
 */
function createGifAnimations(scene: Phaser.Scene, skin: SkinConfig): void {
  const skinId = skin.id;
  const frameData = gifFrameDataCache.get(skinId);
  
  if (!frameData) {
    console.warn(`No GIF frame data found for skin: ${skinId}`);
    return;
  }
  
  const frameRates = skin.frameRates;
  
  // Remove existing animations to recreate with fresh textures
  if (scene.anims.exists(`${skinId}-idle`)) {
    scene.anims.remove(`${skinId}-idle`);
  }
  if (scene.anims.exists(`${skinId}-run`)) {
    scene.anims.remove(`${skinId}-run`);
  }
  
  // Idle animation
  const idleFps = frameRates?.idle ?? calculateFrameRate(frameData.idle.delays);
  scene.anims.create({
    key: `${skinId}-idle`,
    frames: scene.anims.generateFrameNumbers(`${skinId}-idle`, { 
      start: 0, 
      end: frameData.idle.frameCount - 1 
    }),
    frameRate: idleFps,
    repeat: -1
  });

  // Run animation
  const runFps = frameRates?.run ?? calculateFrameRate(frameData.run.delays);
  scene.anims.create({
    key: `${skinId}-run`,
    frames: scene.anims.generateFrameNumbers(`${skinId}-run`, { 
      start: 0, 
      end: frameData.run.frameCount - 1 
    }),
    frameRate: runFps,
    repeat: -1
  });
}

/**
 * Create animations for all loaded skins
 */
export function createAllSkinAnimations(scene: Phaser.Scene): void {
  AVAILABLE_SKINS.forEach(skin => {
    createSkinAnimations(scene, skin);
  });
}
