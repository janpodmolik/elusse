import Phaser from 'phaser';
import type { PlacedItem } from '../data/mapConfig';
import { selectItem } from '../stores/builderStores';
import { ItemRenderer, ItemDragController, ItemSelectionManager } from '../items';

/**
 * PlacedItemManager - Universal manager for placed items
 * 
 * Uses composition with:
 * - ItemRenderer for sprite creation
 * - ItemDragController for drag & drop (builder mode)
 * - ItemSelectionManager for selection visuals (builder mode)
 */
export class PlacedItemManager {
  private scene: Phaser.Scene;
  private items: Map<string, { sprite: Phaser.GameObjects.Sprite; data: PlacedItem }> = new Map();
  private isBuilderMode: boolean = false;
  
  // Composed modules
  private renderer: ItemRenderer;
  private dragController?: ItemDragController;
  private selectionManager?: ItemSelectionManager;

  /**
   * @param scene - Phaser scene instance
   * @param groundY - Y coordinate of ground level
   * @param builderMode - Enable interactive builder features (drag, select, delete)
   */
  constructor(scene: Phaser.Scene, groundY: number, builderMode: boolean = false) {
    this.scene = scene;
    this.isBuilderMode = builderMode;
    
    // Initialize renderer (always needed)
    this.renderer = new ItemRenderer(scene, groundY);
    
    // Initialize builder-specific modules
    if (this.isBuilderMode) {
      this.dragController = new ItemDragController(scene, groundY, {
        onDrag: () => this.updateSelectionVisuals(),
      });
      this.selectionManager = new ItemSelectionManager(scene);
    }
  }

  /**
   * Preload all UI assets
   * Call this in scene's preload() method
   */
  static preloadAssets(scene: Phaser.Scene): void {
    ItemRenderer.preloadAssets(scene);
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
    const sprite = this.renderer.createSprite(itemData);
    
    // Store item reference
    this.items.set(itemData.id, { sprite, data: itemData });
    
    // Add builder interactivity if in builder mode
    if (this.isBuilderMode && this.dragController) {
      this.dragController.makeInteractive(sprite, itemData.id);
      
      // Override pointerdown for selection sync
      sprite.on('pointerdown', () => {
        if (!this.dragController?.getIsDragging()) {
          selectItem(itemData.id);
          this.updateSelectionVisuals();
        }
      });
    }
  }

  /**
   * Update selection visual indicators
   */
  updateSelectionVisuals(): void {
    if (!this.selectionManager) return;
    
    // Get selected item ID from scene data
    const selectedId = this.scene.data.get('selectedItemId') as string | null;
    this.selectionManager.setSelectedId(selectedId);
    
    if (!selectedId) {
      this.selectionManager.clearVisuals();
      return;
    }
    
    const item = this.items.get(selectedId);
    this.selectionManager.updateVisuals(item?.sprite ?? null);
  }

  /**
   * Update existing item with new data
   */
  updateItem(id: string, updates: Partial<PlacedItem>): void {
    const item = this.items.get(id);
    if (!item) return;
    
    // Apply visual updates via renderer
    this.renderer.applyUpdates(item.sprite, updates);
    
    // Update stored data
    item.data = { ...item.data, ...updates };
  }

  /**
   * Remove item by ID
   */
  removeItem(id: string): void {
    const item = this.items.get(id);
    if (item) {
      if (this.dragController) {
        this.dragController.removeInteractivity(item.sprite);
      }
      item.sprite.destroy();
      this.items.delete(id);
    }
  }

  /**
   * Remove all items
   */
  removeAllItems(): void {
    this.items.forEach(item => {
      // Guard against already destroyed sprites
      if (!item.sprite || !item.sprite.scene) return;
      
      if (this.dragController) {
        this.dragController.removeInteractivity(item.sprite);
      }
      item.sprite.destroy();
    });
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
   * Enable or disable all item interactions
   * Used to disable items when in dialogs edit mode
   */
  setInteractiveEnabled(enabled: boolean): void {
    if (!this.isBuilderMode || !this.dragController) return;
    
    this.items.forEach(({ sprite, data }) => {
      if (enabled) {
        // Re-enable interaction and restore opacity
        this.dragController!.makeInteractive(sprite, data.id);
        sprite.setAlpha(1);
        
        // Re-add pointerdown for selection sync
        sprite.on('pointerdown', () => {
          if (!this.dragController?.getIsDragging()) {
            selectItem(data.id);
            this.updateSelectionVisuals();
          }
        });
      } else {
        // Disable interaction and make semi-transparent
        sprite.disableInteractive();
        sprite.off('pointerdown');
        sprite.setAlpha(0.6);
      }
    });
    
    // Clear selection visuals when disabling
    if (!enabled && this.selectionManager) {
      this.selectionManager.clearVisuals();
    }
  }

  /**
   * Destroy manager and cleanup
   */
  destroy(): void {
    this.removeAllItems();
    this.selectionManager?.destroy();
  }

  /**
   * Setup click handler for deselecting when clicking empty space
   */
  setupBackgroundDeselect(): void {
    if (!this.isBuilderMode || !this.selectionManager) return;
    
    this.selectionManager.setupBackgroundDeselect(
      () => this.dragController?.getIsDragging() ?? false
    );
  }
}
