/**
 * Parallax Background Helper
 * Shared logic for creating parallax backgrounds in both GameScene and BuilderScene
 * Uses TileSprites for infinite horizontal scrolling effect
 */

import Phaser from 'phaser';
import type { BackgroundConfig } from '../data/background';
import { DEPTH_LAYERS } from '../constants/depthLayers';

export interface ParallaxLayers {
  bgLayers: Phaser.GameObjects.TileSprite[];
  fgLayers: Phaser.GameObjects.TileSprite[];
}

/**
 * Creates parallax background layers for a scene using TileSprites
 * 
 * @param scene - The Phaser scene to add layers to
 * @param worldWidth - Width of the game world
 * @param worldHeight - Height of the game world
 * @param config - Background configuration with folder and scroll factors
 * @returns Object containing background and foreground layer arrays
 */
export function createParallaxBackground(
  scene: Phaser.Scene,
  worldWidth: number,
  worldHeight: number,
  config: BackgroundConfig
): ParallaxLayers {
  // Create parallax layers with TileSprites for horizontal tiling
  const bgLayers: Phaser.GameObjects.TileSprite[] = [];
  const fgLayers: Phaser.GameObjects.TileSprite[] = [];
  
  // Determine which layers are foreground
  const foregroundCount = config.foregroundLayers ?? 0;
  const totalLayers = config.scrollFactors.length;
  const firstForegroundIndex = totalLayers - foregroundCount;
  
  for (let i = 0; i < config.scrollFactors.length; i++) {
    const layerNum = i + 1;
    const texture = `bg${layerNum}-${config.folder}`;
    const scrollFactor = config.scrollFactors[i];
    
    if (scene.textures.exists(texture)) {
      // Get texture dimensions to calculate proper scale
      const textureFrame = scene.textures.getFrame(texture);
      const textureWidth = textureFrame.width;
      const textureHeight = textureFrame.height;
      
      // Calculate scale to fit world height
      const scale = worldHeight / textureHeight;
      const scaledTextureWidth = textureWidth * scale;
      
      // Calculate required width to cover entire camera view at any scroll/zoom
      // For builder mode with zoom out, the viewport can be larger than screen size
      // At minimum zoom (fit-to-screen), viewport width = worldWidth
      // We need enough tiles to cover: max viewport width + some buffer for scrolling
      // Using 3x worldWidth ensures coverage at any zoom level with margin
      const requiredWidth = worldWidth * 3;
      
      // Create TileSprite that covers the required area
      // Width in tile units (how many texture repetitions we need)
      const tileWidth = Math.ceil(requiredWidth / scaledTextureWidth) * textureWidth + textureWidth;
      
      const layer = scene.add.tileSprite(0, 0, tileWidth, textureHeight, texture);
      layer.setOrigin(0, 0);
      layer.setScale(scale);
      // Use scrollFactor 1 so the layer moves with camera
      // We create parallax effect by adjusting tilePositionX in update
      layer.setScrollFactor(1);
      
      // Store scrollFactor in data for update loop
      layer.setData('scrollFactor', scrollFactor);
      layer.setData('scale', scale);
      
      // Check if this layer should be in foreground
      if (i >= firstForegroundIndex) {
        // Foreground layer - in front of player
        layer.setDepth(DEPTH_LAYERS.FOREGROUND_LAYER_START + (i - firstForegroundIndex));
        fgLayers.push(layer);
      } else {
        // Background layer - behind player
        layer.setDepth(DEPTH_LAYERS.BACKGROUND_LAYER_START + i);
        bgLayers.push(layer);
      }
    }
  }

  return { bgLayers, fgLayers };
}

/**
 * Updates all parallax layers tiling position to follow camera
 * Call this in scene's update() method
 */
export function updateParallaxTiling(
  layers: ParallaxLayers | null,
  camera: Phaser.Cameras.Scene2D.Camera
): void {
  if (!layers) return;
  
  // Calculate effective scroll - clamped to valid range (0 to max)
  // This prevents parallax shift when camera can't actually scroll
  const viewWidth = camera.width / camera.zoom;
  const worldWidth = camera.getBounds().width;
  const maxScrollX = Math.max(0, worldWidth - viewWidth);
  const effectiveScrollX = Math.max(0, Math.min(camera.scrollX, maxScrollX));
  
  // Update background and foreground TileSprite layers
  const allLayers = [...layers.bgLayers, ...layers.fgLayers];
  for (const layer of allLayers) {
    const scrollFactor = layer.getData('scrollFactor') as number;
    const scale = layer.getData('scale') as number;
    
    // Layer has scrollFactor 1, so it moves with camera at full speed
    // To create parallax effect (layer appears to move at scrollFactor speed):
    // We need to offset the tile position in opposite direction
    // If scrollFactor = 0.8, layer should move at 80% speed
    // Since layer moves at 100%, we need to scroll tiles back by 20%
    // tilePositionX offset = effectiveScrollX * (1 - scrollFactor) / scale
    layer.tilePositionX = (effectiveScrollX * (1 - scrollFactor)) / scale;
  }
}

/**
 * Destroys all parallax layers
 */
export function destroyParallaxLayers(layers: ParallaxLayers): void {
  layers.bgLayers.forEach(layer => layer.destroy());
  layers.fgLayers.forEach(layer => layer.destroy());
}
