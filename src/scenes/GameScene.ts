import Phaser from 'phaser';
import { Player } from './Player';
import { AVAILABLE_SKINS } from '../data/catSkin';
import { backgroundManager, AVAILABLE_BACKGROUNDS } from '../data/background';
import { loadBackgroundAssets } from './BackgroundLoader';
import { createParallaxBackground, updateParallaxTiling, type ParallaxLayers } from './ParallaxHelper';
import { PlacedItemManager } from './PlacedItemManager';
import { loadMapConfig, MapConfig } from '../data/mapConfig';
import { getBuilderConfig } from '../stores/builderStores';
import { GroundManager } from './shared/GroundManager';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { isLoading } from '../stores';

export class GameScene extends Phaser.Scene {
  private player!: Player;

  // Map configuration (loaded from JSON)
  private mapConfig!: MapConfig;

  // Parallax backgrounds (flexible layer count)
  private parallaxLayers: ParallaxLayers | null = null;
  private loadedBackgrounds: Set<string> = new Set();

  // Placed items system (replaces dialog trigger system)
  private itemManager!: PlacedItemManager;

  // Store unsubscribe functions
  private unsubscribers: Array<() => void> = [];
  
  // Init data stored for async loading
  private initData?: { useBuilderConfig?: boolean };

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  init(data?: { useBuilderConfig?: boolean }): void {
    // Store init data for async processing in create()
    this.initData = data;
  }

  preload(): void {
    // Load cat sprite sheets for all available skins
    AVAILABLE_SKINS.forEach(skin => {
      this.load.spritesheet(`cat-idle-${skin}`, `assets/sprites/${skin}/Idle.png`, {
        frameWidth: 48,
        frameHeight: 48,
      });
      this.load.spritesheet(`cat-walk-${skin}`, `assets/sprites/${skin}/Walk.png`, {
        frameWidth: 48,
        frameHeight: 48,
      });
    });

    // Load UI assets for placed items
    PlacedItemManager.preloadAssets(this);
  }

  create(): void {
    // Start async initialization
    this.initializeScene();
  }

  /**
   * Async scene initialization
   * Separated from create() because Phaser doesn't await async create
   */
  private async initializeScene(): Promise<void> {
    // Show loading indicator
    isLoading.set(true);
    
    try {
      // Load map configuration asynchronously
      await this.loadMapConfiguration();
      
      // Load background assets
      const bgConfig = backgroundManager.getCurrentConfig();
      await this.loadBackgroundIfNeeded(bgConfig);
      
      // Create parallax background layers
      this.createParallaxBackground();

      // Create ground with physics
      const { ground, groundY } = GroundManager.createPhysicsGround(this, {
        worldWidth: this.mapConfig.worldWidth,
        worldHeight: this.mapConfig.worldHeight,
      });

      // Create player
      this.player = new Player(this, this.mapConfig.playerStartX, this.mapConfig.playerStartY);

      // Add collision between player and ground
      GroundManager.addPlayerCollision(this, this.player, ground);

      // Initialize placed items system (read-only mode for game scene)
      this.itemManager = new PlacedItemManager(this, groundY, false);
      
      // Load placed items from config
      if (this.mapConfig.placedItems && this.mapConfig.placedItems.length > 0) {
        this.itemManager.createItems(this.mapConfig.placedItems);
      }
      
      // TODO: Setup collision detection for items with dialogConfig
      // For now, items are just visual decorations

      // Setup camera to follow player
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
      this.cameras.main.setBounds(0, 0, this.mapConfig.worldWidth, this.mapConfig.worldHeight);
      this.physics.world.setBounds(0, 0, this.mapConfig.worldWidth, this.mapConfig.worldHeight);
    } catch (error) {
      console.error('[GameScene] Failed to initialize scene:', error);
      // Show error state to user - could emit event or set error store
    } finally {
      // Hide loading indicator
      isLoading.set(false);
    }
  }

  /**
   * Load map configuration from builder or JSON file
   */
  private async loadMapConfiguration(): Promise<void> {
    try {
      if (this.initData?.useBuilderConfig) {
        const config = getBuilderConfig();
        this.mapConfig = config || await loadMapConfig();
      } else {
        this.mapConfig = await loadMapConfig();
      }
    } catch (error) {
      console.error('[GameScene] Failed to load map configuration:', error);
      // Fallback to default config
      this.mapConfig = {
        worldWidth: 3200,
        worldHeight: 600,
        playerStartX: 400,
        playerStartY: 300,
        placedItems: [],
      };
    }
  }

  private createParallaxBackground(): void {
    const config = backgroundManager.getCurrentConfig();
    this.parallaxLayers = createParallaxBackground(
      this,
      this.mapConfig.worldWidth,
      this.mapConfig.worldHeight,
      config
    );
  }

  private async loadBackgroundIfNeeded(config: typeof AVAILABLE_BACKGROUNDS[0]): Promise<boolean> {
    // Skip if already loaded
    if (this.loadedBackgrounds.has(config.folder)) {
      return true;
    }

    // Load background assets
    const success = await loadBackgroundAssets(this, config);
    if (success) {
      this.loadedBackgrounds.add(config.folder);
    }
    return success;
  }

  shutdown(): void {
    // Clean up store subscriptions to prevent memory leaks
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    // Clean up placed items
    if (this.itemManager) {
      this.itemManager.destroy();
    }
  }

  update(): void {
    // Guard against update being called before async initialization completes
    if (!this.player) return;
    
    this.player.update();

    // Update base layer tiling for infinite scrolling effect
    if (this.parallaxLayers) {
      updateParallaxTiling(this.parallaxLayers.baseLayer, this.cameras.main);
    }
  }
}
