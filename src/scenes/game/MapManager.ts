import Phaser from 'phaser';
import { loadMapConfig, type MapConfig } from '../../data/mapConfig';
import { getBuilderConfig } from '../../stores/builderStores';
import { backgroundManager } from '../../data/background';
import { loadBackgroundAssets } from '../BackgroundLoader';
import { createParallaxBackground, type ParallaxLayers } from '../ParallaxHelper';
import { GroundManager } from '../shared/GroundManager';
import { getPlayerGroundY } from '../../constants/playerConstants';

export class MapManager {
  private scene: Phaser.Scene;
  private mapConfig!: MapConfig;
  private parallaxLayers: ParallaxLayers | null = null;
  private loadedBackgrounds: Set<string> = new Set();
  private ground: Phaser.GameObjects.TileSprite | null = null;
  private groundY: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Load map configuration from builder or JSON file
   */
  public async loadMapConfiguration(useBuilderConfig: boolean = false): Promise<MapConfig> {
    try {
      if (useBuilderConfig) {
        const config = getBuilderConfig();
        this.mapConfig = config || await loadMapConfig();
      } else {
        this.mapConfig = await loadMapConfig();
      }
    } catch (error) {
      console.error('[MapManager] Failed to load map configuration:', error);
      // Fallback to default config
      const fallbackWorldHeight = 600;
      this.mapConfig = {
        worldWidth: 3200,
        worldHeight: fallbackWorldHeight,
        playerStartX: 400,
        playerStartY: getPlayerGroundY(fallbackWorldHeight),
        placedItems: [],
      };
    }
    return this.mapConfig;
  }

  /**
   * Load background assets and create parallax layers
   */
  public async setupBackground(): Promise<void> {
    const bgConfig = backgroundManager.getCurrentConfig();
    
    // Load assets if needed
    if (!this.loadedBackgrounds.has(bgConfig.folder)) {
      const success = await loadBackgroundAssets(this.scene, bgConfig);
      if (success) {
        this.loadedBackgrounds.add(bgConfig.folder);
      }
    }

    // Create parallax layers
    this.parallaxLayers = createParallaxBackground(
      this.scene,
      this.mapConfig.worldWidth,
      this.mapConfig.worldHeight,
      bgConfig
    );
  }

  /**
   * Create ground with physics
   */
  public createGround(): { ground: Phaser.GameObjects.TileSprite; groundY: number } {
    const result = GroundManager.createPhysicsGround(this.scene, {
      worldWidth: this.mapConfig.worldWidth,
      worldHeight: this.mapConfig.worldHeight,
    });
    
    this.ground = result.ground;
    this.groundY = result.groundY;
    
    // Set world bounds
    this.scene.physics.world.setBounds(0, 0, this.mapConfig.worldWidth, this.mapConfig.worldHeight);
    
    return result;
  }

  /**
   * Get current map configuration
   */
  public getConfig(): MapConfig {
    return this.mapConfig;
  }

  /**
   * Get ground object
   */
  public getGround(): Phaser.GameObjects.TileSprite | null {
    return this.ground;
  }

  /**
   * Get ground Y position
   */
  public getGroundY(): number {
    return this.groundY;
  }
}
