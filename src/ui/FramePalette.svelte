<script lang="ts">
  import { onMount } from 'svelte';
  import DraggablePanel from './DraggablePanel.svelte';
  import { FRAMES } from '../data/frames';
  import { EventBus, EVENTS, type FrameDroppedEvent } from '../events/EventBus';
  import { builderEditMode, isFramePaletteOpen } from '../stores/builderStores';
  
  const frames = FRAMES;
  
  let draggedFrame = $state<string | null>(null);
  
  // Touch drag state
  let touchDragElement = $state<HTMLElement | null>(null);
  
  // Desktop drag & drop handlers
  function onDragStart(event: DragEvent, frameKey: string) {
    if (!event.dataTransfer) return;
    
    draggedFrame = frameKey;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('frameKey', frameKey);
    
    // Create drag image
    const img = event.target as HTMLElement;
    const dragImg = img.querySelector('img')?.cloneNode(true) as HTMLImageElement;
    if (dragImg) {
      dragImg.style.position = 'absolute';
      dragImg.style.top = '-1000px';
      document.body.appendChild(dragImg);
      event.dataTransfer.setDragImage(dragImg, 32, 32);
      setTimeout(() => dragImg.remove(), 0);
    }
  }
  
  function onDragEnd() {
    draggedFrame = null;
  }
  
  // Touch drag handlers for mobile
  function onTouchStart(event: TouchEvent, frameKey: string) {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    draggedFrame = frameKey;
    
    // Create floating drag element
    const target = event.currentTarget as HTMLElement;
    const img = target.querySelector('img');
    if (img) {
      const dragEl = document.createElement('div');
      dragEl.className = 'touch-drag-preview';
      dragEl.innerHTML = `<img src="${img.src}" alt="" />`;
      dragEl.style.cssText = `
        position: fixed;
        top: ${touch.clientY - 32}px;
        left: ${touch.clientX - 32}px;
        width: 64px;
        height: 64px;
        pointer-events: none;
        z-index: 10000;
        opacity: 0.9;
        image-rendering: pixelated;
        filter: drop-shadow(3px 3px 0 rgba(0, 0, 0, 0.5));
        border: 2px solid #9b59b6;
        background: rgba(26, 26, 46, 0.9);
      `;
      dragEl.querySelector('img')!.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        image-rendering: pixelated;
      `;
      document.body.appendChild(dragEl);
      touchDragElement = dragEl;
    }
  }
  
  function onTouchMove(event: TouchEvent) {
    if (!draggedFrame || !touchDragElement) return;
    
    const touch = event.touches[0];
    touchDragElement.style.top = `${touch.clientY - 32}px`;
    touchDragElement.style.left = `${touch.clientX - 32}px`;
    
    event.preventDefault();
  }
  
  function onTouchEnd(event: TouchEvent) {
    if (!draggedFrame) return;
    
    const touch = event.changedTouches[0];
    const canvas = document.querySelector('canvas');
    
    // Clean up drag preview
    if (touchDragElement) {
      touchDragElement.remove();
      touchDragElement = null;
    }
    
    // Check if dropped on canvas
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const x = touch.clientX;
      const y = touch.clientY;
      
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        // Calculate canvas-relative coordinates
        const canvasX = x - rect.left;
        const canvasY = y - rect.top;
        
        // Emit drop event via EventBus
        EventBus.emit<FrameDroppedEvent>(EVENTS.FRAME_DROPPED, {
          frameKey: draggedFrame,
          canvasX,
          canvasY
        });
      }
    }
    
    draggedFrame = null;
  }
  
  function stopMouseDown(event: PointerEvent) {
    // Prevent mousedown from reaching canvas to avoid dragging sprites underneath
    event.stopPropagation();
  }
  
  // Setup drop zone on canvas (for desktop drag & drop)
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }
  
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    
    const frameKey = e.dataTransfer?.getData('frameKey');
    if (!frameKey) return;
    
    // Get canvas-relative coordinates
    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Emit drop event via EventBus
    EventBus.emit<FrameDroppedEvent>(EVENTS.FRAME_DROPPED, {
      frameKey,
      canvasX,
      canvasY
    });
  }
  
  // Use onMount for one-time canvas listener setup
  onMount(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    
    return () => {
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('drop', handleDrop);
    };
  });
  
  // Global touch move/end listeners (need to be on document for drag outside palette)
  $effect(() => {
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  });
  function closePalette() {
    isFramePaletteOpen.set(false);
  }
</script>

{#if $isFramePaletteOpen && $builderEditMode === 'frames'}
  <DraggablePanel 
    panelId="frame-palette"
    title="Frames"
    initialRight={10}
    initialTop={60}
    width={320}
    height={400}
    minWidth={220}
    minHeight={200}
    maxWidth={600}
    maxHeight={600}
    resizable={true}
    showClose={true}
    onclose={closePalette}
  >
    {#snippet headerExtra()}
      <span class="palette-hint">Drag to place</span>
    {/snippet}
    
    <div
      class="palette-content"
      role="toolbar"
      tabindex="-1"
      onpointerdown={stopMouseDown}
    >
      <div class="palette-grid">
        {#each frames as frame}
          <div 
            class="frame-item"
            class:dragging={draggedFrame === frame.key}
            draggable="true"
            ondragstart={(e) => onDragStart(e, frame.key)}
            ondragend={onDragEnd}
            ontouchstart={(e) => onTouchStart(e, frame.key)}
            title={frame.name}
            role="button"
            tabindex="0"
          >
            <img 
              src={frame.path} 
              alt={frame.name}
              class="frame-preview"
            />
            <span class="frame-name">{frame.name}</span>
          </div>
        {/each}
      </div>
    </div>
  </DraggablePanel>
{/if}

<style>
  .palette-hint {
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    color: #888;
    text-transform: uppercase;
  }
  
  .palette-content {
    user-select: none;
    -webkit-user-select: none;
    height: 100%;
    overflow-y: auto;
  }
  
  .palette-grid {
    display: grid;
    /* Auto-fit columns based on available width, wider for frames */
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 8px;
    padding: 12px;
  }
  
  .frame-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: #252540;
    border: 2px solid #333;
    cursor: grab;
    transition: all 0.1s ease-out;
    min-height: 90px;
    user-select: none;
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
  }
  
  .frame-item:active {
    cursor: grabbing;
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
  }
  
  .frame-item.dragging {
    opacity: 0.5;
    border-color: #9b59b6;
  }
  
  .frame-item:hover {
    background: #2d2d50;
    border-color: #9b59b6;
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
  }
  
  .frame-preview {
    width: 64px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
  }
  
  .frame-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: #aaa;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .frame-item:hover .frame-name {
    color: #fff;
  }
  
  .frame-item:hover .frame-preview {
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5))
            drop-shadow(0 0 4px rgba(155, 89, 182, 0.4));
  }
  
  /* Mobile optimization */
  @media (max-width: 600px) {
    .palette-hint {
      font-size: 6px;
    }
    
    .palette-grid {
      gap: 6px;
      padding: 8px;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
    
    .frame-item {
      padding: 8px;
      min-height: 70px;
      gap: 6px;
      border-width: 2px;
      box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
    }
    
    .frame-preview {
      width: 48px;
      height: 36px;
    }
    
    .frame-name {
      font-size: 7px;
      letter-spacing: 0;
    }
  }
</style>
