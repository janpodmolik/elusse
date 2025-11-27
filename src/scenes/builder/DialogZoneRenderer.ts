import Phaser from 'phaser';
import type { DialogZone } from '../../types/DialogTypes';
import { createDialogZone } from '../../types/DialogTypes';
import { builderEditMode, dialogZones, selectedDialogZoneId, selectDialogZone, addDialogZone, updateDialogZone } from '../../stores/builderStores';
import { OVERLAY_DEPTH } from './builderConstants';
import { EventBus, EVENTS } from '../../events/EventBus';

/** Depth for dialog zone graphics (below grid, above background) */
const ZONE_DEPTH = OVERLAY_DEPTH - 1;

/** Minimum zone width in pixels */
const MIN_ZONE_WIDTH = 50;

/** Default zone width when creating new zones */
const DEFAULT_ZONE_WIDTH = 150;

/** Alpha for zone fill */
const ZONE_FILL_ALPHA = 0.3;

/** Alpha for selected zone fill */
const SELECTED_ZONE_FILL_ALPHA = 0.5;

/** Handle width for resize */
const HANDLE_WIDTH = 16;

/** Handle color */
const HANDLE_COLOR = 0xffffff;

/** Handle alpha */
const HANDLE_ALPHA = 0.6;

/** Minimum gap between zones */
const MIN_ZONE_GAP = 0;

/**
 * DialogZoneRenderer - Renders and manages dialog trigger zones in builder mode
 * Shows colored transparent strips for each zone, with drag handles for resizing
 */
export class DialogZoneRenderer {
  private scene: Phaser.Scene;
  private worldWidth: number;
  private worldHeight: number;
  
  /** Graphics object for rendering zones */
  private graphics: Phaser.GameObjects.Graphics | null = null;
  
  /** Interactive zone areas */
  private zoneAreas: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  
  /** Left resize handles */
  private leftHandles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  
  /** Right resize handles */
  private rightHandles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  
  /** Currently dragging state */
  private dragging: { 
    zoneId: string; 
    type: 'left' | 'right' | 'move'; 
    startX: number; 
    originalX: number; 
    originalWidth: number;
  } | null = null;
  
  /** Store unsubscribers */
  private unsubscribers: Array<() => void> = [];
  
  /** EventBus subscription for create zone event */
  private createZoneSubscription?: { unsubscribe: () => void };
  
  /** Current edit mode */
  private currentEditMode: string = 'items';
  
  /** Current zones */
  private currentZones: DialogZone[] = [];
  
  /** Currently selected zone ID */
  private currentSelectedId: string | null = null;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  /**
   * Create the renderer and subscribe to stores
   */
  create(): void {
    // Create graphics object
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(ZONE_DEPTH);
    
    // Subscribe to edit mode changes
    const unsubEditMode = builderEditMode.subscribe((mode) => {
      this.currentEditMode = mode;
      this.render();
    });
    this.unsubscribers.push(unsubEditMode);
    
    // Subscribe to zone changes
    const unsubZones = dialogZones.subscribe((zones) => {
      this.currentZones = zones;
      this.render();
    });
    this.unsubscribers.push(unsubZones);
    
    // Subscribe to selection changes
    const unsubSelection = selectedDialogZoneId.subscribe((id) => {
      this.currentSelectedId = id;
      this.render();
    });
    this.unsubscribers.push(unsubSelection);
    
    // Setup global pointer move/up listeners for dragging
    this.scene.input.on('pointermove', this.handlePointerMove, this);
    this.scene.input.on('pointerup', this.handlePointerUp, this);
    
    // Setup click on empty area to deselect zone
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    
    // Listen for create zone event from UI
    this.createZoneSubscription = EventBus.on(EVENTS.DIALOG_ZONE_CREATE, () => {
      this.createNewZone();
    });
    
    // Initial render
    this.render();
  }

  /**
   * Clear all zone visuals
   */
  private clearVisuals(): void {
    // Clear graphics
    if (this.graphics) {
      this.graphics.clear();
    }
    
    // Destroy all interactive areas
    this.zoneAreas.forEach(area => area.destroy());
    this.zoneAreas.clear();
    
    // Destroy all handles
    this.leftHandles.forEach(handle => handle.destroy());
    this.leftHandles.clear();
    this.rightHandles.forEach(handle => handle.destroy());
    this.rightHandles.clear();
  }

  /**
   * Render all zones based on current state
   */
  private render(): void {
    this.clearVisuals();
    
    // Only render in dialog edit mode
    if (this.currentEditMode !== 'dialogs') {
      return;
    }
    
    // Render each zone
    for (const zone of this.currentZones) {
      this.renderZone(zone, zone.id === this.currentSelectedId);
    }
  }

  /**
   * Render a single zone with fill, border, and handles
   */
  private renderZone(zone: DialogZone, isSelected: boolean): void {
    if (!this.graphics) return;
    
    const color = Phaser.Display.Color.HexStringToColor(zone.color).color;
    const alpha = isSelected ? SELECTED_ZONE_FILL_ALPHA : ZONE_FILL_ALPHA;
    
    // Draw filled rectangle for zone
    this.graphics.fillStyle(color, alpha);
    this.graphics.fillRect(zone.x, 0, zone.width, this.worldHeight);
    
    // Draw border
    this.graphics.lineStyle(2, color, 0.8);
    this.graphics.strokeRect(zone.x, 0, zone.width, this.worldHeight);
    
    // Create interactive zone area for selection and moving
    const zoneArea = this.scene.add.rectangle(
      zone.x + zone.width / 2,
      this.worldHeight / 2,
      zone.width - HANDLE_WIDTH * 2, // Smaller to not overlap with handles
      this.worldHeight
    );
    zoneArea.setOrigin(0.5, 0.5);
    zoneArea.setInteractive({ cursor: isSelected ? 'grab' : 'pointer' });
    zoneArea.setDepth(ZONE_DEPTH + 0.1);
    zoneArea.setAlpha(0.001); // Nearly invisible but interactive
    zoneArea.setData('zoneId', zone.id);
    
    // Click to select, drag to move (only if selected)
    zoneArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Set flag to prevent camera drag
      this.scene.data.set('isDraggingItem', true);
      
      if (this.currentSelectedId === zone.id) {
        // Already selected, start moving
        this.startDrag(zone.id, 'move', pointer.worldX);
      } else {
        // Select the zone
        selectDialogZone(zone.id);
        // Reset flag since we're not actually dragging yet
        this.scene.data.set('isDraggingItem', false);
      }
    });
    
    this.zoneAreas.set(zone.id, zoneArea);
    
    // Only show handles for selected zone
    if (isSelected) {
      this.createHandles(zone);
    }
  }

  /**
   * Create resize handles for a zone
   */
  private createHandles(zone: DialogZone): void {
    // Left handle
    const leftHandle = this.scene.add.rectangle(
      zone.x,
      this.worldHeight / 2,
      HANDLE_WIDTH,
      this.worldHeight
    );
    leftHandle.setOrigin(0.5, 0.5);
    leftHandle.setInteractive({ cursor: 'ew-resize' });
    leftHandle.setDepth(ZONE_DEPTH + 0.2);
    leftHandle.setFillStyle(HANDLE_COLOR, HANDLE_ALPHA);
    leftHandle.setData('zoneId', zone.id);
    leftHandle.setData('type', 'left');
    
    leftHandle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startDrag(zone.id, 'left', pointer.worldX);
    });
    
    this.leftHandles.set(zone.id, leftHandle);
    
    // Right handle
    const rightHandle = this.scene.add.rectangle(
      zone.x + zone.width,
      this.worldHeight / 2,
      HANDLE_WIDTH,
      this.worldHeight
    );
    rightHandle.setOrigin(0.5, 0.5);
    rightHandle.setInteractive({ cursor: 'ew-resize' });
    rightHandle.setDepth(ZONE_DEPTH + 0.2);
    rightHandle.setFillStyle(HANDLE_COLOR, HANDLE_ALPHA);
    rightHandle.setData('zoneId', zone.id);
    rightHandle.setData('type', 'right');
    
    rightHandle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startDrag(zone.id, 'right', pointer.worldX);
    });
    
    this.rightHandles.set(zone.id, rightHandle);
  }

  /**
   * Start dragging a zone edge or the entire zone
   */
  private startDrag(zoneId: string, type: 'left' | 'right' | 'move', startX: number): void {
    const zone = this.currentZones.find(z => z.id === zoneId);
    if (!zone) return;
    
    // Set flag to disable camera scrolling
    this.scene.data.set('isDraggingItem', true);
    
    this.dragging = {
      zoneId,
      type,
      startX,
      originalX: zone.x,
      originalWidth: zone.width,
    };
  }

  /**
   * Get bounds for zone movement/resize to prevent overlap
   */
  private getZoneBounds(zoneId: string): { minX: number; maxX: number; maxRight: number } {
    let minX = 0;
    let maxRight = this.worldWidth;
    
    // Find adjacent zones
    for (const other of this.currentZones) {
      if (other.id === zoneId) continue;
      
      const otherRight = other.x + other.width;
      const zone = this.currentZones.find(z => z.id === zoneId);
      if (!zone) continue;
      
      // Zone is to the left of current zone
      if (otherRight <= zone.x + zone.width / 2) {
        minX = Math.max(minX, otherRight + MIN_ZONE_GAP);
      }
      // Zone is to the right of current zone
      if (other.x >= zone.x + zone.width / 2) {
        maxRight = Math.min(maxRight, other.x - MIN_ZONE_GAP);
      }
    }
    
    return { minX, maxX: maxRight - MIN_ZONE_WIDTH, maxRight };
  }

  /**
   * Check if new zone position would overlap with existing zones
   */
  private wouldOverlap(zoneId: string, newX: number, newWidth: number): boolean {
    const newRight = newX + newWidth;
    
    for (const other of this.currentZones) {
      if (other.id === zoneId) continue;
      
      const otherLeft = other.x;
      const otherRight = other.x + other.width;
      
      // Check overlap
      if (newX < otherRight && newRight > otherLeft) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Handle pointer move for dragging
   */
  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging) return;
    
    // Stop camera from moving while dragging
    pointer.event?.stopPropagation?.();
    
    const deltaX = pointer.worldX - this.dragging.startX;
    const zone = this.currentZones.find(z => z.id === this.dragging?.zoneId);
    if (!zone) return;
    
    const bounds = this.getZoneBounds(zone.id);
    
    if (this.dragging.type === 'left') {
      // Moving left edge (resize from left)
      let newX = this.dragging.originalX + deltaX;
      let newWidth = this.dragging.originalWidth - deltaX;
      
      // Clamp to world bounds
      if (newX < 0) {
        newWidth += newX;
        newX = 0;
      }
      
      // Ensure minimum width
      if (newWidth < MIN_ZONE_WIDTH) {
        newX = this.dragging.originalX + this.dragging.originalWidth - MIN_ZONE_WIDTH;
        newWidth = MIN_ZONE_WIDTH;
      }
      
      // Clamp to not overlap with zones on the left
      if (newX < bounds.minX) {
        const diff = bounds.minX - newX;
        newX = bounds.minX;
        newWidth -= diff;
      }
      
      // Ensure still valid after all clamping
      if (newWidth >= MIN_ZONE_WIDTH && !this.wouldOverlap(zone.id, newX, newWidth)) {
        updateDialogZone(zone.id, { x: newX, width: newWidth });
      }
      
    } else if (this.dragging.type === 'right') {
      // Moving right edge (resize from right)
      let newWidth = this.dragging.originalWidth + deltaX;
      
      // Ensure minimum width
      if (newWidth < MIN_ZONE_WIDTH) {
        newWidth = MIN_ZONE_WIDTH;
      }
      
      // Clamp to world bounds
      if (zone.x + newWidth > this.worldWidth) {
        newWidth = this.worldWidth - zone.x;
      }
      
      // Clamp to not overlap with zones on the right
      if (zone.x + newWidth > bounds.maxRight) {
        newWidth = bounds.maxRight - zone.x;
      }
      
      // Ensure still valid
      if (newWidth >= MIN_ZONE_WIDTH && !this.wouldOverlap(zone.id, zone.x, newWidth)) {
        updateDialogZone(zone.id, { width: newWidth });
      }
      
    } else if (this.dragging.type === 'move') {
      // Moving the entire zone
      let newX = this.dragging.originalX + deltaX;
      const width = zone.width;
      
      // Clamp to world bounds
      if (newX < 0) {
        newX = 0;
      }
      if (newX + width > this.worldWidth) {
        newX = this.worldWidth - width;
      }
      
      // Check for overlaps and clamp
      if (!this.wouldOverlap(zone.id, newX, width)) {
        updateDialogZone(zone.id, { x: newX });
      } else {
        // Try to find nearest non-overlapping position
        const clampedX = this.findNonOverlappingPosition(zone.id, newX, width);
        if (clampedX !== null) {
          updateDialogZone(zone.id, { x: clampedX });
        }
      }
    }
  }

  /**
   * Find nearest non-overlapping position for a zone
   */
  private findNonOverlappingPosition(zoneId: string, targetX: number, width: number): number | null {
    // Sort other zones by x position
    const otherZones = this.currentZones
      .filter(z => z.id !== zoneId)
      .sort((a, b) => a.x - b.x);
    
    if (otherZones.length === 0) {
      return Math.max(0, Math.min(targetX, this.worldWidth - width));
    }
    
    // Find gaps and check if target fits
    let bestX = targetX;
    let bestDistance = Infinity;
    
    // Check gap at start (0 to first zone)
    const firstZone = otherZones[0];
    if (firstZone.x >= width) {
      const maxX = firstZone.x - width;
      const clampedX = Math.max(0, Math.min(targetX, maxX));
      const dist = Math.abs(clampedX - targetX);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestX = clampedX;
      }
    }
    
    // Check gaps between zones
    for (let i = 0; i < otherZones.length - 1; i++) {
      const current = otherZones[i];
      const next = otherZones[i + 1];
      const gapStart = current.x + current.width;
      const gapEnd = next.x;
      const gapWidth = gapEnd - gapStart;
      
      if (gapWidth >= width) {
        const minX = gapStart;
        const maxX = gapEnd - width;
        const clampedX = Math.max(minX, Math.min(targetX, maxX));
        const dist = Math.abs(clampedX - targetX);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestX = clampedX;
        }
      }
    }
    
    // Check gap at end (last zone to world width)
    const lastZone = otherZones[otherZones.length - 1];
    const endGapStart = lastZone.x + lastZone.width;
    if (this.worldWidth - endGapStart >= width) {
      const minX = endGapStart;
      const maxX = this.worldWidth - width;
      const clampedX = Math.max(minX, Math.min(targetX, maxX));
      const dist = Math.abs(clampedX - targetX);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestX = clampedX;
      }
    }
    
    // Only return if we found a valid position
    if (bestDistance < Infinity && !this.wouldOverlap(zoneId, bestX, width)) {
      return bestX;
    }
    
    return null;
  }

  /**
   * Handle pointer up to stop dragging
   */
  private handlePointerUp(): void {
    if (this.dragging) {
      // Clear flag to re-enable camera scrolling
      this.scene.data.set('isDraggingItem', false);
    }
    this.dragging = null;
  }

  /**
   * Handle pointer down - deselect zone when clicking on empty area
   */
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    // Only in dialog edit mode
    if (this.currentEditMode !== 'dialogs') return;
    
    // If already dragging, ignore
    if (this.dragging) return;
    
    // Don't handle if clicking on UI elements (anything that's not the canvas)
    const target = pointer.downElement;
    // Check if target exists and is not the canvas - if so, ignore
    if (target) {
      const tagName = (target as HTMLElement).tagName?.toUpperCase();
      // Ignore clicks on any non-canvas element (inputs, buttons, divs, etc.)
      if (tagName !== 'CANVAS') {
        return;
      }
    }
    
    // Check if click is inside any existing zone
    const worldX = pointer.worldX;
    
    for (const zone of this.currentZones) {
      if (worldX >= zone.x && worldX <= zone.x + zone.width) {
        // Clicked inside existing zone, the zone's own handler will take care of it
        return;
      }
    }
    
    // Clicked on empty area - deselect any selected zone
    if (this.currentSelectedId) {
      selectDialogZone(null);
    }
  }
  
  /**
   * Create a new dialog zone at the camera center or first available space
   * Called from UI button
   */
  public createNewZone(): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.scrollX + camera.width / 2;
    
    let newX = centerX - DEFAULT_ZONE_WIDTH / 2;
    const newWidth = DEFAULT_ZONE_WIDTH;
    
    // Clamp x to world bounds
    newX = Math.max(0, Math.min(this.worldWidth - newWidth, newX));
    
    // Check for overlap
    if (this.wouldOverlap('', newX, newWidth)) {
      // Try to find a non-overlapping position nearby
      const validX = this.findNonOverlappingPosition('', newX, newWidth);
      if (validX === null) {
        // No room for a new zone - could show a message
        console.warn('No room for a new dialog zone');
        return;
      }
      newX = validX;
    }
    
    // Create new zone
    const newZone = createDialogZone(newX, newWidth);
    newZone.x = newX;
    
    addDialogZone(newZone);
    selectDialogZone(newZone.id);
  }

  /**
   * Destroy renderer and clean up
   */
  destroy(): void {
    // Unsubscribe from stores
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    
    // Unsubscribe from EventBus
    if (this.createZoneSubscription) {
      this.createZoneSubscription.unsubscribe();
    }
    
    // Remove input listeners
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    
    // Clear visuals
    this.clearVisuals();
    
    // Destroy graphics
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    
    // Reset state
    this.dragging = null;
  }
}
