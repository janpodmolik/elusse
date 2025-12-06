/**
 * Map configuration interface
 * Defines structure for JSON-based map configuration
 */

import { getItemScale } from './items';
import { getItemDepth } from '../constants/depthLayers';
import type { DialogZone, LocalizedText } from '../types/DialogTypes';
import type { PlacedFrame } from '../types/FrameTypes';
import type { PlacedSocial } from '../types/SocialTypes';

/**
 * Placed NPC in the game world
 */
export interface PlacedNPC {
  id: string;
  npcId: string; // ID from NPC_REGISTRY
  x: number;
  y: number;
  scale?: number;
  flipX?: boolean;
  dialog?: LocalizedText[]; // Optional dialog content
  triggerRadius?: number; // Proximity radius for dialog trigger (default: 200)
}

/**
 * Placed item in the game world
 * Represents any visual asset that can be positioned (with or without dialog functionality)
 */
export interface PlacedItem {
  id: string;
  assetKey: string; // e.g., 'tent', 'lamp', 'sign_left', 'stone_0'
  x: number;
  y: number;
  scale?: number; // Default: 1
  depth?: number; // Default: 0
  yOffset?: number; // Additional Y offset (for fine-tuning vertical position)
  physicsEnabled?: boolean; // Whether this item has physics body that blocks player (default: false)
  flipX?: boolean; // Horizontal flip (default: false)
}

export interface MapConfig {
  worldWidth: number;
  worldHeight: number;
  playerStartX: number;
  playerStartY: number;
  placedItems?: PlacedItem[];
  dialogZones?: DialogZone[];
  placedFrames?: PlacedFrame[];
  placedSocials?: PlacedSocial[];
  placedNPCs?: PlacedNPC[];
}

/**
 * Load map configuration from JSON file
 * Throws error if loading fails
 */
export async function loadMapConfig(): Promise<MapConfig> {
  const response = await fetch('./config/map.json');
  if (!response.ok) {
    throw new Error(`Failed to load map config: ${response.status}`);
  }
  const config: MapConfig = await response.json();
  
  // Basic validation
  if (!config.worldWidth || !config.worldHeight) {
    throw new Error('Invalid map config structure');
  }
  
  return config;
}

// ============================================
// PlacedItem Factory
// ============================================

/**
 * Options for creating a new PlacedItem
 */
export interface CreatePlacedItemOptions {
  assetKey: string;
  x: number;
  yOffset?: number;
  depthLayer?: 'behind' | 'front';
  scale?: number;
}

/**
 * Factory for creating PlacedItem objects
 * Centralizes item creation logic for consistency
 */
export const PlacedItemFactory = {
  /**
   * Generate unique item ID
   */
  generateId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  /**
   * Create a new PlacedItem with default values
   */
  create(options: CreatePlacedItemOptions): PlacedItem {
    const { assetKey, x, yOffset = 0, depthLayer = 'behind', scale } = options;
    
    return {
      id: PlacedItemFactory.generateId(),
      assetKey,
      x: Math.round(x),
      y: 0, // Always 0, position is calculated from yOffset
      scale: scale ?? getItemScale(assetKey),
      depth: getItemDepth(depthLayer),
      yOffset: Math.round(yOffset),
    };
  },
  
  /**
   * Create item at world coordinates (converts to yOffset)
   */
  createAtWorldPosition(
    assetKey: string,
    worldX: number,
    worldY: number,
    groundY: number,
    depthLayer: 'behind' | 'front' = 'behind'
  ): PlacedItem {
    return PlacedItemFactory.create({
      assetKey,
      x: worldX,
      yOffset: worldY - groundY,
      depthLayer,
    });
  },
  
  /**
   * Clone an existing item with a new ID
   */
  clone(item: PlacedItem, offsetX: number = 50): PlacedItem {
    return {
      ...item,
      id: PlacedItemFactory.generateId(),
      x: item.x + offsetX,
    };
  },
};
