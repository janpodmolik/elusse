<script lang="ts">
  import { onMount } from 'svelte';
  import DraggablePanel from './DraggablePanel.svelte';
  import { ASSETS } from '../data/assets';
  import { EventBus, EVENTS } from '../events/EventBus';
  import { builderEditMode, isAssetPaletteOpen, builderCameraInfo } from '../stores/builderStores';
  import { createPaletteDragHandlers } from '../utils/paletteDrag';
  import { get } from 'svelte/store';
  
  const ACCENT_COLOR = '#4a90e2'; // Blue for assets
  
  const assets = ASSETS;
  
  // Drag state
  let draggedAsset = $state<string | null>(null);
  let touchDragElement = $state<HTMLElement | null>(null);
  
  // Create drag handlers using shared utility
  const dragHandlers = createPaletteDragHandlers(
    {
      previewSize: 48,
      borderColor: ACCENT_COLOR,
      dataKey: 'assetKey',
      eventName: EVENTS.ASSET_DROPPED,
    },
    () => ({ draggedKey: draggedAsset, touchDragElement }),
    (updates) => {
      if ('draggedKey' in updates) draggedAsset = updates.draggedKey ?? null;
      if ('touchDragElement' in updates) touchDragElement = updates.touchDragElement ?? null;
    }
  );
  
  function stopMouseDown(event: PointerEvent) {
    event.stopPropagation();
  }
  
  function closePalette() {
    isAssetPaletteOpen.set(false);
  }
  
  /** Double-click to place asset in center of screen */
  function handleDoubleClick(assetKey: string) {
    const cam = get(builderCameraInfo);
    const centerX = cam.scrollX + cam.viewWidth / 2;
    const centerY = cam.scrollY + cam.viewHeight / 2;
    EventBus.emit(EVENTS.ASSET_DROPPED, { assetKey, canvasX: centerX, canvasY: centerY });
  }
  
  // Setup canvas listeners on mount
  onMount(() => {
    return dragHandlers.setupCanvasListeners();
  });
  
  // Setup touch listeners
  $effect(() => {
    return dragHandlers.setupTouchListeners();
  });
</script>

{#if $isAssetPaletteOpen && $builderEditMode === 'items'}
  <DraggablePanel 
    panelId="asset-palette"
    title="Assets"
    initialRight={10}
    initialTop={60}
    width={280}
    height={400}
    minWidth={200}
    minHeight={160}
    maxWidth={500}
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
        {#each assets as asset}
          <div 
            class="palette-item"
            class:dragging={draggedAsset === asset.key}
            draggable="true"
            ondragstart={(e) => dragHandlers.onDragStart(e, asset.key)}
            ondragend={dragHandlers.onDragEnd}
            ontouchstart={(e) => dragHandlers.onTouchStart(e, asset.key)}
            ondblclick={() => handleDoubleClick(asset.key)}
            title="{asset.name} (double-click to place)"
            role="button"
            tabindex="0"
            style:--accent-color={ACCENT_COLOR}
          >
            <img 
              src={asset.path} 
              alt={asset.name}
              class="item-preview"
            />
            <span class="item-name">{asset.name}</span>
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
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 8px;
    padding: 12px;
  }
  
  .palette-item {
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
  
  .palette-item:active {
    cursor: grabbing;
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
  }
  
  .palette-item.dragging {
    opacity: 0.5;
    border-color: var(--accent-color);
  }
  
  .palette-item:hover {
    background: #2d2d50;
    border-color: var(--accent-color);
    transform: translate(-1px, -1px);
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
  }
  
  .item-preview {
    width: 48px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
  }
  
  .item-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: #aaa;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .palette-item:hover .item-name {
    color: #fff;
  }
  
  .palette-item:hover .item-preview {
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5))
            drop-shadow(0 0 4px color-mix(in srgb, var(--accent-color) 40%, transparent));
  }
  
  /* Mobile optimization */
  @media (max-width: 600px) {
    .palette-hint {
      font-size: 6px;
    }
    
    .palette-grid {
      gap: 6px;
      padding: 8px;
    }
    
    .palette-item {
      padding: 8px;
      min-height: 80px;
      gap: 6px;
      border-width: 2px;
      box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
    }
    
    .item-preview {
      width: 40px;
      height: 40px;
    }
    
    .item-name {
      font-size: 7px;
      letter-spacing: 0;
    }
  }
</style>
