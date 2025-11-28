<script lang="ts">
  import type { Snippet } from 'svelte';
  
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
  let position = $state({ x: 0, y: 0 });
  let size = $state({ width, height: height ?? 0 });
  let isDragging = $state(false);
  let isResizing = $state(false);
  let resizeCorner = $state<'se' | 'sw'>('se');
  let dragOffset = $state({ x: 0, y: 0 });
  let panelRef = $state<HTMLDivElement | null>(null);
  let initialized = $state(false);
  
  // Load saved position and size or calculate initial values
  $effect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem(`panel-state-${panelId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        position = { x: parsed.x, y: parsed.y };
        if (resizable && parsed.width && parsed.height) {
          size = { width: parsed.width, height: parsed.height };
        }
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
  
  // Save position and size when they change
  $effect(() => {
    if (!initialized) return;
    const state = resizable 
      ? { ...position, width: size.width, height: size.height }
      : position;
    localStorage.setItem(`panel-state-${panelId}`, JSON.stringify(state));
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
    
    // Also check on mount and when panel becomes visible
    handleWindowResize();
    
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
  function handleResizePointerDown(corner: 'se' | 'sw') {
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
    let newHeight = event.clientY - rect.top;
    let newX = position.x;
    
    if (resizeCorner === 'se') {
      // Southeast corner - standard resize from right
      newWidth = event.clientX - rect.left;
    } else {
      // Southwest corner - resize from left, adjust position
      newWidth = rect.right - event.clientX;
      newX = event.clientX;
    }
    
    // Clamp to min/max bounds
    const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    const clampedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
    
    // Adjust position if width was clamped for SW corner
    if (resizeCorner === 'sw') {
      newX = rect.right - clampedWidth;
      // Don't allow panel to go off-screen left
      if (newX < 0) {
        newX = 0;
      }
    }
    
    // Clamp to viewport
    const maxViewportWidth = resizeCorner === 'se' 
      ? window.innerWidth - position.x - 10
      : rect.right - 10;
    const maxViewportHeight = window.innerHeight - position.y - 10;
    
    const finalWidth = Math.min(clampedWidth, maxViewportWidth);
    const finalHeight = Math.min(clampedHeight, maxViewportHeight);
    
    size = { width: finalWidth, height: finalHeight };
    
    // Update position for SW corner resize
    if (resizeCorner === 'sw' && newWidth >= minWidth) {
      position = { ...position, x: Math.max(0, newX) };
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
  class:minimized={isMinimized}
  class:dragging={isDragging}
  class:resizing={isResizing}
  class:resizable
  style="left: {position.x}px; top: {position.y}px; width: {isMinimized ? 'auto' : `${resizable ? size.width : width}px`}; {resizable && size.height > 0 && !isMinimized ? `height: ${size.height}px;` : ''}"
  bind:this={panelRef}
  onpointerdown={stopPropagation}
  onclick={stopPropagation}
>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="panel-header"
    onpointerdown={handleHeaderPointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
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
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="resize-handle resize-handle-sw"
        onpointerdown={handleResizePointerDown('sw')}
        onpointermove={handleResizePointerMove}
        onpointerup={handleResizePointerUp}
        onpointercancel={handleResizePointerUp}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M1 1L9 9M1 5L5 9M1 9L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div 
        class="resize-handle resize-handle-se"
        onpointerdown={handleResizePointerDown('se')}
        onpointermove={handleResizePointerMove}
        onpointerup={handleResizePointerUp}
        onpointercancel={handleResizePointerUp}
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
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
    z-index: 1000;
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
    gap: 8px;
    margin-left: auto;
  }
  
  .minimize-btn {
    background: none;
    border: none;
    color: #88ddff;
    font-size: 12px;
    cursor: pointer;
    padding: 2px 6px;
    line-height: 1;
  }
  
  .minimize-btn:hover {
    color: #aaeeff;
  }
  
  .close-btn {
    background: none;
    border: none;
    color: #ff6666;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
  }
  
  .close-btn:hover {
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
    bottom: 0;
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
    right: 0;
    cursor: se-resize;
    border-radius: 0 0 5px 0;
  }
  
  .resize-handle-sw {
    left: 0;
    cursor: sw-resize;
    border-radius: 0 0 0 5px;
  }

  /* Allow text selection in input fields inside panel */
  .draggable-panel :global(input),
  .draggable-panel :global(textarea) {
    user-select: text;
    -webkit-user-select: text;
  }
</style>
