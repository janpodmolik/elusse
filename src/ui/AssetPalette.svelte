<script lang="ts">
  interface AssetInfo {
    key: string;
    name: string;
  }
  
  const assets: AssetInfo[] = [
    { key: 'tent', name: 'Tent' },
    { key: 'lamp', name: 'Lamp' },
    { key: 'sign_left', name: 'Sign ←' },
    { key: 'sign_right', name: 'Sign →' },
    { key: 'stone_0', name: 'Stone 0' },
    { key: 'stone_1', name: 'Stone 1' },
    { key: 'stone_2', name: 'Stone 2' },
  ];
  
  let isOpen = $state(false);
  let draggedAsset = $state<string | null>(null);
  
  function togglePalette(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    isOpen = !isOpen;
    
    // Notify BuilderScene about palette state
    window.dispatchEvent(new CustomEvent('paletteStateChanged', {
      detail: { isOpen }
    }));
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

<div class="asset-palette">
  <button class="palette-toggle pixel-button" onclick={togglePalette}>
    {isOpen ? '▼' : '◀'} ASSETS
  </button>
  
  {#if isOpen}
    <div class="palette-warning">
      ⚠️ Close palette to drag player sprite
    </div>
    
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
              src={`assets/ui/${asset.key}.png`} 
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
  .asset-palette {
    position: fixed;
    right: 20px;
    top: 70px;
    z-index: 998;
    font-family: 'Courier New', monospace;
    pointer-events: auto; /* Enable pointer events */
  }
  
  .palette-toggle {
    position: static !important;
    width: 140px;
    height: 36px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #00ff00;
    color: #00ff00;
    font-size: 11px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    cursor: pointer;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    image-rendering: pixelated;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .palette-toggle:hover {
    background: rgba(0, 255, 0, 0.15);
    box-shadow: 0 0 12px rgba(0, 255, 0, 0.4);
  }
  
  .palette-warning {
    position: absolute;
    top: 40px;
    right: 0;
    width: clamp(240px, 30vw, 320px);
    padding: 8px 12px;
    background: rgba(255, 165, 0, 0.95);
    border: 2px solid #ff8800;
    border-bottom: none;
    color: #000;
    font-size: 10px;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 2px 8px rgba(255, 136, 0, 0.3);
  }
  
  .palette-dropdown {
    position: absolute;
    top: 72px;
    right: 0;
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
</style>
