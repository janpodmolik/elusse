<script lang="ts">
  import type { Snippet } from 'svelte';
  import { isDraggingInBuilder } from '../../stores/builderStores';
  
  // Global z-index counter for panel stacking order
  let globalZIndex = 1000;
  
  interface Props {
    /** Unique ID for storing position in localStorage */
    panelId: string;
    /** Panel title shown in header */
    title: string;
    /** Initial X position (from right edge) */
    initialRight?: number;
    /** Initial Y position (from top) */
    initialTop?: number;
    /** Initial panel width */
    width?: number;
    /** Initial panel height (if resizable) */
    height?: number;
    /** Minimum width when resizing */
    minWidth?: number;
    /** Minimum height when resizing */
    minHeight?: number;
    /** Maximum width when resizing */
    maxWidth?: number;
    /** Maximum height when resizing */
    maxHeight?: number;
    /** Enable resize handle */
    resizable?: boolean;
    /** Whether panel starts minimized */
    startMinimized?: boolean;
    /** Show close button */
    showClose?: boolean;
    /** Close callback */
    onclose?: () => void;
    /** Header content (optional, renders after title) */
    headerExtra?: Snippet;
    /** Main content */
    children: Snippet;
  }
  
  let {
    panelId,
    title,
    initialRight = 10,
    initialTop = 60,
    width = 280,
    height,
    minWidth = 200,
    minHeight = 100,
    maxWidth = 600,
    maxHeight = 800,
    resizable = false,
    startMinimized = false,
    showClose = false,
    onclose,
    headerExtra,
    children
  }: Props = $props();
  
  // Panel state
  let isMinimized = $state(startMinimized);
  let isMaximized = $state(false);
  let position = $state({ x: 0, y: 0 });
  let size = $state({ width, height: height ?? 0 });
  let isDragging = $state(false);
  let isResizing = $state(false);
  let resizeCorner = $state<'ne' | 'nw' | 'se' | 'sw'>('se');
  let dragOffset = $state({ x: 0, y: 0 });
  let panelRef = $state<HTMLDivElement | null>(null);
  let initialized = $state(false);
  let zIndex = $state(globalZIndex);
  
  // Store previous state for restore after maximize
  let preMaximizeState = $state<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Track previous position/size to avoid unnecessary saves
  let lastSavedState = $state<string>('');
  
  /** Bring this panel to front by incrementing global z-index */
  function bringToFront() {
    globalZIndex++;
    zIndex = globalZIndex;
  }
  
  /** Clamp position to ensure panel is visible within viewport */
  function clampToViewport(x: number, y: number, panelWidth: number): { x: number; y: number } {
    const padding = 10;
    const minHeaderVisible = 40; // At least header should be visible
    
    // Clamp X - ensure panel is not off-screen horizontally
    let clampedX = x;
    const maxX = window.innerWidth - panelWidth - padding;
    if (clampedX > maxX) clampedX = Math.max(padding, maxX);
    if (clampedX < padding) clampedX = padding;
    
    // Clamp Y - ensure at least header is visible
    let clampedY = y;
    const maxY = window.innerHeight - minHeaderVisible;
    if (clampedY > maxY) clampedY = Math.max(padding, maxY);
    if (clampedY < padding) clampedY = padding;
    
    return { x: clampedX, y: clampedY };
  }
  
  // Load saved position and size on mount (runs once)
  $effect(() => {
    if (typeof window === 'undefined' || initialized) return;
    
    const saved = localStorage.getItem(`panel-state-${panelId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const panelWidth = (resizable && parsed.width) ? parsed.width : width;
        
        // Always clamp saved position to current viewport
        const clamped = clampToViewport(parsed.x, parsed.y, panelWidth);
        position = clamped;
        
        if (resizable && parsed.width && parsed.height) {
          size = { width: parsed.width, height: parsed.height };
        }
        
        // Update lastSavedState with clamped position
        const state = resizable 
          ? { x: clamped.x, y: clamped.y, width: size.width, height: size.height }
          : { x: clamped.x, y: clamped.y };
        lastSavedState = JSON.stringify(state);
      } catch {
        // Calculate from right edge
        position = { 
          x: window.innerWidth - width - initialRight, 
          y: initialTop 
        };
      }
    } else {
      // Calculate from right edge
      position = { 
        x: window.innerWidth - width - initialRight, 
        y: initialTop 
      };
    }
    initialized = true;
  });
  
  // Save position and size when they change (debounced to avoid loops)
  $effect(() => {
    if (!initialized) return;
    const state = resizable 
      ? { x: position.x, y: position.y, width: size.width, height: size.height }
      : { x: position.x, y: position.y };
    const stateStr = JSON.stringify(state);
    
    // Only save if actually changed (prevents infinite loop)
    if (stateStr !== lastSavedState) {
      lastSavedState = stateStr;
      localStorage.setItem(`panel-state-${panelId}`, stateStr);
    }
  });
  
  // Handle window resize - ensure panel stays visible
  $effect(() => {
    if (!initialized) return;
    
    function handleWindowResize() {
      if (!panelRef) return;
      
      const panelWidth = resizable ? size.width : width;
      
      // Check if panel is off-screen and adjust position
      let newX = position.x;
      let newY = position.y;
      let needsUpdate = false;
      
      // Ensure panel doesn't go off the right edge
      const maxX = window.innerWidth - panelWidth;
      if (position.x > maxX) {
        newX = Math.max(10, maxX);
        needsUpdate = true;
      }
      
      // Ensure panel doesn't go off the bottom
      const maxY = window.innerHeight - 40; // At least header visible
      if (position.y > maxY) {
        newY = Math.max(10, maxY);
        needsUpdate = true;
      }
      
      // Ensure panel is not off-screen to the left or top
      if (position.x < 0) {
        newX = 10;
        needsUpdate = true;
      }
      if (position.y < 0) {
        newY = 10;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        position = { x: newX, y: newY };
      }
    }
    
    window.addEventListener('resize', handleWindowResize);
    
    // Note: Do NOT call handleWindowResize() here synchronously!
    // That would cause infinite loop with position save effect.
    // Window resize listener will handle edge cases when window actually resizes.
    
    return () => {
      window.removeEventListener('resize', handleWindowResize);
    };
  });
  
  function toggleMinimize() {
    isMinimized = !isMinimized;
  }
  
  function handleClose() {
    onclose?.();
  }
  
  /**
   * Toggle maximize state - expands panel to fill available space
   * or restores to previous size/position
   */
  function toggleMaximize() {
    if (!resizable) return;
    
    if (isMaximized) {
      // Restore previous state
      if (preMaximizeState) {
        position = { x: preMaximizeState.x, y: preMaximizeState.y };
        size = { width: preMaximizeState.width, height: preMaximizeState.height };
        preMaximizeState = null;
      }
      isMaximized = false;
    } else {
      // Save current state
      preMaximizeState = { 
        x: position.x, 
        y: position.y, 
        width: size.width, 
        height: size.height 
      };
      
      // Calculate maximum available size with some padding
      const padding = 20;
      const newWidth = Math.min(maxWidth, window.innerWidth - padding * 2);
      const newHeight = Math.min(maxHeight, window.innerHeight - padding * 2);
      
      // Center the panel
      const newX = Math.max(padding, (window.innerWidth - newWidth) / 2);
      const newY = Math.max(padding, (window.innerHeight - newHeight) / 2);
      
      position = { x: newX, y: newY };
      size = { width: newWidth, height: newHeight };
      isMaximized = true;
    }
  }
  
  function handleHeaderDoubleClick(event: MouseEvent) {
    // Don't trigger on buttons
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    
    toggleMaximize();
  }
  
  function handleHeaderPointerDown(event: PointerEvent) {
    // Only drag from header, not from buttons
    const target = event.target as HTMLElement;
    if (target.closest('button')) return;
    
    isDragging = true;
    dragOffset = {
      x: event.clientX - position.x,
      y: event.clientY - position.y
    };
    
    // Capture pointer for smooth dragging
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  
  function handlePointerMove(event: PointerEvent) {
    if (!isDragging) return;
    
    const newX = event.clientX - dragOffset.x;
    const newY = event.clientY - dragOffset.y;
    
    // Clamp to viewport bounds
    const maxX = window.innerWidth - (panelRef?.offsetWidth ?? width);
    const maxY = window.innerHeight - 40; // At least header visible
    
    position = {
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY))
    };
  }
  
  function handlePointerUp(event: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }
  
  // Resize handlers
  function handleResizePointerDown(corner: 'ne' | 'nw' | 'se' | 'sw') {
    return (event: PointerEvent) => {
      if (!resizable) return;
      
      isResizing = true;
      resizeCorner = corner;
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    };
  }
  
  function handleResizePointerMove(event: PointerEvent) {
    if (!isResizing || !panelRef) return;
    
    const rect = panelRef.getBoundingClientRect();
    let newWidth: number;
    let newHeight: number;
    let newX = position.x;
    let newY = position.y;
    
    // Calculate new dimensions based on corner
    const isRight = resizeCorner === 'se' || resizeCorner === 'ne';
    const isBottom = resizeCorner === 'se' || resizeCorner === 'sw';
    
    if (isRight) {
      // Resize from right edge
      newWidth = event.clientX - rect.left;
    } else {
      // Resize from left edge - adjust position
      newWidth = rect.right - event.clientX;
      newX = event.clientX;
    }
    
    if (isBottom) {
      // Resize from bottom edge
      newHeight = event.clientY - rect.top;
    } else {
      // Resize from top edge - adjust position
      newHeight = rect.bottom - event.clientY;
      newY = event.clientY;
    }
    
    // Clamp to min/max bounds
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    
    // Adjust position if size was clamped for left/top edges
    if (!isRight) {
      newX = rect.right - clampedWidth;
      // Don't allow panel to go off-screen left
      if (newX < 0) {
        newX = 0;
      }
    }
    
    if (!isBottom) {
      newY = rect.bottom - clampedHeight;
      // Don't allow panel to go off-screen top
      if (newY < 0) {
        newY = 0;
      }
    }
    
    // Clamp to viewport
    const maxViewportWidth = isRight 
      ? window.innerWidth - position.x - 10
      : rect.right - 10;
    const maxViewportHeight = isBottom
      ? window.innerHeight - position.y - 10
      : rect.bottom - 10;
    
    const finalWidth = Math.min(clampedWidth, maxViewportWidth);
    const finalHeight = Math.min(clampedHeight, maxViewportHeight);
    
    size = { width: finalWidth, height: finalHeight };
    
    // Update position for left/top edge resizing
    let positionChanged = false;
    let finalX = position.x;
    let finalY = position.y;
    
    if (!isRight && newWidth >= minWidth) {
      finalX = Math.max(0, newX);
      positionChanged = true;
    }
    if (!isBottom && newHeight >= minHeight) {
      finalY = Math.max(0, newY);
      positionChanged = true;
    }
    
    if (positionChanged) {
      position = { x: finalX, y: finalY };
    }
  }
  
  function handleResizePointerUp(event: PointerEvent) {
    if (!isResizing) return;
    isResizing = false;
    (event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
  }
  
  /** Stop events from reaching canvas */
  function stopPropagation(event: Event) {
    event.stopPropagation();
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div 
  class="draggable-panel"
  data-ui
  class:minimized={isMinimized}
  class:maximized={isMaximized}
  class:dragging={isDragging}
  class:resizing={isResizing}
  class:resizable
  style="left: {position.x}px; top: {position.y}px; width: {isMinimized ? 'auto' : `${resizable ? size.width : width}px`}; {resizable && size.height > 0 && !isMinimized ? `height: ${size.height}px;` : ''}{$isDraggingInBuilder ? ' pointer-events: none;' : ''} z-index: {zIndex};"
  bind:this={panelRef}
  onpointerdown={(e) => { bringToFront(); stopPropagation(e); }}
  onclick={stopPropagation}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="panel-header"
    onpointerdown={handleHeaderPointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
    ondblclick={handleHeaderDoubleClick}
  >
    <span class="panel-title">{title}</span>
    {#if headerExtra}
      {@render headerExtra()}
    {/if}
    <div class="header-buttons">
      <button 
        class="minimize-btn" 
        onclick={toggleMinimize} 
        title={isMinimized ? 'Expand' : 'Minimize'}
      >
        {isMinimized ? '▲' : '▼'}
      </button>
      {#if showClose}
        <button class="close-btn" onclick={handleClose} title="Close">×</button>
      {/if}
    </div>
  </div>
  
  {#if !isMinimized}
    <div class="panel-body" class:has-fixed-height={resizable && size.height > 0}>
      {@render children()}
    </div>
    
    {#if resizable}
      <!-- Top-left corner resize handle -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="resize-handle resize-handle-nw"
        onpointerdown={handleResizePointerDown('nw')}
        onpointermove={handleResizePointerMove}
        onpointerup={handleResizePointerUp}
        onpointercancel={handleResizePointerUp}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M9 9L1 1M5 1L1 1L1 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
      <!-- Top-right corner resize handle -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="resize-handle resize-handle-ne"
        onpointerdown={handleResizePointerDown('ne')}
        onpointermove={handleResizePointerMove}
        onpointerup={handleResizePointerUp}
        onpointercancel={handleResizePointerUp}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M1 9L9 1M5 1L9 1L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
      <!-- Bottom-left corner resize handle -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="resize-handle resize-handle-sw"
        onpointerdown={handleResizePointerDown('sw')}
        onpointermove={handleResizePointerMove}
        onpointerup={handleResizePointerUp}
        onpointercancel={handleResizePointerUp}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M9 1L1 9M1 5L1 9L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
      <!-- Bottom-right corner resize handle -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="resize-handle resize-handle-se"
        onpointerdown={handleResizePointerDown('se')}
        onpointermove={handleResizePointerMove}
        onpointerup={handleResizePointerUp}
        onpointercancel={handleResizePointerUp}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M1 1L9 9M9 5L9 9L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>
      </div>
    {/if}
  {/if}
</div>

<style>
  .draggable-panel {
    position: fixed;
    background: rgba(30, 30, 40, 0.95);
    border: 3px solid #4a4a5a;
    border-radius: 8px;
    color: white;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    /* z-index is set dynamically via inline style for panel stacking */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    user-select: none;
    -webkit-user-select: none;
    pointer-events: auto;
    display: flex;
    flex-direction: column;
  }
  
  .draggable-panel.resizable {
    min-width: 200px;
    min-height: 100px;
  }
  
  .draggable-panel.minimized {
    min-height: auto;
    height: auto !important;
  }
  
  .draggable-panel.maximized {
    border-color: #88ddff;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
  }
  
  .draggable-panel.dragging,
  .draggable-panel.resizing {
    opacity: 0.9;
  }
  
  .draggable-panel.dragging {
    cursor: grabbing;
  }
  
  .draggable-panel.resizing {
    cursor: se-resize;
  }
  
  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 12px;
    border-bottom: 2px solid #4a4a5a;
    background: rgba(50, 50, 60, 0.5);
    border-radius: 5px 5px 0 0;
    cursor: grab;
    gap: 8px;
  }
  
  .dragging .panel-header {
    cursor: grabbing;
  }
  
  .minimized .panel-header {
    border-bottom: none;
    border-radius: 5px;
  }
  
  .panel-title {
    font-size: 11px;
    color: #88ddff;
    flex-shrink: 0;
  }
  
  .header-buttons {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
    margin-right: 12px; /* Space for corner resize handle */
  }
  
  .minimize-btn {
    background: rgba(136, 221, 255, 0.15);
    border: 2px solid #88ddff;
    border-radius: 4px;
    color: #88ddff;
    font-size: 14px;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    min-width: 28px;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .minimize-btn:hover {
    background: rgba(136, 221, 255, 0.25);
    color: #aaeeff;
  }
  
  .close-btn {
    background: rgba(255, 102, 102, 0.15);
    border: 2px solid #ff6666;
    border-radius: 4px;
    color: #ff6666;
    font-size: 18px;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    min-width: 28px;
    min-height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-btn:hover {
    background: rgba(255, 102, 102, 0.25);
    color: #ff8888;
  }
  
  .panel-body {
    /* Allow content to scroll if needed */
    max-height: calc(100vh - 150px);
    overflow-y: auto;
    overflow-x: hidden;
    flex: 1;
    min-height: 0;
    
    /* Pixel art scrollbar */
    scrollbar-width: thin;
    scrollbar-color: #4a90e2 #1a1a2e;
  }
  
  .panel-body.has-fixed-height {
    max-height: none;
  }
  
  .panel-body::-webkit-scrollbar {
    width: 10px;
  }
  
  .panel-body::-webkit-scrollbar-track {
    background: #1a1a2e;
  }
  
  .panel-body::-webkit-scrollbar-thumb {
    background: #4a90e2;
    border: 2px solid #1a1a2e;
  }
  
  /* Resize handles */
  .resize-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #666;
    transition: color 0.15s;
  }
  
  .resize-handle:hover {
    color: #88ddff;
  }
  
  .resize-handle svg {
    pointer-events: none;
  }
  
  .resize-handle-se {
    bottom: 0;
    right: 0;
    cursor: se-resize;
    border-radius: 0 0 5px 0;
  }
  
  .resize-handle-sw {
    bottom: 0;
    left: 0;
    cursor: sw-resize;
    border-radius: 0 0 0 5px;
  }
  
  .resize-handle-ne {
    top: 0;
    right: 0;
    cursor: ne-resize;
    border-radius: 0 5px 0 0;
  }
  
  .resize-handle-nw {
    top: 0;
    left: 0;
    cursor: nw-resize;
    border-radius: 5px 0 0 0;
  }

  /* Allow text selection in input fields inside panel */
  .draggable-panel :global(input),
  .draggable-panel :global(textarea) {
    user-select: text;
    -webkit-user-select: text;
  }
</style>
