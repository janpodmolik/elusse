/**
 * Builder Item Stores
 */
import { writable, derived } from 'svelte/store';
import type { PlacedItem } from '../../data/mapConfig';
import { getItemDepth } from '../../constants/depthLayers';
import { builderState } from './builderState';
import { isNPCConfigPanelOpen } from '../uiStores';

// ==================== Derived Stores ====================

/** Currently selected item ID (null if none) */
export const selectedItemId = derived(builderState, $state => $state.selectedItemId);

/** Current depth layer preference for new items */
export const itemDepthLayer = derived(builderState, $state => $state.itemDepthLayer);

/** Get selected item data */
export const selectedItem = derived(builderState, $state => {
  if (!$state.selectedItemId || !$state.config?.placedItems) return null;
  return $state.config.placedItems.find(item => item.id === $state.selectedItemId) ?? null;
});

/** Whether selected item has physics enabled */
export const selectedItemPhysicsEnabled = derived(selectedItem, $item => $item?.physicsEnabled ?? false);

/** Whether selected item is horizontally flipped */
export const selectedItemFlipX = derived(selectedItem, $item => $item?.flipX ?? false);

/**
 * Screen position of selected item (updated from Phaser scene)
 * Used for positioning item controls overlay
 */
export const selectedItemScreenPosition = writable<{ screenX: number; screenY: number; itemHeight: number } | null>(null);

/** Update selected item screen position (called from BuilderScene/ItemSelectionManager) */
export function updateSelectedItemScreenPosition(pos: { screenX: number; screenY: number; itemHeight: number } | null): void {
  selectedItemScreenPosition.set(pos);
}

// ==================== Actions - Placed Items ====================

/** Add a new placed item to the builder config */
export function addPlacedItem(item: PlacedItem): void {
  builderState.update(state => {
    if (!state.config) return state;
    
    const placedItems = state.config.placedItems || [];
    return {
      ...state,
      config: {
        ...state.config,
        placedItems: [...placedItems, item]
      }
    };
  });
}

/** Update an existing placed item by ID */
export function updatePlacedItem(id: string, updates: Partial<PlacedItem>): void {
  builderState.update(state => {
    if (!state.config || !state.config.placedItems) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        placedItems: state.config.placedItems.map(item =>
          item.id === id ? { ...item, ...updates } : item
        )
      }
    };
  });
}

/** Delete a placed item by ID (also clears selection if deleted item was selected) */
export function deletePlacedItem(id: string): void {
  builderState.update(state => {
    if (!state.config || !state.config.placedItems) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        placedItems: state.config.placedItems.filter(item => item.id !== id)
      },
      selectedItemId: state.selectedItemId === id ? null : state.selectedItemId
    };
  });
}

// ==================== Actions - Selection ====================

/** Select an item by ID (or null to deselect) */
export function selectItem(id: string | null): void {
  // Close NPC config panel when changing selection (user can reopen with double-click or EDIT button)
  isNPCConfigPanelOpen.set(false);
  
  builderState.update(state => ({
    ...state,
    selectedItemId: id,
    // Deselect player when selecting an item
    isPlayerSelected: id ? false : state.isPlayerSelected
  }));
}

// ==================== Actions - Depth Layer ====================

/** Toggle depth layer preference between 'behind' and 'front' */
export function toggleItemDepthLayer(): void {
  builderState.update(state => ({
    ...state,
    itemDepthLayer: state.itemDepthLayer === 'behind' ? 'front' : 'behind'
  }));
}

/** Update depth of an existing item */
export function updateItemDepth(id: string, depth: number): void {
  updatePlacedItem(id, { depth });
}

/** Update physics enabled state of an existing item */
export function updateItemPhysics(id: string, physicsEnabled: boolean): void {
  if (physicsEnabled) {
    // When enabling physics, force depth to 'behind' layer
    updatePlacedItem(id, { physicsEnabled, depth: getItemDepth('behind') });
    // Also update the UI state
    builderState.update(state => ({
      ...state,
      itemDepthLayer: 'behind'
    }));
  } else {
    updatePlacedItem(id, { physicsEnabled });
  }
}

/** Update flipX state of an existing item */
export function updateItemFlipX(id: string, flipX: boolean): void {
  updatePlacedItem(id, { flipX });
}
