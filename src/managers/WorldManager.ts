import Phaser from 'phaser';
import { loadMapConfig, type MapConfig } from '../data/mapConfig';
import { getBuilderConfig } from '../stores/builderStores';
import { backgroundManager } from '../data/background';
import { loadBackgroundAssets } from '../utils/BackgroundLoader';
import { 
  createParallaxBackground, 
  updateParallaxTiling, 
  destroyParallaxLayers,
  type ParallaxLayers 
} from '../utils/ParallaxHelper';
import { GroundManager, type GroundResult } from './GroundManager';
import { getPlayerGroundY } from '../constants/playerConstants';

/**
 * WorldManager - Centralized world setup and management
 * 
 * Handles map configuration, background/parallax, and ground creation
 * for both GameScene and BuilderScene.
 * 
 * @responsibilities
 * - Loading map configuration from JSON or builder store
 * - Setting up parallax background layers
 * - Creating ground (physics or visual mode)
 * - Updating parallax scrolling
 * - Managing world bounds
 * 
 * @usage
 * ```typescript
 * const worldManager = new WorldManager(scene);
 * const config = await worldManager.loadConfiguration();
 * await worldManager.setupBackground();
 * const { ground, groundY } = worldManager.createGround('physics');
 * ```
 */
export class WorldManager {
  private scene: Phaser.Scene;
  private mapConfig!: MapConfig;
  private parallaxLayers: ParallaxLayers | null = null;
  private loadedBackgrounds: Set<string> = new Set();
  private ground: Phaser.GameObjects.Rectangle | null = null;
  private groundY: number = 0;
  private groundHeight: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // =========================================================================
  // CONFIGURATION
  // =========================================================================

  /**
   * Load map configuration from builder store or JSON file.
   * 
   * @param useBuilderConfig - If true, tries to load from builder store first
   * @returns The loaded map configuration
   */
  public async loadConfiguration(useBuilderConfig: boolean = false): Promise<MapConfig> {
    try {
      if (useBuilderConfig) {
        const config = getBuilderConfig();
        this.mapConfig = config || await loadMapConfig();
      } else {
        this.mapConfig = await loadMapConfig();
      }
    } catch (error) {
      console.error('[WorldManager] Failed to load map configuration:', error);
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
   * Set map configuration directly (for BuilderScene).
   * Use this when config is already available from scene init data.
   */
  public setConfiguration(config: MapConfig): void {
    this.mapConfig = config;
  }

  /**
   * Get current map configuration.
   */
  public getConfig(): MapConfig {
    return this.mapConfig;
  }

  // =========================================================================
  // BACKGROUND & PARALLAX
  // =========================================================================

  /**
   * Load background assets and create parallax layers.
   * Caches loaded backgrounds to avoid duplicate loading.
   */
  public async setupBackground(): Promise<void> {
    const bgConfig = backgroundManager.getCurrentConfig();
    
    // Destroy existing layers if any
    if (this.parallaxLayers) {
      destroyParallaxLayers(this.parallaxLayers);
      this.parallaxLayers = null;
    }
    
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
   * Update parallax background scrolling.
   * Should be called every frame in update().
   */
  public updateParallax(camera: Phaser.Cameras.Scene2D.Camera): void {
    if (this.parallaxLayers) {
      updateParallaxTiling(this.parallaxLayers, camera);
    }
  }

  /**
   * Get parallax layers (for external access if needed).
   */
  public getParallaxLayers(): ParallaxLayers | null {
    return this.parallaxLayers;
  }

  // =========================================================================
  // GROUND
  // =========================================================================

  /**
   * Create ground with specified mode.
   * 
   * @param mode - 'physics' for GameScene (invisible, with collision), 
   *               'visual' for BuilderScene (visible, no physics)
   * @returns Ground object and Y position
   */
  public createGround(mode: 'physics' | 'visual'): GroundResult & { groundHeight: number } {
    const bgConfig = backgroundManager.getCurrentConfig();
    this.groundHeight = bgConfig.groundHeight ?? 40;

    let result: GroundResult;
    
    if (mode === 'physics') {
      result = GroundManager.createPhysicsGround(this.scene, {
        worldWidth: this.mapConfig.worldWidth,
        worldHeight: this.mapConfig.worldHeight,
        height: this.groundHeight,
      });
    } else {
      result = GroundManager.createVisualGround(this.scene, {
        worldWidth: this.mapConfig.worldWidth,
        worldHeight: this.mapConfig.worldHeight,
        height: this.groundHeight,
      });
    }
    
    this.ground = result.ground;
    this.groundY = result.groundY;
    
    return { ...result, groundHeight: this.groundHeight };
  }

  /**
   * Setup physics world bounds based on map config.
   * Should be called after loading configuration.
   */
  public setupWorldBounds(): void {
    this.scene.physics.world.setBounds(
      0, 0, 
      this.mapConfig.worldWidth, 
      this.mapConfig.worldHeight
    );
  }

  /**
   * Get ground object.
   */
  public getGround(): Phaser.GameObjects.Rectangle | null {
    return this.ground;
  }

  /**
   * Get ground Y position.
   */
  public getGroundY(): number {
    return this.groundY;
  }

  /**
   * Get ground height.
   */
  public getGroundHeight(): number {
    return this.groundHeight;
  }

  // =========================================================================
  // CLEANUP
  // =========================================================================

  /**
   * Destroy all managed objects.
   * Should be called during scene shutdown.
   */
  public destroy(): void {
    if (this.parallaxLayers) {
      destroyParallaxLayers(this.parallaxLayers);
      this.parallaxLayers = null;
    }
    
    if (this.ground) {
      this.ground.destroy();
      this.ground = null;
    }
  }
}
