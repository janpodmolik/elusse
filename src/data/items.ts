/**
 * Item definition for placeable items in the game
 */
export interface ItemDefinition {
  /** Unique identifier for the item */
  key: string;
  /** Display name in UI */
  name: string;
  /** Path to the item file (relative to public/) */
  path: string;
  /** Default scale factor when placed in scene */
  scale: number;
  /** Optional category for grouping in UI */
  category?: string;
  /** Whether this item supports physics body (can block player) */
  supportsPhysics?: boolean;
}

/**
 * Central registry of all available items
 */
export const ITEMS: ItemDefinition[] = [
  {
    key: 'tent',
    name: 'Tent',
    path: 'assets/ui/tent.png',
    scale: 6,
    category: 'structures'
  },
  {
    key: 'lamp',
    name: 'Lamp',
    path: 'assets/ui/lamp.png',
    scale: 8,
    category: 'props'
  },
  {
    key: 'sign_left',
    name: 'Sign ←',
    path: 'assets/ui/sign_left.png',
    scale: 7,
    category: 'signs'
  },
  {
    key: 'sign_right',
    name: 'Sign →',
    path: 'assets/ui/sign_right.png',
    scale: 7,
    category: 'signs'
  },
  {
    key: 'stone_0',
    name: 'Stone 0',
    path: 'assets/ui/stone_0.png',
    scale: 4,
    category: 'nature',
    supportsPhysics: true
  },
  {
    key: 'stone_1',
    name: 'Stone 1',
    path: 'assets/ui/stone_1.png',
    scale: 5,
    category: 'nature',
    supportsPhysics: true
  },
  {
    key: 'stone_2',
    name: 'Stone 2',
    path: 'assets/ui/stone_2.png',
    scale: 4,
    category: 'nature',
    supportsPhysics: true
  },
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
 * Check if an item supports physics body
 */
export function itemSupportsPhysics(key: string): boolean {
  return getItem(key)?.supportsPhysics ?? false;
}
