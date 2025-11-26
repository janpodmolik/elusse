/**
 * Map configuration interface
 * Defines structure for JSON-based map configuration
 */

import type { LocalizedText } from '../types/DialogData';

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
  
  // Optional: Dialog configuration
  // If present, this item will trigger a dialog on collision
  dialogConfig?: {
    width: number; // Collision zone width
    text: LocalizedText;
  };
}

export interface MapConfig {
  worldWidth: number;
  worldHeight: number;
  playerStartX: number;
  playerStartY: number;
  placedItems?: PlacedItem[];
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
