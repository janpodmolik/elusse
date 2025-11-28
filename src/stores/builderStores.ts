/**
 * Builder Mode Stores
 * State management for map builder using Svelte stores
 * 
 * Note: Using writable/derived for cross-context compatibility.
 * The builder state is accessed from both Svelte UI and Phaser scenes.
 */

import { writable, derived, get } from 'svelte/store';
import type { MapConfig, PlacedItem } from '../data/mapConfig';
import type { DialogZone, LocalizedText } from '../types/DialogTypes';
import type { PlacedFrame } from '../types/FrameTypes';
import { getItemDepth } from '../constants/depthLayers';

// ==================== Types ====================

export type ItemDepthLayer = 'behind' | 'front';

/** Builder edit mode */
export type BuilderEditMode = 'items' | 'dialogs' | 'frames';

interface BuilderState {
  isActive: boolean;
  config: MapConfig | null;
  selectedItemId: string | null;
  itemDepthLayer: ItemDepthLayer;
  editMode: BuilderEditMode;
  selectedDialogZoneId: string | null;
  selectedFrameId: string | null;
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
};

const builderState = writable<BuilderState>(initialState);

// ==================== Derived Stores (Read-only) ====================

/** Whether builder mode is active */
export const isBuilderMode = derived(builderState, $state => $state.isActive);

/** Current builder map configuration */
export const builderConfig = derived(builderState, $state => $state.config);

// ==================== Grid Snapping ====================

/** Whether grid snapping is enabled (default: true) */
export const gridSnappingEnabled = writable<boolean>(true);

/** Toggle grid snapping on/off */
export function toggleGridSnapping(): void {
  gridSnappingEnabled.update(enabled => !enabled);
}

// ==================== Palette Open State ====================

/** Whether asset palette is open */
export const isAssetPaletteOpen = writable<boolean>(false);

/** Whether frame palette is open */
export const isFramePaletteOpen = writable<boolean>(false);

/** Toggle asset palette */
export function toggleAssetPalette(): void {
  isAssetPaletteOpen.update(open => !open);
}

/** Toggle frame palette */
export function toggleFramePalette(): void {
  isFramePaletteOpen.update(open => !open);
}

/** Currently selected item ID (null if none) */
export const selectedItemId = derived(builderState, $state => $state.selectedItemId);

/** Current depth layer preference for new items */
export const itemDepthLayer = derived(builderState, $state => $state.itemDepthLayer);

/** Current edit mode (items or dialogs) */
export const builderEditMode = derived(builderState, $state => $state.editMode);

/** Currently selected dialog zone ID */
export const selectedDialogZoneId = derived(builderState, $state => $state.selectedDialogZoneId);

/** All dialog zones from config */
export const dialogZones = derived(builderState, $state => $state.config?.dialogZones || []);

/** Currently selected frame ID */
export const selectedFrameId = derived(builderState, $state => $state.selectedFrameId);

/** All placed frames from config */
export const placedFrames = derived(builderState, $state => $state.config?.placedFrames || []);

/** Get selected frame data */
export const selectedFrame = derived(builderState, $state => {
  if (!$state.selectedFrameId || !$state.config?.placedFrames) return null;
  return $state.config.placedFrames.find(frame => frame.id === $state.selectedFrameId) ?? null;
});

/** Get selected item data */
export const selectedItem = derived(builderState, $state => {
  if (!$state.selectedItemId || !$state.config?.placedItems) return null;
  return $state.config.placedItems.find(item => item.id === $state.selectedItemId) ?? null;
});

/** Whether selected item has physics enabled */
export const selectedItemPhysicsEnabled = derived(selectedItem, $item => $item?.physicsEnabled ?? false);

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

// ==================== Actions - Builder Mode ====================

/** Enter builder mode with a map configuration */
export function enterBuilderMode(config: MapConfig): void {
  builderState.set({
    isActive: true,
    config: { 
      ...config, 
      placedItems: config.placedItems || [],
      dialogZones: config.dialogZones || [],
      placedFrames: config.placedFrames || []
    },
    selectedItemId: null,
    itemDepthLayer: 'behind',
    editMode: 'items',
    selectedDialogZoneId: null,
    selectedFrameId: null,
  });
  // Reset zoom state when entering builder
  isBuilderZoomedOut.set(false);
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

// ==================== Actions - Edit Mode ====================

/** Set builder edit mode (items or dialogs) */
export function setBuilderEditMode(mode: BuilderEditMode): void {
  builderState.update(state => ({
    ...state,
    editMode: mode,
    // Clear selections when switching modes
    selectedItemId: mode === 'items' ? state.selectedItemId : null,
    selectedDialogZoneId: mode === 'dialogs' ? state.selectedDialogZoneId : null,
    selectedFrameId: mode === 'frames' ? state.selectedFrameId : null,
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

// ==================== Actions - Dialog Zones ====================

/** Add a new dialog zone */
export function addDialogZone(zone: DialogZone): void {
  builderState.update(state => {
    if (!state.config) return state;
    
    const dialogZones = state.config.dialogZones || [];
    return {
      ...state,
      config: {
        ...state.config,
        dialogZones: [...dialogZones, zone]
      }
    };
  });
}

/** Update an existing dialog zone by ID */
export function updateDialogZone(id: string, updates: Partial<DialogZone>): void {
  builderState.update(state => {
    if (!state.config || !state.config.dialogZones) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        dialogZones: state.config.dialogZones.map(zone =>
          zone.id === id ? { ...zone, ...updates } : zone
        )
      }
    };
  });
}

/** Delete a dialog zone by ID */
export function deleteDialogZone(id: string): void {
  builderState.update(state => {
    if (!state.config || !state.config.dialogZones) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        dialogZones: state.config.dialogZones.filter(zone => zone.id !== id)
      },
      selectedDialogZoneId: state.selectedDialogZoneId === id ? null : state.selectedDialogZoneId
    };
  });
}

/** Select a dialog zone by ID */
export function selectDialogZone(id: string | null): void {
  builderState.update(state => ({
    ...state,
    selectedDialogZoneId: id
  }));
}

/** Get a dialog zone by ID */
export function getDialogZone(id: string): DialogZone | undefined {
  const state = get(builderState);
  return state.config?.dialogZones?.find(zone => zone.id === id);
}

/** Update localized text for a dialog zone */
export function updateDialogZoneText(zoneId: string, language: string, updates: Partial<LocalizedText>): void {
  builderState.update(state => {
    if (!state.config || !state.config.dialogZones) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        dialogZones: state.config.dialogZones.map(zone => {
          if (zone.id !== zoneId) return zone;
          
          const existingIndex = zone.texts.findIndex(t => t.language === language);
          let newTexts: LocalizedText[];
          
          if (existingIndex >= 0) {
            // Update existing
            newTexts = zone.texts.map((t, i) => 
              i === existingIndex ? { ...t, ...updates } : t
            );
          } else {
            // Add new language
            newTexts = [...zone.texts, { language, title: '', content: '', ...updates }];
          }
          
          return { ...zone, texts: newTexts };
        })
      }
    };
  });
}

/** Add a new language to a dialog zone */
export function addDialogZoneLanguage(zoneId: string, language: string): void {
  updateDialogZoneText(zoneId, language, { language, title: '', content: '' });
}

/** Remove a language from a dialog zone */
export function removeDialogZoneLanguage(zoneId: string, language: string): void {
  builderState.update(state => {
    if (!state.config || !state.config.dialogZones) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        dialogZones: state.config.dialogZones.map(zone => {
          if (zone.id !== zoneId) return zone;
          return {
            ...zone,
            texts: zone.texts.filter(t => t.language !== language)
          };
        })
      }
    };
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
  builderState.update(state => ({
    ...state,
    selectedFrameId: id
  }));
}

/** Update localized text for a frame */
export function updateFrameText(frameId: string, language: string, updates: Partial<LocalizedText>): void {
  builderState.update(state => {
    if (!state.config || !state.config.placedFrames) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        placedFrames: state.config.placedFrames.map(frame => {
          if (frame.id !== frameId) return frame;
          
          const existingIndex = frame.texts.findIndex(t => t.language === language);
          let newTexts: LocalizedText[];
          
          if (existingIndex >= 0) {
            // Update existing
            newTexts = frame.texts.map((t, i) => 
              i === existingIndex ? { ...t, ...updates } : t
            );
          } else {
            // Add new language
            newTexts = [...frame.texts, { language, title: '', content: '', ...updates }];
          }
          
          return { ...frame, texts: newTexts };
        })
      }
    };
  });
}

/** Update frame background color */
export function updateFrameColor(frameId: string, backgroundColor: string): void {
  updatePlacedFrame(frameId, { backgroundColor });
}
