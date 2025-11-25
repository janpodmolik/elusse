/**
 * Svelte stores for shared UI state between Phaser game and Svelte components
 */
import { writable } from 'svelte/store';

// Current language (cs/en)
export const currentLanguage = writable<string>('cs');

// Current cat skin (orange/white)
export const currentSkin = writable<string>('orange');

// Current background name
export const currentBackground = writable<string>('Forest');

// Loading overlay visibility
export const isLoading = writable<boolean>(false);

// Controls dialog visibility
export const showControlsDialog = writable<boolean>(false);

// Touch device detection
export const isTouchDevice = writable<boolean>(false);

// Player movement flag (for closing controls dialog)
export const hasPlayerMoved = writable<boolean>(false);

// Background change trigger (increment to trigger reload in GameScene)
export const backgroundChangeCounter = writable<number>(0);
