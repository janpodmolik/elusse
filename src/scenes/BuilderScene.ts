import Phaser from 'phaser';
import { loadBackgroundAssets } from './BackgroundLoader';
import { createParallaxBackground, updateParallaxTiling, destroyParallaxLayers, type ParallaxLayers } from './ParallaxHelper';
import { backgroundManager } from '../data/background';
import type { MapConfig } from '../data/mapConfig';
import { BuilderCameraController } from './builder/BuilderCameraController';
import { BuilderPlayerController } from './builder/BuilderPlayerController';
import { BuilderGridOverlay } from './builder/BuilderGridOverlay';
import { BuilderItemsController } from './builder/BuilderItemsController';
import { BuilderFramesController } from './builder/BuilderFramesController';
import { BuilderSocialsController } from './builder/BuilderSocialsController';
import { DialogZoneRenderer } from './builder/DialogZoneRenderer';
import { PlacedItemManager } from './PlacedItemManager';
import { GROUND_HEIGHT } from './builder/builderConstants';
import { GroundManager } from './shared/GroundManager';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { updateCameraInfo } from '../stores/builderStores';
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
  private framesController!: BuilderFramesController;
  private socialsController!: BuilderSocialsController;
  private dialogZoneRenderer!: DialogZoneRenderer;
  
  // Configuration
  private config!: MapConfig;
  
  // Event subscriptions
  private minimapSubscription?: { unsubscribe: () => void };
  
  // Shutdown guard to prevent double cleanup
  private isShuttingDown = false;
  
  // Public access for UI
  public get itemManager(): PlacedItemManager {
    return this.itemsController?.getManager();
  }
  
  /** Reset camera zoom to fit-to-screen */
  public resetZoom(): void {
    this.cameraController?.resetToFit();
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
    
    // Load frame assets
    BuilderFramesController.preloadAssets(this);
    
    // Load social assets
    BuilderSocialsController.preloadAssets(this);
  }

  create(): void {
    // Reset shutdown guard for scene restart
    this.isShuttingDown = false;
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);

    // Initialize controllers
    const groundY = this.config.worldHeight - GROUND_HEIGHT;
    
    this.cameraController = new BuilderCameraController(this, this.config.worldWidth, this.config.worldHeight);
    this.playerController = new BuilderPlayerController(this, this.config.worldWidth, this.config.worldHeight);
    this.gridOverlay = new BuilderGridOverlay(this, this.config.worldWidth, this.config.worldHeight);
    this.itemsController = new BuilderItemsController(this, groundY, this.config.worldWidth, this.config.worldHeight);
    this.framesController = new BuilderFramesController(this, this.config.worldWidth, this.config.worldHeight);
    this.socialsController = new BuilderSocialsController(this, this.config.worldWidth, this.config.worldHeight);
    this.dialogZoneRenderer = new DialogZoneRenderer(this, this.config.worldWidth, this.config.worldHeight);

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
    
    // Create frames manager
    this.framesController.create(this.config.placedFrames || []);
    
    // Create socials manager
    this.socialsController.create(this.config.placedSocials || []);
    
    // Create dialog zone renderer
    this.dialogZoneRenderer.create();

    // Setup camera and controls
    this.cameraController.setup();
    this.cameraController.centerOn(this.config.playerStartX, this.config.playerStartY);
    
    // Listen for minimap navigation events
    this.minimapSubscription = EventBus.on<MinimapNavigateEvent>(EVENTS.MINIMAP_NAVIGATE, (data) => {
      this.navigateToPosition(data.worldX, data.worldY);
    });
    
    // Setup resize handler
    this.scale.on('resize', this.handleResize, this);
    
    // Register shutdown handler for proper cleanup when scene stops
    this.events.on('shutdown', this.shutdown, this);
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
    
    // Update selection visuals and screen position (for UI overlay)
    this.itemManager?.updateSelectionVisuals();
    this.framesController?.updateSelectionVisuals();
    this.socialsController?.updateSelectionVisuals();
    this.dialogZoneRenderer?.updateSelectionVisuals();
    
    // Update camera info for minimap
    const camera = this.cameras.main;
    const playerSprite = this.data.get('playerSprite') as Phaser.GameObjects.Sprite | undefined;
    
    // Use worldView for accurate world-to-screen conversion
    // worldView represents the visible area in world coordinates
    updateCameraInfo({
      scrollX: camera.worldView.x,
      scrollY: camera.worldView.y,
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
    this.cameraController.centerOn(x, y);
  }
  
  /**
   * Handle window/canvas resize
   */
  private handleResize(gameSize: Phaser.Structs.Size): void {
    // Guard: only handle resize when scene is active
    if (!this.cameras?.main || !this.config) return;
    
    // Let camera controller handle zoom/bounds recalculation
    this.cameraController?.handleResize();
    
    // Update parallax base layer to cover new viewport
    if (this.parallaxLayers?.baseLayer) {
      const viewportHeight = Math.max(this.config.worldHeight, gameSize.height);
      this.parallaxLayers.baseLayer.setSize(this.config.worldWidth, viewportHeight);
    }
    
    // Update grid overlay if exists
    if (this.gridOverlay) {
      this.gridOverlay.redraw();
    }
  }

  shutdown(): void {
    // Guard against double shutdown
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;
    
    // Remove resize listener
    this.scale.off('resize', this.handleResize, this);
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
    if (this.framesController) {
      this.framesController.destroy();
    }
    if (this.socialsController) {
      this.socialsController.destroy();
    }
    if (this.dialogZoneRenderer) {
      this.dialogZoneRenderer.destroy();
    }
  }
}
