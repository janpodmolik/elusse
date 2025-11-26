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
import { writable } from 'svelte/store';

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
