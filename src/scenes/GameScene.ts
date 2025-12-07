import { PlacedItemManager } from '../managers/PlacedItemManager';
import { PlacedNPCManager } from '../managers/PlacedNPCManager';
import { GameSocialManager } from '../managers/GameSocialManager';
import { dialogZones as dialogZonesStore } from '../stores/builderStores';
import { SCENE_KEYS } from '../constants/sceneKeys';
import { updateSpriteDepth } from '../constants/depthLayers';
import { 
  isLoading, 
  setPlayerScreenPosition, 
  setActiveDialogZone,
  setActiveNPCDialog
} from '../stores';
import type { DialogZone } from '../types/DialogTypes';
import type { IPlayer } from '../entities';
import { GamePlayerManager } from '../managers/game/GamePlayerManager';
import { GameCameraController } from '../managers/game/GameCameraController';
import { WorldManager } from '../managers/WorldManager';
import { AssetPreloader } from '../utils/AssetPreloader';
import { BaseScene } from './BaseScene';
import type { MapConfig } from '../data/mapConfig';

/**
 * GameScene - Runtime game with player control
 * 
 * Main gameplay scene where player walks around, interacts with NPCs,
 * and triggers dialog zones.
 * 
 * @extends BaseScene
 * 
 * @lifecycle
 * 1. init() - Store config, initialize managers
 * 2. preload() - Queue assets via AssetPreloader
 * 3. create() - Register handlers, start async initializeScene()
 * 4. initializeScene() - Load map, create entities, setup camera
 * 5. update() - Game loop (player movement, proximity checks)
 * 6. shutdown() - Cleanup managers and subscriptions
 * 
 * @managers
 * - WorldManager: Map config, background, ground
 * - GamePlayerManager: Player entity creation
 * - GameCameraController: Camera bounds, following, resize
 * - PlacedItemManager: Static items in world
 * - PlacedNPCManager: NPC entities
 * - GameSocialManager: Social icons
 * 
 * @stores
 * - isLoading: Loading overlay state
 * - dialogZonesStore: Live updates from builder
 * - setActiveDialogZone: Current zone for UI
 * - setActiveNPCDialog: Current NPC dialog for UI
 */

export class GameScene extends BaseScene {
  // =========================================================================
  // MANAGERS
  // =========================================================================
  
  /** Manages world configuration, background, and ground */
  private worldManager!: WorldManager;
  
  /** Manages player entity creation and assets */
  private playerManager!: GamePlayerManager;
  
  /** Manages camera bounds, following, and resize */
  private cameraController!: GameCameraController;
  
  /** Manages placed items (furniture, decorations) */
  private itemManager!: PlacedItemManager;
  
  /** Manages NPC entities */
  private npcManager!: PlacedNPCManager;
  
  /** Manages clickable social icons */
  private socialManager!: GameSocialManager;
  
  // =========================================================================
  // STATE
  // =========================================================================
  
  /** Current player entity (legacy or modular) */
  private player: IPlayer | null = null;
  
  /** Dialog zones loaded from config */
  private dialogZones: DialogZone[] = [];
  
  /** Currently active dialog zone (for detecting zone exit) */
  private currentDialogZone: DialogZone | null = null;
  
  /** Currently active NPC (for proximity detection) */
  private currentNPCId: string | null = null;
  
  /** Init data stored for async loading */
  private initData?: { useBuilderConfig?: boolean };
  
  // =========================================================================
  // CONSTANTS
  // =========================================================================
  
  /** NPC proximity threshold (fallback if NPC doesn't have custom radius) */
  private static readonly NPC_PROXIMITY_THRESHOLD = 200;
  
  // =========================================================================
  // PUBLIC API
  // =========================================================================
  
  /** Get current map config (used by sceneManager) */
  public getMapConfig(): MapConfig | null {
    return this.worldManager?.getConfig() || null;
  }

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  // =========================================================================
  // LIFECYCLE: INIT
  // =========================================================================

  init(data?: { useBuilderConfig?: boolean }): void {
    super.init(data);
    
    // Store init data for async processing
    this.initData = data;
    
    // Initialize managers
    this.worldManager = new WorldManager(this);
    this.playerManager = new GamePlayerManager(this);
    this.cameraController = new GameCameraController(this);
    
    // Initialize player settings from localStorage
    this.playerManager.init();
  }

  // =========================================================================
  // LIFECYCLE: PRELOAD
  // =========================================================================

  preload(): void {
    // Preload player assets (may skip if using modular)
    this.playerManager.preload();
    
    // Preload all game assets via centralized preloader
    AssetPreloader.preloadForGame(this, false); // skins already handled above
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
   * Separated from create() because Phaser doesn't await async create.
   */
  protected async initializeScene(): Promise<void> {
    isLoading.set(true);
    
    try {
      // Load player assets (modular character if selected)
      await this.playerManager.loadAssets();
      
      // Load map configuration from file or builder store
      const mapConfig = await this.worldManager.loadConfiguration(this.initData?.useBuilderConfig);
      
      // Setup parallax background
      await this.worldManager.setupBackground();
      
      // Setup physics world bounds
      this.worldManager.setupWorldBounds();

      // Create physics ground
      const { ground, groundHeight } = this.worldManager.createGround('physics');
      const groundY = this.worldManager.getGroundY();

      // Create player entity
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
      this.addUnsubscriber(unsubDialogZones);

      // Setup camera
      this.cameraController.setConfig(mapConfig);
      if (this.player) {
        this.cameraController.followPlayer(this.player.getGameObject());
      }
      this.cameraController.setupBounds();
      
      // Mark as initialized - safe to call update()
      this.isInitialized = true;
    } catch (error) {
      console.error('[GameScene] Failed to initialize scene:', error);
    } finally {
      isLoading.set(false);
    }
  }

  // =========================================================================
  // RESIZE HANDLING
  // =========================================================================

  /**
   * Handle window/canvas resize.
   * Delegates to camera controller.
   */
  protected handleResize(_gameSize: Phaser.Structs.Size): void {
    if (!this.cameraController) return;
    this.cameraController.handleResize();
  }

  // =========================================================================
  // SHUTDOWN
  // =========================================================================

  shutdown(): void {
    // Clear active dialog states
    setActiveDialogZone(null);
    setActiveNPCDialog(null);
    this.currentDialogZone = null;
    this.currentNPCId = null;
    
    // Destroy managers
    this.worldManager?.destroy();
    this.itemManager?.destroy();
    this.socialManager?.destroy();
    
    // Call parent cleanup (subscriptions, resize handler)
    super.shutdown();
  }

  // =========================================================================
  // UPDATE LOOP
  // =========================================================================

  update(): void {
    // Guard: wait for async initialization
    if (!this.isInitialized || !this.player) return;
    
    // Update player
    this.player.update();
    const { x: playerX, y: playerY } = this.player.getPosition();
    
    // Get world height for depth calculation
    const worldHeight = this.worldManager.getConfig()?.worldHeight ?? 640;
    
    // Update depth sorting based on Y position
    updateSpriteDepth(this.player.getGameObject(), worldHeight);
    this.itemManager?.updateAutoDepth(worldHeight);
    this.npcManager?.updateAutoDepth(worldHeight);
    
    // Update player screen position for UI
    const camera = this.cameras.main;
    setPlayerScreenPosition(playerX - camera.scrollX, playerY - camera.scrollY);
    
    // Update camera info for overlay
    this.cameraController.updateCameraInfo();
    
    // Check dialog zone and NPC proximity
    this.checkDialogZonesForPosition(playerX);
    this.checkNPCProximity(playerX, playerY, camera);

    // Update parallax scrolling
    this.worldManager.updateParallax(camera);
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
      const threshold = npc.triggerRadius ?? GameScene.NPC_PROXIMITY_THRESHOLD;
      
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
      
      // Use content height (excludes empty top space) for dialog positioning
      const npcContentHeight = npc.getContentHeight();
      // Adjust screenY to account for topOffset (move reference point down)
      const adjustedScreenY = npcScreenY + npc.topOffset / 2;
      
      if (this.currentNPCId !== nearestNPC.id) {
        // New NPC in proximity
        this.currentNPCId = nearestNPC.id;
        setActiveNPCDialog({
          npcId: nearestNPC.id,
          texts: npc.getDialogData() ?? [],
          screenX: npcScreenX,
          screenY: adjustedScreenY,
          npcHeight: npcContentHeight
        });
      } else {
        // Same NPC, just update position
        setActiveNPCDialog({
          npcId: nearestNPC.id,
          texts: npc.getDialogData() ?? [],
          screenX: npcScreenX,
          screenY: adjustedScreenY,
          npcHeight: npcContentHeight
        });
      }
    } else if (this.currentNPCId) {
      // No NPC in proximity, clear dialog
      this.currentNPCId = null;
      setActiveNPCDialog(null);
    }
  }
}
