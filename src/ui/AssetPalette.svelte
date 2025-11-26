<script lang="ts">
  import { onMount } from 'svelte';
  import PixelButton from './PixelButton.svelte';
  import { ASSETS } from '../data/assets';
  import { EventBus, EVENTS, type AssetDroppedEvent } from '../events/EventBus';
  
  const assets = ASSETS;
  
  let isOpen = $state(false);
  let draggedAsset = $state<string | null>(null);
  
  // Touch drag state
  let touchDragElement = $state<HTMLElement | null>(null);
  
  function togglePalette(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    isOpen = !isOpen;
  }
  
  // Desktop drag & drop handlers
  function onDragStart(event: DragEvent, assetKey: string) {
    if (!event.dataTransfer) return;
    
    draggedAsset = assetKey;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('assetKey', assetKey);
    
    // Create drag image
    const img = event.target as HTMLElement;
    const dragImg = img.querySelector('img')?.cloneNode(true) as HTMLImageElement;
    if (dragImg) {
      dragImg.style.position = 'absolute';
      dragImg.style.top = '-1000px';
      document.body.appendChild(dragImg);
      event.dataTransfer.setDragImage(dragImg, 24, 24);
      setTimeout(() => dragImg.remove(), 0);
    }
  }
  
  function onDragEnd() {
    draggedAsset = null;
  }
  
  // Touch drag handlers for mobile
  function onTouchStart(event: TouchEvent, assetKey: string) {
    if (event.touches.length !== 1) return;
    
    const touch = event.touches[0];
    draggedAsset = assetKey;
    
    // Create floating drag element
    const target = event.currentTarget as HTMLElement;
    const img = target.querySelector('img');
    if (img) {
      const dragEl = document.createElement('div');
      dragEl.className = 'touch-drag-preview';
      dragEl.innerHTML = `<img src="${img.src}" alt="" />`;
      dragEl.style.cssText = `
        position: fixed;
        top: ${touch.clientY - 24}px;
        left: ${touch.clientX - 24}px;
        width: 48px;
        height: 48px;
        pointer-events: none;
        z-index: 10000;
        opacity: 0.9;
        image-rendering: pixelated;
        filter: drop-shadow(3px 3px 0 rgba(0, 0, 0, 0.5));
        border: 2px solid #4a90e2;
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
    if (!draggedAsset || !touchDragElement) return;
    
    const touch = event.touches[0];
    touchDragElement.style.top = `${touch.clientY - 24}px`;
    touchDragElement.style.left = `${touch.clientX - 24}px`;
    
    event.preventDefault();
  }
  
  function onTouchEnd(event: TouchEvent) {
    if (!draggedAsset) return;
    
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
        EventBus.emit<AssetDroppedEvent>(EVENTS.ASSET_DROPPED, {
          assetKey: draggedAsset,
          canvasX,
          canvasY
        });
      }
    }
    
    draggedAsset = null;
  }
  
  function stopMouseDown(event: PointerEvent) {
    // Prevent mousedown from reaching canvas to avoid dragging sprites underneath
    // Drag events (ondragstart, ondrag, ondrop) continue to work normally
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
    
    const assetKey = e.dataTransfer?.getData('assetKey');
    if (!assetKey) return;
    
    // Get canvas-relative coordinates
    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;
    
    // Emit drop event via EventBus
    EventBus.emit<AssetDroppedEvent>(EVENTS.ASSET_DROPPED, {
      assetKey,
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
</script>

<div class="palette-container">
  <!-- ASSETS button - always top-right -->
  <PixelButton 
    onclick={togglePalette}
    position="top-right"
    variant="blue"
    width="140px"
    title="Asset Palette"
  >
    {isOpen ? '▼' : '◀'} ASSETS
  </PixelButton>

  {#if isOpen}
    <div
      class="palette-dropdown"
      role="toolbar"
      tabindex="-1"
      onpointerdown={stopMouseDown}
    >
      <div class="palette-header">
        <span class="palette-title">Assets</span>
        <span class="palette-hint">Drag to place</span>
      </div>
      <div class="palette-grid">
        {#each assets as asset}
          <div 
            class="asset-item"
            class:dragging={draggedAsset === asset.key}
            draggable="true"
            ondragstart={(e) => onDragStart(e, asset.key)}
            ondragend={onDragEnd}
            ontouchstart={(e) => onTouchStart(e, asset.key)}
            title={asset.name}
            role="button"
            tabindex="0"
          >
            <img 
              src={asset.path} 
              alt={asset.name}
              class="asset-preview"
            />
            <span class="asset-name">{asset.name}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .palette-container {
    pointer-events: none; /* Allow clicks through */
  }
  
  .palette-container :global(.pixel-btn) {
    pointer-events: auto; /* Re-enable for button */
  }
  
  .palette-dropdown {
    position: fixed;
    top: calc(60px + env(safe-area-inset-top));
    right: calc(10px + env(safe-area-inset-right));
    width: clamp(240px, 30vw, 320px);
    min-height: 200px;
    max-height: min(calc(100vh - 150px), 500px);
    background: #1a1a2e;
    border: 3px solid #333;
    box-shadow: 
      6px 6px 0 rgba(0, 0, 0, 0.4),
      inset 0 0 0 1px rgba(255, 255, 255, 0.05);
    overflow-y: auto;
    overflow-x: hidden;
    image-rendering: pixelated;
    pointer-events: auto;
    user-select: none;
    -webkit-user-select: none;
    
    /* Pixel art scrollbar */
    scrollbar-width: thin;
    scrollbar-color: #4a90e2 #0f0f1a;
  }
  
  /* Webkit scrollbar styling */
  .palette-dropdown::-webkit-scrollbar {
    width: 12px;
  }
  
  .palette-dropdown::-webkit-scrollbar-track {
    background: #0f0f1a;
    border-left: 2px solid #333;
  }
  
  .palette-dropdown::-webkit-scrollbar-thumb {
    background: #4a90e2;
    border: 2px solid #333;
  }
  
  .palette-dropdown::-webkit-scrollbar-thumb:hover {
    background: #5da0f2;
  }
  
  .palette-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: #252540;
    border-bottom: 2px solid #333;
    position: sticky;
    top: 0;
    z-index: 1;
  }
  
  .palette-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    color: #fff;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  .palette-hint {
    font-family: 'Press Start 2P', monospace;
    font-size: 7px;
    color: #888;
    text-transform: uppercase;
  }
  
  .palette-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    padding: 12px;
  }
  
  .asset-item {
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
    min-height: 100px;
    user-select: none;
    box-shadow: 3px 3px 0 rgba(0, 0, 0, 0.3);
  }
  
  .asset-item:active {
    cursor: grabbing;
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
  }
  
  .asset-item.dragging {
    opacity: 0.5;
    border-color: #4a90e2;
  }
  
  .asset-item:hover {
    background: #2d2d50;
    border-color: #4a90e2;
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
  }
  
  .asset-preview {
    width: 48px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
  }
  
  .asset-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: #aaa;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .asset-item:hover .asset-name {
    color: #fff;
  }
  
  .asset-item:hover .asset-preview {
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5))
            drop-shadow(0 0 4px rgba(74, 144, 226, 0.4));
  }
  
  /* Mobile optimization */
  @media (max-width: 600px) {
    .palette-dropdown {
      top: calc(50px + env(safe-area-inset-top));
      right: calc(5px + env(safe-area-inset-right));
      width: clamp(200px, 90vw, 280px);
      max-height: min(calc(100vh - 120px), 400px);
    }
    
    .palette-header {
      padding: 8px 10px;
    }
    
    .palette-title {
      font-size: 8px;
    }
    
    .palette-hint {
      font-size: 6px;
    }
    
    .palette-grid {
      gap: 6px;
      padding: 8px;
    }
    
    .asset-item {
      padding: 8px;
      min-height: 80px;
      gap: 6px;
      border-width: 2px;
      box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
    }
    
    .asset-preview {
      width: 40px;
      height: 40px;
    }
    
    .asset-name {
      font-size: 7px;
      letter-spacing: 0;
    }
  }
</style>
