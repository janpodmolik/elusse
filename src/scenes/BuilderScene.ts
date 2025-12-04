import Phaser from 'phaser';
import { loadBackgroundAssets } from '../utils/BackgroundLoader';
import { createParallaxBackground, updateParallaxTiling, destroyParallaxLayers, type ParallaxLayers } from '../utils/ParallaxHelper';
import { backgroundManager } from '../data/background';
import { preloadSkins, createAllSkinAnimations } from '../utils/skinLoader';
import type { MapConfig } from '../data/mapConfig';
import { BuilderCameraController } from '../managers/builder/BuilderCameraController';
import { BuilderPlayerController } from '../managers/builder/BuilderPlayerController';
import { BuilderGridOverlay } from '../managers/builder/BuilderGridOverlay';
import { BuilderItemsController } from '../managers/builder/BuilderItemsController';
import { BuilderFramesController } from '../managers/builder/BuilderFramesController';
import { BuilderSocialsController } from '../managers/builder/BuilderSocialsController';
import { DialogZoneRenderer } from '../managers/builder/DialogZoneRenderer';
import { PlacedItemManager } from '../managers/PlacedItemManager';
import { GROUND_HEIGHT } from '../managers/builder/builderConstants';
import { GroundManager } from '../managers/GroundManager';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { updateCameraInfo } from '../stores/gameStores';
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
    // Load player sprite sheets
    preloadSkins(this);
    
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
    
    // Start async initialization
    this.initializeScene();
  }
  
  /**
   * Scene initialization
   */
  private async initializeScene(): Promise<void> {
    // Create animations for all skins
    createAllSkinAnimations(this);
    
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);

    // Initialize controllers
    const bgConfig = backgroundManager.getCurrentConfig();
    const groundHeight = bgConfig.groundHeight ?? GROUND_HEIGHT;
    const groundY = this.config.worldHeight - groundHeight;
    
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

    // Preload modular character if needed, then create player
    await this.playerController.preload();
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
    const config = backgroundManager.getCurrentConfig();
    const groundHeight = config.groundHeight ?? GROUND_HEIGHT;

    GroundManager.createVisualGround(this, {
      worldWidth: this.config.worldWidth,
      worldHeight: this.config.worldHeight,
      height: groundHeight,
    });
  }

  update(): void {
    // Update all parallax layers tiling for infinite scrolling effect
    if (this.parallaxLayers) {
      updateParallaxTiling(this.parallaxLayers, this.cameras.main);
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
  private handleResize(_gameSize: Phaser.Structs.Size): void {
    // Guard: only handle resize when scene is active
    if (!this.cameras?.main || !this.config) return;
    
    // Let camera controller handle zoom/bounds recalculation
    this.cameraController?.handleResize();
    
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
