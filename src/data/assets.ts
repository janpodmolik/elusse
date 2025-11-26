/**
 * Asset definition for placeable items in the game
 */
export interface AssetDefinition {
  /** Unique identifier for the asset */
  key: string;
  /** Display name in UI */
  name: string;
  /** Path to the asset file (relative to public/) */
  path: string;
  /** Default scale factor when placed in scene */
  scale: number;
  /** Optional category for grouping in UI */
  category?: string;
}

/**
 * Central registry of all available assets
 */
export const ASSETS: AssetDefinition[] = [
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
    category: 'nature'
  },
  {
    key: 'stone_1',
    name: 'Stone 1',
    path: 'assets/ui/stone_1.png',
    scale: 5,
    category: 'nature'
  },
  {
    key: 'stone_2',
    name: 'Stone 2',
    path: 'assets/ui/stone_2.png',
    scale: 4,
    category: 'nature'
  },
];

/**
 * Get asset definition by key
 */
export function getAsset(key: string): AssetDefinition | undefined {
  return ASSETS.find(asset => asset.key === key);
}

/**
 * Get default scale for an asset
 */
export function getAssetScale(key: string): number {
  return getAsset(key)?.scale || 1;
}

/**
 * Get all assets in a specific category
 */
export function getAssetsByCategory(category: string): AssetDefinition[] {
  return ASSETS.filter(asset => asset.category === category);
}
