/**
 * Frame Types
 * Types for text frames/bubbles that can be placed in the world
 */

/**
 * Localized frame text (single text field per language)
 */
export interface FrameLocalizedText {
  language: string;  // 'cs', 'en', etc.
  text: string;      // Single text content
}

/**
 * Placed frame in the game world
 * Visual text container with customizable appearance
 */
export interface PlacedFrame {
  id: string;
  frameKey: string;       // e.g., 'base_1', 'base_2', etc.
  x: number;
  y: number;
  scale?: number;         // Default: 4
  depth?: number;         // Default: 0
  rotation?: number;      // 0 or 90 degrees
  backgroundColor: string; // Hex color for frame fill
  textColor?: string;      // Hex color for text (default: #333333)
  textSize?: number;       // Font size in pixels (default: 16)
  textAlign?: TextAlign;   // Vertical text alignment (default: 'center')
  texts: FrameLocalizedText[]; // Localized text content (single text per language)
  url?: string;           // Optional hyperlink - opens in new tab when clicked
}

/**
 * Frame asset definition
 */
export interface FrameDefinition {
  key: string;
  name: string;
  path: string;
  scale: number;
}

/**
 * Generate unique frame ID
 */
export function generateFrameId(): string {
  return `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Available colors for frame background (pixel art friendly palette)
 * Includes light and dark variants
 */
export const FRAME_COLORS = [
  // Light colors
  '#ffffff', // White
  '#f8f8f8', // Light gray
  '#fffacd', // Lemon chiffon
  '#ffefd5', // Papaya whip
  '#ffe4e1', // Misty rose
  '#e6e6fa', // Lavender
  '#f0fff0', // Honeydew
  '#f5fffa', // Mint cream
  '#fff0f5', // Lavender blush
  '#f0f8ff', // Alice blue
  // Dark colors
  '#2d2d2d', // Dark gray
  '#1a1a2e', // Dark blue
  '#16213e', // Navy
  '#1a1a1a', // Near black
  '#2d132c', // Dark purple
  '#1e3a3a', // Dark teal
  '#3d1a1a', // Dark red
  '#1a2f1a', // Dark green
  '#3d3d1a', // Dark yellow
  '#2a1a3d', // Deep purple
] as const;

/**
 * Available text colors
 */
export const TEXT_COLORS = [
  '#333333', // Dark gray (default)
  '#000000', // Black
  '#ffffff', // White
  '#1a1a1a', // Near black
  '#666666', // Medium gray
  '#8b4513', // Brown
  '#2c3e50', // Dark blue gray
  '#c0392b', // Red
  '#27ae60', // Green
  '#2980b9', // Blue
  '#8e44ad', // Purple
  '#f39c12', // Orange
] as const;

/**
 * Available text sizes
 */
export const TEXT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32] as const;

/**
 * Text vertical alignment
 */
export type TextAlign = 'top' | 'center' | 'bottom';

/**
 * Text alignment options
 */
export const TEXT_ALIGNMENTS: { value: TextAlign; label: string; icon: string }[] = [
  { value: 'top', label: 'Top', icon: '↑' },
  { value: 'center', label: 'Center', icon: '⬌' },
  { value: 'bottom', label: 'Bottom', icon: '↓' },
] as const;

/**
 * Frame size preset
 */
export type FrameSize = 'S' | 'M' | 'L';

/**
 * Frame size presets with their scale values
 */
export const FRAME_SIZES: Record<FrameSize, { label: string; scale: number }> = {
  'S': { label: 'Small', scale: 3 },
  'M': { label: 'Medium', scale: 4 },
  'L': { label: 'Large', scale: 5 },
} as const;

/**
 * Default frame size
 */
export const DEFAULT_FRAME_SIZE: FrameSize = 'M';

/**
 * Get scale value from frame size
 */
export function getScaleFromSize(size: FrameSize): number {
  return FRAME_SIZES[size].scale;
}

/**
 * Get frame size from scale value
 */
export function getSizeFromScale(scale: number): FrameSize {
  if (scale <= 3) return 'S';
  if (scale >= 5) return 'L';
  return 'M';
}

/**
 * Get random frame background color
 */
export function getRandomFrameColor(): string {
  return FRAME_COLORS[Math.floor(Math.random() * FRAME_COLORS.length)];
}

/**
 * Default frame values
 */
export const DEFAULT_FRAME_SCALE = 4;
export const DEFAULT_FRAME_COLOR = '#ffffff';
export const DEFAULT_TEXT_COLOR = '#333333';
export const DEFAULT_TEXT_SIZE = 16;
export const DEFAULT_TEXT_ALIGN: TextAlign = 'center';
