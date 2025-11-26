/**
 * Parallax Background Helper
 * Shared logic for creating parallax backgrounds in both GameScene and BuilderScene
 * Ensures consistency across play and builder modes
 */

import Phaser from 'phaser';
import type { BackgroundConfig } from '../data/background';
import { DEPTH_LAYERS } from '../constants/depthLayers';

export interface ParallaxLayers {
  baseLayer: Phaser.GameObjects.TileSprite;
  bgLayers: Phaser.GameObjects.Image[];
}

/**
 * Creates parallax background layers for a scene
 * @param scene - The Phaser scene to add layers to
 * @param worldWidth - Width of the game world
 * @param worldHeight - Height of the game world
 * @param config - Background configuration with folder and scroll factors
 * @returns Object containing base layer and parallax layers
 */
export function createParallaxBackground(
  scene: Phaser.Scene,
  worldWidth: number,
  worldHeight: number,
  config: BackgroundConfig
): ParallaxLayers {
  // Calculate viewport height to ensure full coverage
  const viewportHeight = Math.max(worldHeight, scene.scale.height);
  
  // Create base tiling layer (layer 0) - repeating ground texture
  const baseLayer = scene.add.tileSprite(
    0,
    0,
    worldWidth,
    viewportHeight,
    `bg0-${config.folder}`
  );
  baseLayer.setOrigin(0, 0);
  baseLayer.setScrollFactor(1.0);
  baseLayer.setDepth(DEPTH_LAYERS.BACKGROUND_BASE);
  
  // Initialize tile positions for proper repeating
  baseLayer.tilePositionX = 0;
  baseLayer.tilePositionY = 0;

  // Create parallax layers (1-6) with different scroll factors
  const bgLayers: Phaser.GameObjects.Image[] = [];
  
  for (let i = 0; i < config.scrollFactors.length; i++) {
    const layerNum = i + 1;
    const texture = `bg${layerNum}-${config.folder}`;
    
    if (scene.textures.exists(texture)) {
      const layer = scene.add.image(0, 0, texture);
      layer.setOrigin(0, 0);
      layer.setScrollFactor(config.scrollFactors[i]);
      layer.setDepth(DEPTH_LAYERS.BACKGROUND_LAYER_START + i);
      layer.setDisplaySize(worldWidth, worldHeight);
      bgLayers.push(layer);
    }
  }

  return { baseLayer, bgLayers };
}

/**
 * Updates base layer tiling position to follow camera
 * Call this in scene's update() method
 */
export function updateParallaxTiling(
  baseLayer: Phaser.GameObjects.TileSprite | null,
  camera: Phaser.Cameras.Scene2D.Camera
): void {
  if (baseLayer) {
    baseLayer.tilePositionX = camera.scrollX;
  }
}

/**
 * Destroys all parallax layers
 */
export function destroyParallaxLayers(layers: ParallaxLayers): void {
  layers.bgLayers.forEach(layer => layer.destroy());
  layers.baseLayer.destroy();
}
