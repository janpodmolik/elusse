import { ITEMS, ANIMATED_ITEMS } from './itemRegistry';
import type { ItemDefinition, ItemAnimationConfig } from './itemTypes';

export * from './itemTypes';
export { ITEMS, ANIMATED_ITEMS };

/**
 * Get item definition by key
 */
export function getItem(key: string): ItemDefinition | undefined {
  return ITEMS.find(item => item.key === key);
}

/**
 * Get default scale for an item
 */
export function getItemScale(key: string): number {
  return getItem(key)?.scale || 1;
}

/**
 * Get all items in a specific category
 */
export function getItemsByCategory(category: string): ItemDefinition[] {
  return ITEMS.filter(item => item.category === category);
}

/**
 * Check if an item is animated
 */
export function isAnimatedItem(key: string): boolean {
  return key in ANIMATED_ITEMS;
}

/**
 * Get animation config for an item
 */
export function getAnimationConfig(key: string): ItemAnimationConfig | undefined {
  return ANIMATED_ITEMS[key];
}

/**
 * Check if an item supports physics body
 */
export function itemSupportsPhysics(key: string): boolean {
  return getItem(key)?.supportsPhysics ?? false;
}
