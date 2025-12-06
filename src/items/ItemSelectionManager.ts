/**
 * ItemSelectionManager - Handles selection visuals and state for items
 * Also manages global background click deselection for ALL interactive object types
 */

import Phaser from 'phaser';
import { DEPTH_LAYERS } from '../constants/depthLayers';
import { SELECTION_COLORS } from '../constants/colors';
import { clearSelection } from '../stores/builderStores';
import { isPointerOverUI } from '../utils/inputUtils';

/**
 * INTERACTIVE_DATA_KEYS - Centralized registry of all data keys used to identify interactive objects
 * 
 * When adding a new interactive object type (like socials, stickers, etc.):
 * 1. Add the data key here
 * 2. In your controller, use sprite.setData('yourKey', id)
 * 3. In builderStores, sync the selection to scene.data.set('yourKey', id)
 * 
 * This prevents the "forgot to add key" bug that happens when the check is buried in code.
 * All places that need to check for interactive objects will use this registry.
 */
export const INTERACTIVE_DATA_KEYS = {
  ITEM: 'itemId',
  SOCIAL: 'socialId',
  NPC: 'npcId',
  PLAYER: 'isPlayer',
  ZONE: 'zoneId',  // Used for Rectangle objects (dialog zone handles)
} as const;

/**
 * SELECTED_DATA_KEYS - Maps interactive data keys to their corresponding scene.data selection keys
 * 
 * Used by isTouchOnSelectedSprite to check if a sprite is currently selected.
 * When adding a new interactive object type, add mapping here too.
 */
export const SELECTED_DATA_KEYS: Record<string, string> = {
  [INTERACTIVE_DATA_KEYS.ITEM]: 'selectedItemId',
  [INTERACTIVE_DATA_KEYS.SOCIAL]: 'selectedSocialId',
  [INTERACTIVE_DATA_KEYS.NPC]: 'selectedItemId',  // NPCs reuse selectedItemId
  [INTERACTIVE_DATA_KEYS.PLAYER]: 'isPlayerSelected',
  // ZONE uses different selection mechanism (selectedDialogZoneId)
} as const;

type DataEnabledGameObject = Phaser.GameObjects.GameObject & {
  getData: (key: string) => unknown;
};

function hasDataComponent(obj: Phaser.GameObjects.GameObject): obj is DataEnabledGameObject {
  return typeof (obj as DataEnabledGameObject).getData === 'function';
}

function hasInteractiveData(obj: Phaser.GameObjects.GameObject): boolean {
  if (!hasDataComponent(obj)) return false;

  if (obj.type === 'Rectangle') {
    return Boolean(obj.getData(INTERACTIVE_DATA_KEYS.ZONE));
  }

  return Object.values(INTERACTIVE_DATA_KEYS).some(key => {
    if (key === INTERACTIVE_DATA_KEYS.ZONE) return false;
    return Boolean(obj.getData(key));
  });
}

/**
 * Check if a hit object is currently selected
 * Uses centralized SELECTED_DATA_KEYS to avoid missing new object types
 */
export function isObjectSelected(obj: Phaser.GameObjects.GameObject, scene: Phaser.Scene): boolean {
  if (!hasDataComponent(obj)) return false;
  
  // Check each interactive data key
  for (const [dataKey, selectedKey] of Object.entries(SELECTED_DATA_KEYS)) {
    const objectId = obj.getData(dataKey);
    if (objectId) {
      // Special case for player (boolean check)
      if (dataKey === INTERACTIVE_DATA_KEYS.PLAYER) {
        const isPlayerSelected = scene.data.get(selectedKey);
        const playerSprite = scene.data.get('playerSprite') as Phaser.GameObjects.GameObject | undefined;
        if (isPlayerSelected && obj === playerSprite) return true;
      } else {
        // Normal ID comparison
        const selectedId = scene.data.get(selectedKey);
        if (objectId === selectedId) return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if any of the hit objects under a pointer is currently selected
 * Uses centralized registry - no need to update when adding new object types
 */
export function isTouchOnSelectedSprite(scene: Phaser.Scene, pointer: Phaser.Input.Pointer): boolean {
  const hitObjects = scene.input.hitTestPointer(pointer);
  
  for (const obj of hitObjects) {
    if (isObjectSelected(obj, scene)) return true;
  }
  
  return false;
}

export interface SelectionStyle {
  lineWidth: number;
  lineColor: number;
  lineAlpha: number;
  padding: number;
}

const DEFAULT_STYLE: SelectionStyle = {
  lineWidth: 3,
  lineColor: SELECTION_COLORS.ITEM.hex,
  lineAlpha: 1,
  padding: 5,
};

/**
 * ItemSelectionManager - Manages selection visuals for builder mode
 */
export class ItemSelectionManager {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private style: SelectionStyle;
  private selectedId: string | null = null;

  constructor(scene: Phaser.Scene, style: Partial<SelectionStyle> = {}) {
    this.scene = scene;
    this.style = { ...DEFAULT_STYLE, ...style };
    
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(DEPTH_LAYERS.SELECTION_GRAPHICS);
  }

  /**
   * Set selected item ID
   */
  setSelectedId(id: string | null): void {
    this.selectedId = id;
  }

  /**
   * Get current selected ID
   */
  getSelectedId(): string | null {
    return this.selectedId;
  }

  /**
   * Update selection visuals for a sprite
   */
  updateVisuals(sprite: Phaser.GameObjects.Sprite | null): void {
    this.graphics.clear();
    
    if (!sprite || !this.selectedId) return;
    
    const bounds = sprite.getBounds();
    const { lineWidth, lineColor, lineAlpha, padding } = this.style;
    
    // Draw selection rectangle
    this.graphics.lineStyle(lineWidth, lineColor, lineAlpha);
    this.graphics.strokeRect(
      bounds.x - padding,
      bounds.y - padding,
      bounds.width + padding * 2,
      bounds.height + padding * 2
    );
  }

  /**
   * Clear selection visuals
   */
  clearVisuals(): void {
    this.graphics.clear();
    this.selectedId = null;
  }

  /**
   * Setup click handler for deselecting when clicking empty space
   * 
   * Uses INTERACTIVE_DATA_KEYS registry to check all known interactive object types.
   * When adding new interactive objects, add their key to INTERACTIVE_DATA_KEYS above.
   */
  setupBackgroundDeselect(isDragging: () => boolean): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Skip if pointer is over UI element
      if (isPointerOverUI()) return;
      
      if (isDragging()) return;
      
      // Check if clicking on any interactive object
      // Uses centralized INTERACTIVE_DATA_KEYS to avoid forgetting new object types
      const hitObjects = this.scene.input.hitTestPointer(pointer);
      const hitInteractive = hitObjects.find(obj => hasInteractiveData(obj));
      
      if (!hitInteractive) {
        clearSelection();
        this.clearVisuals();
      }
    });
  }

  /**
   * Destroy graphics
   */
  destroy(): void {
    this.graphics?.destroy();
  }
}
