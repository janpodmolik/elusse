/**
 * Shared sprite interaction utilities
 * 
 * Provides unified drag & drop behavior for all interactive sprites
 * (frames, assets, player) using manual drag detection instead of
 * Phaser's setDraggable which has issues with UI overlay detection.
 */

import Phaser from 'phaser';
import { isPointerOverUI } from './inputUtils';
import { setDraggingInBuilder, gridSnappingEnabled, isPinchingInBuilder } from '../stores/builderStores';
import { GRID_SIZE } from '../scenes/builder/builderConstants';
import { get } from 'svelte/store';

export interface DragCallbacks {
  onSelect?: () => void;
  onDoubleClick?: () => boolean; // Return true to prevent drag start
  onDragStart?: () => void;
  onDrag?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  /** Check if this sprite is currently selected (required for drag) */
  isSelected?: () => boolean;
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
  let lastCheckedTapTime = 0;

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

  /**
   * Check if a tap at given world coordinates hits this sprite
   */
  const checkTapHit = (worldX: number, worldY: number): boolean => {
    const bounds = sprite.getBounds();
    // Expand bounds slightly for easier tapping on mobile
    const padding = 5;
    return worldX >= bounds.x - padding && 
           worldX <= bounds.x + bounds.width + padding &&
           worldY >= bounds.y - padding && 
           worldY <= bounds.y + bounds.height + padding;
  };

  /**
   * Handle tap event from camera controller (touch devices)
   */
  const checkForTap = () => {
    const tapTime = scene.data.get('lastTapTime') as number;
    if (!tapTime || tapTime === lastCheckedTapTime) return;
    
    // Only process recent taps (within 100ms)
    if (Date.now() - tapTime > 100) return;
    
    lastCheckedTapTime = tapTime;
    
    const tapWorldX = scene.data.get('lastTapWorldX') as number;
    const tapWorldY = scene.data.get('lastTapWorldY') as number;
    
    if (checkTapHit(tapWorldX, tapWorldY)) {
      // This sprite was tapped!
      callbacks.onSelect?.();
    }
  };

  const handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    // On touch devices, ignore pointerdown - camera handles gesture detection
    // Drag will be initiated via touchDragStarted signal
    if (pointer.wasTouch) {
      return;
    }
    
    // Skip if pinch zoom is active (shouldn't happen on desktop, but just in case)
    if (get(isPinchingInBuilder)) return;
    
    // Skip if pointer is over UI element
    if (isPointerOverUI()) return;
    
    // Skip if already dragging something
    if (isDragging) return;
    
    // Check for double-click FIRST - if returns true, don't start drag or select
    if (callbacks.onDoubleClick?.()) {
      return;
    }
    
    // Check if this sprite was ALREADY selected before this click
    const wasAlreadySelected = callbacks.isSelected?.() ?? false;
    
    // Call select callback
    callbacks.onSelect?.();
    
    // Only start drag if the sprite was ALREADY selected
    // First click = select only, subsequent clicks on selected sprite = drag
    if (!wasAlreadySelected) {
      return;
    }
    
    // Start drag (only for already selected sprites)
    isDragging = true;
    scene.data.set('isDraggingItem', true);
    setDraggingInBuilder(true);
    dragStartX = sprite.x - pointer.worldX;
    dragStartY = sprite.y - pointer.worldY;
    
    callbacks.onDragStart?.();
  };

  // Scene-level pointermove to track drag even when pointer leaves sprite
  const handleScenePointerMove = (pointer: Phaser.Input.Pointer) => {
    // Handle touch drag (initiated by camera controller)
    if (pointer.wasTouch) {
      // Check if camera signaled that touch drag should start on selected sprite
      const touchDragStarted = scene.data.get('touchDragStarted');
      if (!isDragging && touchDragStarted) {
        // Only start drag if this sprite is selected
        const isSelected = callbacks.isSelected?.();
        if (isSelected) {
          // Verify this sprite is the one being touched by checking bounds
          const startX = scene.data.get('touchStartWorldX') as number;
          const startY = scene.data.get('touchStartWorldY') as number;
          const bounds = sprite.getBounds();
          const padding = 10; // Larger padding for easier touch
          
          const inBounds = startX >= bounds.x - padding && startX <= bounds.x + bounds.width + padding &&
              startY >= bounds.y - padding && startY <= bounds.y + bounds.height + padding;
          
          if (inBounds) {
            // Start touch drag for this sprite
            isDragging = true;
            scene.data.set('isDraggingItem', true);
            scene.data.set('touchDragStarted', false); // Consume the signal
            setDraggingInBuilder(true);
            dragStartX = sprite.x - startX;
            dragStartY = sprite.y - startY;
            callbacks.onDragStart?.();
          }
        }
      }
      
      // Continue touch drag
      if (isDragging) {
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
      }
      return;
    }
    
    // Desktop mouse drag handling
    if (!isDragging) return;
    
    // Cancel drag if pinch zoom started
    if (get(isPinchingInBuilder)) {
      endDrag();
      return;
    }
    
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
  
  // Update handler to check for tap events (for touch devices)
  const handleUpdate = () => {
    checkForTap();
  };
  scene.events.on('update', handleUpdate);

  // Return cleanup function
  return () => {
    sprite.off('pointerdown', handlePointerDown);
    scene.input.off('pointermove', handleScenePointerMove);
    scene.input.off('pointerup', handlePointerUp);
    scene.events.off('update', handleUpdate);
  };
}
