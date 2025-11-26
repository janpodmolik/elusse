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
import { GROUND_HEIGHT, GROUND_COLOR, GROUND_ALPHA } from './builder/builderConstants';

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
  
  // Public access for UI
  public get itemManager(): PlacedItemManager {
    return this.itemsController?.getManager();
  }

  constructor() {
    super({ key: 'BuilderScene' });
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
    this.cameraController.centerOn(this.config.playerStartX, this.config.worldHeight / 2);
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
    const groundY = this.config.worldHeight - GROUND_HEIGHT;
    
    const ground = this.add.rectangle(
      0,
      groundY,
      this.config.worldWidth,
      GROUND_HEIGHT,
      GROUND_COLOR,
      GROUND_ALPHA
    );
    ground.setOrigin(0, 0);
    ground.setDepth(-1);
  }

  update(): void {
    // Update base layer tiling for infinite scrolling effect
    if (this.parallaxLayers) {
      updateParallaxTiling(this.parallaxLayers.baseLayer, this.cameras.main);
    }
  }

  shutdown(): void {
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
