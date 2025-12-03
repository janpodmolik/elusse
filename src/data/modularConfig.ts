/**
 * Modular Character Configuration
 * 
 * Defines the structure for building custom characters from layered PNG spritesheets.
 * Each PNG is 800×448 pixels = 10 columns × 7 rows grid.
 * Each animation occupies its own row.
 * 
 * Folder structure:
 * modular/{gender}/skins/
 * modular/{gender}/hair/
 * modular/{gender}/clothing/{subcategory}/  (underwear, legs, chest, feet, hats)
 */

export type Gender = 'male' | 'female';

// Main categories for UI tabs
export type ModularCategory = 'skins' | 'hair' | 'clothing';

// Subcategories within clothing (also determines layer order within clothing)
export type ClothingSubcategory = 'underwear' | 'legs' | 'chest' | 'feet' | 'hats';

export interface ModularAnimation {
  name: string;
  from: number;  // Start frame (0-indexed)
  to: number;    // End frame (0-indexed)
  frameCount: number;
  frameRate: number;  // FPS
}

export interface ModularItem {
  id: string;
  name: string;
  file: string;
  category: ModularCategory;
  subcategory?: ClothingSubcategory;  // Only for clothing items
  gender: Gender;
}

export interface ModularCharacterSelection {
  gender: Gender;
  skin: string | null;
  hair: string | null;
  clothing: string[];  // Multiple clothing items can be combined
}

// Frame dimensions
export const MODULAR_FRAME = {
  WIDTH: 80,
  HEIGHT: 64,
  COLUMNS: 10,
  ROWS: 7,
  TOTAL_FRAMES: 70,
} as const;

// Animations - each on its own row (row * 10 = start frame)
export const MODULAR_ANIMATIONS: ModularAnimation[] = [
  { name: 'idle', from: 0, to: 4, frameCount: 5, frameRate: 8 },
  { name: 'walk', from: 10, to: 17, frameCount: 8, frameRate: 10 },
  { name: 'run', from: 20, to: 27, frameCount: 8, frameRate: 12 },
  { name: 'jump', from: 30, to: 33, frameCount: 4, frameRate: 10 },
  { name: 'fall', from: 40, to: 43, frameCount: 4, frameRate: 10 },
  { name: 'attack', from: 50, to: 55, frameCount: 6, frameRate: 10 },
  { name: 'death', from: 60, to: 69, frameCount: 10, frameRate: 8 },
];

// Layer rendering order (bottom to top)
// Clothing renders between skins and hair, but hats render on top of hair
export const LAYER_ORDER: ModularCategory[] = ['skins', 'clothing', 'hair'];

// Clothing subcategory order for RENDERING (bottom to top, excludes hats)
// Note: hats are handled specially - they render AFTER hair
export const CLOTHING_LAYER_ORDER: ClothingSubcategory[] = ['underwear', 'legs', 'chest', 'feet'];

// Clothing subcategory order for UI tabs (includes hats)
export const CLOTHING_UI_ORDER: ClothingSubcategory[] = ['underwear', 'legs', 'chest', 'feet', 'hats'];

export const HATS_RENDER_AFTER_HAIR = true;

/**
 * Get asset path for a modular item
 */
export function getModularAssetPath(item: ModularItem): string {
  if (item.category === 'clothing' && item.subcategory) {
    return `assets/skins/modular/${item.gender}/clothing/${item.subcategory}/${item.file}`;
  }
  return `assets/skins/modular/${item.gender}/${item.category}/${item.file}`;
}

/**
 * Generate texture key for a modular item
 */
export function getModularTextureKey(item: ModularItem): string {
  if (item.subcategory) {
    return `modular-${item.gender}-${item.subcategory}-${item.id}`;
  }
  return `modular-${item.gender}-${item.category}-${item.id}`;
}

// ============================================================================
// Male Items
// ============================================================================

export const MALE_SKINS: ModularItem[] = [
  { id: 'male-skin-1', name: 'Skin 1', file: 'Male Skin1.png', category: 'skins', gender: 'male' },
  { id: 'male-skin-2', name: 'Skin 2', file: 'Male Skin2.png', category: 'skins', gender: 'male' },
  { id: 'male-skin-3', name: 'Skin 3', file: 'Male Skin3.png', category: 'skins', gender: 'male' },
  { id: 'male-skin-4', name: 'Skin 4', file: 'Male Skin4.png', category: 'skins', gender: 'male' },
  { id: 'male-skin-5', name: 'Skin 5', file: 'Male Skin5.png', category: 'skins', gender: 'male' },
];

export const MALE_HAIR: ModularItem[] = [
  { id: 'male-hair-1', name: 'Hair 1', file: 'Male Hair1.png', category: 'hair', gender: 'male' },
  { id: 'male-hair-2', name: 'Hair 2', file: 'Male Hair2.png', category: 'hair', gender: 'male' },
  { id: 'male-hair-3', name: 'Hair 3', file: 'Male Hair3.png', category: 'hair', gender: 'male' },
  { id: 'male-hair-4', name: 'Hair 4', file: 'Male Hair4.png', category: 'hair', gender: 'male' },
  { id: 'male-hair-5', name: 'Hair 5', file: 'Male Hair5.png', category: 'hair', gender: 'male' },
];

export const MALE_CLOTHING: ModularItem[] = [
  // Underwear
  { id: 'male-underwear-green', name: 'Green Underwear', file: 'Green Underwear.png', category: 'clothing', subcategory: 'underwear', gender: 'male' },
  { id: 'male-underwear-orange', name: 'Orange Underwear', file: 'Orange Underwear.png', category: 'clothing', subcategory: 'underwear', gender: 'male' },
  { id: 'male-underwear-purple', name: 'Purple Underwear', file: 'Purple Underwear.png', category: 'clothing', subcategory: 'underwear', gender: 'male' },
  { id: 'male-underwear-red', name: 'Red Underwear', file: 'Red Underwear.png', category: 'clothing', subcategory: 'underwear', gender: 'male' },
  { id: 'male-underwear-skyblue', name: 'Skyblue Underwear', file: 'Skyblue Underwear.png', category: 'clothing', subcategory: 'underwear', gender: 'male' },
  // Legs (pants)
  { id: 'male-pants', name: 'Pants', file: 'Pants.png', category: 'clothing', subcategory: 'legs', gender: 'male' },
  { id: 'male-pants-blue', name: 'Blue Pants', file: 'Blue Pants.png', category: 'clothing', subcategory: 'legs', gender: 'male' },
  { id: 'male-pants-green', name: 'Green Pants', file: 'Green Pants.png', category: 'clothing', subcategory: 'legs', gender: 'male' },
  { id: 'male-pants-orange', name: 'Orange Pants', file: 'Orange Pants.png', category: 'clothing', subcategory: 'legs', gender: 'male' },
  { id: 'male-pants-purple', name: 'Purple Pants', file: 'Purple Pants.png', category: 'clothing', subcategory: 'legs', gender: 'male' },
  // Chest (shirts)
  { id: 'male-shirt', name: 'Shirt', file: 'Shirt.png', category: 'clothing', subcategory: 'chest', gender: 'male' },
  { id: 'male-shirt-v2', name: 'Shirt v2', file: 'Shirt v2.png', category: 'clothing', subcategory: 'chest', gender: 'male' },
  { id: 'male-shirt-blue', name: 'Blue Shirt', file: 'Blue Shirt v2.png', category: 'clothing', subcategory: 'chest', gender: 'male' },
  { id: 'male-shirt-green', name: 'Green Shirt', file: 'Green Shirt v2.png', category: 'clothing', subcategory: 'chest', gender: 'male' },
  { id: 'male-shirt-orange', name: 'Orange Shirt', file: 'orange Shirt v2.png', category: 'clothing', subcategory: 'chest', gender: 'male' },
  { id: 'male-shirt-purple', name: 'Purple Shirt', file: 'Purple Shirt v2.png', category: 'clothing', subcategory: 'chest', gender: 'male' },
  // Feet (shoes/boots)
  { id: 'male-shoes', name: 'Shoes', file: 'Shoes.png', category: 'clothing', subcategory: 'feet', gender: 'male' },
  { id: 'male-boots', name: 'Boots', file: 'Boots.png', category: 'clothing', subcategory: 'feet', gender: 'male' },
  // Hats
  { id: 'male-hat-1', name: 'Hat 1', file: 'Male Hat1.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-hat-2', name: 'Hat 2', file: 'Male Hat2.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-hat-3', name: 'Hat 3', file: 'Male Hat3.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-hat-4', name: 'Hat 4', file: 'Male Hat4.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-hat-5', name: 'Hat 5', file: 'Male Hat5.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-hat-6', name: 'Hat 6', file: 'Male Hat6.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-hat-7', name: 'Hat 7', file: 'Male Hat7.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-hat-8', name: 'Hat 8', file: 'Male Hat8.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-hat-9', name: 'Hat 9', file: 'Male Hat9.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-hat-10', name: 'Hat 10', file: 'Male Hat10.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-cap-blue', name: 'Blue Cap', file: 'Male Blue cap.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-cap-green', name: 'Green Cap', file: 'Male Green cap.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-cap-orange', name: 'Orange Cap', file: 'Male Orange cap.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-cap-purple', name: 'Purple Cap', file: 'Male Purple cap.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-cap-red', name: 'Red Cap', file: 'Male Red cap.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-farming-hat', name: 'Farming Hat', file: 'Farming Hat M.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-guard-helmet', name: 'Guard Helmet', file: 'Guard Helmet.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-mining-helmet', name: 'Mining Helmet', file: 'Male Mining Helmet.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-pumpkin', name: 'Pumpkin Hat', file: 'Pumpkin hat.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-santa', name: 'Santa Hat', file: 'Male Santa hat.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-viking', name: 'Viking Helmet', file: 'Viking Helmet.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
  { id: 'male-viking-horns', name: 'Viking Helmet (Horns)', file: 'Viking Helmet with horns.png', category: 'clothing', subcategory: 'hats', gender: 'male' },
];

// ============================================================================
// Female Items
// ============================================================================

export const FEMALE_SKINS: ModularItem[] = [
  { id: 'female-skin-1', name: 'Skin 1', file: 'Female Skin1.png', category: 'skins', gender: 'female' },
  { id: 'female-skin-2', name: 'Skin 2', file: 'Female Skin2.png', category: 'skins', gender: 'female' },
  { id: 'female-skin-3', name: 'Skin 3', file: 'Female Skin3.png', category: 'skins', gender: 'female' },
  { id: 'female-skin-4', name: 'Skin 4', file: 'Female Skin4.png', category: 'skins', gender: 'female' },
  { id: 'female-skin-5', name: 'Skin 5', file: 'Female Skin5.png', category: 'skins', gender: 'female' },
];

export const FEMALE_HAIR: ModularItem[] = [
  { id: 'female-hair-1', name: 'Hair 1', file: 'Female Hair1.png', category: 'hair', gender: 'female' },
  { id: 'female-hair-2', name: 'Hair 2', file: 'Female Hair2.png', category: 'hair', gender: 'female' },
  { id: 'female-hair-3', name: 'Hair 3', file: 'Female Hair3.png', category: 'hair', gender: 'female' },
  { id: 'female-hair-4', name: 'Hair 4', file: 'Female Hair4.png', category: 'hair', gender: 'female' },
  { id: 'female-hair-5', name: 'Hair 5', file: 'Female Hair5.png', category: 'hair', gender: 'female' },
];

export const FEMALE_CLOTHING: ModularItem[] = [
  // Underwear
  { id: 'female-bra-panties', name: 'Bra & Panties', file: 'Blue Panties and Bra.png', category: 'clothing', subcategory: 'underwear', gender: 'female' },
  { id: 'female-bra-panties-green', name: 'Green Bra & Panties', file: 'Green Panties and Bra.png', category: 'clothing', subcategory: 'underwear', gender: 'female' },
  { id: 'female-bra-panties-orange', name: 'Orange Bra & Panties', file: 'Orange Panties and Bra.png', category: 'clothing', subcategory: 'underwear', gender: 'female' },
  { id: 'female-bra-panties-purple', name: 'Purple Bra & Panties', file: 'Purple Panties and Bra.png', category: 'clothing', subcategory: 'underwear', gender: 'female' },
  { id: 'female-bra-panties-red', name: 'Red Bra & Panties', file: 'Red Panties and Bra.png', category: 'clothing', subcategory: 'underwear', gender: 'female' },
  { id: 'female-bra-panties-skyblue', name: 'Skyblue Bra & Panties', file: 'Skyblue Panties and Bra.png', category: 'clothing', subcategory: 'underwear', gender: 'female' },
  // Legs (skirt)
  { id: 'female-skirt', name: 'Skirt', file: 'Skirt.png', category: 'clothing', subcategory: 'legs', gender: 'female' },
  // Chest (corsets)
  { id: 'female-corset', name: 'Corset', file: 'Corset.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  { id: 'female-corset-v2', name: 'Corset v2', file: 'Corset v2.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  { id: 'female-corset-blue', name: 'Blue Corset', file: 'Blue Corset.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  { id: 'female-corset-blue-v2', name: 'Blue Corset v2', file: 'Blue Corset v2.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  { id: 'female-corset-green', name: 'Green Corset', file: 'Green Corset.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  { id: 'female-corset-green-v2', name: 'Green Corset v2', file: 'Green Corset v2.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  { id: 'female-corset-orange', name: 'Orange Corset', file: 'Orange Corset.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  { id: 'female-corset-orange-v2', name: 'Orange Corset v2', file: 'Orange Corset v2.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  { id: 'female-corset-purple', name: 'Purple Corset', file: 'Purple Corset.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  { id: 'female-corset-purple-v2', name: 'Purple Corset v2', file: 'Purple Corset v2.png', category: 'clothing', subcategory: 'chest', gender: 'female' },
  // Feet (socks/boots)
  { id: 'female-socks', name: 'Socks', file: 'Socks.png', category: 'clothing', subcategory: 'feet', gender: 'female' },
  { id: 'female-socks-green', name: 'Green Socks', file: 'Green Socks.png', category: 'clothing', subcategory: 'feet', gender: 'female' },
  { id: 'female-socks-orange', name: 'Orange Socks', file: 'Orange Socks.png', category: 'clothing', subcategory: 'feet', gender: 'female' },
  { id: 'female-socks-purple', name: 'Purple Socks', file: 'Purple Socks.png', category: 'clothing', subcategory: 'feet', gender: 'female' },
  { id: 'female-socks-red', name: 'Red Socks', file: 'Red Socks.png', category: 'clothing', subcategory: 'feet', gender: 'female' },
  { id: 'female-socks-skyblue', name: 'Skyblue Socks', file: 'Skyblue Socks.png', category: 'clothing', subcategory: 'feet', gender: 'female' },
  { id: 'female-boots', name: 'Boots', file: 'Boots.png', category: 'clothing', subcategory: 'feet', gender: 'female' },
  // Hats
  { id: 'female-hat-1', name: 'Hat 1', file: 'Female Hat1.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-hat-2', name: 'Hat 2', file: 'Female Hat2.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-hat-3', name: 'Hat 3', file: 'Female Hat3.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-hat-4', name: 'Hat 4', file: 'Female Hat4.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-hat-5', name: 'Hat 5', file: 'Female Hat5.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-bunny-1', name: 'Bunny Ears 1', file: 'Bunny ears1.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-bunny-2', name: 'Bunny Ears 2', file: 'Bunny ears2.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-bunny-3', name: 'Bunny Ears 3', file: 'Bunny ears3.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-bunny-4', name: 'Bunny Ears 4', file: 'Bunny ears4.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-bunny-5', name: 'Bunny Ears 5', file: 'Bunny ears5.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-cap-blue', name: 'Blue Cap', file: 'Female Blue cap.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-cap-green', name: 'Green Cap', file: 'Female Green cap.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-cap-orange', name: 'Orange Cap', file: 'Female Orange cap.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-cap-purple', name: 'Purple Cap', file: 'Female Purple cap.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-cap-red', name: 'Red Cap', file: 'Female Red cap.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-farming-hat', name: 'Farming Hat', file: 'Farming Hat F.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-mining-helmet', name: 'Mining Helmet', file: 'Female Mining Helmet.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-santa', name: 'Santa Hat', file: 'Female Santa hat.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
  { id: 'female-witch', name: 'Witch Hat', file: 'Witch hat.png', category: 'clothing', subcategory: 'hats', gender: 'female' },
];

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Get all items for a gender organized by category
 */
export function getItemsForGender(gender: Gender): Record<ModularCategory, ModularItem[]> {
  if (gender === 'male') {
    return {
      skins: MALE_SKINS,
      hair: MALE_HAIR,
      clothing: MALE_CLOTHING,
    };
  }
  return {
    skins: FEMALE_SKINS,
    hair: FEMALE_HAIR,
    clothing: FEMALE_CLOTHING,
  };
}

/**
 * Get clothing items grouped by subcategory
 */
export function getClothingBySubcategory(gender: Gender): Record<ClothingSubcategory, ModularItem[]> {
  const clothing = gender === 'male' ? MALE_CLOTHING : FEMALE_CLOTHING;
  
  const result: Record<ClothingSubcategory, ModularItem[]> = {
    underwear: [],
    legs: [],
    chest: [],
    feet: [],
    hats: [],
  };
  
  clothing.forEach(item => {
    if (item.subcategory) {
      result[item.subcategory].push(item);
    }
  });
  
  return result;
}

/**
 * Get item by ID
 */
export function getItemById(id: string): ModularItem | undefined {
  const allItems = [
    ...MALE_SKINS, ...MALE_HAIR, ...MALE_CLOTHING,
    ...FEMALE_SKINS, ...FEMALE_HAIR, ...FEMALE_CLOTHING,
  ];
  return allItems.find(item => item.id === id);
}

/**
 * Get all items that need to be loaded for a character selection
 */
export function getItemsForSelection(selection: ModularCharacterSelection): ModularItem[] {
  const items: ModularItem[] = [];
  
  if (selection.skin) {
    const skinItem = getItemById(selection.skin);
    if (skinItem) items.push(skinItem);
  }
  
  if (selection.hair) {
    const hairItem = getItemById(selection.hair);
    if (hairItem) items.push(hairItem);
  }
  
  selection.clothing.forEach(clothingId => {
    const clothingItem = getItemById(clothingId);
    if (clothingItem) items.push(clothingItem);
  });
  
  return items;
}

/**
 * Sort clothing items by layer order for rendering (excludes hats)
 */
export function sortClothingByLayer(clothingIds: string[]): string[] {
  // Filter out hats - they render separately after hair
  const nonHats = clothingIds.filter(id => {
    const item = getItemById(id);
    return item?.subcategory !== 'hats';
  });
  
  return nonHats.sort((a, b) => {
    const itemA = getItemById(a);
    const itemB = getItemById(b);
    
    if (!itemA?.subcategory || !itemB?.subcategory) return 0;
    
    const indexA = CLOTHING_LAYER_ORDER.indexOf(itemA.subcategory);
    const indexB = CLOTHING_LAYER_ORDER.indexOf(itemB.subcategory);
    
    return indexA - indexB;
  });
}

/**
 * Get hat items from clothing selection
 */
export function getHatsFromClothing(clothingIds: string[]): string[] {
  return clothingIds.filter(id => {
    const item = getItemById(id);
    return item?.subcategory === 'hats';
  });
}

/**
 * Create default character selection
 */
export function createDefaultSelection(gender: Gender): ModularCharacterSelection {
  const items = getItemsForGender(gender);
  return {
    gender,
    skin: items.skins[0]?.id ?? null,
    hair: items.hair[0]?.id ?? null,
    clothing: [],
  };
}
