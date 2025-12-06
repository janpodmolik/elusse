/**
 * Builder Social Stores
 */
import { writable, derived } from 'svelte/store';
import type { PlacedSocial } from '../../types/SocialTypes';
import { builderState } from './builderState';
import { isSocialPanelOpen } from '../uiStores';

// ==================== Derived Stores ====================

/** Currently selected social ID */
export const selectedSocialId = derived(builderState, $state => $state.selectedSocialId);

/** All placed socials from config */
export const placedSocials = derived(builderState, $state => $state.config?.placedSocials || []);

/** Get selected social data */
export const selectedSocial = derived(builderState, $state => {
  if (!$state.selectedSocialId || !$state.config?.placedSocials) return null;
  return $state.config.placedSocials.find(social => social.id === $state.selectedSocialId) ?? null;
});

/**
 * Screen position of selected social (updated from Phaser scene)
 * Used for positioning social controls overlay
 */
export const selectedSocialScreenPosition = writable<{ screenX: number; screenY: number; socialHeight: number } | null>(null);

/** Update selected social screen position (called from BuilderSocialsController) */
export function updateSelectedSocialScreenPosition(pos: { screenX: number; screenY: number; socialHeight: number } | null): void {
  selectedSocialScreenPosition.set(pos);
}

// ==================== Actions - Socials ====================

/** Add a new placed social */
export function addPlacedSocial(social: PlacedSocial): void {
  builderState.update(state => {
    if (!state.config) return state;
    
    const placedSocials = state.config.placedSocials || [];
    return {
      ...state,
      config: {
        ...state.config,
        placedSocials: [...placedSocials, social]
      }
    };
  });
}

/** Update an existing placed social by ID */
export function updatePlacedSocial(id: string, updates: Partial<PlacedSocial>): void {
  builderState.update(state => {
    if (!state.config || !state.config.placedSocials) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        placedSocials: state.config.placedSocials.map(social =>
          social.id === id ? { ...social, ...updates } : social
        )
      }
    };
  });
}

/** Delete a placed social by ID */
export function deletePlacedSocial(id: string): void {
  builderState.update(state => {
    if (!state.config || !state.config.placedSocials) return state;
    
    return {
      ...state,
      config: {
        ...state.config,
        placedSocials: state.config.placedSocials.filter(social => social.id !== id)
      },
      selectedSocialId: state.selectedSocialId === id ? null : state.selectedSocialId
    };
  });
}

/** Select a social by ID */
export function selectSocial(id: string | null): void {
  // Close social panel when changing selection (user can reopen with double-click or EDIT button)
  isSocialPanelOpen.set(false);
  
  builderState.update(state => ({
    ...state,
    selectedSocialId: id,
    // Deselect player and items when selecting a social
    isPlayerSelected: id ? false : state.isPlayerSelected,
    selectedItemId: id ? null : state.selectedItemId
  }));
}
