/**
 * Item definition for placeable items in the game
 */

export interface ItemAnimationConfig {
  frameWidth: number;
  frameHeight: number;
  frameRate?: number;
  repeat?: number;
  startFrame?: number;
  endFrame?: number;
}

export interface ItemDefinition {
  /** Unique identifier for the item */
  key: string;
  /** Display name in UI */
  name: string;
  /** Path to the item file (relative to public/) */
  path: string;
  /** Default scale factor when placed in scene */
  scale: number;
  /** Group identifier for background filtering */
  group: string;
  /** Optional category for grouping in UI */
  category?: string;
  /** Whether this item supports physics body (can block player) */
  supportsPhysics?: boolean;
}

/**
 * Registry of animated items and their configuration
 */
export const ANIMATED_ITEMS: Record<string, ItemAnimationConfig> = {
  'campfire': {
    frameWidth: 32,
    frameHeight: 32,
    frameRate: 10,
    repeat: -1,
    endFrame: 39
  }
};

/**
 * Central registry of all available items
 */
export const ITEMS: ItemDefinition[] = [
  {
    key: 'campfire',
    name: 'Campfire',
    path: 'assets/items/campfire.png',
    scale: 3,
    group: 'forest_summer',
    category: 'props'
  },
  {
    key: 'stone_0',
    name: 'Stone 0',
    path: 'assets/items/stone_0.png',
    scale: 4,
    group: 'shared',
    category: 'nature',
    supportsPhysics: true
  },
  {
    key: 'stone_1',
    name: 'Stone 1',
    path: 'assets/items/stone_1.png',
    scale: 4,
    group: 'shared',
    category: 'nature',
    supportsPhysics: true
  },
  {
    key: 'stone_2',
    name: 'Stone 2',
    path: 'assets/items/stone_2.png',
    scale: 4,
    group: 'shared',
    category: 'nature',
    supportsPhysics: true
  },
  {
    key: 'tent_large',
    name: 'Tent Large',
    path: 'assets/items/tent_large.png',
    scale: 4,
    group: 'forest_summer',
    category: 'structures'
  }
];

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
