/**
 * UI State Stores
 * Shared UI state between Phaser game and Svelte components
 */
import { writable } from 'svelte/store';
import { DEFAULT_LANGUAGE, type Language } from '../types/Language';

// ==================== General UI ====================

/** Current language (cs/en) */
export const currentLanguage = writable<'cs' | 'en'>('cs');

/** Current player skin ID */
export const currentSkin = writable<string>('succubus');

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

// ==================== Builder UI ====================

/** Whether item palette is open */
export const isItemPaletteOpen = writable<boolean>(false);

/** Whether frame palette is open */
export const isFramePaletteOpen = writable<boolean>(false);

/** Whether frame panel is explicitly open (set by double-click, not single click) */
export const isFramePanelOpen = writable<boolean>(false);

/** Whether social palette is open */
export const isSocialPaletteOpen = writable<boolean>(false);

/** Whether NPC palette is open */
export const isNPCPaletteOpen = writable<boolean>(false);

/** Toggle item palette visibility */

/** Whether social panel is explicitly open (set by double-click, not single click) */
export const isSocialPanelOpen = writable<boolean>(false);

/** Whether dialog zone panel is open */
export const isDialogZonePanelOpen = writable<boolean>(false);

/** Language used for previewing text in builder mode */
export const builderPreviewLanguage = writable<Language>(DEFAULT_LANGUAGE);

// ==================== Builder UI Actions ====================

/** Toggle item palette */
export function toggleItemPalette(): void {
  isItemPaletteOpen.update(open => !open);
}

/** Toggle frame palette */
export function toggleFramePalette(): void {
  isFramePaletteOpen.update(open => !open);
}

/** Open frame panel (called on double-click) */
export function openFramePanel(): void {
  isFramePanelOpen.set(true);
}

/** Close frame panel */
export function closeFramePanel(): void {
  isFramePanelOpen.set(false);
}

/** Toggle social palette */
export function toggleSocialPalette(): void {
  isSocialPaletteOpen.update(open => !open);
}

/** Toggle NPC palette */
export function toggleNPCPalette(): void {
  isNPCPaletteOpen.update(open => !open);
}

/** Open social panel (called on double-click) */
export function openSocialPanel(): void {
  isSocialPanelOpen.set(true);
}

/** Close social panel */
export function closeSocialPanel(): void {
  isSocialPanelOpen.set(false);
}

/** Open dialog zone panel */
export function openDialogZonePanel(): void {
  isDialogZonePanelOpen.set(true);
}

/** Close dialog zone panel */
export function closeDialogZonePanel(): void {
  isDialogZonePanelOpen.set(false);
}

/** Set the builder preview language */
export function setBuilderPreviewLanguage(lang: Language): void {
  builderPreviewLanguage.set(lang);
}
