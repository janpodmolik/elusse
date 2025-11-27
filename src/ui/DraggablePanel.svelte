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
    /** Panel width */
    width?: number;
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
    startMinimized = false,
    showClose = false,
    onclose,
    headerExtra,
    children
  }: Props = $props();
  
  // Panel state
  let isMinimized = $state(startMinimized);
  let position = $state({ x: 0, y: 0 });
  let isDragging = $state(false);
  let dragOffset = $state({ x: 0, y: 0 });
  let panelRef = $state<HTMLDivElement | null>(null);
  let initialized = $state(false);
  
  // Load saved position or calculate initial position
  $effect(() => {
    if (typeof window === 'undefined') return;
    
    const saved = localStorage.getItem(`panel-position-${panelId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        position = { x: parsed.x, y: parsed.y };
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
  
  // Save position when it changes
  $effect(() => {
    if (!initialized) return;
    localStorage.setItem(`panel-position-${panelId}`, JSON.stringify(position));
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
  style="left: {position.x}px; top: {position.y}px; width: {isMinimized ? 'auto' : `${width}px`};"
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
    <div class="panel-body">
      {@render children()}
    </div>
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
  }
  
  .draggable-panel.dragging {
    opacity: 0.9;
    cursor: grabbing;
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
    
    /* Pixel art scrollbar */
    scrollbar-width: thin;
    scrollbar-color: #4a90e2 #1a1a2e;
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
  
  /* Allow text selection in input fields inside panel */
  .draggable-panel :global(input),
  .draggable-panel :global(textarea) {
    user-select: text;
    -webkit-user-select: text;
  }
</style>
