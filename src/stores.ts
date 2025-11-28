/**
 * Svelte stores for shared UI state between Phaser game and Svelte components
 * 
 * Note: Using writable() stores for cross-context compatibility.
 * These stores are accessed from both Svelte components and Phaser scenes,
 * so we keep the writable API which works in both contexts.
 * 
 * In Svelte 5 components, use: $storeName (auto-subscribed)
 * In Phaser/JS: storeName.set(value) or storeName.subscribe(callback)
 */
import { writable, derived } from 'svelte/store';
import type { DialogZone } from './types/DialogTypes';
import { getZoneText } from './types/DialogTypes';

// ==================== UI State Stores ====================

/** Current language (cs/en) */
export const currentLanguage = writable<'cs' | 'en'>('cs');

/** Current cat skin (orange/white) */
export const currentSkin = writable<'orange' | 'white'>('orange');

/** Current background name */
export const currentBackground = writable<string>('Forest');

/** Loading overlay visibility - set true during async operations */
export const isLoading = writable<boolean>(false);

/** Controls dialog visibility */
export const showControlsDialog = writable<boolean>(false);

/** Touch device detection */
export const isTouchDevice = writable<boolean>(false);

/** Player movement flag (for closing controls dialog on first move) */
export const hasPlayerMoved = writable<boolean>(false);

/** Background change trigger (increment to trigger reload in GameScene) */
export const backgroundChangeCounter = writable<number>(0);

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

// ==================== Player Screen Position ====================

/** Player's screen position (for UI positioning like dialog bubbles) */
export const playerScreenPosition = writable<{ x: number; y: number }>({ x: 0, y: 0 });

/** Update player screen position (called from GameScene update) */
export function setPlayerScreenPosition(x: number, y: number): void {
  playerScreenPosition.set({ x, y });
}

// ==================== Store Utilities ====================

/**
 * Get current value from a store synchronously
 * Useful in Phaser scenes where you need immediate value
 */
export function getStoreValue<T>(store: { subscribe: (fn: (value: T) => void) => () => void }): T {
  let value: T;
  const unsubscribe = store.subscribe((v) => { value = v; });
  unsubscribe();
  return value!;
}
