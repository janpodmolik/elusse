<script lang="ts">
  import PixelButton from './PixelButton.svelte';
  import { ASSETS } from '../data/assets';
  
  const assets = ASSETS;
  
  let isOpen = $state(false);
  let draggedAsset = $state<string | null>(null);
  
  function togglePalette(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    isOpen = !isOpen;
  }
  
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
  
  function stopMouseDown(event: PointerEvent) {
    // Prevent mousedown from reaching canvas to avoid dragging sprites underneath
    // Drag events (ondragstart, ondrag, ondrop) continue to work normally
    event.stopPropagation();
  }
  
  // Setup drop zone on canvas
  $effect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      
      const assetKey = e.dataTransfer?.getData('assetKey');
      if (!assetKey) return;
      
      // Get canvas-relative coordinates
      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      
      // Dispatch custom event for BuilderScene
      const dropEvent = new CustomEvent('assetDropped', {
        detail: { assetKey, canvasX, canvasY }
      });
      
      window.dispatchEvent(dropEvent);
    };
    
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('drop', handleDrop);
    
    return () => {
      canvas.removeEventListener('dragover', handleDragOver);
      canvas.removeEventListener('drop', handleDrop);
    };
  });
</script>

<div class="palette-container">
  <!-- ASSETS button - always top-right -->
  <PixelButton 
    onclick={togglePalette}
    position="top-right"
    width="150px"
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
      <div class="palette-grid">
        {#each assets as asset}
          <div 
            class="asset-item"
            class:dragging={draggedAsset === asset.key}
            draggable="true"
            ondragstart={(e) => onDragStart(e, asset.key)}
            ondragend={onDragEnd}
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
    top: calc(80px + env(safe-area-inset-top));
    right: calc(10px + env(safe-area-inset-right));
    width: clamp(240px, 30vw, 320px);
    min-height: 200px;
    max-height: min(calc(100vh - 150px), 500px);
    background: rgba(0, 0, 0, 0.95);
    border: 2px solid #00ff00;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    overflow-y: auto;
    overflow-x: hidden;
    image-rendering: pixelated;
    pointer-events: auto; /* Enable pointer events */
    
    /* Pixel art scrollbar */
    scrollbar-width: thin;
    scrollbar-color: #00ff00 rgba(0, 0, 0, 0.5);
  }
  
  /* Webkit scrollbar styling */
  .palette-dropdown::-webkit-scrollbar {
    width: 12px;
  }
  
  .palette-dropdown::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.5);
    border-left: 1px solid #00ff00;
  }
  
  .palette-dropdown::-webkit-scrollbar-thumb {
    background: #00ff00;
    border: 2px solid rgba(0, 0, 0, 0.5);
  }
  
  .palette-dropdown::-webkit-scrollbar-thumb:hover {
    background: #00ff00;
    box-shadow: 0 0 8px rgba(0, 255, 0, 0.6);
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
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(0, 255, 0, 0.3);
    cursor: grab;
    transition: all 0.15s;
    min-height: 100px;
    user-select: none;
  }
  
  .asset-item:active {
    cursor: grabbing;
  }
  
  .asset-item.dragging {
    opacity: 0.5;
  }
  
  .asset-item:hover {
    background: rgba(0, 255, 0, 0.15);
    border-color: #00ff00;
    box-shadow: inset 0 0 12px rgba(0, 255, 0, 0.2);
    transform: scale(1.02);
  }
  
  .asset-preview {
    width: 48px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
  }
  
  .asset-name {
    font-size: 10px;
    color: #00ff00;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: bold;
  }
  
  .asset-item:hover .asset-name {
    color: #ffffff;
    text-shadow: 0 0 8px rgba(0, 255, 0, 0.8);
  }
  
  /* Mobile optimization */
  @media (max-width: 600px) {
    .palette-dropdown {
      top: calc(68px + env(safe-area-inset-top));
      right: calc(5px + env(safe-area-inset-right));
      width: clamp(200px, 90vw, 280px);
      max-height: min(calc(100vh - 120px), 400px);
    }
    
    .palette-grid {
      gap: 6px;
      padding: 8px;
    }
    
    .asset-item {
      padding: 8px;
      min-height: 80px;
      gap: 6px;
    }
    
    .asset-preview {
      width: 40px;
      height: 40px;
    }
    
    .asset-name {
      font-size: 8px;
      letter-spacing: 0.5px;
    }
  }
</style>
