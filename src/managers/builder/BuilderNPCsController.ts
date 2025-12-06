import Phaser from 'phaser';
import { PlacedNPCManager } from '../../managers/PlacedNPCManager';
import { builderConfig, builderEditMode, clearSelection, selectedItemId, selectItem } from '../../stores/builderStores';
import { addPlacedNPC, deletePlacedNPC } from '../../stores/builder/npcStores';
import { isNPCPaletteOpen } from '../../stores/uiStores';
import type { PlacedNPC } from '../../data/mapConfig';
import { EventBus, EVENTS } from '../../events/EventBus';
import { getNPCDefinition } from '../../data/npcs/npcRegistry';

export class BuilderNPCsController {
  private scene: Phaser.Scene;
  private groundY: number;
  private worldWidth: number;
  private worldHeight: number;
  public npcManager!: PlacedNPCManager;
  private unsubscribers: Array<() => void> = [];
  private currentSelectedId: string | null = null;

  constructor(scene: Phaser.Scene, groundY: number, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.groundY = groundY;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  static preloadAssets(scene: Phaser.Scene): void {
    PlacedNPCManager.preloadAssets(scene);
  }

  create(existingNPCs: PlacedNPC[]): PlacedNPCManager {
    this.npcManager = new PlacedNPCManager(
      this.scene, 
      this.groundY,
      this.worldWidth,
      this.worldHeight,
      true
    );
    
    if (existingNPCs && existingNPCs.length > 0) {
      this.npcManager.createNPCs(existingNPCs);
    }
    
    this.setupStoreSubscriptions();
    this.setupAssetDropListener();
    this.setupDeleteKeys();

    return this.npcManager;
  }

  private setupStoreSubscriptions(): void {
    // Subscribe to selection changes to track current selection
    const selectionUnsubscribe = selectedItemId.subscribe(id => {
      this.currentSelectedId = id;
    });
    this.unsubscribers.push(selectionUnsubscribe);
    
    // Subscribe to edit mode changes
    // Only disable NPCs when in dialogs mode (consistent with items and frames)
    const editModeUnsubscribe = builderEditMode.subscribe(mode => {
      if (mode === 'dialogs') {
        // Clear selection and disable interactions only in dialogs mode
        clearSelection();
        this.npcManager.setInteractiveEnabled(false);
      } else {
        // Re-enable in all other modes
        this.npcManager.setInteractiveEnabled(true);
      }
    });
    this.unsubscribers.push(editModeUnsubscribe);
    
    // Subscribe to config changes for sync
    let previousNPCs: PlacedNPC[] = [];
    const configUnsubscribe = builderConfig.subscribe(config => {
      if (!config?.placedNPCs) return;
      
      const currentNPCs = config.placedNPCs;
      
      // Check for deleted NPCs
      previousNPCs.forEach(oldNPC => {
        const stillExists = currentNPCs.find(npc => npc.id === oldNPC.id);
        if (!stillExists) {
          this.npcManager.removeNPC(oldNPC.id);
        }
      });
      
      // Check for updated NPCs (position, flipX, dialog, scale changes)
      currentNPCs.forEach(newNPCData => {
        const oldNPCData = previousNPCs.find(npc => npc.id === newNPCData.id);
        if (oldNPCData && JSON.stringify(oldNPCData) !== JSON.stringify(newNPCData)) {
          this.npcManager.updateNPC(newNPCData.id, newNPCData);
        }
      });
      
      // Note: New NPCs are created via EVENTS.NPC_DROPPED handler, not here.
      // This subscription only handles updates and deletions.
      
      previousNPCs = JSON.parse(JSON.stringify(currentNPCs));
    });
    this.unsubscribers.push(configUnsubscribe);
  }

  private setupAssetDropListener(): void {
    const subscription = EventBus.on(EVENTS.NPC_DROPPED, (data: { assetKey: string, canvasX: number, canvasY: number }) => {
      const { assetKey, canvasX, canvasY } = data;
      
      // Convert canvas coordinates to world coordinates
      const worldPoint = this.scene.cameras.main.getWorldPoint(canvasX, canvasY);
      
      // Clamp to world bounds immediately
      const worldX = Math.max(0, Math.min(this.worldWidth, worldPoint.x));
      const worldY = Math.max(0, Math.min(this.worldHeight, worldPoint.y));
      
      // Create new NPC data
      const definition = getNPCDefinition(assetKey);
      if (!definition) return;

      const newNPC: PlacedNPC = {
        id: `npc_${Date.now()}`,
        npcId: assetKey,
        x: Math.round(worldX),
        y: Math.round(worldY),
        scale: definition.scale,
        flipX: false
      };
      
      // Add to store AND create sprite (like Items do)
      addPlacedNPC(newNPC);
      this.npcManager.createNPC(newNPC);
      selectItem(newNPC.id);
      // Close NPC palette after adding NPC
      isNPCPaletteOpen.set(false);
    });
    
    // Store subscription for cleanup
    this.unsubscribers.push(() => subscription.unsubscribe());
  }

  private setupDeleteKeys(): void {
    this.scene.input.keyboard?.on('keydown-DELETE', () => this.handleDelete());
    this.scene.input.keyboard?.on('keydown-BACKSPACE', () => this.handleDelete());
  }

  private handleDelete(): void {
    // Check if the selected ID corresponds to an NPC in our manager
    if (this.currentSelectedId) {
      const npc = this.npcManager.getNPC(this.currentSelectedId);
      if (npc) {
        deletePlacedNPC(this.currentSelectedId);
        clearSelection();
      }
    }
  }
  
  /** Call in scene update loop to keep selection visuals in sync */
  update(): void {
    this.npcManager.update();
  }
  
  /** Update NPC depths based on Y position */
  updateAutoDepth(worldHeight: number): void {
    this.npcManager.updateAutoDepth(worldHeight);
  }

  destroy(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.npcManager.destroy();
    this.scene.input.keyboard?.off('keydown-DELETE');
    this.scene.input.keyboard?.off('keydown-BACKSPACE');
  }
  
  getManager(): PlacedNPCManager {
    return this.npcManager;
  }
}
