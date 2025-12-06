import { derived } from 'svelte/store';
import type { PlacedNPC } from '../../data/mapConfig';
import { builderState } from './builderState';

// ==================== Derived Stores ====================

/** Get selected NPC data (reusing selectedItemId for now, or we can add selectedNPCId to state) */
// For simplicity, let's assume selectedItemId can hold NPC ID too, or we check if it matches an NPC.
// But better to have separate selection logic or unified selection.
// Given the current architecture, `selectedItemId` is in `builderState`.
// Let's see if we can reuse it.
export const selectedNPC = derived(builderState, $state => {
  if (!$state.selectedItemId || !$state.config?.placedNPCs) return null;
  return $state.config.placedNPCs.find(npc => npc.id === $state.selectedItemId) ?? null;
});

// ==================== Actions - Placed NPCs ====================

export function addPlacedNPC(npc: PlacedNPC): void {
  builderState.update(state => {
    if (!state.config) return state;
    
    const placedNPCs = state.config.placedNPCs || [];
    return {
      ...state,
      config: {
        ...state.config,
        placedNPCs: [...placedNPCs, npc]
      },
      isDirty: true
    };
  });
}

export function updatePlacedNPC(id: string, updates: Partial<PlacedNPC>): void {
  builderState.update(state => {
    if (!state.config?.placedNPCs) return state;
    
    const placedNPCs = state.config.placedNPCs.map(npc => 
      npc.id === id ? { ...npc, ...updates } : npc
    );
    
    return {
      ...state,
      config: {
        ...state.config,
        placedNPCs
      },
      isDirty: true
    };
  });
}

import type { Language } from '../../types/Language';

export function updateNPCDialogText(id: string, language: Language, updates: { title?: string; content?: string }): void {
  builderState.update(state => {
    if (!state.config?.placedNPCs) return state;
    
    const placedNPCs = state.config.placedNPCs.map(npc => {
      if (npc.id !== id) return npc;
      
      const dialogs = npc.dialog || [];
      const existingIndex = dialogs.findIndex(t => t.language === language);
      
      let newDialogs;
      if (existingIndex >= 0) {
        newDialogs = [...dialogs];
        newDialogs[existingIndex] = { ...newDialogs[existingIndex], ...updates };
      } else {
        newDialogs = [...dialogs, { language, title: updates.title ?? '', content: updates.content ?? '' }];
      }
      
      return { ...npc, dialog: newDialogs };
    });
    
    return {
      ...state,
      config: {
        ...state.config,
        placedNPCs
      },
      isDirty: true
    };
  });
}

export function deletePlacedNPC(id: string): void {
  builderState.update(state => {
    if (!state.config?.placedNPCs) return state;
    
    const placedNPCs = state.config.placedNPCs.filter(npc => npc.id !== id);
    
    // Clear selection if deleted item was selected
    const selectedItemId = state.selectedItemId === id ? null : state.selectedItemId;
    
    return {
      ...state,
      selectedItemId,
      config: {
        ...state.config,
        placedNPCs
      },
      isDirty: true
    };
  });
}
