import Phaser from 'phaser';
import type { PlacedItem } from '../data/mapConfig';
import { updateSelectedItemScreenPosition } from '../stores/builderStores';
import { worldToScreen } from '../utils/inputUtils';
import { ItemRenderer, ItemDragController, ItemSelectionManager } from '../items';
import { calculateDepthFromY, DEPTH_LAYERS } from '../constants/depthLayers';

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
  private items: Map<string, { sprite: Phaser.GameObjects.Sprite; data: PlacedItem; physicsBody?: Phaser.GameObjects.Rectangle }> = new Map();
  private isBuilderMode: boolean = false;
  
  // Physics group for collision detection
  private physicsGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  
  // Composed modules
  private renderer: ItemRenderer;
  private dragController?: ItemDragController;
  private selectionManager?: ItemSelectionManager;

  /**
   * @param scene - Phaser scene instance
   * @param groundY - Y coordinate of ground level
   * @param worldWidth - Width of the world in pixels
   * @param worldHeight - Height of the world in pixels
   * @param builderMode - Enable interactive builder features (drag, select, delete)
   */
  constructor(
    scene: Phaser.Scene, 
    groundY: number, 
    worldWidth: number,
    worldHeight: number,
    builderMode: boolean = false
  ) {
    this.scene = scene;
    this.isBuilderMode = builderMode;
    
    // Initialize renderer (always needed)
    this.renderer = new ItemRenderer(scene, groundY);
    
    // Initialize physics group for item collisions (game mode only)
    if (!builderMode) {
      this.physicsGroup = scene.physics.add.staticGroup();
    }
    
    // Initialize builder-specific modules
    if (this.isBuilderMode) {
      this.dragController = new ItemDragController(scene, groundY, worldWidth, worldHeight, {
        onSelect: () => this.updateSelectionVisuals(),
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
    const itemEntry: { sprite: Phaser.GameObjects.Sprite; data: PlacedItem; physicsBody?: Phaser.GameObjects.Rectangle } = { sprite, data: itemData };
    
    // Create physics body if enabled (game mode only)
    if (!this.isBuilderMode && itemData.physicsEnabled && this.physicsGroup) {
      const physicsBody = this.createPhysicsBody(sprite, itemData);
      itemEntry.physicsBody = physicsBody;
    }
    
    this.items.set(itemData.id, itemEntry);
    
    // Add builder interactivity if in builder mode
    // Selection is handled by ItemDragController via setupSpriteInteraction
    if (this.isBuilderMode && this.dragController) {
      this.dragController.makeInteractive(sprite, itemData.id);
    }
  }
  
  /**
   * Create physics body for an item based on sprite bounds
   */
  private createPhysicsBody(sprite: Phaser.GameObjects.Sprite, itemData: PlacedItem): Phaser.GameObjects.Rectangle {
    // Get sprite bounds
    const bounds = sprite.getBounds();
    
    // Create invisible rectangle for physics collision
    // Make it slightly smaller than visual for better feel
    const bodyWidth = bounds.width * 0.5;
    const bodyHeight = bounds.height * 0.8;
    const bodyX = sprite.x;
    const bodyY = sprite.y
    
    const physicsBody = this.scene.add.rectangle(bodyX, bodyY, bodyWidth, bodyHeight);
    physicsBody.setVisible(false);
    
    // Add to physics group
    this.physicsGroup!.add(physicsBody);
    
    // Store reference to item
    physicsBody.setData('itemId', itemData.id);
    
    return physicsBody;
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
      updateSelectedItemScreenPosition(null);
      return;
    }
    
    const item = this.items.get(selectedId);
    this.selectionManager.updateVisuals(item?.sprite ?? null);
    
    // Update screen position for UI overlay
    if (item?.sprite) {
      const camera = this.scene.cameras.main;
      const bounds = item.sprite.getBounds();
      // Use worldToScreen for correct FIT mode support
      const { screenX, screenY } = worldToScreen(bounds.centerX, bounds.centerY, camera);
      const itemHeight = bounds.height * camera.zoom;
      updateSelectedItemScreenPosition({ screenX, screenY, itemHeight });
    } else {
      updateSelectedItemScreenPosition(null);
    }
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
      // Destroy physics body if exists
      if (item.physicsBody) {
        item.physicsBody.destroy();
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
      // Destroy physics body if exists
      if (item.physicsBody) {
        item.physicsBody.destroy();
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
   * Get physics group for collision setup
   * Only available in game mode (non-builder)
   */
  getPhysicsGroup(): Phaser.Physics.Arcade.StaticGroup | null {
    return this.physicsGroup;
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
        // Selection is handled by ItemDragController via setupSpriteInteraction
        this.dragController!.makeInteractive(sprite, data.id);
        sprite.setAlpha(1);
      } else {
        // Disable interaction and make semi-transparent
        sprite.disableInteractive();
        sprite.setAlpha(0.6);
      }
    });
    
    // Clear selection visuals when disabling
    if (!enabled && this.selectionManager) {
      this.selectionManager.clearVisuals();
    }
  }

  /**
   * Update item depths based on Y position
   * All objects are sorted by bottomY - lower on screen = higher depth
   * @param worldHeight - The total world height for depth calculation
   */
  updateAutoDepth(worldHeight: number): void {
    this.items.forEach(({ sprite, data }) => {
      // Skip physics-enabled items - they should stay at a low depth
      if (data.physicsEnabled) {
        sprite.setDepth(DEPTH_LAYERS.DYNAMIC_BASE);
        return;
      }
      
      // Calculate item's bottom Y position
      const bounds = sprite.getBounds();
      const itemBottomY = bounds.bottom;
      
      // Calculate depth from Y position
      const newDepth = calculateDepthFromY(itemBottomY, worldHeight);
      sprite.setDepth(newDepth);
    });
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
