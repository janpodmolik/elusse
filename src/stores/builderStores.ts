/**
 * Builder Mode Stores
 * State management for map builder using Svelte stores
 * 
 * Note: Using writable/derived for cross-context compatibility.
 * The builder state is accessed from both Svelte UI and Phaser scenes.
 */

import { writable, derived, get } from 'svelte/store';
import type { MapConfig, PlacedItem } from '../data/mapConfig';

// ==================== Types ====================

export type ItemDepthLayer = 'behind' | 'front';

interface BuilderState {
  isActive: boolean;
  config: MapConfig | null;
  selectedItemId: string | null;
  itemDepthLayer: ItemDepthLayer;
}

// ==================== Main State Store ====================

const initialState: BuilderState = {
  isActive: false,
  config: null,
  selectedItemId: null,
  itemDepthLayer: 'behind',
};

const builderState = writable<BuilderState>(initialState);

// ==================== Derived Stores (Read-only) ====================

/** Whether builder mode is active */
export const isBuilderMode = derived(builderState, $state => $state.isActive);

/** Current builder map configuration */
export const builderConfig = derived(builderState, $state => $state.config);

/** Currently selected item ID (null if none) */
export const selectedItemId = derived(builderState, $state => $state.selectedItemId);

/** Current depth layer preference for new items */
export const itemDepthLayer = derived(builderState, $state => $state.itemDepthLayer);

// ==================== Actions - Player ====================

/** Update player start position in builder config */
export function updatePlayerPosition(x: number, y: number): void {
  builderState.update(state => {
    if (!state.config) return state;
    return {
      ...state,
      config: { ...state.config, playerStartX: x, playerStartY: y }
    };
  });
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
  builderState.update(state => ({
    ...state,
    selectedItemId: id
  }));
}

/** Clear current selection */
export function clearSelection(): void {
  builderState.update(state => ({
    ...state,
    selectedItemId: null
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

// ==================== Actions - Builder Mode ====================

/** Enter builder mode with a map configuration */
export function enterBuilderMode(config: MapConfig): void {
  builderState.set({
    isActive: true,
    config: { ...config, placedItems: config.placedItems || [] },
    selectedItemId: null,
    itemDepthLayer: 'behind'
  });
  // Reset zoom state when entering builder
  isBuilderZoomedOut.set(false);
}

/** Exit builder mode (preserves config for potential return) */
export function exitBuilderMode(): void {
  builderState.update(state => ({
    ...state,
    isActive: false,
    selectedItemId: null
  }));
  // Reset zoom state when exiting builder
  isBuilderZoomedOut.set(false);
}

/**
 * Get current builder configuration snapshot
 * Uses Svelte's get() for synchronous access
 * @returns Current map configuration or null if not in builder mode
 */
export function getBuilderConfig(): MapConfig | null {
  return get(builderState).config;
}

// ==================== Zoom State (separate for performance) ====================

/** Whether builder camera is zoomed out to show full map */
export const isBuilderZoomedOut = writable<boolean>(false);

/** Set zoom state (called from BuilderCameraController) */
export function setBuilderZoom(isZoomedOut: boolean): void {
  isBuilderZoomedOut.set(isZoomedOut);
}

// ==================== Camera Info (for minimap) ====================

export interface CameraInfo {
  scrollX: number;
  scrollY: number;
  viewWidth: number;
  viewHeight: number;
  worldWidth: number;
  worldHeight: number;
  zoom: number;
  playerX: number;
  playerY: number;
}

/** Camera state for minimap rendering */
export const builderCameraInfo = writable<CameraInfo>({
  scrollX: 0,
  scrollY: 0,
  viewWidth: 0,
  viewHeight: 0,
  worldWidth: 0,
  worldHeight: 0,
  zoom: 1,
  playerX: 0,
  playerY: 0,
});

/** Update camera info (called from BuilderScene on each frame) */
export function updateCameraInfo(info: Partial<CameraInfo>): void {
  builderCameraInfo.update(state => ({ ...state, ...info }));
}
