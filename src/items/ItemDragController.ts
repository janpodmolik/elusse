/**
 * ItemDragController - Handles drag & drop interactions for items in builder mode
 */

import Phaser from 'phaser';
import { updatePlacedItem, selectItem, gridSnappingEnabled } from '../stores/builderStores';
import { GRID_SIZE } from '../scenes/builder/builderConstants';
import { get } from 'svelte/store';

export interface ItemDragCallbacks {
  onDragStart?: (id: string) => void;
  onDrag?: (id: string, x: number, y: number) => void;
  onDragEnd?: (id: string, x: number, yOffset: number) => void;
}

/**
 * Snap coordinate to grid
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * ItemDragController - Manages item dragging in builder mode
 */
export class ItemDragController {
  private scene: Phaser.Scene;
  private groundY: number;
  private isDragging: boolean = false;
  private callbacks: ItemDragCallbacks;

  constructor(scene: Phaser.Scene, groundY: number, callbacks: ItemDragCallbacks = {}) {
    this.scene = scene;
    this.groundY = groundY;
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
    sprite.setInteractive({ cursor: 'pointer' });
    this.scene.input.setDraggable(sprite);

    // Click to select
    sprite.on('pointerdown', () => {
      if (!this.isDragging) {
        selectItem(id);
      }
    });

    // Drag handlers
    sprite.on('dragstart', () => {
      this.isDragging = false; // Will be set to true on actual drag
      sprite.setTint(0x4a90e2);
      
      // Notify scene that we're dragging an item
      this.scene.data?.set('isDraggingItem', true);
      
      this.callbacks.onDragStart?.(id);
    });

    sprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.isDragging = true;
      
      // Apply grid snapping if enabled
      const isSnapEnabled = get(gridSnappingEnabled);
      const finalX = isSnapEnabled ? snapToGrid(dragX, GRID_SIZE) : dragX;
      const finalY = isSnapEnabled ? snapToGrid(dragY, GRID_SIZE) : dragY;
      
      sprite.setPosition(finalX, finalY);
      
      this.callbacks.onDrag?.(id, finalX, finalY);
    });

    sprite.on('dragend', () => {
      sprite.clearTint();
      
      // Notify scene that dragging ended
      this.scene.data?.set('isDraggingItem', false);
      
      // Update store with new position
      const worldX = Math.round(sprite.x);
      const worldY = Math.round(sprite.y);
      const yOffset = worldY - this.groundY;
      
      updatePlacedItem(id, { x: worldX, yOffset });
      
      this.callbacks.onDragEnd?.(id, worldX, yOffset);
      
      // Reset dragging flag after a short delay
      this.scene.time.delayedCall(50, () => {
        this.isDragging = false;
      });
    });
  }

  /**
   * Remove interactivity from sprite
   */
  removeInteractivity(sprite: Phaser.GameObjects.Sprite): void {
    // Guard against already destroyed sprites
    if (!sprite || !sprite.scene) return;
    
    sprite.removeInteractive();
    sprite.off('pointerdown');
    sprite.off('dragstart');
    sprite.off('drag');
    sprite.off('dragend');
  }
}
