import Phaser from 'phaser';
import { loadBackgroundAssets } from './BackgroundLoader';
import { createParallaxBackground, updateParallaxTiling, destroyParallaxLayers, type ParallaxLayers } from './ParallaxHelper';
import { backgroundManager } from '../data/background';
import type { MapConfig } from '../data/mapConfig';
import { BuilderCameraController } from './builder/BuilderCameraController';
import { BuilderPlayerController } from './builder/BuilderPlayerController';
import { BuilderGridOverlay } from './builder/BuilderGridOverlay';
import { BuilderItemsController } from './builder/BuilderItemsController';
import { PlacedItemManager } from './PlacedItemManager';
import { GROUND_HEIGHT } from './builder/builderConstants';
import { GroundManager } from './shared/GroundManager';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { setBuilderZoom, updateCameraInfo } from '../stores/builderStores';
import { EventBus, EVENTS, type MinimapNavigateEvent } from '../events/EventBus';

/**
 * BuilderScene - Interactive map builder with visual editor
 * Modular architecture using specialized controllers
 */
export class BuilderScene extends Phaser.Scene {
  // Visual elements
  private parallaxLayers: ParallaxLayers | null = null;
  
  // Controllers
  private cameraController!: BuilderCameraController;
  private playerController!: BuilderPlayerController;
  private gridOverlay!: BuilderGridOverlay;
  private itemsController!: BuilderItemsController;
  
  // Configuration
  private config!: MapConfig;
  
  // Event subscriptions
  private minimapSubscription?: { unsubscribe: () => void };
  
  // Public access for UI
  public get itemManager(): PlacedItemManager {
    return this.itemsController?.getManager();
  }
  
  /** Toggle camera zoom between fit-all and normal */
  public toggleZoom(): void {
    this.cameraController?.toggleZoomToFit();
  }

  constructor() {
    super({ key: SCENE_KEYS.BUILDER });
  }

  init(data: { config: MapConfig }): void {
    this.config = data.config;
  }

  preload(): void {
    // Load player sprites (white skin)
    this.load.spritesheet('cat-idle-white', 'assets/sprites/white/Idle.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
    
    // Load UI assets for placed items
    PlacedItemManager.preloadAssets(this);
  }

  create(): void {
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);

    // Initialize controllers
    const groundY = this.config.worldHeight - GROUND_HEIGHT;
    
    this.cameraController = new BuilderCameraController(this, this.config.worldWidth, this.config.worldHeight);
    this.playerController = new BuilderPlayerController(this, this.config.worldWidth, this.config.worldHeight);
    this.gridOverlay = new BuilderGridOverlay(this, this.config.worldWidth, this.config.worldHeight);
    this.itemsController = new BuilderItemsController(this, groundY);

    // Load and create background
    this.createBackground();

    // Create grid overlay
    this.gridOverlay.create();

    // Create ground visual reference
    this.createGroundReference();

    // Create player sprite
    this.playerController.create(this.config.playerStartX, this.config.playerStartY);
    
    // Create placed items manager
    this.itemsController.create(this.config.placedItems || []);

    // Setup camera and controls
    this.cameraController.setup();
    this.cameraController.centerOn(this.config.playerStartX, this.config.playerStartY);
    
    // Connect zoom state changes to store for UI
    this.cameraController.setOnZoomChange((isZoomedOut) => {
      setBuilderZoom(isZoomedOut);
    });
    
    // Listen for minimap navigation events
    this.minimapSubscription = EventBus.on<MinimapNavigateEvent>(EVENTS.MINIMAP_NAVIGATE, (data) => {
      this.navigateToPosition(data.worldX, data.worldY);
    });
  }

  private async createBackground(): Promise<void> {
    const config = backgroundManager.getCurrentConfig();
    
    // Load background assets if not already loaded
    try {
      await loadBackgroundAssets(this, config);
    } catch (error) {
      console.error('Failed to load background:', error);
      return;
    }

    // Destroy existing layers
    if (this.parallaxLayers) {
      destroyParallaxLayers(this.parallaxLayers);
      this.parallaxLayers = null;
    }

    // Create new parallax layers using shared helper
    this.parallaxLayers = createParallaxBackground(
      this,
      this.config.worldWidth,
      this.config.worldHeight,
      config
    );
  }

  private createGroundReference(): void {
    GroundManager.createVisualGround(this, {
      worldWidth: this.config.worldWidth,
      worldHeight: this.config.worldHeight,
      height: GROUND_HEIGHT,
    });
  }

  update(): void {
    // Update base layer tiling for infinite scrolling effect
    if (this.parallaxLayers) {
      updateParallaxTiling(this.parallaxLayers.baseLayer, this.cameras.main);
    }
    
    // Update camera info for minimap
    const camera = this.cameras.main;
    const playerSprite = this.data.get('playerSprite') as Phaser.GameObjects.Sprite | undefined;
    
    updateCameraInfo({
      scrollX: camera.scrollX,
      scrollY: camera.scrollY,
      viewWidth: camera.width,
      viewHeight: camera.height,
      worldWidth: this.config.worldWidth,
      worldHeight: this.config.worldHeight,
      zoom: camera.zoom,
      playerX: playerSprite?.x ?? this.config.playerStartX,
      playerY: playerSprite?.y ?? this.config.playerStartY,
    });
  }
  
  /** Navigate camera to a position (called from minimap click) */
  private navigateToPosition(x: number, y: number): void {
    if (this.cameraController.getIsZoomedOut()) return;
    this.cameraController.centerOn(x, y);
  }

  shutdown(): void {
    // Clean up event subscriptions
    if (this.minimapSubscription) {
      this.minimapSubscription.unsubscribe();
    }
    
    // Clean up controllers
    if (this.cameraController) {
      this.cameraController.destroy();
    }
    if (this.playerController) {
      this.playerController.destroy();
    }
    if (this.gridOverlay) {
      this.gridOverlay.destroy();
    }
    if (this.itemsController) {
      this.itemsController.destroy();
    }
  }
}
