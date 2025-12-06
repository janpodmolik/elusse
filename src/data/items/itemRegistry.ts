import type { ItemDefinition, ItemAnimationConfig } from './itemTypes';

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
  },
  'campfire_large': {
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
  // --- Shared Items ---
  {
    key: 'campfire',
    name: 'Campfire Small',
    path: 'assets/items/campfire.png',
    scale: 3,
    group: 'shared',
    category: 'props'
  },
  {
    key: 'campfire_large',
    name: 'Campfire Large',
    path: 'assets/items/campfire.png',
    scale: 5,
    group: 'shared',
    category: 'props'
  },

  {
    key: 'stones_0',
    name: 'Stones 0',
    path: 'assets/items/stones_0.png',
    scale: 4,
    group: 'shared',
    category: 'nature',
    supportsPhysics: true
  },
  {
    key: 'stones_1',
    name: 'Stones 1',
    path: 'assets/items/stones_1.png',
    scale: 4,
    group: 'shared',
    category: 'nature',
    supportsPhysics: true
  },
  {
    key: 'stones_3',
    name: 'Stones 3',
    path: 'assets/items/stones_3.png',
    scale: 4,
    group: 'shared',
    category: 'nature',
    supportsPhysics: true
  },
  {
    key: 'stones_4',
    name: 'Stones 4',
    path: 'assets/items/stones_4.png',
    scale: 4,
    group: 'shared',
    category: 'nature',
    supportsPhysics: true
  },
  {
    key: 'barell',
    name: 'Barrel',
    path: 'assets/items/barell.png',
    scale: 4,
    group: 'shared',
    category: 'props',
    supportsPhysics: true
  },
  {
    key: 'box',
    name: 'Box',
    path: 'assets/items/box.png',
    scale: 4,
    group: 'shared',
    category: 'props',
    supportsPhysics: true
  },
  {
    key: 'chair',
    name: 'Chair',
    path: 'assets/items/chair.png',
    scale: 4,
    group: 'shared',
    category: 'furniture'
  },
  {
    key: 'stool',
    name: 'Stool',
    path: 'assets/items/stool.png',
    scale: 4,
    group: 'shared',
    category: 'furniture'
  },
  {
    key: 'table_small',
    name: 'Table Small',
    path: 'assets/items/table_small.png',
    scale: 4,
    group: 'shared',
    category: 'furniture'
  },
  {
    key: 'table_full',
    name: 'Table Full',
    path: 'assets/items/table_full.png',
    scale: 4,
    group: 'forest_summer',
    category: 'furniture'
  },
  {
    key: 'kettle',
    name: 'Kettle',
    path: 'assets/items/kettle.png',
    scale: 4,
    group: 'shared',
    category: 'props'
  },
  {
    key: 'log_axe',
    name: 'Log with Axe',
    path: 'assets/items/log_axe.png',
    scale: 4,
    group: 'shared',
    category: 'props'
  },
  {
    key: 'log_chisel',
    name: 'Log with Chisel',
    path: 'assets/items/log_chisel.png',
    scale: 4,
    group: 'shared',
    category: 'props'
  },
  {
    key: 'apple_basket',
    name: 'Apple Basket',
    path: 'assets/items/apple_basket.png',
    scale: 4,
    group: 'shared',
    category: 'props'
  },
  {
    key: 'apples',
    name: 'Apples',
    path: 'assets/items/apples.png',
    scale: 4,
    group: 'forest_summer',
    category: 'props'
  },
  {
    key: 'pumpkin',
    name: 'Pumpkin',
    path: 'assets/items/pumpkin.png',
    scale: 4,
    group: 'forest_summer',
    category: 'nature'
  },
  {
    key: 'pumpkin_helloween',
    name: 'Pumpkin Halloween',
    path: 'assets/items/pumpkin_helloween.png',
    scale: 4,
    group: 'forest_summer',
    category: 'props'
  },
  {
    key: 'scarecrow',
    name: 'Scarecrow',
    path: 'assets/items/scarecrow.png',
    scale: 4,
    group: 'forest_summer',
    category: 'props'
  },
  {
    key: 'sign_skogen',
    name: 'Sign Skogen',
    path: 'assets/items/sign_skogen.png',
    scale: 4,
    group: 'forest_shared',
    category: 'props'
  },
  {
    key: 'statue',
    name: 'Statue',
    path: 'assets/items/statue.png',
    scale: 4,
    group: 'shared',
    category: 'props',
    supportsPhysics: true
  },
  {
    key: 'wall',
    name: 'Wall',
    path: 'assets/items/wall.png',
    scale: 4,
    group: 'forest_summer',
    category: 'structures',
  },
  {
    key: 'hanger',
    name: 'Hanger',
    path: 'assets/items/hanger.png',
    scale: 4,
    group: 'forest_summer',
    category: 'furniture'
  },
  {
    key: 'cauldron_campfire',
    name: 'Cauldron Campfire',
    path: 'assets/items/cauldron_campfire.png',
    scale: 4,
    group: 'shared',
    category: 'props'
  },
  {
    key: 'ore_copper',
    name: 'Ore Copper',
    path: 'assets/items/ore_copper.png',
    scale: 4,
    group: 'cave_dark',
    category: 'nature'
  },
  {
    key: 'ore_dia',
    name: 'Ore Diamond',
    path: 'assets/items/ore_dia.png',
    scale: 4,
    group: 'cave_dark',
    category: 'nature'
  },
  {
    key: 'ore_gold',
    name: 'Ore Gold',
    path: 'assets/items/ore_gold.png',
    scale: 4,
    group: 'cave_dark',
    category: 'nature'
  },
  {
    key: 'ore_tin',
    name: 'Ore Tin',
    path: 'assets/items/ore_tin.png',
    scale: 4,
    group: 'cave_dark',
    category: 'nature'
  },

  // --- Forest Summer Items ---
  {
    key: 'tent_large',
    name: 'Tent Large',
    path: 'assets/items/tent_large.png',
    scale: 4,
    group: 'forest_summer',
    category: 'structures'
  },
  {
    key: 'tent',
    name: 'Tent Small',
    path: 'assets/items/tent.png',
    scale: 4,
    group: 'forest_summer',
    category: 'structures'
  },
  {
    key: 'bush_0',
    name: 'Bush 0',
    path: 'assets/items/bush_0.png',
    scale: 4,
    group: 'forest_summer',
    category: 'nature'
  },
  {
    key: 'bush_1',
    name: 'Bush 1',
    path: 'assets/items/bush_1.png',
    scale: 4,
    group: 'forest_summer',
    category: 'nature'
  },
  {
    key: 'bush_2',
    name: 'Bush 2',
    path: 'assets/items/bush_2.png',
    scale: 4,
    group: 'forest_summer',
    category: 'nature'
  },
  {
    key: 'grass',
    name: 'Grass',
    path: 'assets/items/grass.png',
    scale: 4,
    group: 'forest_summer',
    category: 'nature'
  },
  {
    key: 'grass_0',
    name: 'Grass 0',
    path: 'assets/items/grass_0.png',
    scale: 4,
    group: 'forest_summer',
    category: 'nature'
  },
  {
    key: 'tree_picea',
    name: 'Tree Picea',
    path: 'assets/items/tree_picea.png',
    scale: 4,
    group: 'forest_summer',
    category: 'nature'
  },
  {
    key: 'tree_pinus',
    name: 'Tree Pinus',
    path: 'assets/items/tree_pinus.png',
    scale: 4,
    group: 'forest_summer',
    category: 'nature'
  },

  // --- Cave / Dark Items (Assumed based on names) ---
  {
    key: 'grave_0',
    name: 'Grave 0',
    path: 'assets/items/grave_0.png',
    scale: 4,
    group: 'forest_shared',
    category: 'props'
  },
  {
    key: 'grave_1',
    name: 'Grave 1',
    path: 'assets/items/grave_1.png',
    scale: 4,
    group: 'forest_shared',
    category: 'props'
  },
  {
    key: 'grave_2',
    name: 'Grave 2',
    path: 'assets/items/grave_2.png',
    scale: 4,
    group: 'forest_shared',
    category: 'props'
  },
  {
    key: 'grave_3',
    name: 'Grave 3',
    path: 'assets/items/grave_3.png',
    scale: 4,
    group: 'forest_shared',
    category: 'props'
  },
  {
    key: 'grave_4',
    name: 'Grave 4',
    path: 'assets/items/grave_4.png',
    scale: 4,
    group: 'forest_shared',
    category: 'props'
  },
  {
    key: 'icebush_0',
    name: 'Ice Bush 0',
    path: 'assets/items/icebush_0.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icebush_1',
    name: 'Ice Bush 1',
    path: 'assets/items/icebush_1.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icebush_2',
    name: 'Ice Bush 2',
    path: 'assets/items/icebush_2.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icestones_0',
    name: 'Ice Stones 0',
    path: 'assets/items/icestones_0.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icestones_1',
    name: 'Ice Stones 1',
    path: 'assets/items/icestones_1.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icestones_2',
    name: 'Ice Stones 2',
    path: 'assets/items/icestones_2.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icestones_3',
    name: 'Ice Stones 3',
    path: 'assets/items/icestones_3.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icestones_4',
    name: 'Ice Stones 4',
    path: 'assets/items/icestones_4.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icestones_5',
    name: 'Ice Stones 5',
    path: 'assets/items/icestones_5.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icestones_6',
    name: 'Ice Stones 6',
    path: 'assets/items/icestones_6.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'icestones_7',
    name: 'Ice Stones 7',
    path: 'assets/items/icestones_7.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  },
  {
    key: 'snow_pile',
    name: 'Snow Pile',
    path: 'assets/items/snow_pile.png',
    scale: 4,
    group: 'forest_birch',
    category: 'nature'
  }
];
