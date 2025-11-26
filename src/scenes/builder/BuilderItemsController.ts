import Phaser from 'phaser';
import { PlacedItemManager } from '../PlacedItemManager';
import { selectedItemId, deletePlacedItem, addPlacedItem, selectItem, itemDepthLayer, builderConfig } from '../../stores/builderStores';
import type { PlacedItem } from '../../data/mapConfig';
import { PlacedItemFactory } from '../../data/mapConfig';
import { EventBus, EVENTS, type AssetDroppedEvent } from '../../events/EventBus';

/**
 * BuilderItemsController - Manages placed items and their interactions
 */
export class BuilderItemsController {
  private scene: Phaser.Scene;
  private groundY: number;
  public itemManager!: PlacedItemManager;
  private unsubscribers: Array<() => void> = [];

  constructor(scene: Phaser.Scene, groundY: number) {
    this.scene = scene;
    this.groundY = groundY;
  }

  /**
   * Create and setup placed items manager
   */
  create(existingItems: PlacedItem[]): PlacedItemManager {
    this.itemManager = new PlacedItemManager(this.scene, this.groundY, true);
    
    // Load existing items
    if (existingItems && existingItems.length > 0) {
      this.itemManager.createItems(existingItems);
    }
    
    this.setupBackgroundDeselect();
    this.setupStoreSubscriptions();
    this.setupAssetDropListener();
    this.setupDeleteKeys();

    return this.itemManager;
  }

  private setupBackgroundDeselect(): void {
    this.itemManager.setupBackgroundDeselect();
  }

  private setupStoreSubscriptions(): void {
    // Subscribe to selection changes
    const selectedUnsubscribe = selectedItemId.subscribe(id => {
      this.scene.data.set('selectedItemId', id);
      this.itemManager.updateSelectionVisuals();
    });
    this.unsubscribers.push(selectedUnsubscribe);
    
    // Subscribe to config changes for sync
    let previousItems: PlacedItem[] = [];
    const configUnsubscribe = builderConfig.subscribe(config => {
      if (!config?.placedItems) return;
      
      const currentItems = config.placedItems;
      
      // Check for deleted items
      previousItems.forEach(oldItem => {
        const stillExists = currentItems.find(item => item.id === oldItem.id);
        if (!stillExists) {
          this.itemManager.removeItem(oldItem.id);
        }
      });
      
      // Check for updated items
      currentItems.forEach(newItemData => {
        const oldItemData = previousItems.find(item => item.id === newItemData.id);
        if (oldItemData && JSON.stringify(oldItemData) !== JSON.stringify(newItemData)) {
          this.itemManager.updateItem(newItemData.id, newItemData);
        }
      });
      
      previousItems = currentItems.map(item => ({ ...item }));
    });
    this.unsubscribers.push(configUnsubscribe);
  }

  private setupAssetDropListener(): void {
    // Subscribe to asset drop events from EventBus
    const subscription = EventBus.on<AssetDroppedEvent>(EVENTS.ASSET_DROPPED, (data) => {
      const { assetKey, canvasX, canvasY } = data;
      
      // Convert canvas coordinates to world coordinates using Phaser's built-in method
      // This correctly handles zoom and scroll
      const camera = this.scene.cameras.main;
      const worldPoint = camera.getWorldPoint(canvasX, canvasY);
      const worldX = worldPoint.x;
      const worldY = worldPoint.y;
      
      // Get current depth layer preference
      let currentDepthLayer: 'behind' | 'front' = 'behind';
      const unsubscribe = itemDepthLayer.subscribe(layer => {
        currentDepthLayer = layer;
      });
      unsubscribe();
      
      // Create new item using factory
      const newItem = PlacedItemFactory.createAtWorldPosition(
        assetKey,
        worldX,
        worldY,
        this.groundY,
        currentDepthLayer
      );
      
      // Add to store and create sprite
      addPlacedItem(newItem);
      this.itemManager.createItem(newItem);
      selectItem(newItem.id);
    });
    
    // Store subscription for cleanup
    this.unsubscribers.push(() => subscription.unsubscribe());
  }

  private setupDeleteKeys(): void {
    const deleteKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE);
    const backspaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    
    const handleDelete = () => {
      const selectedId = this.scene.data.get('selectedItemId');
      if (selectedId) {
        deletePlacedItem(selectedId);
      }
    };
    
    deleteKey.on('down', handleDelete);
    backspaceKey.on('down', handleDelete);
  }

  /**
   * Get the item manager instance
   */
  getManager(): PlacedItemManager {
    return this.itemManager;
  }

  /**
   * Cleanup subscriptions and manager
   */
  destroy(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    if (this.itemManager) {
      this.itemManager.destroy();
    }
  }
}
