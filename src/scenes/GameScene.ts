import Phaser from 'phaser';
import { PlacedItemManager } from '../managers/PlacedItemManager';
import { PlacedNPCManager } from '../managers/PlacedNPCManager';
import { GameSocialManager } from '../managers/GameSocialManager';
import { dialogZones as dialogZonesStore } from '../stores/builderStores';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { 
  isLoading, 
  setGameWorldDimensions, 
  setPlayerScreenPosition, 
  setGameCameraInfo, 
  setActiveDialogZone,
  setActiveNPCDialog
} from '../stores';
import type { DialogZone } from '../types/DialogTypes';
import type { IPlayer } from '../entities';
import { GamePlayerManager } from '../managers/game/GamePlayerManager';
import { MapManager } from '../managers/game/MapManager';
import type { MapConfig } from '../data/mapConfig';

export class GameScene extends Phaser.Scene {
  // Managers
  private playerManager!: GamePlayerManager;
  private mapManager!: MapManager;
  
  // Unified player interface
  private player: IPlayer | null = null;

  // Public accessor for map config (used by sceneManager)
  public getMapConfig(): MapConfig | null {
    return this.mapManager?.getConfig() || null;
  }

  // Placed items system (replaces dialog trigger system)
  private itemManager!: PlacedItemManager;
  
  // Placed NPCs system
  private npcManager!: PlacedNPCManager;
  
  // Social manager for clickable social icons
  private socialManager!: GameSocialManager;
  
  // Dialog zones loaded from config
  private dialogZones: DialogZone[] = [];
  
  // Currently active dialog zone (for detecting zone exit)
  private currentDialogZone: DialogZone | null = null;
  
  // Currently active NPC dialog (for proximity detection)
  private currentNPCId: string | null = null;
  
  // NPC proximity threshold (in pixels) - fallback if NPC doesn't have custom radius
  private readonly NPC_PROXIMITY_THRESHOLD = 200;

  // Store unsubscribe functions
  private unsubscribers: Array<() => void> = [];
  
  // Init data stored for async loading
  private initData?: { useBuilderConfig?: boolean };
  
  // Initialization flag to prevent update() before async init completes
  private isInitialized: boolean = false;

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  init(data?: { useBuilderConfig?: boolean }): void {
    // Store init data for async processing in create()
    this.initData = data;
    // Reset initialization flag
    this.isInitialized = false;
    
    // Initialize managers
    this.playerManager = new GamePlayerManager(this);
    this.mapManager = new MapManager(this);
    
    // Initialize player settings
    this.playerManager.init();
  }

  preload(): void {
    // Preload player assets
    this.playerManager.preload();

    // Load UI assets for placed items
    PlacedItemManager.preloadAssets(this);
    
    // Load NPC assets
    PlacedNPCManager.preloadAssets(this);
    
    // Load social assets
    GameSocialManager.preloadAssets(this);
  }

  create(): void {
    // Register shutdown handler for proper cleanup when scene stops
    this.events.on('shutdown', this.shutdown, this);
    
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
      // Load player assets
      await this.playerManager.loadAssets();
      
      // Load map configuration
      const mapConfig = await this.mapManager.loadMapConfiguration(this.initData?.useBuilderConfig);
      
      // Setup background
      await this.mapManager.setupBackground();

      // Create ground with physics
      const { ground, groundY, groundHeight } = this.mapManager.createGround();

      // Create player
      this.player = this.playerManager.createPlayer(mapConfig, ground, groundHeight);

      // Initialize placed items system (read-only mode for game scene)
      this.itemManager = new PlacedItemManager(
        this, 
        groundY, 
        mapConfig.worldWidth,
        mapConfig.worldHeight,
        false
      );
      
      // Load placed items from config
      if (mapConfig.placedItems && mapConfig.placedItems.length > 0) {
        this.itemManager.createItems(mapConfig.placedItems);
      }
      
      // Add collision between player and physics-enabled items
      const itemPhysicsGroup = this.itemManager.getPhysicsGroup();
      if (itemPhysicsGroup && this.player) {
        this.physics.add.collider(this.player.getGameObject(), itemPhysicsGroup);
      }
      
      // Initialize social manager for clickable social icons
      this.socialManager = new GameSocialManager(this);
      
      // Load placed socials from config
      if (mapConfig.placedSocials && mapConfig.placedSocials.length > 0) {
        this.socialManager.createSocials(mapConfig.placedSocials);
      }
      
      // Initialize NPC manager
      this.npcManager = new PlacedNPCManager(this, groundY, mapConfig.worldWidth, mapConfig.worldHeight, false);
      
      // Load placed NPCs from config
      if (mapConfig.placedNPCs && mapConfig.placedNPCs.length > 0) {
        this.npcManager.createNPCs(mapConfig.placedNPCs);
      }
      
      // Load dialog zones from config (initial load)
      this.dialogZones = mapConfig.dialogZones || [];
      
      // Subscribe to dialog zones store for live updates from builder
      const unsubDialogZones = dialogZonesStore.subscribe(zones => {
        this.dialogZones = zones;
        // Re-check current zone to update dialog text immediately
        this.recheckCurrentZone();
      });
      this.unsubscribers.push(unsubDialogZones);

      // Setup camera to follow player
      if (this.player) {
        this.cameras.main.startFollow(this.player.getGameObject(), true, 0.1, 0.1);
      }
      this.setupCameraBounds();
      
      // Setup resize handler
      this.scale.on('resize', this.handleResize, this);
      
      // Mark as initialized - safe to call update()
      this.isInitialized = true;
    } catch (error) {
      console.error('[GameScene] Failed to initialize scene:', error);
      // Show error state to user - could emit event or set error store
    } finally {
      // Hide loading indicator
      isLoading.set(false);
    }
  }

  /**
   * Setup camera bounds with zoom adjustment to always show full world height
   */
  private setupCameraBounds(): void {
    const mapConfig = this.mapManager.getConfig();
    if (!mapConfig) return;

    const camera = this.cameras.main;
    const viewportHeight = camera.height;
    const viewportWidth = camera.width;
    
    // Calculate zoom to ensure full world height is always visible
    // If viewport is shorter than world, we need to zoom out
    const zoomToFitHeight = viewportHeight / mapConfig.worldHeight;
    const zoom = Math.min(1, zoomToFitHeight); // Never zoom in beyond 1x
    
    camera.setZoom(zoom);
    
    // Effective viewport size after zoom
    const effectiveViewportHeight = viewportHeight / zoom;
    const effectiveViewportWidth = viewportWidth / zoom;
    
    // Calculate bounds - allow negative Y to center vertically when viewport > world
    let boundsY = 0;
    let boundsHeight = mapConfig.worldHeight;
    
    if (effectiveViewportHeight > mapConfig.worldHeight) {
      // Viewport is taller than world - center vertically
      boundsY = (mapConfig.worldHeight - effectiveViewportHeight) / 2;
      boundsHeight = effectiveViewportHeight;
    }
    
    // Similarly for X axis
    let boundsX = 0;
    let boundsWidth = mapConfig.worldWidth;
    
    if (effectiveViewportWidth > mapConfig.worldWidth) {
      boundsX = (mapConfig.worldWidth - effectiveViewportWidth) / 2;
      boundsWidth = effectiveViewportWidth;
    }
    
    camera.setBounds(boundsX, boundsY, boundsWidth, boundsHeight);
    
    // Update game world dimensions for UI overlay
    setGameWorldDimensions(
      mapConfig.worldWidth,
      mapConfig.worldHeight,
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
    if (!this.cameras?.main || !this.mapManager) return;
    
    // Update camera bounds with vertical centering
    this.setupCameraBounds();
  }

  shutdown(): void {
    // Mark as not initialized to stop update() calls
    this.isInitialized = false;
    
    // Remove resize listener
    this.scale.off('resize', this.handleResize, this);
    
    // Clear active dialog zone and NPC dialog
    setActiveDialogZone(null);
    setActiveNPCDialog(null);
    this.currentDialogZone = null;
    this.currentNPCId = null;
    
    // Clean up store subscriptions to prevent memory leaks
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    // Clean up placed items
    if (this.itemManager) {
      this.itemManager.destroy();
    }
    
    // Clean up social manager
    if (this.socialManager) {
      this.socialManager.destroy();
    }
  }

  update(): void {
    // Guard against update being called before async initialization completes
    if (!this.isInitialized || !this.player) return;
    
    // Update player and get position via unified interface
    this.player.update();
    const { x: playerX, y: playerY } = this.player.getPosition();
    
    // Calculate player's bottom Y for auto-depth sorting
    const playerGameObject = this.player.getGameObject();
    const playerBounds = playerGameObject.getBounds();
    const playerBottomY = playerBounds.bottom;
    
    // Update auto-depth for items and NPCs based on player position
    if (this.itemManager) {
      this.itemManager.updateAutoDepth(playerBottomY);
    }
    if (this.npcManager) {
      this.npcManager.updateAutoDepth(playerBottomY);
    }
    
    // Update player screen position for UI (dialog bubbles)
    const camera = this.cameras.main;
    const screenX = playerX - camera.scrollX;
    const screenY = playerY - camera.scrollY;
    setPlayerScreenPosition(screenX, screenY);
    
    // Update camera info for overlay
    setGameCameraInfo(camera.scrollX, camera.scrollY, camera.zoom);
    
    // Check dialog zone collisions
    this.checkDialogZonesForPosition(playerX);
    
    // Check NPC proximity
    this.checkNPCProximity(playerX, playerY, camera);

    // Update all parallax layers tiling for infinite scrolling effect
    if (this.mapManager) {
      this.mapManager.update(this.cameras.main);
    }
  }
  
  /**
   * Check dialog zones for a given X position
   */
  private checkDialogZonesForPosition(playerX: number): void {
    
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
  
  /**
   * Check NPC proximity and show dialog bubble when player is near
   */
  private checkNPCProximity(playerX: number, playerY: number, camera: Phaser.Cameras.Scene2D.Camera): void {
    if (!this.npcManager) return;
    
    const npcs = this.npcManager.getAllNPCs();
    let nearestNPC: { id: string; distance: number; npc: any } | null = null;
    
    // Find nearest NPC within their individual trigger radius
    for (const npc of npcs) {
      // Check if NPC has dialog content
      const dialogData = npc.getDialogData?.() ?? [];
      if (!dialogData || dialogData.length === 0) continue;
      
      // Check if any text has content
      const hasContent = dialogData.some((t: { content?: string }) => t.content && t.content.trim().length > 0);
      if (!hasContent) continue;
      
      const dx = npc.x - playerX;
      const dy = npc.y - playerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Use per-NPC trigger radius
      const threshold = npc.triggerRadius ?? this.NPC_PROXIMITY_THRESHOLD;
      
      if (distance <= threshold) {
        if (!nearestNPC || distance < nearestNPC.distance) {
          nearestNPC = { id: npc.id, distance, npc };
        }
      }
    }
    
    // Update active NPC dialog if changed
    if (nearestNPC) {
      const npc = nearestNPC.npc;
      const npcScreenX = npc.x - camera.scrollX;
      const npcScreenY = npc.y - camera.scrollY;
      
      if (this.currentNPCId !== nearestNPC.id) {
        // New NPC in proximity
        this.currentNPCId = nearestNPC.id;
        setActiveNPCDialog({
          npcId: nearestNPC.id,
          texts: npc.getDialogData() ?? [],
          screenX: npcScreenX,
          screenY: npcScreenY,
          npcHeight: npc.displayHeight
        });
      } else {
        // Same NPC, just update position
        setActiveNPCDialog({
          npcId: nearestNPC.id,
          texts: npc.getDialogData() ?? [],
          screenX: npcScreenX,
          screenY: npcScreenY,
          npcHeight: npc.displayHeight
        });
      }
    } else if (this.currentNPCId) {
      // No NPC in proximity, clear dialog
      this.currentNPCId = null;
      setActiveNPCDialog(null);
    }
  }
}
