import { createAllSkinAnimations } from '../utils/skinLoader';
import type { MapConfig } from '../data/mapConfig';
import { BuilderCameraController } from '../managers/builder/BuilderCameraController';
import { BuilderPlayerController } from '../managers/builder/BuilderPlayerController';
import { BuilderGridOverlay } from '../managers/builder/BuilderGridOverlay';
import { BuilderItemsController } from '../managers/builder/BuilderItemsController';
import { BuilderSocialsController } from '../managers/builder/BuilderSocialsController';
import { BuilderNPCsController } from '../managers/builder/BuilderNPCsController';
import { DialogZoneRenderer } from '../managers/builder/DialogZoneRenderer';
import { PlacedItemManager } from '../managers/PlacedItemManager';
import { WorldManager } from '../managers/WorldManager';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { updateCameraInfo } from '../stores/gameStores';
import { EventBus, EVENTS, type MinimapNavigateEvent } from '../events/EventBus';
import { updateSpriteDepth } from '../constants/depthLayers';
import { AssetPreloader } from '../utils/AssetPreloader';
import { BaseScene } from './BaseScene';

/**
 * BuilderScene - Interactive map builder with visual editor
 * 
 * Allows users to place items, NPCs, socials, and configure dialog zones.
 * Uses specialized controllers for each entity type.
 * 
 * @extends BaseScene
 * 
 * @lifecycle
 * 1. init() - Store config, reset guards
 * 2. preload() - Queue assets via AssetPreloader
 * 3. create() - Register handlers, start async initializeScene()
 * 4. initializeScene() - Create background, entities, setup camera
 * 5. update() - Update depth sorting, selection visuals, camera info
 * 6. shutdown() - Cleanup controllers and subscriptions
 * 
 * @controllers
 * - WorldManager: Background and ground
 * - BuilderCameraController: Pan, zoom, minimap navigation
 * - BuilderPlayerController: Draggable player preview
 * - BuilderGridOverlay: Visual grid for alignment
 * - BuilderItemsController: Placeable items
 * - BuilderSocialsController: Social icons
 * - BuilderNPCsController: NPC entities
 * - DialogZoneRenderer: Dialog zone visualization
 * 
 * @stores
 * - updateCameraInfo: Camera state for minimap
 * - EventBus: Minimap navigation events
 */
export class BuilderScene extends BaseScene {
  // =========================================================================
  // MANAGERS & CONTROLLERS
  // =========================================================================
  
  /** Manages world configuration, background, and ground */
  private worldManager!: WorldManager;
  
  /** Manages camera pan, zoom, and minimap navigation */
  private cameraController!: BuilderCameraController;
  
  /** Manages draggable player preview */
  private playerController!: BuilderPlayerController;
  
  /** Manages visual grid overlay */
  private gridOverlay!: BuilderGridOverlay;
  
  /** Manages placeable items */
  private itemsController!: BuilderItemsController;
  
  /** Manages social icons */
  private socialsController!: BuilderSocialsController;
  
  /** Manages NPC entities */
  private npcsController!: BuilderNPCsController;
  
  /** Manages dialog zone visualization */
  private dialogZoneRenderer!: DialogZoneRenderer;
  
  // =========================================================================
  // STATE
  // =========================================================================
  
  /** Map configuration from init data */
  private config!: MapConfig;
  
  /** Minimap navigation event subscription */
  private minimapSubscription?: { unsubscribe: () => void };
  
  /** Saved camera position to restore after scene switch */
  private savedCameraPosition: { scrollX: number; scrollY: number; zoom: number } | null = null;
  
  // =========================================================================
  // PUBLIC API
  // =========================================================================
  public get itemManager(): PlacedItemManager {
    return this.itemsController?.getManager();
  }
  
  /** Reset camera zoom to fit-to-screen */
  public resetZoom(): void {
    this.cameraController?.resetToFit();
  }

  /** Get current camera position and zoom */
  public getCameraPosition(): { scrollX: number; scrollY: number; zoom: number } | null {
    return this.cameraController?.getPosition() ?? null;
  }

  /** Set camera position and zoom (for restoring saved state) */
  public setCameraPosition(scrollX: number, scrollY: number, zoom: number): void {
    this.cameraController?.setPosition(scrollX, scrollY, zoom);
  }

  constructor() {
    super({ key: SCENE_KEYS.BUILDER });
  }

  // =========================================================================
  // LIFECYCLE: INIT
  // =========================================================================

  init(data: { config: MapConfig; savedCameraPosition?: { scrollX: number; scrollY: number; zoom: number } | null }): void {
    super.init(data);
    
    this.config = data.config;
    this.savedCameraPosition = data.savedCameraPosition ?? null;
    
    // Initialize world manager with config
    this.worldManager = new WorldManager(this);
    this.worldManager.setConfiguration(this.config);
  }

  // =========================================================================
  // LIFECYCLE: PRELOAD
  // =========================================================================

  preload(): void {
    // Preload all builder assets via centralized preloader
    AssetPreloader.preloadForBuilder(this);
  }

  // =========================================================================
  // LIFECYCLE: CREATE
  // =========================================================================

  create(): void {
    super.create();
    
    // Start async initialization
    this.initializeScene();
  }
  
  // =========================================================================
  // ASYNC INITIALIZATION
  // =========================================================================

  /**
   * Async scene initialization.
   * Creates background, entities, and sets up camera.
   */
  protected async initializeScene(): Promise<void> {
    // Create animations for all skins
    createAllSkinAnimations(this);
    
    // Setup physics world bounds
    this.worldManager.setupWorldBounds();
    
    // Get ground Y for entity placement
    const { groundY } = this.worldManager.createGround('visual');
    
    // Initialize controllers
    this.cameraController = new BuilderCameraController(this, this.config.worldWidth, this.config.worldHeight);
    this.playerController = new BuilderPlayerController(this, this.config.worldWidth, this.config.worldHeight);
    this.gridOverlay = new BuilderGridOverlay(this, this.config.worldWidth, this.config.worldHeight);
    this.itemsController = new BuilderItemsController(this, groundY, this.config.worldWidth, this.config.worldHeight);
    this.socialsController = new BuilderSocialsController(this, this.config.worldWidth, this.config.worldHeight);
    this.npcsController = new BuilderNPCsController(this, groundY, this.config.worldWidth, this.config.worldHeight);
    this.dialogZoneRenderer = new DialogZoneRenderer(this, this.config.worldWidth, this.config.worldHeight);

    // Setup background
    await this.worldManager.setupBackground();

    // Create grid overlay
    this.gridOverlay.create();

    // Preload modular character if needed, then create player
    await this.playerController.preload();
    this.playerController.create(this.config.playerStartX, this.config.playerStartY);
    
    // Create placed items manager
    this.itemsController.create(this.config.placedItems || []);
    
    // Create socials manager
    this.socialsController.create(this.config.placedSocials || []);
    
    // Create NPCs manager
    this.npcsController.create(this.config.placedNPCs || []);
    
    // Create dialog zone renderer
    this.dialogZoneRenderer.create();

    // Setup camera and controls
    this.cameraController.setup();
    
    // Restore saved camera position or center on player
    if (this.savedCameraPosition) {
      this.cameraController.setPosition(
        this.savedCameraPosition.scrollX,
        this.savedCameraPosition.scrollY,
        this.savedCameraPosition.zoom
      );
      this.savedCameraPosition = null;
    } else {
      this.cameraController.centerOn(this.config.playerStartX, this.config.playerStartY);
    }
    
    // Listen for minimap navigation events
    this.minimapSubscription = EventBus.on<MinimapNavigateEvent>(EVENTS.MINIMAP_NAVIGATE, (data) => {
      this.navigateToPosition(data.worldX, data.worldY);
    });
    
    // Mark as initialized
    this.isInitialized = true;
  }

  // =========================================================================
  // UPDATE LOOP
  // =========================================================================

  update(): void {
    // Guard: wait for initialization
    if (!this.isInitialized) return;
    
    // Update parallax scrolling
    this.worldManager.updateParallax(this.cameras.main);
    
    // Get world height for depth calculation
    const worldHeight = this.config.worldHeight;
    
    // Update player depth based on Y position
    const playerSprite = this.data.get('playerSprite') as Phaser.GameObjects.Sprite | undefined;
    if (playerSprite) {
      updateSpriteDepth(playerSprite, worldHeight);
    }
    
    // Update auto-depth for items and NPCs
    this.itemManager?.updateAutoDepth(worldHeight);
    this.npcsController?.updateAutoDepth(worldHeight);
    
    // Update selection visuals
    this.itemManager?.updateSelectionVisuals();
    this.socialsController?.updateSelectionVisuals();
    this.dialogZoneRenderer?.updateSelectionVisuals();
    this.npcsController?.update();
    
    // Update camera info for minimap
    const camera = this.cameras.main;
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
  
  // =========================================================================
  // NAVIGATION
  // =========================================================================
  
  /** Navigate camera to a position (called from minimap click) */
  private navigateToPosition(x: number, y: number): void {
    this.cameraController.centerOn(x, y);
  }
  
  // =========================================================================
  // RESIZE HANDLING
  // =========================================================================

  /**
   * Handle window/canvas resize.
   * Delegates to camera controller and redraws grid.
   */
  protected handleResize(_gameSize: Phaser.Structs.Size): void {
    if (!this.cameraController || !this.config) return;
    
    this.cameraController.handleResize();
    this.gridOverlay?.redraw();
  }

  // =========================================================================
  // SHUTDOWN
  // =========================================================================

  shutdown(): void {
    // Clean up minimap subscription
    this.minimapSubscription?.unsubscribe();
    
    // Destroy world manager
    this.worldManager?.destroy();
    
    // Destroy controllers
    this.cameraController?.destroy();
    this.playerController?.destroy();
    this.gridOverlay?.destroy();
    this.itemsController?.destroy();
    this.socialsController?.destroy();
    this.dialogZoneRenderer?.destroy();
    this.npcsController?.destroy();
    
    // Call parent cleanup
    super.shutdown();
  }
}
