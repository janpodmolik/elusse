/**
 * Builder Frame Stores
 */
import { writable, derived } from 'svelte/store';
import type { PlacedFrame } from '../../types/FrameTypes';
import { builderState } from './builderState';
import { isFramePanelOpen } from '../uiStores';

// ==================== Derived Stores ====================

/** Currently selected frame ID */
export const selectedFrameId = derived(builderState, $state => $state.selectedFrameId);

/** All placed frames from config */
export const placedFrames = derived(builderState, $state => $state.config?.placedFrames || []);

/** Get selected frame data */
export const selectedFrame = derived(builderState, $state => {
  if (!$state.selectedFrameId || !$state.config?.placedFrames) return null;
  return $state.config.placedFrames.find(frame => frame.id === $state.selectedFrameId) ?? null;
});

/**
 * Screen position of selected frame (updated from Phaser scene)
 * Used for positioning frame controls overlay
 */
export const selectedFrameScreenPosition = writable<{ screenX: number; screenY: number; frameHeight: number } | null>(null);

/** Update selected frame screen position (called from BuilderFramesController) */
export function updateSelectedFrameScreenPosition(pos: { screenX: number; screenY: number; frameHeight: number } | null): void {
  selectedFrameScreenPosition.set(pos);
}

/** 
 * Real-time frame positions during drag operations
 * Key: frame ID, Value: { x, y } position
 * Used by FrameContent for smooth text following during drag
 */
export const draggingFramePositions = writable<Map<string, { x: number; y: number }>>(new Map());

/** Update frame position during drag (real-time, doesn't persist) */
export function updateDraggingFramePosition(id: string, x: number, y: number): void {
  draggingFramePositions.update(map => {
    const newMap = new Map(map);
    newMap.set(id, { x, y });
    return newMap;
  });
}

/** Clear dragging position when drag ends */
export function clearDraggingFramePosition(id: string): void {
  draggingFramePositions.update(map => {
    const newMap = new Map(map);
    newMap.delete(id);
    return newMap;
  });
}

// ==================== Actions - Frames ====================

/** Add a new placed frame */
export function addPlacedFrame(frame: PlacedFrame): void {
  builderState.update(state => {
    if (!state.config) return state;
    
    const placedFrames = state.config.placedFrames || [];
    return {
      ...state,
      config: {
        ...state.config,
        placedFrames: [...placedFrames, frame]
      }
    };
  });
}

/** Update an existing placed frame by ID */
export function updatePlacedFrame(id: string, updates: Partial<PlacedFrame>): void {
  builderState.update(state => {
    if (!state.config || !state.config.placedFrames) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        placedFrames: state.config.placedFrames.map(frame =>
          frame.id === id ? { ...frame, ...updates } : frame
        )
      }
    };
  });
}

/** Delete a placed frame by ID */
export function deletePlacedFrame(id: string): void {
  builderState.update(state => {
    if (!state.config || !state.config.placedFrames) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        placedFrames: state.config.placedFrames.filter(frame => frame.id !== id)
      },
      selectedFrameId: state.selectedFrameId === id ? null : state.selectedFrameId
    };
  });
}

/** Select a frame by ID */
export function selectFrame(id: string | null): void {
  // Close frame panel when changing selection (user can reopen with double-click or EDIT button)
  isFramePanelOpen.set(false);
  
  builderState.update(state => ({
    ...state,
    selectedFrameId: id,
    // Deselect player and items when selecting a frame
    isPlayerSelected: id ? false : state.isPlayerSelected,
    selectedItemId: id ? null : state.selectedItemId
  }));
}
