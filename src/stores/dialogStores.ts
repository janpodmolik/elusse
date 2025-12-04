/**
 * Dialog State Stores
 * Shared dialog state
 */
import { writable, derived } from 'svelte/store';
import type { DialogZone } from '../types/DialogTypes';
import { getZoneText } from '../types/DialogTypes';
import { currentLanguage } from './uiStores';

// ==================== Dialog System Stores ====================

/** Currently active dialog zone (player is inside) */
export const activeDialogZone = writable<DialogZone | null>(null);

/** Active dialog text based on current language */
export const activeDialogText = derived(
  [activeDialogZone, currentLanguage],
  ([$zone, $lang]) => {
    if (!$zone) return null;
    return getZoneText($zone, $lang);
  }
);

/** Set active dialog zone (called from GameScene) */
export function setActiveDialogZone(zone: DialogZone | null): void {
  activeDialogZone.set(zone);
}
