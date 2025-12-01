/**
 * ItemDragController - Handles drag & drop interactions for items in builder mode
 * 
 * Uses shared spriteInteraction utility for consistent behavior with frames and player.
 */

import Phaser from 'phaser';
import { updatePlacedItem, selectItem, selectedItemId } from '../stores/builderStores';
import { setupSpriteInteraction } from '../utils/spriteInteraction';
import { DRAG_TINT } from '../constants/colors';
import { get } from 'svelte/store';

export interface ItemDragCallbacks {
  onSelect?: (id: string) => void;
  onDragStart?: (id: string) => void;
  onDrag?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, x: number, yOffset: number) => void;
}

/**
 * ItemDragController - Manages item dragging in builder mode
 */
export class ItemDragController {
  private scene: Phaser.Scene;
  private groundY: number;
  private worldWidth: number;
  private worldHeight: number;
  private isDragging: boolean = false;
  private callbacks: ItemDragCallbacks;
  private cleanupFunctions: Map<string, () => void> = new Map();

  constructor(
    scene: Phaser.Scene, 
    groundY: number, 
    worldWidth: number,
    worldHeight: number,
    callbacks: ItemDragCallbacks = {}
  ) {
    this.scene = scene;
    this.groundY = groundY;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.callbacks = callbacks;
  }

  /**
   * Check if currently dragging
   */
  getIsDragging(): boolean {
    return this.isDragging;
  }

  /**
   * Make a sprite interactive and draggable
   */
  makeInteractive(sprite: Phaser.GameObjects.Sprite, id: string): void {
    const cleanup = setupSpriteInteraction({
      sprite,
      scene: this.scene,
      cursor: 'pointer',
      // Constrain to world bounds (allow items to go right to edge)
      constraints: {
        minX: 0,
        maxX: this.worldWidth,
        minY: 0,
        maxY: this.worldHeight,
      },
      callbacks: {
        onSelect: () => {
          selectItem(id);
          this.callbacks.onSelect?.(id);
        },
        isSelected: () => {
          // Check if this item is currently selected
          return get(selectedItemId) === id;
        },
        onDragStart: () => {
          this.isDragging = true;
          sprite.setTint(DRAG_TINT); // Blue drag tint
          this.callbacks.onDragStart?.(id);
        },
        onDrag: (x, y) => {
          this.callbacks.onDrag?.(id, x, y);
        },
        onDragEnd: (x, y) => {
          sprite.clearTint(); // Just clear drag tint
          this.isDragging = false;
          
          const worldX = Math.round(x);
          const worldY = Math.round(y);
          const yOffset = worldY - this.groundY;
          
          updatePlacedItem(id, { x: worldX, yOffset });
          this.callbacks.onDragEnd?.(id, worldX, yOffset);
        }
      }
    });
    
    this.cleanupFunctions.set(id, cleanup);
  }

  /**
   * Remove interactivity from sprite
   */
  removeInteractivity(sprite: Phaser.GameObjects.Sprite): void {
    // Guard against already destroyed sprites
    if (!sprite || !sprite.scene) return;
    
    const id = sprite.getData('itemId') as string;
    if (id && this.cleanupFunctions.has(id)) {
      this.cleanupFunctions.get(id)!();
      this.cleanupFunctions.delete(id);
    }
    
    sprite.removeInteractive();
  }

  /**
   * Cleanup all
   */
  destroy(): void {
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions.clear();
  }
}
