/**
 * Social definitions for placeable social media icons
 * 
 * This module provides:
 * - Social asset definitions (SOCIALS registry)
 * - Social lookup functions
 */

import type { SocialDefinition } from '../types/SocialTypes';
import { DEFAULT_SOCIAL_SCALE } from '../types/SocialTypes';

// ==================== Social Registry ====================

/**
 * Central registry of all available social icons
 * Note: Individual scale values are not used - DEFAULT_SOCIAL_SCALE from SocialTypes.ts is used instead
 */
export const SOCIALS: SocialDefinition[] = [
  { key: 'discord', name: 'Discord', path: 'assets/socials/Discord.png', scale: 1 },
  { key: 'facebook', name: 'Facebook', path: 'assets/socials/Facebook.png', scale: 1 },
  { key: 'instagram', name: 'Instagram', path: 'assets/socials/Instagram.png', scale: 1 },
  { key: 'kofi', name: 'Ko-Fi', path: 'assets/socials/Ko Fi.png', scale: 1 },
  { key: 'linkedin', name: 'LinkedIn', path: 'assets/socials/LinkedIn.png', scale: 1 },
  { key: 'patreon', name: 'Patreon', path: 'assets/socials/Patreon.png', scale: 1 },
  { key: 'tiktok', name: 'TikTok', path: 'assets/socials/TikTok.png', scale: 1 },
  { key: 'twitch', name: 'Twitch', path: 'assets/socials/Twitch.png', scale: 1 },
  { key: 'twitter', name: 'Twitter', path: 'assets/socials/Twitter.png', scale: 1 },
  { key: 'whatsapp', name: 'WhatsApp', path: 'assets/socials/Whatsapp.png', scale: 1 },
  { key: 'youtube', name: 'YouTube', path: 'assets/socials/Youtube.png', scale: 1 },
];

// ==================== Social Lookup ====================

/**
 * Get social definition by key
 */
export function getSocial(key: string): SocialDefinition | undefined {
  return SOCIALS.find(social => social.key === key);
}

/**
 * Get default scale for a social
 */
export function getSocialScale(key: string): number {
  return getSocial(key)?.scale ?? DEFAULT_SOCIAL_SCALE;
}
