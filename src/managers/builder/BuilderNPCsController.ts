import Phaser from 'phaser';
import { PlacedNPCManager } from '../../managers/PlacedNPCManager';
import { selectedItemId, builderConfig, builderEditMode, clearSelection } from '../../stores/builderStores';
import { addPlacedNPC, updatePlacedNPC, deletePlacedNPC } from '../../stores/builder/npcStores';
import type { PlacedNPC } from '../../data/mapConfig';
import { EventBus, EVENTS } from '../../events/EventBus';
import { getNPCDefinition, NPC_REGISTRY } from '../../data/npcs/npcRegistry';

export class BuilderNPCsController {
  private scene: Phaser.Scene;
  private groundY: number;
  public npcManager!: PlacedNPCManager;
  private unsubscribers: Array<() => void> = [];

  constructor(scene: Phaser.Scene, groundY: number) {
    this.scene = scene;
    this.groundY = groundY;
  }

  static preloadAssets(scene: Phaser.Scene): void {
    PlacedNPCManager.preloadAssets(scene);
  }

  create(existingNPCs: PlacedNPC[]): PlacedNPCManager {
    this.npcManager = new PlacedNPCManager(
      this.scene, 
      this.groundY, 
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
    // Subscribe to selection changes
    // We might need to update visuals if we add selection box to NPCs
    
    // Subscribe to edit mode changes
    const editModeUnsubscribe = builderEditMode.subscribe(mode => {
      // Enable/disable interactivity based on mode
      // For now, we assume NPCs are always interactive in 'npcs' mode
      // But we might want to disable them in other modes
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
      
      // Check for updated NPCs
      currentNPCs.forEach(newNPCData => {
        const oldNPCData = previousNPCs.find(npc => npc.id === newNPCData.id);
        if (oldNPCData && JSON.stringify(oldNPCData) !== JSON.stringify(newNPCData)) {
          this.npcManager.updateNPC(newNPCData.id, newNPCData);
        }
      });
      
      // Check for new NPCs
      currentNPCs.forEach(newNPCData => {
        const exists = previousNPCs.find(npc => npc.id === newNPCData.id);
        if (!exists) {
          this.npcManager.createNPC(newNPCData);
        }
      });
      
      previousNPCs = JSON.parse(JSON.stringify(currentNPCs));
    });
    this.unsubscribers.push(configUnsubscribe);
  }

  private setupAssetDropListener(): void {
    EventBus.on(EVENTS.NPC_DROPPED, (data: { assetKey: string, canvasX: number, canvasY: number }) => {
      const { assetKey, canvasX, canvasY } = data;
      
      // Convert canvas coordinates to world coordinates
      const worldPoint = this.scene.cameras.main.getWorldPoint(canvasX, canvasY);
      
      // Create new NPC data
      const definition = getNPCDefinition(assetKey);
      if (!definition) return;

      const newNPC: PlacedNPC = {
        id: `npc_${Date.now()}`,
        npcId: assetKey,
        x: Math.round(worldPoint.x),
        y: Math.round(worldPoint.y), // Or snap to ground
        scale: definition.scale,
        flipX: false
      };
      
      addPlacedNPC(newNPC);
    });
  }

  private setupDeleteKeys(): void {
    this.scene.input.keyboard?.on('keydown-DELETE', () => this.handleDelete());
    this.scene.input.keyboard?.on('keydown-BACKSPACE', () => this.handleDelete());
  }

  private handleDelete(): void {
    // Check if we have a selected NPC
    // We need to know if the selected item is an NPC
    // We can check store or ask manager
    // For now, let's assume if we are in 'npcs' mode and have selection, it's an NPC
    // But we need access to current mode and selection
    // We can subscribe to them or get current value
    // Let's use the store subscription approach or just check store value if available
    // Since we are inside a class, we can't easily get store value without subscription or get()
    // But we can use the imported stores with get() if we import 'get' from svelte/store
    // Or just rely on the fact that deletePlacedNPC checks if ID exists
    
    // Actually, we should check if the selected ID corresponds to an NPC
    // We can do this by checking if npcManager has this ID
    // But we don't have access to the selected ID here directly unless we store it
    // Let's subscribe to selectedItemId and store it locally
  }

  destroy(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.scene.input.keyboard?.off('keydown-DELETE');
    this.scene.input.keyboard?.off('keydown-BACKSPACE');
  }
  
  getManager(): PlacedNPCManager {
    return this.npcManager;
  }
}
