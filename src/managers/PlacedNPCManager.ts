import Phaser from 'phaser';
import type { PlacedNPC } from '../data/mapConfig';
import { NPC } from '../entities/NPC';
import { EventBus, EVENTS } from '../events/EventBus';
import { selectItem, updatePlacedNPC, updateSelectedNPCScreenPosition, selectedItemId } from '../stores/builderStores';
import { openNPCConfigPanel } from '../stores/uiStores';
import { setupSpriteInteraction, DoubleClickDetector } from '../utils/spriteInteraction';
import { worldToScreen } from '../utils/inputUtils';
import { get } from 'svelte/store';
import { calculateDepthFromY } from '../constants/depthLayers';

import { NPC_REGISTRY } from '../data/npcs/npcRegistry';

export class PlacedNPCManager {
  private scene: Phaser.Scene;
  private npcs: Map<string, NPC> = new Map();
  private isBuilderMode: boolean;
  // @ts-expect-error Reserved for future ground snapping
  private groundY: number;
  private worldWidth: number;
  private worldHeight: number;
  private selectedNPCId: string | null = null;
  private unsubscribers: Array<() => void> = [];
  private cleanupFunctions: Map<string, () => void> = new Map();
  private doubleClickDetector = new DoubleClickDetector();

  constructor(scene: Phaser.Scene, groundY: number, worldWidth: number, worldHeight: number, builderMode: boolean = false) {
    this.scene = scene;
    this.groundY = groundY;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.isBuilderMode = builderMode;
    
    if (builderMode) {
      // Subscribe to selection changes
      const unsub = selectedItemId.subscribe(id => {
        this.handleSelectionChange(id);
      });
      this.unsubscribers.push(unsub);
    }
  }

  static preloadAssets(scene: Phaser.Scene) {
    NPC_REGISTRY.forEach(npc => {
      scene.load.spritesheet(npc.id, npc.path, {
        frameWidth: npc.frameWidth,
        frameHeight: npc.frameHeight
      });
    });
  }

  createNPCs(npcs: PlacedNPC[]) {
    npcs.forEach(npc => this.createNPC(npc));
  }

  createNPC(data: PlacedNPC) {
    const npc = new NPC(this.scene, data, this.isBuilderMode);
    this.npcs.set(data.id, npc);

    if (this.isBuilderMode) {
      this.makeInteractive(npc);
    }
  }

  private makeInteractive(npc: NPC) {
    // Store NPC ID on the sprite for selection manager
    npc.setData('npcId', npc.id);
    
    // Use unified sprite interaction (same as items, frames, etc.)
    const cleanup = setupSpriteInteraction({
      sprite: npc,
      scene: this.scene,
      cursor: 'pointer',
      constraints: {
        minX: 0,
        maxX: this.worldWidth,
        minY: 0,
        maxY: this.worldHeight,
      },
      callbacks: {
        onSelect: () => {
          selectItem(npc.id);
          EventBus.emit(EVENTS.NPC_SELECTED, npc.id);
        },
        isSelected: () => {
          return get(selectedItemId) === npc.id;
        },
        onDoubleClick: () => {
          if (this.doubleClickDetector.check(npc.id)) {
            openNPCConfigPanel();
            return true; // Prevent drag start
          }
          return false;
        },
        onDragStart: () => {
          // Optional: add drag tint
        },
        onDrag: (_x, _y) => {
          npc.updateSelectionIndicator();
        },
        onDragEnd: (x, y) => {
          updatePlacedNPC(npc.id, {
            x: Math.round(x),
            y: Math.round(y)
          });
        }
      }
    });
    
    this.cleanupFunctions.set(npc.id, cleanup);
  }

  removeNPC(id: string) {
    const npc = this.npcs.get(id);
    if (npc) {
      // Clean up interaction
      const cleanup = this.cleanupFunctions.get(id);
      if (cleanup) {
        cleanup();
        this.cleanupFunctions.delete(id);
      }
      npc.destroy();
      this.npcs.delete(id);
    }
  }

  updateNPC(id: string, data: Partial<PlacedNPC>) {
    const npc = this.npcs.get(id);
    if (npc) {
      if (data.x !== undefined) npc.x = data.x;
      if (data.y !== undefined) npc.y = data.y;
      if (data.flipX !== undefined) npc.setFlipped(data.flipX);
      if (data.dialog !== undefined) npc.updateDialog(data.dialog);
      if (data.scale !== undefined) npc.setScale(data.scale);
      if (data.triggerRadius !== undefined) npc.setTriggerRadius(data.triggerRadius);
    }
  }

  getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }
  
  getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }
  
  private handleSelectionChange(id: string | null) {
    // Deselect previous NPC
    if (this.selectedNPCId && this.selectedNPCId !== id) {
      const prevNPC = this.npcs.get(this.selectedNPCId);
      if (prevNPC) {
        prevNPC.setSelected(false);
      }
    }
    
    // Check if the new selection is an NPC
    const npc = id ? this.npcs.get(id) : null;
    if (npc) {
      npc.setSelected(true);
      this.selectedNPCId = id;
      this.updateNPCScreenPosition(npc);
    } else {
      this.selectedNPCId = null;
      updateSelectedNPCScreenPosition(null);
    }
  }
  
  private updateNPCScreenPosition(npc: NPC) {
    const camera = this.scene.cameras.main;
    const { screenX, screenY } = worldToScreen(npc.x, npc.y, camera);
    const npcHeight = npc.displayHeight * camera.zoom;
    
    updateSelectedNPCScreenPosition({ screenX, screenY, npcHeight });
  }
  
  /** Call this in scene update loop to keep selection indicator and screen position in sync */
  update() {
    if (this.selectedNPCId) {
      const npc = this.npcs.get(this.selectedNPCId);
      if (npc) {
        npc.updateSelectionIndicator();
        this.updateNPCScreenPosition(npc);
      }
    }
  }
  
  /**
   * Enable or disable all NPC interactions
   * Used to disable NPCs when in other edit modes
   */
  setInteractiveEnabled(enabled: boolean): void {
    if (!this.isBuilderMode) return;
    
    this.npcs.forEach((npc) => {
      if (enabled) {
        // Re-enable interaction and restore opacity
        npc.setInteractive({ cursor: 'pointer' });
        npc.setAlpha(1);
      } else {
        // Disable interaction and make semi-transparent
        npc.disableInteractive();
        npc.setAlpha(0.6);
      }
    });
    
    // Clear selection visual when disabling
    if (!enabled && this.selectedNPCId) {
      const npc = this.npcs.get(this.selectedNPCId);
      if (npc) npc.setSelected(false);
      this.selectedNPCId = null;
      updateSelectedNPCScreenPosition(null);
    }
  }

  /**
   * Update NPC depths based on Y position
   * All objects are sorted by bottomY - lower on screen = higher depth
   * @param worldHeight - The total world height for depth calculation
   */
  updateAutoDepth(worldHeight: number): void {
    this.npcs.forEach((npc) => {
      // Calculate NPC's bottom Y position
      const npcBottomY = npc.y + npc.displayHeight / 2;
      
      // Calculate depth from Y position
      const newDepth = calculateDepthFromY(npcBottomY, worldHeight);
      npc.setDepth(newDepth);
    });
  }
  
  destroy() {
    // Clean up interaction handlers
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions.clear();
    
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    
    this.npcs.forEach(npc => npc.destroy());
    this.npcs.clear();
    
    updateSelectedNPCScreenPosition(null);
  }
}
