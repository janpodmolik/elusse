/**
 * Social Types
 * Types for social media icons that can be placed in the world
 */

/**
 * Placed social icon in the game world
 */
export interface PlacedSocial {
  id: string;
  socialKey: string;       // e.g., 'discord', 'twitter', etc.
  x: number;
  y: number;
  scale?: number;          // Default: 4
  depth?: number;          // Default: DEPTH_LAYERS.ITEMS_FRONT
  url?: string;            // Link URL - opens in new tab when clicked
}

/**
 * Social asset definition
 */
export interface SocialDefinition {
  key: string;
  name: string;
  path: string;
  scale: number;
}

/**
 * Generate unique social ID
 */
export function generateSocialId(): string {
  return `social_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Social size preset
 */
export type SocialSize = 'S' | 'M' | 'L';

/**
 * Social size presets with their scale values
 */
export const SOCIAL_SIZES: Record<SocialSize, { label: string; scale: number }> = {
  'S': { label: 'Small', scale: 1.5 },
  'M': { label: 'Medium', scale: 2 },
  'L': { label: 'Large', scale: 2.5 },
} as const;

/**
 * Default social size
 */
export const DEFAULT_SOCIAL_SIZE: SocialSize = 'M';

/**
 * Default social scale
 */
export const DEFAULT_SOCIAL_SCALE = SOCIAL_SIZES['M'].scale;

/**
 * Get scale value from social size
 */
export function getScaleFromSize(size: SocialSize): number {
  return SOCIAL_SIZES[size].scale;
}

/**
 * Get social size from scale value
 */
export function getSizeFromScale(scale: number): SocialSize {
  if (scale <= SOCIAL_SIZES['S'].scale) return 'S';
  if (scale >= SOCIAL_SIZES['L'].scale) return 'L';
  return 'M';
}
