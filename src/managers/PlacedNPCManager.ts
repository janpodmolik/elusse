import Phaser from 'phaser';
import type { PlacedNPC } from '../data/mapConfig';
import { NPC } from '../entities/NPC';
import { EventBus, EVENTS } from '../events/EventBus';
import { selectedItemId, selectItem, clearSelection, updatePlacedNPC, deletePlacedNPC } from '../stores/builderStores';

import { NPC_REGISTRY } from '../data/npcs/npcRegistry';

export class PlacedNPCManager {
  private scene: Phaser.Scene;
  private npcs: Map<string, NPC> = new Map();
  private isBuilderMode: boolean;
  private groundY: number;

  constructor(scene: Phaser.Scene, groundY: number, builderMode: boolean = false) {
    this.scene = scene;
    this.groundY = groundY;
    this.isBuilderMode = builderMode;
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
    const npc = new NPC(this.scene, data);
    this.npcs.set(data.id, npc);

    if (this.isBuilderMode) {
      this.makeInteractive(npc);
    }
  }

  private makeInteractive(npc: NPC) {
    npc.setInteractive({ draggable: true, cursor: 'pointer' });
    
    this.scene.input.setDraggable(npc);

    npc.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isBuilderMode) {
        selectItem(npc.id); // We reuse selectedItemId store for simplicity, or create selectedNPCId
        EventBus.emit(EVENTS.NPC_SELECTED, npc.id);
        pointer.event.stopPropagation();
      }
    });

    npc.on('dragstart', () => {
      if (this.isBuilderMode) {
        selectItem(npc.id);
        EventBus.emit(EVENTS.NPC_SELECTED, npc.id);
      }
    });

    npc.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.isBuilderMode) {
        npc.x = dragX;
        npc.y = dragY;
        // Snap to ground? Or free movement?
        // Usually NPCs are on the ground.
        // Let's constrain Y to ground for now, or allow free movement if needed.
        // For now, free movement but maybe snap to ground line visually?
        // Actually, let's keep it free for now, user can place them anywhere.
      }
    });

    npc.on('dragend', () => {
      if (this.isBuilderMode) {
        // Update store
        updatePlacedNPC(npc.id, {
          x: Math.round(npc.x),
          y: Math.round(npc.y)
        });
      }
    });
  }

  removeNPC(id: string) {
    const npc = this.npcs.get(id);
    if (npc) {
      npc.destroy();
      this.npcs.delete(id);
    }
  }

  updateNPC(id: string, data: Partial<PlacedNPC>) {
    const npc = this.npcs.get(id);
    if (npc) {
      if (data.x !== undefined) npc.x = data.x;
      if (data.y !== undefined) npc.y = data.y;
      if (data.flipX !== undefined) npc.setFlip(data.flipX);
      if (data.dialog !== undefined) npc.updateDialog(data.dialog);
      if (data.scale !== undefined) npc.setScale(data.scale);
    }
  }

  getNPC(id: string): NPC | undefined {
    return this.npcs.get(id);
  }
  
  getAllNPCs(): NPC[] {
    return Array.from(this.npcs.values());
  }
}
