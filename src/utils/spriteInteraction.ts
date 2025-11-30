/**
 * Shared sprite interaction utilities
 * 
 * Provides unified drag & drop behavior for all interactive sprites
 * (frames, assets, player) using manual drag detection instead of
 * Phaser's setDraggable which has issues with UI overlay detection.
 */

import Phaser from 'phaser';
import { isPointerOverUI } from './inputUtils';
import { setDraggingInBuilder, gridSnappingEnabled } from '../stores/builderStores';
import { GRID_SIZE } from '../scenes/builder/builderConstants';
import { get } from 'svelte/store';

export interface DragCallbacks {
  onSelect?: () => void;
  onDoubleClick?: () => boolean; // Return true to prevent drag start
  onDragStart?: () => void;
  onDrag?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
}

export interface DragConstraints {
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface SpriteInteractionConfig {
  sprite: Phaser.GameObjects.Sprite;
  scene: Phaser.Scene;
  callbacks?: DragCallbacks;
  constraints?: DragConstraints;
  useGridSnapping?: boolean;
  cursor?: string;
  /** Optional custom hit area rectangle */
  hitArea?: Phaser.Geom.Rectangle;
}

/**
 * Double-click detector for consistent double-click behavior
 */
export class DoubleClickDetector {
  private lastClickTime = 0;
  private lastClickId: string | null = null;
  private readonly threshold: number;

  constructor(thresholdMs: number = 300) {
    this.threshold = thresholdMs;
  }

  check(id: string): boolean {
    const now = Date.now();
    const isDoubleClick = this.lastClickId === id && (now - this.lastClickTime) < this.threshold;
    this.lastClickTime = now;
    this.lastClickId = id;
    return isDoubleClick;
  }

  reset(): void {
    this.lastClickTime = 0;
    this.lastClickId = null;
  }
}

/**
 * Snap coordinate to grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Setup unified interactive drag behavior for a sprite.
 * Uses manual pointerdown/pointermove/pointerup instead of Phaser's
 * built-in drag system to properly handle UI overlay detection.
 * 
 * Features:
 * - UI overlay detection (won't start drag if clicking on UI)
 * - Scene-level pointermove/pointerup for reliable tracking during fast drags
 * - Optional grid snapping
 * - Optional position constraints
 * - Optional custom hit area
 * - Double-click support via callback
 * 
 * @returns Cleanup function to remove all event listeners
 */
export function setupSpriteInteraction(config: SpriteInteractionConfig): () => void {
  const { 
    sprite, 
    scene, 
    callbacks = {}, 
    constraints, 
    useGridSnapping = true, 
    cursor = 'grab',
    hitArea 
  } = config;
  
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;

  // Make sprite interactive with optional custom hit area
  if (hitArea) {
    sprite.setInteractive({
      hitArea,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
      cursor
    });
  } else {
    sprite.setInteractive({ useHandCursor: true, cursor });
  }

  const handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    // Skip if pointer is over UI element
    if (isPointerOverUI()) return;
    
    // Skip if already dragging something
    if (isDragging) return;
    
    // Call select callback
    callbacks.onSelect?.();
    
    // Check for double-click - if returns true, don't start drag
    if (callbacks.onDoubleClick?.()) {
      return;
    }
    
    // Start drag
    isDragging = true;
    scene.data.set('isDraggingItem', true);
    setDraggingInBuilder(true);
    dragStartX = sprite.x - pointer.worldX;
    dragStartY = sprite.y - pointer.worldY;
    
    callbacks.onDragStart?.();
  };

  // Scene-level pointermove to track drag even when pointer leaves sprite
  const handleScenePointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!isDragging) return;
    if (!pointer.isDown) {
      // Pointer released outside - end drag
      endDrag();
      return;
    }
    
    let newX = pointer.worldX + dragStartX;
    let newY = pointer.worldY + dragStartY;
    
    // Apply grid snapping if enabled
    if (useGridSnapping && get(gridSnappingEnabled)) {
      newX = snapToGrid(newX, GRID_SIZE);
      newY = snapToGrid(newY, GRID_SIZE);
    }
    
    // Apply constraints
    if (constraints) {
      if (constraints.minX !== undefined) newX = Math.max(newX, constraints.minX);
      if (constraints.maxX !== undefined) newX = Math.min(newX, constraints.maxX);
      if (constraints.minY !== undefined) newY = Math.max(newY, constraints.minY);
      if (constraints.maxY !== undefined) newY = Math.min(newY, constraints.maxY);
    }
    
    sprite.setPosition(newX, newY);
    callbacks.onDrag?.(newX, newY);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    endDrag();
  };

  const endDrag = () => {
    isDragging = false;
    scene.data.set('isDraggingItem', false);
    setDraggingInBuilder(false);
    callbacks.onDragEnd?.(sprite.x, sprite.y);
  };

  // Attach event handlers
  sprite.on('pointerdown', handlePointerDown);
  
  // Use scene-level move/up for reliable drag tracking
  scene.input.on('pointermove', handleScenePointerMove);
  scene.input.on('pointerup', handlePointerUp);

  // Return cleanup function
  return () => {
    sprite.off('pointerdown', handlePointerDown);
    scene.input.off('pointermove', handleScenePointerMove);
    scene.input.off('pointerup', handlePointerUp);
  };
}
