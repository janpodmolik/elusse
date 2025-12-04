/**
 * Builder Core State
 */
import { writable, derived, get } from 'svelte/store';
import type { MapConfig } from '../../data/mapConfig';
import { builderZoomLevel } from '../gameStores';

// ==================== Types ====================

export type ItemDepthLayer = 'behind' | 'front';

/** Builder edit mode */
export type BuilderEditMode = 'items' | 'dialogs' | 'frames' | 'socials';

export interface BuilderState {
  isActive: boolean;
  config: MapConfig | null;
  selectedItemId: string | null;
  itemDepthLayer: ItemDepthLayer;
  editMode: BuilderEditMode;
  selectedDialogZoneId: string | null;
  selectedFrameId: string | null;
  selectedSocialId: string | null;
  isPlayerSelected: boolean;
}

// ==================== Main State Store ====================

const initialState: BuilderState = {
  isActive: false,
  config: null,
  selectedItemId: null,
  itemDepthLayer: 'behind',
  editMode: 'items',
  selectedDialogZoneId: null,
  selectedFrameId: null,
  selectedSocialId: null,
  isPlayerSelected: false,
};

export const builderState = writable<BuilderState>(initialState);

// ==================== Derived Stores (Read-only) ====================

/** Whether builder mode is active */
export const isBuilderMode = derived(builderState, $state => $state.isActive);

/** Current builder map configuration */
export const builderConfig = derived(builderState, $state => $state.config);

/** Current edit mode (items or dialogs) */
export const builderEditMode = derived(builderState, $state => $state.editMode);

// ==================== Grid Snapping ====================

/** Whether grid snapping is enabled (default: true) */
export const gridSnappingEnabled = writable<boolean>(true);

/** Toggle grid snapping on/off */
export function toggleGridSnapping(): void {
  gridSnappingEnabled.update(enabled => !enabled);
}

// ==================== Drag State ====================

/** Whether any item/frame/zone is currently being dragged */
export const isDraggingInBuilder = writable<boolean>(false);

/** Set dragging state (called from Phaser scene) */
export function setDraggingInBuilder(isDragging: boolean): void {
  isDraggingInBuilder.set(isDragging);
}

/** Whether pinch zoom is active (disables all sprite interactions) */
export const isPinchingInBuilder = writable<boolean>(false);

/** Set pinching state (called from BuilderCameraController) */
export function setPinchingInBuilder(isPinching: boolean): void {
  isPinchingInBuilder.set(isPinching);
}

// ==================== Actions - Builder Mode ====================

/** Enter builder mode with a map configuration */
export function enterBuilderMode(config: MapConfig): void {
  builderState.set({
    isActive: true,
    config: { 
      ...config, 
      placedItems: config.placedItems || [],
      dialogZones: config.dialogZones || [],
      placedFrames: config.placedFrames || [],
      placedSocials: config.placedSocials || []
    },
    selectedItemId: null,
    itemDepthLayer: 'behind',
    editMode: 'items',
    selectedDialogZoneId: null,
    selectedFrameId: null,
    selectedSocialId: null,
    isPlayerSelected: false,
  });
  // Reset zoom state when entering builder (will be set properly by camera controller)
  builderZoomLevel.set(1);
}

/** Exit builder mode (preserves config for potential return) */
export function exitBuilderMode(): void {
  builderState.update(state => {
    // Clean up empty dialog zones before exiting
    const cleanedConfig = state.config ? {
      ...state.config,
      dialogZones: (state.config.dialogZones || []).filter(zone => {
        // Keep zone if it has at least one text with title OR content
        return zone.texts.some(text => text.title.trim() !== '' || text.content.trim() !== '');
      })
    } : state.config;
    
    return {
      ...state,
      isActive: false,
      selectedItemId: null,
      config: cleanedConfig
    };
  });
  // Reset zoom state when exiting builder
  builderZoomLevel.set(1);
}

/**
 * Get current builder configuration snapshot
 * Uses Svelte's get() for synchronous access
 * @returns Current map configuration or null if not in builder mode
 */
export function getBuilderConfig(): MapConfig | null {
  return get(builderState).config;
}

// ==================== Actions - Edit Mode ====================

/** Set builder edit mode (items, dialogs, or frames) */
export function setBuilderEditMode(mode: BuilderEditMode): void {
  builderState.update(state => ({
    ...state,
    editMode: mode,
    // Clear item and dialog selections when switching modes
    // Keep selectedFrameId - FramePanel can be open in any mode
    selectedItemId: null,
    selectedDialogZoneId: null,
  }));
}

/** Toggle between edit modes */
export function toggleBuilderEditMode(): void {
  builderState.update(state => {
    const modes: BuilderEditMode[] = ['items', 'dialogs', 'frames'];
    const currentIndex = modes.indexOf(state.editMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    return {
      ...state,
      editMode: nextMode,
      selectedItemId: null,
      selectedDialogZoneId: null,
      selectedFrameId: null,
    };
  });
}
