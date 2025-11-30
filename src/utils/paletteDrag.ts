/**
 * Palette Drag & Drop Utility
 * Shared logic for drag & drop from palette items to canvas.
 * Supports both desktop (native drag & drop) and touch devices.
 */

import { EventBus } from '../events/EventBus';
import { setPaletteDragging } from './inputUtils';

// ============================================================================
// Constants
// ============================================================================

/** Minimum distance in pixels to consider as intentional drag (not tap) */
const DRAG_THRESHOLD_PX = 10;

/** Delay in ms before touch is considered a long-press drag */
const LONG_PRESS_DELAY_MS = 150;

/** CSS for touch drag preview container */
const DRAG_PREVIEW_BASE_STYLES = `
  position: fixed;
  pointer-events: none;
  z-index: 10000;
  opacity: 0.9;
  image-rendering: pixelated;
  filter: drop-shadow(3px 3px 0 rgba(0, 0, 0, 0.5));
  background: rgba(26, 26, 46, 0.9);
`;

/** CSS for touch drag preview image */
const DRAG_PREVIEW_IMG_STYLES = `
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-rendering: pixelated;
`;

// ============================================================================
// Types
// ============================================================================

export interface PaletteDragConfig {
  /** Size of the drag preview in pixels */
  previewSize: number;
  /** Border color for touch drag preview (hex) */
  borderColor: string;
  /** Data key for dataTransfer (e.g., 'assetKey', 'frameKey') */
  dataKey: string;
  /** Event name to emit on drop */
  eventName: string;
  /** Optional callback after successful drop */
  onDrop?: () => void;
}

export interface PaletteDragState {
  draggedKey: string | null;
  touchDragElement: HTMLElement | null;
}

interface TouchDragContext {
  startX: number;
  startY: number;
  hasMoved: boolean;
  isActivated: boolean;
  pendingKey: string | null;
  pendingTarget: HTMLElement | null;
  longPressTimer: ReturnType<typeof setTimeout> | null;
}

// ============================================================================
// Main Factory Function
// ============================================================================

/**
 * Creates all drag & drop handlers for a palette component.
 *
 * @param config - Configuration for drag behavior
 * @param getState - Getter for current drag state from component
 * @param setState - Setter to update drag state in component
 * @returns Object with event handlers and setup functions
 */
export function createPaletteDragHandlers(
  config: PaletteDragConfig,
  getState: () => PaletteDragState,
  setState: (updates: Partial<PaletteDragState>) => void
) {
  const { previewSize, borderColor, dataKey, eventName, onDrop } = config;
  const halfSize = previewSize / 2;

  // Touch drag context (mutable internal state)
  const touch: TouchDragContext = {
    startX: 0,
    startY: 0,
    hasMoved: false,
    isActivated: false,
    pendingKey: null,
    pendingTarget: null,
    longPressTimer: null,
  };

  // ==========================================================================
  // Shared Helpers
  // ==========================================================================

  /** Emit drop event with canvas coordinates */
  function emitDropEvent(itemKey: string, canvasX: number, canvasY: number) {
    EventBus.emit(eventName, { [dataKey]: itemKey, canvasX, canvasY });
    onDrop?.();
  }

  /** Check if point is inside canvas and return local coordinates */
  function getCanvasDropPosition(
    clientX: number,
    clientY: number
  ): { canvasX: number; canvasY: number } | null {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const isInside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;

    if (!isInside) return null;

    return {
      canvasX: clientX - rect.left,
      canvasY: clientY - rect.top,
    };
  }

  /** Create floating drag preview element for touch */
  function createTouchPreview(imgSrc: string, x: number, y: number): HTMLElement {
    const el = document.createElement('div');
    el.className = 'touch-drag-preview';
    el.innerHTML = `<img src="${imgSrc}" alt="" />`;
    el.style.cssText = `
      ${DRAG_PREVIEW_BASE_STYLES}
      top: ${y - halfSize}px;
      left: ${x - halfSize}px;
      width: ${previewSize}px;
      height: ${previewSize}px;
      border: 2px solid ${borderColor};
    `;
    el.querySelector('img')!.style.cssText = DRAG_PREVIEW_IMG_STYLES;
    document.body.appendChild(el);
    return el;
  }

  /** Update touch preview position */
  function updatePreviewPosition(preview: HTMLElement, x: number, y: number) {
    preview.style.top = `${y - halfSize}px`;
    preview.style.left = `${x - halfSize}px`;
  }

  /** Reset touch context to initial state */
  function resetTouchContext() {
    if (touch.longPressTimer) {
      clearTimeout(touch.longPressTimer);
      touch.longPressTimer = null;
    }
    touch.pendingKey = null;
    touch.pendingTarget = null;
    touch.isActivated = false;
    touch.hasMoved = false;
  }

  /** Clean up touch drag completely */
  function cleanupTouchDrag() {
    resetTouchContext();

    const state = getState();
    if (state.touchDragElement) {
      state.touchDragElement.remove();
      setState({ touchDragElement: null });
    }
    setState({ draggedKey: null });
    setPaletteDragging(false);
  }

  // ==========================================================================
  // Desktop Drag & Drop Handlers
  // ==========================================================================

  function onDragStart(event: DragEvent, itemKey: string) {
    if (!event.dataTransfer) return;

    setState({ draggedKey: itemKey });
    setPaletteDragging(true);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(dataKey, itemKey);

    // Create custom drag image
    const target = event.target as HTMLElement;
    const dragImg = target.querySelector('img')?.cloneNode(true) as HTMLImageElement | undefined;
    if (dragImg) {
      dragImg.style.cssText = 'position: absolute; top: -1000px;';
      document.body.appendChild(dragImg);
      event.dataTransfer.setDragImage(dragImg, halfSize, halfSize);
      requestAnimationFrame(() => dragImg.remove());
    }
  }

  function onDragEnd() {
    setState({ draggedKey: null });
    setPaletteDragging(false);
  }

  function handleCanvasDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  function handleCanvasDrop(e: DragEvent) {
    e.preventDefault();

    const itemKey = e.dataTransfer?.getData(dataKey);
    if (!itemKey) return;

    const pos = getCanvasDropPosition(e.clientX, e.clientY);
    if (pos) {
      emitDropEvent(itemKey, pos.canvasX, pos.canvasY);
    }
  }

  // ==========================================================================
  // Touch Drag Handlers
  // ==========================================================================

  /** Activate touch drag (create preview, update state) */
  function activateTouchDrag(x: number, y: number) {
    if (!touch.pendingKey || !touch.pendingTarget || touch.isActivated) return;

    touch.isActivated = true;
    setState({ draggedKey: touch.pendingKey });
    setPaletteDragging(true);

    const img = touch.pendingTarget.querySelector('img');
    if (img) {
      const preview = createTouchPreview(img.src, x, y);
      setState({ touchDragElement: preview });
    }
  }

  function onTouchStart(event: TouchEvent, itemKey: string) {
    if (event.touches.length !== 1) return;

    const t = event.touches[0];
    touch.startX = t.clientX;
    touch.startY = t.clientY;
    touch.hasMoved = false;
    touch.isActivated = false;
    touch.pendingKey = itemKey;
    touch.pendingTarget = event.currentTarget as HTMLElement;

    // Long press activates drag if user doesn't scroll
    touch.longPressTimer = setTimeout(() => {
      if (touch.pendingKey && !touch.hasMoved) {
        activateTouchDrag(t.clientX, t.clientY);
      }
    }, LONG_PRESS_DELAY_MS);
  }

  function onTouchMove(event: TouchEvent) {
    const t = event.touches[0];
    const dx = t.clientX - touch.startX;
    const dy = t.clientY - touch.startY;

    // Detect intentional movement
    if (!touch.hasMoved) {
      const movedEnough = Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX;
      if (movedEnough) {
        touch.hasMoved = true;

        // Determine intent: scroll vs drag
        if (!touch.isActivated) {
          const isVerticalScroll = Math.abs(dy) > Math.abs(dx);
          if (isVerticalScroll) {
            // User is scrolling - cancel pending drag, allow native behavior
            resetTouchContext();
            return;
          }
          // Horizontal movement - activate drag
          activateTouchDrag(t.clientX, t.clientY);
        }
      }
    }

    // Update preview position if drag is active
    const state = getState();
    if (touch.isActivated && state.touchDragElement) {
      updatePreviewPosition(state.touchDragElement, t.clientX, t.clientY);
      event.preventDefault(); // Prevent scroll only when dragging
    }
  }

  function onTouchEnd(event: TouchEvent) {
    const state = getState();
    const wasActivated = touch.isActivated;
    const draggedKey = state.draggedKey;

    // Handle drop if drag was active and moved
    if (wasActivated && draggedKey && touch.hasMoved) {
      const t = event.changedTouches[0];
      const pos = getCanvasDropPosition(t.clientX, t.clientY);
      if (pos) {
        emitDropEvent(draggedKey, pos.canvasX, pos.canvasY);
      }
    }

    cleanupTouchDrag();
  }

  // ==========================================================================
  // Setup Functions
  // ==========================================================================

  /** Setup canvas listeners for desktop drag & drop. Returns cleanup function. */
  function setupCanvasListeners(): () => void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return () => {};

    canvas.addEventListener('dragover', handleCanvasDragOver);
    canvas.addEventListener('drop', handleCanvasDrop);

    return () => {
      canvas.removeEventListener('dragover', handleCanvasDragOver);
      canvas.removeEventListener('drop', handleCanvasDrop);
    };
  }

  /** Setup document listeners for touch drag. Returns cleanup function. */
  function setupTouchListeners(): () => void {
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);

    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  return {
    // Desktop handlers (bind to palette items)
    onDragStart,
    onDragEnd,
    // Touch handler (bind to palette items)
    onTouchStart,
    // Setup functions (call on mount)
    setupCanvasListeners,
    setupTouchListeners,
  };
}
