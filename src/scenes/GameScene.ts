import Phaser from 'phaser';
import { Player } from './Player';
import { AVAILABLE_SKINS } from '../data/catSkin';
import { backgroundManager, AVAILABLE_BACKGROUNDS } from '../data/background';
import { loadBackgroundAssets } from './BackgroundLoader';
import { createParallaxBackground, updateParallaxTiling, type ParallaxLayers } from './ParallaxHelper';
import { PlacedItemManager } from './PlacedItemManager';
import { loadMapConfig, MapConfig } from '../data/mapConfig';
import { getBuilderConfig } from '../stores/builderStores';

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

  constructor() {
    super({ key: 'GameScene' });
  }

  async init(data?: { useBuilderConfig?: boolean }): Promise<void> {
    // Load map configuration from builder or JSON
    if (data?.useBuilderConfig) {
      const config = getBuilderConfig();
      this.mapConfig = config || await loadMapConfig();
    } else {
      this.mapConfig = await loadMapConfig();
    }
    
    // Load default background assets
    const defaultConfig = backgroundManager.getCurrentConfig();
    await this.loadBackgroundIfNeeded(defaultConfig);
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
    // Create parallax background layers
    this.createParallaxBackground();

    const groundHeight = 40;
    const groundY = this.mapConfig.worldHeight - groundHeight;
    
    const ground = this.add.rectangle(
      0, 
      groundY, 
      this.mapConfig.worldWidth, 
      groundHeight, 
      0x000000, 
      0 // Alpha 0 for invisible
    ).setOrigin(0, 0);
    
    this.physics.add.existing(ground, true); // true = static body

    // Create player
    this.player = new Player(this, this.mapConfig.playerStartX, this.mapConfig.playerStartY);

    // Add collision between player and ground
    this.physics.add.collider(this.player, ground);

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
    this.player.update();

    // Update base layer tiling for infinite scrolling effect
    if (this.parallaxLayers) {
      updateParallaxTiling(this.parallaxLayers.baseLayer, this.cameras.main);
    }
  }
}
