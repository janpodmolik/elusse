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

/** Whether user has selected a background (shown after page refresh) */
export const hasSelectedBackground = writable<boolean>(false);

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

// ==================== Game Frame Customization ====================

/** Game frame border color (customizable) */
export const gameFrameColor = writable<string>('#2a1a0a');

/** Game frame visibility */
export const gameFrameVisible = writable<boolean>(true);

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

// ==================== Game Camera Info ====================

/** Game camera info for Svelte overlays */
export const gameCameraInfo = writable<{ scrollX: number; scrollY: number; zoom: number }>({ 
  scrollX: 0, 
  scrollY: 0, 
  zoom: 1 
});

/** Update game camera info (called from GameScene update) */
export function setGameCameraInfo(scrollX: number, scrollY: number, zoom: number = 1): void {
  gameCameraInfo.set({ scrollX, scrollY, zoom });
}

// ==================== Game World Dimensions ====================

/** Game world dimensions for frame overlay positioning */
export const gameWorldDimensions = writable<{ 
  worldWidth: number; 
  worldHeight: number;
  offsetX: number;
  offsetY: number;
}>({ 
  worldWidth: 640, 
  worldHeight: 640,
  offsetX: 0,
  offsetY: 0
});

/** Update game world dimensions (called from GameScene on create and resize) */
export function setGameWorldDimensions(
  worldWidth: number, 
  worldHeight: number, 
  viewportWidth: number, 
  viewportHeight: number
): void {
  // Calculate offset when viewport is larger than world
  const offsetX = Math.max(0, (viewportWidth - worldWidth) / 2);
  const offsetY = Math.max(0, (viewportHeight - worldHeight) / 2);
  gameWorldDimensions.set({ worldWidth, worldHeight, offsetX, offsetY });
}

// ==================== Frame Click Blocking ====================

/** 
 * Flag to block player input when frame link is clicked
 * Prevents jump loop when window loses focus during redirect
 */
export const frameClickBlocked = writable<boolean>(false);

/** Block player input temporarily (called when frame with URL is clicked) */
export function blockFrameClick(): void {
  frameClickBlocked.set(true);
  // Auto-reset after short delay
  setTimeout(() => frameClickBlocked.set(false), 150);
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
