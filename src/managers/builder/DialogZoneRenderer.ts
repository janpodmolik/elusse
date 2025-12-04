import Phaser from 'phaser';
import type { DialogZone } from '../../types/DialogTypes';
import { createDialogZone } from '../../types/DialogTypes';
import { builderEditMode, dialogZones, selectedDialogZoneId, selectDialogZone, addDialogZone, updateDialogZone, setDraggingInBuilder, updateSelectedDialogZoneScreenPosition } from '../../stores/builderStores';
import { openDialogZonePanel } from '../../stores/uiStores';
import { OVERLAY_DEPTH } from './builderConstants';
import { EventBus, EVENTS } from '../../events/EventBus';
import { isPointerOverUI, worldToScreen, screenToWorld as screenToWorldUtil } from '../../utils/inputUtils';

/** Depth for dialog zone graphics (below grid, above background) */
const ZONE_DEPTH = OVERLAY_DEPTH - 1;

/** Minimum zone width in pixels */
const MIN_ZONE_WIDTH = 300;

/** Default zone width when creating new zones */
const DEFAULT_ZONE_WIDTH = 150;

/** Alpha for zone fill */
const ZONE_FILL_ALPHA = 0.3;

/** Alpha for selected zone fill */
const SELECTED_ZONE_FILL_ALPHA = 0.5;

/** Handle visual width for resize */
const HANDLE_WIDTH = 40;

/** Handle hit area width (larger for easier grabbing) */
const HANDLE_HIT_WIDTH = 60;

/** Handle color */
const HANDLE_COLOR = 0xffffff;

/** Handle alpha */
const HANDLE_ALPHA = 0.6;

/** Minimum gap between zones */
const MIN_ZONE_GAP = 0;

/** Edge margin for auto-scroll (pixels from screen edge) */
const AUTO_SCROLL_MARGIN = 60;

/** Auto-scroll speed (pixels per frame) */
const AUTO_SCROLL_SPEED = 8;

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
  
  /** Left resize handles (hit area) */
  private leftHandles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  
  /** Left resize handle visuals */
  private leftHandleVisuals: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  
  /** Right resize handles (hit area) */
  private rightHandles: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  
  /** Right resize handle visuals */
  private rightHandleVisuals: Map<string, Phaser.GameObjects.Rectangle> = new Map();
  
  /** Arrow graphics for handles */
  private arrowGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  
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
  
  /** Double-click detection */
  private lastClickTime: number = 0;
  private lastClickX: number = 0;
  private readonly DOUBLE_CLICK_THRESHOLD = 300; // ms
  private readonly DOUBLE_CLICK_DISTANCE = 20; // pixels
  
  /** Pending tap state - to show button only on tap, not drag */
  private pendingTap: { worldX: number; worldY: number; startTime: number } | null = null;
  private readonly TAP_MAX_DURATION = 300; // ms - max time for tap gesture
  private readonly TAP_MAX_DISTANCE = 15; // pixels - max movement for tap

  /** Pending zone selection - wait to see if user drags or clicks */
  private pendingZoneSelection: { 
    zoneId: string; 
    worldX: number; 
    startTime: number;
  } | null = null;

  /** Event subscription for create zone at position */
  private createZoneAtSubscription?: { unsubscribe: () => void };

  /** Bound handler for window pointerup */
  private boundWindowPointerUp: () => void = () => {};

  /** Bound handler for window pointermove */
  private boundWindowPointerMove: (e: PointerEvent) => void = () => {};

  /** Current screen X position during drag (for auto-scroll) */
  private currentScreenX: number = 0;

  /** Auto-scroll update timer */
  private autoScrollTimer: Phaser.Time.TimerEvent | null = null;

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
    
    // Also listen for window pointer events to catch moves/releases outside canvas
    this.boundWindowPointerUp = this.handlePointerUp.bind(this);
    this.boundWindowPointerMove = this.handleWindowPointerMove.bind(this);
    window.addEventListener('pointerup', this.boundWindowPointerUp);
    window.addEventListener('pointermove', this.boundWindowPointerMove);
    
    // Setup click on empty area to deselect zone
    this.scene.input.on('pointerdown', this.handlePointerDown, this);
    
    // Listen for create zone event from UI
    this.createZoneSubscription = EventBus.on(EVENTS.DIALOG_ZONE_CREATE, () => {
      this.createNewZone();
    });
    
    // Listen for create zone at specific position event (from temp button)
    this.createZoneAtSubscription = EventBus.on<{ worldX: number }>(EVENTS.DIALOG_ZONE_CREATE_AT, (data) => {
      this.createZoneAtPosition(data.worldX);
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
    
    // Destroy all handles (hit areas)
    this.leftHandles.forEach(handle => handle.destroy());
    this.leftHandles.clear();
    this.rightHandles.forEach(handle => handle.destroy());
    this.rightHandles.clear();
    
    // Destroy all handle visuals
    this.leftHandleVisuals.forEach(v => v.destroy());
    this.leftHandleVisuals.clear();
    this.rightHandleVisuals.forEach(v => v.destroy());
    this.rightHandleVisuals.clear();
    
    // Destroy all arrow graphics
    this.arrowGraphics.forEach(g => g.destroy());
    this.arrowGraphics.clear();
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
      // Ignore clicks that started on UI elements (buttons, panels, etc.)
      if (this.isClickOnUIElement(pointer)) return;
      
      const now = Date.now();
      const isDoubleClick = 
        now - this.lastClickTime < this.DOUBLE_CLICK_THRESHOLD &&
        Math.abs(pointer.worldX - this.lastClickX) < this.DOUBLE_CLICK_DISTANCE;
      
      this.lastClickTime = now;
      this.lastClickX = pointer.worldX;
      
      const isAlreadySelected = this.currentSelectedId === zone.id;
      
      // Double-click opens dialog panel (only if already selected)
      if (isDoubleClick && isAlreadySelected) {
        openDialogZonePanel();
        return;
      }
      
      // If already selected, start dragging immediately
      if (isAlreadySelected) {
        // Set flag to prevent camera drag
        this.scene.data.set('isDraggingItem', true);
        setDraggingInBuilder(true);
        this.startDrag(zone.id, 'move', pointer.worldX);
      } else {
        // Not selected yet - wait to see if this is a click (select) or drag (scroll)
        // Don't block camera scroll yet
        this.pendingZoneSelection = {
          zoneId: zone.id,
          worldX: pointer.worldX,
          startTime: now
        };
      }
    });
    
    this.zoneAreas.set(zone.id, zoneArea);
    
    // Only show handles for selected zone
    if (isSelected) {
      this.createHandles(zone);
    }
  }

  /**
   * Create resize handles for a zone with arrow indicators
   */
  private createHandles(zone: DialogZone): void {
    const cameraY = this.scene.cameras.main.scrollY;
    const viewportHeight = this.scene.cameras.main.height;
    const arrowY = cameraY + viewportHeight / 2;
    
    // Left handle - visual
    const leftHandleVisual = this.scene.add.rectangle(
      zone.x,
      this.worldHeight / 2,
      HANDLE_WIDTH,
      this.worldHeight
    );
    leftHandleVisual.setOrigin(0.5, 0.5);
    leftHandleVisual.setDepth(ZONE_DEPTH + 0.2);
    leftHandleVisual.setFillStyle(HANDLE_COLOR, HANDLE_ALPHA);
    
    // Left handle - hit area (larger for easier grabbing)
    const leftHandle = this.scene.add.rectangle(
      zone.x,
      this.worldHeight / 2,
      HANDLE_HIT_WIDTH,
      this.worldHeight
    );
    leftHandle.setOrigin(0.5, 0.5);
    leftHandle.setInteractive({ cursor: 'ew-resize' });
    leftHandle.setDepth(ZONE_DEPTH + 0.25);
    leftHandle.setAlpha(0.001); // Nearly invisible but interactive
    leftHandle.setData('zoneId', zone.id);
    leftHandle.setData('type', 'left');
    
    leftHandle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isClickOnUIElement(pointer)) return;
      this.startDrag(zone.id, 'left', pointer.worldX);
    });
    
    this.leftHandles.set(zone.id, leftHandle);
    this.leftHandleVisuals.set(zone.id, leftHandleVisual);
    
    // Left arrow (pointing left) - offset outward from zone edge
    const arrowOffset = 8;
    const leftArrow = this.scene.add.graphics();
    leftArrow.setDepth(ZONE_DEPTH + 0.3);
    this.drawArrow(leftArrow, zone.x - arrowOffset, arrowY, 'left');
    this.arrowGraphics.set(`${zone.id}_left`, leftArrow);
    
    // Right handle - visual
    const rightHandleVisual = this.scene.add.rectangle(
      zone.x + zone.width,
      this.worldHeight / 2,
      HANDLE_WIDTH,
      this.worldHeight
    );
    rightHandleVisual.setOrigin(0.5, 0.5);
    rightHandleVisual.setDepth(ZONE_DEPTH + 0.2);
    rightHandleVisual.setFillStyle(HANDLE_COLOR, HANDLE_ALPHA);
    
    // Right handle - hit area (larger for easier grabbing)
    const rightHandle = this.scene.add.rectangle(
      zone.x + zone.width,
      this.worldHeight / 2,
      HANDLE_HIT_WIDTH,
      this.worldHeight
    );
    rightHandle.setOrigin(0.5, 0.5);
    rightHandle.setInteractive({ cursor: 'ew-resize' });
    rightHandle.setDepth(ZONE_DEPTH + 0.25);
    rightHandle.setAlpha(0.001); // Nearly invisible but interactive
    rightHandle.setData('zoneId', zone.id);
    rightHandle.setData('type', 'right');
    
    rightHandle.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isClickOnUIElement(pointer)) return;
      this.startDrag(zone.id, 'right', pointer.worldX);
    });
    
    this.rightHandles.set(zone.id, rightHandle);
    this.rightHandleVisuals.set(zone.id, rightHandleVisual);
    
    // Right arrow (pointing right) - offset outward from zone edge
    const rightArrow = this.scene.add.graphics();
    rightArrow.setDepth(ZONE_DEPTH + 0.3);
    this.drawArrow(rightArrow, zone.x + zone.width + arrowOffset, arrowY, 'right');
    this.arrowGraphics.set(`${zone.id}_right`, rightArrow);
  }
  
  /**
   * Draw a filled triangle pointing left or right (pixel art style)
   * Left arrow: ◀ (tip points left, base on right)
   * Right arrow: ▶ (tip points right, base on left)
   */
  private drawArrow(g: Phaser.GameObjects.Graphics, x: number, y: number, direction: 'left' | 'right'): void {
    const size = 10;
    const dir = direction === 'left' ? -1 : 1;
    
    // Dark outline/shadow (offset by 1px)
    g.fillStyle(0x333333, 0.8);
    g.beginPath();
    g.moveTo(x + dir * size + 1, y);           // Tip
    g.lineTo(x - dir * size + 1, y - size + 1); // Top of base
    g.lineTo(x - dir * size + 1, y + size - 1); // Bottom of base
    g.closePath();
    g.fillPath();
    
    // White filled triangle
    g.fillStyle(0xffffff, 0.9);
    g.beginPath();
    g.moveTo(x + dir * size, y);           // Tip points outward
    g.lineTo(x - dir * size, y - size);    // Top of base
    g.lineTo(x - dir * size, y + size);    // Bottom of base
    g.closePath();
    g.fillPath();
  }

  /**
   * Start dragging a zone edge or the entire zone
   */
  private startDrag(zoneId: string, type: 'left' | 'right' | 'move', startX: number): void {
    const zone = this.currentZones.find(z => z.id === zoneId);
    if (!zone) return;
    
    // Set flag to disable camera scrolling
    this.scene.data.set('isDraggingItem', true);
    setDraggingInBuilder(true);
    
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
   * Check if a pointer event started on a UI element (not canvas)
   */
  private isClickOnUIElement(pointer: Phaser.Input.Pointer): boolean {
    const target = pointer.downElement;
    if (!target) return false;
    const tagName = (target as HTMLElement).tagName?.toUpperCase();
    return tagName !== 'CANVAS';
  }

  /**
   * Cancel pending interactions if pointer moved too far
   */
  private cancelPendingIfMoved(worldX: number): void {
    if (this.pendingTap) {
      const distance = Math.abs(worldX - this.pendingTap.worldX);
      if (distance > this.TAP_MAX_DISTANCE) {
        this.pendingTap = null;
      }
    }
    
    if (this.pendingZoneSelection) {
      const distance = Math.abs(worldX - this.pendingZoneSelection.worldX);
      if (distance > this.TAP_MAX_DISTANCE) {
        this.pendingZoneSelection = null;
      }
    }
  }

  /**
   * Convert screen coordinates to world coordinates
   * Uses shared utility for correct FIT mode support
   */
  private screenToWorld(screenX: number, screenY: number): { worldX: number; worldY: number } {
    const camera = this.scene.cameras.main;
    // Get canvas bounds to convert page coordinates to canvas-relative coordinates
    const canvas = this.scene.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;
    
    // Use shared utility for correct FIT mode support
    return screenToWorldUtil(canvasX, canvasY, camera);
  }

  /**
   * Handle window pointer move for dragging (works even over UI)
   * This is a fallback - Phaser's handlePointerMove is primary
   */
  private handleWindowPointerMove(event: PointerEvent): void {
    const coords = this.screenToWorld(event.clientX, event.clientY);
    this.cancelPendingIfMoved(coords.worldX);
    
    if (!this.dragging) return;
    
    // Check if the event is over the canvas - if so, Phaser's handler will process it
    const canvas = this.scene.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const isOverCanvas = 
      event.clientX >= rect.left && 
      event.clientX <= rect.right && 
      event.clientY >= rect.top && 
      event.clientY <= rect.bottom;
    
    // Only process if pointer is outside canvas (Phaser won't fire events there)
    if (isOverCanvas) {
      return;
    }
    
    // Store screen X for auto-scroll (relative to canvas)
    this.currentScreenX = event.clientX - rect.left;
    
    this.updateDrag(coords.worldX);
    
    // Check for auto-scroll
    this.checkAutoScroll();
  }

  /**
   * Handle pointer move for dragging (Phaser input)
   */
  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    this.cancelPendingIfMoved(pointer.worldX);
    
    if (!this.dragging) return;
    
    // Store screen X for auto-scroll
    this.currentScreenX = pointer.x;
    
    // Stop camera from moving while dragging
    pointer.event?.stopPropagation?.();
    
    this.updateDrag(pointer.worldX);
    
    // Check for auto-scroll
    this.checkAutoScroll();
  }

  /**
   * Check if auto-scroll should be active and start/stop timer accordingly
   */
  private checkAutoScroll(): void {
    if (!this.dragging || this.dragging.type !== 'move') {
      this.stopAutoScroll();
      return;
    }
    
    const camera = this.scene.cameras.main;
    const screenWidth = camera.width;
    const zone = this.currentZones.find(z => z.id === this.dragging?.zoneId);
    if (!zone) return;
    
    // Check if scrolling is even possible (whole world might be visible)
    const maxScroll = Math.max(0, this.worldWidth - camera.width / camera.zoom);
    if (maxScroll <= 0) {
      // Whole world is visible, no scrolling possible
      this.stopAutoScroll();
      return;
    }
    
    // Calculate zone's screen position (left and right edges)
    // Use worldToScreen for correct FIT mode support
    const { screenX: zoneLeftScreen } = worldToScreen(zone.x, 0, camera);
    const { screenX: zoneRightScreen } = worldToScreen(zone.x + zone.width, 0, camera);
    
    // Check if zone edge is at screen edge AND there's room to scroll
    const zoneAtLeftEdge = zoneLeftScreen <= AUTO_SCROLL_MARGIN;
    const zoneAtRightEdge = zoneRightScreen >= screenWidth - AUTO_SCROLL_MARGIN;
    
    const canScrollLeft = camera.scrollX > 0;
    const canScrollRight = camera.scrollX < maxScroll;
    
    // Also check if zone can move (not at world boundaries)
    const zoneCanMoveLeft = zone.x > 0;
    const zoneCanMoveRight = zone.x + zone.width < this.worldWidth;
    
    // Also check if pointer is at edge (user is trying to push further)
    const pointerAtLeftEdge = this.currentScreenX < AUTO_SCROLL_MARGIN;
    const pointerAtRightEdge = this.currentScreenX > screenWidth - AUTO_SCROLL_MARGIN;
    
    const shouldScrollLeft = zoneAtLeftEdge && pointerAtLeftEdge && canScrollLeft && zoneCanMoveLeft;
    const shouldScrollRight = zoneAtRightEdge && pointerAtRightEdge && canScrollRight && zoneCanMoveRight;
    
    const shouldScroll = shouldScrollLeft || shouldScrollRight;
    
    if (shouldScroll && !this.autoScrollTimer) {
      // Start auto-scroll timer
      this.autoScrollTimer = this.scene.time.addEvent({
        delay: 16, // ~60fps
        callback: this.performAutoScroll,
        callbackScope: this,
        loop: true
      });
    } else if (!shouldScroll && this.autoScrollTimer) {
      this.stopAutoScroll();
    }
  }

  /**
   * Perform auto-scroll based on current pointer position
   * Zone "pushes against" screen edge and moves with camera
   */
  private performAutoScroll(): void {
    if (!this.dragging || this.dragging.type !== 'move') {
      this.stopAutoScroll();
      return;
    }
    
    const camera = this.scene.cameras.main;
    const screenWidth = camera.width;
    const zone = this.currentZones.find(z => z.id === this.dragging?.zoneId);
    if (!zone) return;
    
    let scrollDelta = 0;
    
    // Calculate scroll direction and speed based on pointer edge proximity
    if (this.currentScreenX < AUTO_SCROLL_MARGIN) {
      // Near left edge - scroll left
      // But stop if zone is already at world's left edge
      if (zone.x <= 0) {
        this.stopAutoScroll();
        return;
      }
      const edgeDistance = AUTO_SCROLL_MARGIN - this.currentScreenX;
      const speedFactor = edgeDistance / AUTO_SCROLL_MARGIN;
      scrollDelta = -AUTO_SCROLL_SPEED * speedFactor;
    } else if (this.currentScreenX > screenWidth - AUTO_SCROLL_MARGIN) {
      // Near right edge - scroll right
      // But stop if zone is already at world's right edge
      if (zone.x + zone.width >= this.worldWidth) {
        this.stopAutoScroll();
        return;
      }
      const edgeDistance = this.currentScreenX - (screenWidth - AUTO_SCROLL_MARGIN);
      const speedFactor = edgeDistance / AUTO_SCROLL_MARGIN;
      scrollDelta = AUTO_SCROLL_SPEED * speedFactor;
    }
    
    if (scrollDelta === 0) return;
    
    // Check bounds before scrolling
    const newScrollX = camera.scrollX + scrollDelta;
    const minScroll = 0;
    const maxScroll = Math.max(0, this.worldWidth - camera.width / camera.zoom);
    const clampedScrollX = Math.max(minScroll, Math.min(maxScroll, newScrollX));
    const actualDelta = clampedScrollX - camera.scrollX;
    
    // If maxScroll is 0 or negative, we can't scroll (whole world is visible)
    if (maxScroll <= 0) {
      this.stopAutoScroll();
      return;
    }
    
    if (actualDelta === 0) {
      this.stopAutoScroll();
      return;
    }
    
    // Calculate new zone position
    const newZoneX = zone.x + actualDelta;
    const clampedZoneX = Math.max(0, Math.min(this.worldWidth - zone.width, newZoneX));
    
    // Calculate actual zone movement (may be less than camera movement due to clamping)
    const actualZoneDelta = clampedZoneX - zone.x;
    
    // Only scroll if zone can actually move
    if (actualZoneDelta === 0) {
      this.stopAutoScroll();
      return;
    }
    
    // Limit camera scroll to match zone movement (don't scroll more than zone can move)
    const limitedCameraScrollX = camera.scrollX + actualZoneDelta;
    const finalCameraScrollX = Math.max(0, Math.min(maxScroll, limitedCameraScrollX));
    
    // Don't apply if camera would jump too far (more than a reasonable amount)
    const cameraJump = Math.abs(finalCameraScrollX - camera.scrollX);
    if (cameraJump > Math.abs(actualZoneDelta) * 2) {
      this.stopAutoScroll();
      return;
    }
    
    // Apply camera scroll (limited to zone movement)
    camera.scrollX = finalCameraScrollX;
    
    // Move zone with camera (zone stays at same screen position)
    if (!this.wouldOverlap(zone.id, clampedZoneX, zone.width)) {
      updateDialogZone(zone.id, { x: clampedZoneX });
      
      // Update drag reference to keep sync - use actual zone delta, not camera delta
      this.dragging.originalX += actualZoneDelta;
      this.dragging.startX += actualZoneDelta;
    }
  }

  /**
   * Stop auto-scroll timer
   */
  private stopAutoScroll(): void {
    if (this.autoScrollTimer) {
      this.autoScrollTimer.destroy();
      this.autoScrollTimer = null;
    }
  }

  /**
   * Update drag position with world X coordinate
   */
  private updateDrag(worldX: number): void {
    if (!this.dragging) return;
    
    const deltaX = worldX - this.dragging.startX;
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
   * Handle pointer up to stop dragging and detect taps
   */
  private handlePointerUp(pointer?: Phaser.Input.Pointer): void {
    // Handle zone drag end
    if (this.dragging) {
      // Stop auto-scroll
      this.stopAutoScroll();
      
      // Clear flag to re-enable camera scrolling
      this.scene.data.set('isDraggingItem', false);
      setDraggingInBuilder(false);
      this.dragging = null;
    }
    
    // Handle pending zone selection (user clicked on unselected zone)
    if (this.pendingZoneSelection) {
      const now = Date.now();
      const duration = now - this.pendingZoneSelection.startTime;
      
      // Check if this was a quick click (not a scroll/drag)
      let isValidClick = duration < this.TAP_MAX_DURATION;
      if (isValidClick && pointer && pointer.worldX !== undefined) {
        const distance = Math.abs(pointer.worldX - this.pendingZoneSelection.worldX);
        isValidClick = distance < this.TAP_MAX_DISTANCE;
      }
      
      if (isValidClick) {
        // User clicked without dragging - select the zone
        selectDialogZone(this.pendingZoneSelection.zoneId);
      }
      // If user dragged, don't select - they were scrolling
      
      this.pendingZoneSelection = null;
    }
    
    // Check for tap gesture to show temp button
    if (this.pendingTap && this.currentEditMode === 'dialogs') {
      const now = Date.now();
      const duration = now - this.pendingTap.startTime;
      
      // Check if this was a quick tap (not a drag)
      if (duration < this.TAP_MAX_DURATION) {
        // Check distance - if pointer is available, use it; otherwise assume tap is valid
        let isValidTap = true;
        if (pointer && pointer.worldX !== undefined) {
          const distance = Math.abs(pointer.worldX - this.pendingTap.worldX);
          isValidTap = distance < this.TAP_MAX_DISTANCE;
        }
        
        if (isValidTap) {
          this.showTempAddButton(this.pendingTap.worldX, this.pendingTap.worldY);
        }
      }
      
      this.pendingTap = null;
    }
  }

  /**
   * Handle pointer down - show temp add button or create zone on double-click
   */
  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    // Skip if pointer is over UI element
    if (isPointerOverUI()) return;
    
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
    
    // Clicked on empty area - check for double-click
    const now = Date.now();
    const timeDiff = now - this.lastClickTime;
    const distDiff = Math.abs(worldX - this.lastClickX);
    
    if (timeDiff < this.DOUBLE_CLICK_THRESHOLD && distDiff < this.DOUBLE_CLICK_DISTANCE) {
      // Double-click - create zone at this position
      this.createZoneAtPosition(worldX);
      this.lastClickTime = 0; // Reset to prevent triple-click
      this.hideTempAddButton();
      return;
    }
    
    // Single click - update last click info
    this.lastClickTime = now;
    this.lastClickX = worldX;
    
    // Record potential tap start (button will be shown on pointerup if it was a tap)
    this.pendingTap = { worldX, worldY: pointer.worldY, startTime: now };
    
    // Deselect any selected zone
    if (this.currentSelectedId) {
      selectDialogZone(null);
    }
  }
  
  /**
   * Show temporary "+Zone" button at click position via Svelte UI
   */
  private showTempAddButton(worldX: number, worldY: number): void {
    // Convert world coordinates to screen coordinates
    // Use worldToScreen for correct FIT mode support
    const camera = this.scene.cameras.main;
    const { screenX, screenY } = worldToScreen(worldX, worldY, camera);
    
    // Emit event for Svelte component to show button
    EventBus.emit(EVENTS.TEMP_ZONE_BUTTON_SHOW, { screenX, screenY, worldX });
  }
  
  /**
   * Hide temporary add button via event
   */
  private hideTempAddButton(): void {
    EventBus.emit(EVENTS.TEMP_ZONE_BUTTON_HIDE, {});
  }
  
  /**
   * Create a new zone centered at the given X position
   */
  private createZoneAtPosition(worldX: number): void {
    this.createZoneAt(worldX);
  }
  
  /**
   * Create a new dialog zone at the camera center or first available space
   * Called from UI button
   */
  public createNewZone(): void {
    const camera = this.scene.cameras.main;
    // Use worldView for correct FIT mode support
    // worldView.x + worldView.width/2 gives the center in world coordinates
    const centerX = camera.worldView.x + camera.worldView.width / 2;
    this.createZoneAt(centerX);
  }
  
  /**
   * Create a new zone centered at the given X position
   * Shared logic for createZoneAtPosition and createNewZone
   */
  private createZoneAt(centerX: number): void {
    let newX = centerX - DEFAULT_ZONE_WIDTH / 2;
    const newWidth = DEFAULT_ZONE_WIDTH;
    
    // Clamp x to world bounds
    newX = Math.max(0, Math.min(this.worldWidth - newWidth, newX));
    
    // Check for overlap
    if (this.wouldOverlap('', newX, newWidth)) {
      // Try to find a non-overlapping position nearby
      const validX = this.findNonOverlappingPosition('', newX, newWidth);
      if (validX === null) {
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
   * Update selection visuals and screen position for UI overlay
   * Called from scene's update loop
   */
  updateSelectionVisuals(): void {
    // Only update in dialog mode
    if (this.currentEditMode !== 'dialogs') {
      updateSelectedDialogZoneScreenPosition(null);
      return;
    }
    
    if (!this.currentSelectedId) {
      updateSelectedDialogZoneScreenPosition(null);
      return;
    }
    
    // Find the selected zone
    const zone = this.currentZones.find(z => z.id === this.currentSelectedId);
    if (!zone) {
      updateSelectedDialogZoneScreenPosition(null);
      return;
    }
    
    // Calculate screen position (center of zone, below arrows)
    // Use worldToScreen for correct FIT mode support (only for X, Y is fixed)
    const camera = this.scene.cameras.main;
    const zoneCenterX = zone.x + zone.width / 2;
    const { screenX } = worldToScreen(zoneCenterX, 0, camera);
    // Position Y below the center (arrows are at 50%, buttons at 65%)
    const screenY = camera.height * 0.65;
    
    updateSelectedDialogZoneScreenPosition({ screenX, screenY });
  }

  /**
   * Destroy renderer and clean up
   */
  destroy(): void {
    // Hide temp button
    this.hideTempAddButton();
    
    // Unsubscribe from stores
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    
    // Unsubscribe from EventBus
    if (this.createZoneSubscription) {
      this.createZoneSubscription.unsubscribe();
    }
    if (this.createZoneAtSubscription) {
      this.createZoneAtSubscription.unsubscribe();
    }
    
    // Stop auto-scroll
    this.stopAutoScroll();
    
    // Remove input listeners
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    
    // Remove window listeners
    window.removeEventListener('pointerup', this.boundWindowPointerUp);
    window.removeEventListener('pointermove', this.boundWindowPointerMove);
    
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
