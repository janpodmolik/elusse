/**
 * Builder Dialog Stores
 */
import { writable, derived, get } from 'svelte/store';
import type { DialogZone, LocalizedText } from '../../types/DialogTypes';
import { builderState } from './builderState';

// ==================== Derived Stores ====================

/** Currently selected dialog zone ID */
export const selectedDialogZoneId = derived(builderState, $state => $state.selectedDialogZoneId);

/** All dialog zones from config */
export const dialogZones = derived(builderState, $state => $state.config?.dialogZones || []);

/**
 * Screen position of selected dialog zone (updated from Phaser scene)
 * Used for positioning dialog zone controls overlay
 */
export const selectedDialogZoneScreenPosition = writable<{ screenX: number; screenY: number } | null>(null);

/** Update selected dialog zone screen position (called from DialogZoneRenderer) */
export function updateSelectedDialogZoneScreenPosition(pos: { screenX: number; screenY: number } | null): void {
  selectedDialogZoneScreenPosition.set(pos);
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
