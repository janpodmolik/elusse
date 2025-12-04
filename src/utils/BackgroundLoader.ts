/**
 * Background asset loading helper
 * Handles dynamic loading of background textures
 */

import Phaser from 'phaser';
import { BackgroundConfig } from '../data/background';

/**
 * Loads all background assets for a given configuration
 * @param scene - The Phaser scene to load assets into
 * @param config - Background configuration with folder and layer count
 * @returns Promise that resolves to true on success, false on error
 */
export function loadBackgroundAssets(
  scene: Phaser.Scene,
  config: BackgroundConfig
): Promise<boolean> {
  return new Promise((resolve) => {
    // Load parallax layers (1.png, 2.png, etc.)
    for (let i = 0; i < config.scrollFactors.length; i++) {
      const layerNum = i + 1;
      scene.load.image(
        `bg${layerNum}-${config.folder}`,
        `assets/backgrounds/${config.folder}/${layerNum}.png`
      );
    }

    // Setup completion handler
    scene.load.once('complete', () => {
      resolve(true);
    });

    // Setup error handler
    scene.load.once('loaderror', (file: any) => {
      console.error(`Failed to load background asset: ${file.key}`);
      resolve(false);
    });

    // Start loading
    scene.load.start();
  });
}
