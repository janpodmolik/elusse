/**
 * Centralized Color Constants
 * 
 * All UI colors should be defined here for consistency.
 * When changing a color, it will update everywhere it's used.
 * 
 * Usage:
 * - Import the specific color you need: import { COLORS } from '../constants/colors';
 * - Use in Svelte styles via CSS variables (injected at component level)
 * - Use in Phaser via hex values (0xRRGGBB format)
 */

/**
 * Convert hex string (#RRGGBB) to Phaser hex number (0xRRGGBB)
 */
export function hexToNumber(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}

/**
 * Primary accent colors for different UI elements
 */
export const ACCENT_COLORS = {
  /** Blue - Default selection, items, general UI */
  BLUE: '#4a90e2',
  
  /** Green - Success, confirm actions */
  GREEN: '#27ae60',
  
  /** Orange - Buttons, active states */
  ORANGE: '#e67e22',
  
  /** Red - Delete, danger actions */
  RED: '#e74c3c',
  
  /** Purple - Frames */
  PURPLE: '#9b59b6',
  
  /** Cyan - Social icons */
  CYAN: '#17a2b8',
  
  /** Teal - Alternative accent */
  TEAL: '#1abc9c',
  
  /** Yellow - Warnings, highlights */
  YELLOW: '#f1c40f',
  
  /** Pink - Special accents */
  PINK: '#e91e8f',
} as const;

/**
 * Selection colors for different object types in builder
 * Each type has unique color to distinguish them visually
 */
export const SELECTION_COLORS = {
  /** Items (assets) - Blue */
  ITEM: {
    css: ACCENT_COLORS.BLUE,
    hex: hexToNumber(ACCENT_COLORS.BLUE),
  },
  
  /** Frames - Purple */
  FRAME: {
    css: ACCENT_COLORS.PURPLE,
    hex: hexToNumber(ACCENT_COLORS.PURPLE),
  },
  
  /** Social icons - Pink */
  SOCIAL: {
    css: ACCENT_COLORS.PINK,
    hex: hexToNumber(ACCENT_COLORS.PINK),
  },
  
  /** Dialog zones - Teal */
  DIALOG_ZONE: {
    css: ACCENT_COLORS.TEAL,
    hex: hexToNumber(ACCENT_COLORS.TEAL),
  },
  
  /** Player - Green */
  PLAYER: {
    css: ACCENT_COLORS.GREEN,
    hex: hexToNumber(ACCENT_COLORS.GREEN),
  },
} as const;

/**
 * Button variant colors with hover/active states
 */
export const BUTTON_COLORS = {
  default: { base: ACCENT_COLORS.BLUE, hover: '#357abd', active: '#2a5f8f' },
  green: { base: ACCENT_COLORS.GREEN, hover: '#229954', active: '#1e8449' },
  blue: { base: '#3498db', hover: '#2980b9', active: '#21618c' },
  orange: { base: '#ffa500', hover: '#ff8c00', active: '#e67e00' },
  red: { base: ACCENT_COLORS.RED, hover: '#c0392b', active: '#a02e22' },
  purple: { base: ACCENT_COLORS.PURPLE, hover: '#8e44ad', active: '#7d3c98' },
  cyan: { base: ACCENT_COLORS.CYAN, hover: '#138496', active: '#0f6674' },
  pink: { base: ACCENT_COLORS.PINK, hover: '#c9177a', active: '#a31265' },
} as const;

/**
 * Drag tint color (applied to sprites while dragging)
 */
export const DRAG_TINT = hexToNumber(ACCENT_COLORS.BLUE);

/**
 * Background colors for UI panels
 */
export const PANEL_COLORS = {
  DARK: '#252540',
  MEDIUM: '#2d2d50',
  BORDER: '#4a4a5a',
} as const;
