import Phaser from 'phaser';
import { Player } from './Player';
import { AVAILABLE_SKINS } from '../data/catSkin';
import { backgroundManager } from '../data/background';
import { loadBackgroundAssets } from './BackgroundLoader';
import { createParallaxBackground, updateParallaxTiling, type ParallaxLayers } from './ParallaxHelper';
import { PlacedItemManager } from './PlacedItemManager';
import { GameFrameManager } from './GameFrameManager';
import { GameSocialManager } from './GameSocialManager';
import { loadMapConfig, MapConfig } from '../data/mapConfig';
import { getBuilderConfig, dialogZones as dialogZonesStore } from '../stores/builderStores';
import { GroundManager } from './shared/GroundManager';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { clampPlayerY, getPlayerGroundY } from '../constants/playerConstants';
import { isLoading, setActiveDialogZone, setPlayerScreenPosition, setGameCameraInfo, setGameWorldDimensions } from '../stores';
import type { DialogZone } from '../types/DialogTypes';

export class GameScene extends Phaser.Scene {
  private player!: Player;

  // Map configuration (loaded from JSON)
  private mapConfig!: MapConfig;

  // Parallax backgrounds (flexible layer count)
  private parallaxLayers: ParallaxLayers | null = null;
  private loadedBackgrounds: Set<string> = new Set();

  // Placed items system (replaces dialog trigger system)
  private itemManager!: PlacedItemManager;
  
  // Frame manager for clickable frames
  private frameManager!: GameFrameManager;
  
  // Social manager for clickable social icons
  private socialManager!: GameSocialManager;
  
  // Dialog zones loaded from config
  private dialogZones: DialogZone[] = [];
  
  // Currently active dialog zone (for detecting zone exit)
  private currentDialogZone: DialogZone | null = null;

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
    
    // Load frame assets
    GameFrameManager.preloadAssets(this);
    
    // Load social assets
    GameSocialManager.preloadAssets(this);
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

      // Create player - ensure they start on ground, not floating or underground
      const playerY = clampPlayerY(this.mapConfig.playerStartY, this.mapConfig.worldHeight);
      this.player = new Player(this, this.mapConfig.playerStartX, playerY);

      // Add collision between player and ground
      GroundManager.addPlayerCollision(this, this.player, ground);

      // Initialize placed items system (read-only mode for game scene)
      this.itemManager = new PlacedItemManager(
        this, 
        groundY, 
        this.mapConfig.worldWidth,
        this.mapConfig.worldHeight,
        false
      );
      
      // Load placed items from config
      if (this.mapConfig.placedItems && this.mapConfig.placedItems.length > 0) {
        this.itemManager.createItems(this.mapConfig.placedItems);
      }
      
      // Add collision between player and physics-enabled items
      const itemPhysicsGroup = this.itemManager.getPhysicsGroup();
      if (itemPhysicsGroup) {
        this.physics.add.collider(this.player, itemPhysicsGroup);
      }
      
      // Initialize frame manager for clickable frames
      this.frameManager = new GameFrameManager(this);
      
      // Load placed frames from config
      if (this.mapConfig.placedFrames && this.mapConfig.placedFrames.length > 0) {
        this.frameManager.createFrames(this.mapConfig.placedFrames);
      }
      
      // Initialize social manager for clickable social icons
      this.socialManager = new GameSocialManager(this);
      
      // Load placed socials from config
      if (this.mapConfig.placedSocials && this.mapConfig.placedSocials.length > 0) {
        this.socialManager.createSocials(this.mapConfig.placedSocials);
      }
      
      // Load dialog zones from config (initial load)
      this.dialogZones = this.mapConfig.dialogZones || [];
      
      // Subscribe to dialog zones store for live updates from builder
      const unsubDialogZones = dialogZonesStore.subscribe(zones => {
        this.dialogZones = zones;
        // Re-check current zone to update dialog text immediately
        this.recheckCurrentZone();
      });
      this.unsubscribers.push(unsubDialogZones);

      // Setup camera to follow player
      this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
      this.setupCameraBounds();
      this.physics.world.setBounds(0, 0, this.mapConfig.worldWidth, this.mapConfig.worldHeight);
      
      // Setup resize handler
      this.scale.on('resize', this.handleResize, this);
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
      // Fallback to default config - playerStartY will be clamped to ground level
      const fallbackWorldHeight = 600;
      this.mapConfig = {
        worldWidth: 3200,
        worldHeight: fallbackWorldHeight,
        playerStartX: 400,
        playerStartY: getPlayerGroundY(fallbackWorldHeight),
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

  private async loadBackgroundIfNeeded(config: import('../data/background').BackgroundConfig): Promise<boolean> {
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

  /**
   * Setup camera bounds with zoom adjustment to always show full world height
   */
  private setupCameraBounds(): void {
    const camera = this.cameras.main;
    const viewportHeight = camera.height;
    const viewportWidth = camera.width;
    
    // Calculate zoom to ensure full world height is always visible
    // If viewport is shorter than world, we need to zoom out
    const zoomToFitHeight = viewportHeight / this.mapConfig.worldHeight;
    const zoom = Math.min(1, zoomToFitHeight); // Never zoom in beyond 1x
    
    camera.setZoom(zoom);
    
    // Effective viewport size after zoom
    const effectiveViewportHeight = viewportHeight / zoom;
    const effectiveViewportWidth = viewportWidth / zoom;
    
    // Calculate bounds - allow negative Y to center vertically when viewport > world
    let boundsY = 0;
    let boundsHeight = this.mapConfig.worldHeight;
    
    if (effectiveViewportHeight > this.mapConfig.worldHeight) {
      // Viewport is taller than world - center vertically
      boundsY = (this.mapConfig.worldHeight - effectiveViewportHeight) / 2;
      boundsHeight = effectiveViewportHeight;
    }
    
    // Similarly for X axis
    let boundsX = 0;
    let boundsWidth = this.mapConfig.worldWidth;
    
    if (effectiveViewportWidth > this.mapConfig.worldWidth) {
      boundsX = (this.mapConfig.worldWidth - effectiveViewportWidth) / 2;
      boundsWidth = effectiveViewportWidth;
    }
    
    camera.setBounds(boundsX, boundsY, boundsWidth, boundsHeight);
    
    // Update game world dimensions for UI frame overlay
    setGameWorldDimensions(
      this.mapConfig.worldWidth,
      this.mapConfig.worldHeight,
      viewportWidth,
      viewportHeight,
      zoom
    );
  }

  /**
   * Handle window/canvas resize
   */
  private handleResize(_gameSize: Phaser.Structs.Size): void {
    // Guard: only handle resize when scene is active
    if (!this.cameras?.main || !this.mapConfig) return;
    
    // Update camera bounds with vertical centering
    this.setupCameraBounds();
  }

  shutdown(): void {
    // Remove resize listener
    this.scale.off('resize', this.handleResize, this);
    
    // Clear active dialog zone
    setActiveDialogZone(null);
    this.currentDialogZone = null;
    
    // Clean up store subscriptions to prevent memory leaks
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    // Clean up placed items
    if (this.itemManager) {
      this.itemManager.destroy();
    }
    
    // Clean up frame manager
    if (this.frameManager) {
      this.frameManager.destroy();
    }
    
    // Clean up social manager
    if (this.socialManager) {
      this.socialManager.destroy();
    }
  }

  update(): void {
    // Guard against update being called before async initialization completes
    if (!this.player) return;
    
    this.player.update();
    
    // Update player screen position for UI (dialog bubbles)
    const camera = this.cameras.main;
    const screenX = this.player.x - camera.scrollX;
    const screenY = this.player.y - camera.scrollY;
    setPlayerScreenPosition(screenX, screenY);
    
    // Update camera info for frame text overlay
    setGameCameraInfo(camera.scrollX, camera.scrollY, camera.zoom);
    
    // Check dialog zone collisions
    this.checkDialogZones();

    // Update all parallax layers tiling for infinite scrolling effect
    if (this.parallaxLayers) {
      updateParallaxTiling(this.parallaxLayers, this.cameras.main);
    }
  }
  
  /**
   * Check if player is inside any dialog zone and update active dialog
   */
  private checkDialogZones(): void {
    const playerX = this.player.x;
    
    // Find zone player is currently in (if any)
    let activeZone: DialogZone | null = null;
    for (const zone of this.dialogZones) {
      if (playerX >= zone.x && playerX <= zone.x + zone.width) {
        activeZone = zone;
        break;
      }
    }
    
    // Only update if zone changed
    if (activeZone?.id !== this.currentDialogZone?.id) {
      this.currentDialogZone = activeZone;
      setActiveDialogZone(activeZone);
    }
  }
  
  /**
   * Re-check current zone and update dialog (called when zone content changes)
   */
  private recheckCurrentZone(): void {
    if (!this.currentDialogZone) return;
    
    // Find updated zone data
    const updatedZone = this.dialogZones.find(z => z.id === this.currentDialogZone?.id);
    if (updatedZone) {
      this.currentDialogZone = updatedZone;
      setActiveDialogZone(updatedZone);
    }
  }
}
