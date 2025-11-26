/**
 * Builder Mode Stores
 * Simple state management for map builder
 */

import { writable, derived } from 'svelte/store';
import type { MapConfig, PlacedItem } from '../data/mapConfig';

// Main builder state store
const builderState = writable<{
  isActive: boolean;
  config: MapConfig | null;
  selectedItemId: string | null;
  itemDepthLayer: 'behind' | 'front';
}>({
  isActive: false,
  config: null,
  selectedItemId: null,
  itemDepthLayer: 'behind'
});

// Derived store - public read-only access to builder mode state
export const isBuilderMode = derived(builderState, $state => $state.isActive);

// Derived store - public read-only access to builder config (for UI display)
export const builderConfig = derived(builderState, $state => $state.config);

// Derived store - public read-only access to selected item ID
export const selectedItemId = derived(builderState, $state => $state.selectedItemId);

// Derived store - public read-only access to item depth layer preference
export const itemDepthLayer = derived(builderState, $state => $state.itemDepthLayer);

// Actions - Player
export function updatePlayerPosition(x: number, y: number): void {
  builderState.update(state => {
    if (!state.config) return state;
    return {
      ...state,
      config: { ...state.config, playerStartX: x, playerStartY: y }
    };
  });
}

// Actions - Placed Items
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

// Actions - Selection
export function selectItem(id: string | null): void {
  builderState.update(state => ({
    ...state,
    selectedItemId: id
  }));
}

export function clearSelection(): void {
  builderState.update(state => ({
    ...state,
    selectedItemId: null
  }));
}

// Actions - Depth Layer
export function toggleItemDepthLayer(): void {
  builderState.update(state => ({
    ...state,
    itemDepthLayer: state.itemDepthLayer === 'behind' ? 'front' : 'behind'
  }));
}

export function updateItemDepth(id: string, depth: number): void {
  updatePlacedItem(id, { depth });
}

// Actions - Builder Mode
export function enterBuilderMode(config: MapConfig): void {
  builderState.set({
    isActive: true,
    config: { ...config, placedItems: config.placedItems || [] },
    selectedItemId: null,
    itemDepthLayer: 'behind'
  });
}

export function exitBuilderMode(): void {
  builderState.update(state => ({
    ...state,
    isActive: false,
    selectedItemId: null
  }));
}

/**
 * Get current builder configuration snapshot
 * Used by GameScene to load builder-modified map config
 * @returns Current map configuration or null if not in builder mode
 */
export function getBuilderConfig(): MapConfig | null {
  let config: MapConfig | null = null;
  const unsubscribe = builderState.subscribe(state => {
    config = state.config;
  });
  unsubscribe();
  return config;
}
