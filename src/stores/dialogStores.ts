/**
 * Dialog State Stores
 * Shared dialog state
 */
import { writable, derived } from 'svelte/store';
import type { DialogZone, LocalizedText } from '../types/DialogTypes';
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

// ==================== NPC Dialog Stores ====================

/** NPC dialog data with screen position */
export interface ActiveNPCDialog {
  npcId: string;
  texts: LocalizedText[];
  screenX: number;
  screenY: number;
  npcHeight: number;
}

/** Currently active NPC dialog (player is near NPC) */
export const activeNPCDialog = writable<ActiveNPCDialog | null>(null);

/** Active NPC dialog text based on current language */
export const activeNPCDialogText = derived(
  [activeNPCDialog, currentLanguage],
  ([$npcDialog, $lang]) => {
    if (!$npcDialog) return null;
    const text = $npcDialog.texts.find(t => t.language === $lang);
    return text ?? $npcDialog.texts[0] ?? null;
  }
);

/** Set active NPC dialog (called from GameScene) */
export function setActiveNPCDialog(dialog: ActiveNPCDialog | null): void {
  activeNPCDialog.set(dialog);
}

/** Update NPC dialog screen position (called each frame when NPC dialog is active) */
export function updateActiveNPCDialogPosition(screenX: number, screenY: number): void {
  activeNPCDialog.update(current => {
    if (!current) return null;
    return { ...current, screenX, screenY };
  });
}
