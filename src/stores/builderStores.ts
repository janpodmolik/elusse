/**
 * Builder Mode Stores
 * Simple state management for map builder
 */

import { writable, derived } from 'svelte/store';
import type { MapConfig } from '../data/mapConfig';

// Main builder state store
const builderState = writable<{
  isActive: boolean;
  config: MapConfig | null;
}>({
  isActive: false,
  config: null
});

// Derived store - public read-only access to builder mode state
export const isBuilderMode = derived(builderState, $state => $state.isActive);

// Derived store - public read-only access to builder config (for UI display)
export const builderConfig = derived(builderState, $state => $state.config);

// Actions
export function enterBuilderMode(config: MapConfig): void {
  builderState.set({ isActive: true, config: { ...config } });
}

export function exitBuilderMode(): void {
  builderState.update(state => ({ ...state, isActive: false }));
}

export function updatePlayerPosition(x: number, y: number): void {
  builderState.update(state => {
    if (!state.config) return state;
    return {
      ...state,
      config: { ...state.config, playerStartX: x, playerStartY: y }
    };
  });
}

/**
 * Get current builder configuration
 * Used by GameScene to load builder-modified map config
 */
export function getBuilderConfig(): MapConfig | null {
  let config: MapConfig | null = null;
  builderState.subscribe(state => {
    config = state.config;
  })();
  return config;
}
