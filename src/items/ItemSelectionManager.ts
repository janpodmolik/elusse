/**
 * ItemSelectionManager - Handles selection visuals and state for items
 */

import Phaser from 'phaser';
import { DEPTH_LAYERS } from '../constants/depthLayers';
import { clearSelection } from '../stores/builderStores';

export interface SelectionStyle {
  lineWidth: number;
  lineColor: number;
  lineAlpha: number;
  handleSize: number;
  handleColor: number;
  padding: number;
}

const DEFAULT_STYLE: SelectionStyle = {
  lineWidth: 3,
  lineColor: 0x4a90e2,
  lineAlpha: 1,
  handleSize: 8,
  handleColor: 0x4a90e2,
  padding: 5,
};

/**
 * ItemSelectionManager - Manages selection visuals for builder mode
 */
export class ItemSelectionManager {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private style: SelectionStyle;
  private selectedId: string | null = null;

  constructor(scene: Phaser.Scene, style: Partial<SelectionStyle> = {}) {
    this.scene = scene;
    this.style = { ...DEFAULT_STYLE, ...style };
    
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(DEPTH_LAYERS.SELECTION_GRAPHICS);
  }

  /**
   * Set selected item ID
   */
  setSelectedId(id: string | null): void {
    this.selectedId = id;
  }

  /**
   * Get current selected ID
   */
  getSelectedId(): string | null {
    return this.selectedId;
  }

  /**
   * Update selection visuals for a sprite
   */
  updateVisuals(sprite: Phaser.GameObjects.Sprite | null): void {
    this.graphics.clear();
    
    if (!sprite || !this.selectedId) return;
    
    const bounds = sprite.getBounds();
    const { lineWidth, lineColor, lineAlpha, handleSize, handleColor, padding } = this.style;
    
    // Draw selection rectangle
    this.graphics.lineStyle(lineWidth, lineColor, lineAlpha);
    this.graphics.strokeRect(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );
    
    // Draw corner handles
    this.graphics.fillStyle(handleColor, 1);
    
    // Top-left
    this.graphics.fillCircle(bounds.x, bounds.y, handleSize);
    // Top-right
    this.graphics.fillCircle(bounds.x + bounds.width, bounds.y, handleSize);
    // Bottom-left
    this.graphics.fillCircle(bounds.x, bounds.y + bounds.height, handleSize);
    // Bottom-right
    this.graphics.fillCircle(bounds.x + bounds.width, bounds.y + bounds.height, handleSize);
  }

  /**
   * Clear selection visuals
   */
  clearVisuals(): void {
    this.graphics.clear();
    this.selectedId = null;
  }

  /**
   * Setup click handler for deselecting when clicking empty space
   */
  setupBackgroundDeselect(isDragging: () => boolean): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (isDragging()) return;
      
      // Check if clicking on any sprite with itemId
      const hitSprite = this.scene.input.hitTestPointer(pointer).find(
        obj => obj.type === 'Sprite' && obj.getData('itemId')
      );
      
      if (!hitSprite) {
        clearSelection();
        this.clearVisuals();
      }
    });
  }

  /**
   * Destroy graphics
   */
  destroy(): void {
    this.graphics?.destroy();
  }
}
