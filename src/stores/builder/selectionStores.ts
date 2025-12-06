/**
 * Builder Selection Stores
 */
import { derived } from 'svelte/store';
import { builderState } from './builderState';

// ==================== Derived Stores ====================

/** Whether player sprite is selected */
export const isPlayerSelected = derived(builderState, $state => $state.isPlayerSelected);

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

// ==================== Actions - Selection ====================

/** Select player sprite */
export function selectPlayer(selected: boolean): void {
  builderState.update(state => ({
    ...state,
    isPlayerSelected: selected,
    // Deselect item when selecting player
    selectedItemId: selected ? null : state.selectedItemId
  }));
}

/** Clear all selections (items, dialogs, socials, player) */
export function clearSelection(): void {
  builderState.update(state => ({
    ...state,
    selectedItemId: null,
    selectedDialogZoneId: null,
    selectedSocialId: null,
    isPlayerSelected: false
  }));
}
