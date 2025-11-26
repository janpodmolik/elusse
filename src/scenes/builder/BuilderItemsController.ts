import Phaser from 'phaser';
import { PlacedItemManager } from '../PlacedItemManager';
import { selectedItemId, deletePlacedItem, addPlacedItem, selectItem, itemDepthLayer, builderConfig } from '../../stores/builderStores';
import type { PlacedItem } from '../../data/mapConfig';
import { getAssetScale } from '../../data/assets';

/**
 * Depth values for item placement relative to player
 */
const DEPTH_VALUES = {
  BEHIND: 5,
  FRONT: 15
} as const;

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
    const handleAssetDrop = (event: CustomEvent) => {
      const { assetKey, canvasX, canvasY } = event.detail;
      
      // Convert canvas coordinates to world coordinates
      const camera = this.scene.cameras.main;
      const worldX = camera.scrollX + canvasX / camera.zoom;
      const worldY = camera.scrollY + canvasY / camera.zoom;
      
      // Get current depth layer preference
      let currentDepthLayer: 'behind' | 'front' = 'behind';
      const unsubscribe = itemDepthLayer.subscribe(layer => {
        currentDepthLayer = layer;
      });
      unsubscribe();
      
      // Create new item at drop position
      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assetKey,
        x: Math.round(worldX),
        y: 0,
        scale: getAssetScale(assetKey),
        depth: currentDepthLayer === 'behind' ? DEPTH_VALUES.BEHIND : DEPTH_VALUES.FRONT,
        yOffset: Math.round(worldY - this.groundY),
      };
      
      // Add to store and create sprite
      addPlacedItem(newItem);
      this.itemManager.createItem(newItem);
      selectItem(newItem.id);
    };
    
    window.addEventListener('assetDropped', handleAssetDrop as EventListener);
    
    this.scene.events.once('shutdown', () => {
      window.removeEventListener('assetDropped', handleAssetDrop as EventListener);
    });
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
