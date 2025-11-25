import Phaser from 'phaser';
import { Player } from './Player';
import { AVAILABLE_SKINS, CatSkin } from '../data/catSkin';
import { backgroundManager, AVAILABLE_BACKGROUNDS } from '../data/background';
import { loadBackgroundAssets } from './BackgroundLoader';
import { createParallaxBackground, updateParallaxTiling, destroyParallaxLayers, type ParallaxLayers } from './ParallaxHelper';
import { DialogTriggerManager } from './DialogTriggerManager';
import { loadMapConfig, MapConfig } from '../data/mapConfig';
import { currentSkin, currentBackground, isLoading, backgroundChangeCounter, activeDialogId } from '../stores';
import { getBuilderConfig } from '../stores/builderStores';

export class GameScene extends Phaser.Scene {
  private player!: Player;

  // Map configuration (loaded from JSON)
  private mapConfig!: MapConfig;

  // Parallax backgrounds (flexible layer count)
  private parallaxLayers: ParallaxLayers | null = null;
  private loadedBackgrounds: Set<string> = new Set();

  // Dialog trigger system
  private triggerManager!: DialogTriggerManager;

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

    // Load dialog trigger sprites
    DialogTriggerManager.preloadAssets(this);
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

    // Initialize dialog trigger system
    this.triggerManager = new DialogTriggerManager(this, groundY);
    this.triggerManager.createTriggers(this.mapConfig.dialogs);
    this.triggerManager.setupCollisionDetection(
      this.player,
      (dialogId: string) => {
        // Player entered trigger zone
        console.log(`Entered trigger: ${dialogId}`);
        activeDialogId.set(dialogId);
      },
      () => {
        // Player exited trigger zone
        console.log('Exited trigger');
        activeDialogId.set(null);
      }
    );

    // Setup camera to follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, this.mapConfig.worldWidth, this.mapConfig.worldHeight);
    this.physics.world.setBounds(0, 0, this.mapConfig.worldWidth, this.mapConfig.worldHeight);

    // Subscribe to store changes to react to UI updates
    const skinUnsubscribe = currentSkin.subscribe((skin: string) => {
      const catSkin = skin as CatSkin;
      if (this.player && AVAILABLE_SKINS.includes(catSkin)) {
        this.player.changeSkin(catSkin);
      }
    });

    // Subscribe to background change requests from UI
    const backgroundUnsubscribe = backgroundChangeCounter.subscribe(async () => {
      // Trigger background reload when counter changes
      await this.reloadBackground();
    });

    // Store unsubscribe functions for cleanup
    this.unsubscribers.push(skinUnsubscribe, backgroundUnsubscribe);
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

  private async reloadBackground(): Promise<void> {
    let config = backgroundManager.getCurrentConfig();
    
    // Show loader
    isLoading.set(true);

    // Load background if needed
    let success = await this.loadBackgroundIfNeeded(config);
    
    // Fallback to forest on error
    if (!success) {
      console.error(`Failed to load background: ${config.folder}, falling back to forest`);
      backgroundManager.setBackground('forest');
      config = backgroundManager.getCurrentConfig();
      success = await this.loadBackgroundIfNeeded(config);
      
      if (!success) {
        console.error('Failed to load fallback background');
        isLoading.set(false);
        return;
      }
    }

    // Destroy old layers
    if (this.parallaxLayers) {
      destroyParallaxLayers(this.parallaxLayers);
      this.parallaxLayers = null;
    }

    // Create new layers
    this.createParallaxBackground();

    // Hide loader and update UI
    isLoading.set(false);
    currentBackground.set(config.name);
  }

  shutdown(): void {
    // Clean up store subscriptions to prevent memory leaks
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    // Clean up dialog triggers
    if (this.triggerManager) {
      this.triggerManager.destroy();
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
