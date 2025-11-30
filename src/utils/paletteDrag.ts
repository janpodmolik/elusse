/**
 * Palette Drag & Drop Hook
 * Shared logic for drag & drop from palette to canvas
 */

import { EventBus } from '../events/EventBus';
import { setPaletteDragging } from './inputUtils';

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

/**
 * Creates all drag & drop handlers for a palette
 */
// Minimum distance in pixels to consider as drag (not just tap)
const DRAG_THRESHOLD = 10;

export function createPaletteDragHandlers(
  config: PaletteDragConfig,
  getState: () => PaletteDragState,
  setState: (updates: Partial<PaletteDragState>) => void
) {
  const { previewSize, borderColor, dataKey, eventName, onDrop } = config;
  const halfSize = previewSize / 2;
  
  // Touch start position for movement detection
  let touchStartX = 0;
  let touchStartY = 0;
  let hasMoved = false;

  // Desktop drag handlers
  function onDragStart(event: DragEvent, itemKey: string) {
    if (!event.dataTransfer) return;
    
    setState({ draggedKey: itemKey });
    setPaletteDragging(true);
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(dataKey, itemKey);
    
    // Create drag image
    const img = event.target as HTMLElement;
    const dragImg = img.querySelector('img')?.cloneNode(true) as HTMLImageElement;
    if (dragImg) {
      dragImg.style.position = 'absolute';
      dragImg.style.top = '-1000px';
      document.body.appendChild(dragImg);
      event.dataTransfer.setDragImage(dragImg, halfSize, halfSize);
      setTimeout(() => dragImg.remove(), 0);
    }
  }
  
  function onDragEnd() {
    setState({ draggedKey: null });
    setPaletteDragging(false);
  }

  // Touch drag handlers
  function onTouchStart(event: TouchEvent, itemKey: string) {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    hasMoved = false;
    
    setState({ draggedKey: itemKey });
    setPaletteDragging(true);
    
    // Create floating drag element
    const target = event.currentTarget as HTMLElement;
    const img = target.querySelector('img');
    if (img) {
      const dragEl = document.createElement('div');
      dragEl.className = 'touch-drag-preview';
      dragEl.innerHTML = `<img src="${img.src}" alt="" />`;
      dragEl.style.cssText = `
        position: fixed;
        top: ${touch.clientY - halfSize}px;
        left: ${touch.clientX - halfSize}px;
        width: ${previewSize}px;
        height: ${previewSize}px;
        pointer-events: none;
        z-index: 10000;
        opacity: 0.9;
        image-rendering: pixelated;
        filter: drop-shadow(3px 3px 0 rgba(0, 0, 0, 0.5));
        border: 2px solid ${borderColor};
        background: rgba(26, 26, 46, 0.9);
      `;
      dragEl.querySelector('img')!.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        image-rendering: pixelated;
      `;
      document.body.appendChild(dragEl);
      setState({ touchDragElement: dragEl });
    }
  }
  
  function onTouchMove(event: TouchEvent) {
    const state = getState();
    if (!state.draggedKey || !state.touchDragElement) return;
    
    const touch = event.touches[0];
    state.touchDragElement.style.top = `${touch.clientY - halfSize}px`;
    state.touchDragElement.style.left = `${touch.clientX - halfSize}px`;
    
    // Check if moved beyond threshold
    if (!hasMoved) {
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        hasMoved = true;
      }
    }
    
    event.preventDefault();
  }
  
  function onTouchEnd(event: TouchEvent) {
    const state = getState();
    if (!state.draggedKey) return;
    
    const touch = event.changedTouches[0];
    const canvas = document.querySelector('canvas');
    
    // Clean up drag preview
    if (state.touchDragElement) {
      state.touchDragElement.remove();
      setState({ touchDragElement: null });
    }
    
    // Only emit drop if user actually dragged (not just tapped)
    // Check movement one more time in case touchmove wasn't called
    if (!hasMoved) {
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        hasMoved = true;
      }
    }
    
    // Check if dropped on canvas (only if actually dragged)
    if (canvas && hasMoved) {
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX;
      const y = touch.clientY;
      
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        EventBus.emit(eventName, {
          [dataKey]: state.draggedKey,
          canvasX,
          canvasY
        });
        
        onDrop?.();
      }
    }
    
    setState({ draggedKey: null });
    setPaletteDragging(false);
  }

  // Canvas drop handlers (desktop)
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }
  
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    
    const itemKey = e.dataTransfer?.getData(dataKey);
    if (!itemKey) return;
    
    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    EventBus.emit(eventName, {
      [dataKey]: itemKey,
      canvasX,
      canvasY
    });
    
    onDrop?.();
  }

  // Setup functions
  function setupCanvasListeners(): () => void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return () => {};
    
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    
    return () => {
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('drop', handleDrop);
    };
  }
  
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

  return {
    onDragStart,
    onDragEnd,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    setupCanvasListeners,
    setupTouchListeners,
  };
}
