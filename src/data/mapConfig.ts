/**
 * Map configuration interface
 * Defines structure for JSON-based map configuration
 */

import { DialogData } from '../types/DialogData';

export interface MapConfig {
  worldWidth: number;
  worldHeight: number;
  playerStartX: number;
  playerStartY: number;
  dialogs: DialogData[];
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
  if (!config.worldWidth || !config.worldHeight || !config.dialogs) {
    throw new Error('Invalid map config structure');
  }
  
  return config;
}
