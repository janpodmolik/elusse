/**
 * Frame Types
 * Types for text frames/bubbles that can be placed in the world
 */

import type { LocalizedText } from './DialogTypes';

/**
 * Placed frame in the game world
 * Visual text container with customizable appearance
 */
export interface PlacedFrame {
  id: string;
  frameKey: string;       // e.g., 'base_1', 'base_2', etc.
  x: number;
  y: number;
  scale?: number;         // Default: 1
  depth?: number;         // Default: 0
  backgroundColor: string; // Hex color for frame fill
  texts: LocalizedText[]; // Localized text content
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
 */
export const FRAME_COLORS = [
  '#ffffff', // White
  '#f8f8f8', // Light gray
  '#e0e0e0', // Gray
  '#fffacd', // Lemon chiffon
  '#ffefd5', // Papaya whip
  '#ffe4e1', // Misty rose
  '#e6e6fa', // Lavender
  '#f0fff0', // Honeydew
  '#f5fffa', // Mint cream
  '#fff0f5', // Lavender blush
  '#f0f8ff', // Alice blue
  '#fffff0', // Ivory
] as const;

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
