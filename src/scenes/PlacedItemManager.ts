import Phaser from 'phaser';
import type { PlacedItem } from '../data/mapConfig';
import { updatePlacedItem, selectItem, clearSelection } from '../stores/builderStores';

/**
 * PlacedItemManager - Universal manager for placed items
 * Handles item creation, rendering, and interaction in both builder and game modes
 */
export class PlacedItemManager {
  private scene: Phaser.Scene;
  private groundY: number;
  private items: Map<string, { sprite: Phaser.GameObjects.Sprite; data: PlacedItem }> = new Map();
  private isBuilderMode: boolean = false;
  
  // Builder-specific state
  private selectionGraphics?: Phaser.GameObjects.Graphics;
  private isDragging: boolean = false;

  /**
   * @param scene - Phaser scene instance
   * @param groundY - Y coordinate of ground level
   * @param builderMode - Enable interactive builder features (drag, select, delete)
   */
  constructor(scene: Phaser.Scene, groundY: number, builderMode: boolean = false) {
    this.scene = scene;
    this.groundY = groundY;
    this.isBuilderMode = builderMode;
    
    if (this.isBuilderMode) {
      this.selectionGraphics = this.scene.add.graphics();
      this.selectionGraphics.setDepth(999);
    }
  }

  /**
   * Preload all UI assets
   * Call this in scene's preload() method
   */
  static preloadAssets(scene: Phaser.Scene): void {
    const uiAssets = ['tent', 'lamp', 'sign_left', 'sign_right', 'stone_0', 'stone_1', 'stone_2'];
    
    uiAssets.forEach(asset => {
      scene.load.image(asset, `assets/ui/${asset}.png`);
    });
  }

  /**
   * Create items from data
   */
  createItems(items: PlacedItem[]): void {
    items.forEach(itemData => {
      this.createItem(itemData);
    });
  }

  /**
   * Create a single item
   */
  createItem(itemData: PlacedItem): void {
    const { id, assetKey, x, scale = 1, depth = 5, yOffset = 0 } = itemData;
    
    // Calculate final Y position (ground + offset)
    const finalY = this.groundY + yOffset;
    
    // Create sprite
    const sprite = this.scene.add.sprite(x, finalY, assetKey);
    sprite.setScale(scale);
    sprite.setDepth(depth);
    sprite.setData('itemId', id);
    
    // Store item reference
    this.items.set(id, { sprite, data: itemData });
    
    // Add builder interactivity if in builder mode
    if (this.isBuilderMode) {
      this.makeInteractive(sprite, id);
    }
  }

  /**
   * Make sprite interactive for builder mode
   */
  private makeInteractive(sprite: Phaser.GameObjects.Sprite, id: string): void {
    sprite.setInteractive({ cursor: 'pointer' });
    
    // Enable dragging via scene input
    this.scene.input.setDraggable(sprite);
    
    // Click to select
    sprite.on('pointerdown', () => {
      if (!this.isDragging) {
        selectItem(id);
        this.updateSelectionVisuals();
      }
    });
    
    // Drag handlers
    sprite.on('dragstart', () => {
      this.isDragging = false;
      sprite.setTint(0x00ff00);
    });
    
    sprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      this.isDragging = true;
      sprite.setPosition(dragX, dragY);
      this.updateSelectionVisuals();
    });
    
    sprite.on('dragend', () => {
      sprite.clearTint();
      
      // Update store with new position
      const worldX = Math.round(sprite.x);
      const worldY = Math.round(sprite.y);
      const yOffset = worldY - this.groundY;
      
      updatePlacedItem(id, { x: worldX, yOffset });
      
      // Reset dragging flag after a short delay
      this.scene.time.delayedCall(50, () => {
        this.isDragging = false;
      });
    });
  }

  /**
   * Update selection visual indicators
   */
  updateSelectionVisuals(): void {
    if (!this.selectionGraphics) return;
    
    this.selectionGraphics.clear();
    
    // Get selected item ID from scene data
    const selectedId = this.scene.data.get('selectedItemId');
    if (!selectedId) return;
    
    const item = this.items.get(selectedId);
    if (!item) return;
    
    const sprite = item.sprite;
    const bounds = sprite.getBounds();
    
    // Draw selection rectangle
    this.selectionGraphics.lineStyle(3, 0x00ff00, 1);
    this.selectionGraphics.strokeRect(
      bounds.x - 5,
      bounds.y - 5,
      bounds.width + 10,
      bounds.height + 10
    );
    
    // Draw corner handles
    const handleSize = 8;
    this.selectionGraphics.fillStyle(0x00ff00, 1);
    this.selectionGraphics.fillCircle(bounds.x, bounds.y, handleSize);
    this.selectionGraphics.fillCircle(bounds.x + bounds.width, bounds.y, handleSize);
    this.selectionGraphics.fillCircle(bounds.x, bounds.y + bounds.height, handleSize);
    this.selectionGraphics.fillCircle(bounds.x + bounds.width, bounds.y + bounds.height, handleSize);
  }

  /**
   * Update existing item with new data
   */
  updateItem(id: string, updates: Partial<PlacedItem>): void {
    const item = this.items.get(id);
    if (!item) return;
    
    // Update sprite properties
    if (updates.x !== undefined) {
      item.sprite.x = updates.x;
    }
    if (updates.yOffset !== undefined) {
      item.sprite.y = this.groundY + updates.yOffset;
    }
    if (updates.scale !== undefined) {
      item.sprite.setScale(updates.scale);
    }
    if (updates.depth !== undefined) {
      item.sprite.setDepth(updates.depth);
    }
    
    // Update stored data
    item.data = { ...item.data, ...updates };
  }

  /**
   * Remove item by ID
   */
  removeItem(id: string): void {
    const item = this.items.get(id);
    if (item) {
      item.sprite.destroy();
      this.items.delete(id);
    }
  }

  /**
   * Remove all items
   */
  removeAllItems(): void {
    this.items.forEach(item => item.sprite.destroy());
    this.items.clear();
  }

  /**
   * Get item data by ID
   */
  getItem(id: string): PlacedItem | undefined {
    return this.items.get(id)?.data;
  }

  /**
   * Get all items
   */
  getAllItems(): PlacedItem[] {
    return Array.from(this.items.values()).map(item => item.data);
  }

  /**
   * Destroy manager and cleanup
   */
  destroy(): void {
    this.removeAllItems();
    this.selectionGraphics?.destroy();
  }

  /**
   * Setup click handler for deselecting when clicking empty space
   */
  setupBackgroundDeselect(): void {
    if (!this.isBuilderMode) return;
    
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only deselect if clicking on empty space (not on any sprite)
      if (!this.isDragging) {
        const hitSprite = this.scene.input.hitTestPointer(pointer).find(
          obj => obj.type === 'Sprite' && obj.getData('itemId')
        );
        
        if (!hitSprite) {
          clearSelection();
          this.updateSelectionVisuals();
        }
      }
    });
  }
}
