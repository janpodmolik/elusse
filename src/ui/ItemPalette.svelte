<script lang="ts">
  import { onMount } from 'svelte';
  import DraggablePanel from './DraggablePanel.svelte';
  import { ITEMS } from '../data/items';
  import { EventBus, EVENTS } from '../events/EventBus';
  import { builderEditMode, isItemPaletteOpen } from '../stores/builderStores';
  import { createPaletteDragHandlers } from '../utils/paletteDrag';
  
  const ACCENT_COLOR = '#4a90e2'; // Blue for items
  const NARROW_SCREEN_THRESHOLD = 600; // px - close palette after adding item on narrow screens
  
  const items = ITEMS;
  
  /** Check if screen is narrow (portrait mobile) */
  function isNarrowScreen(): boolean {
    return window.innerWidth < NARROW_SCREEN_THRESHOLD;
  }
  
  /** Close palette if on narrow screen */
  function closeOnNarrowScreen() {
    if (isNarrowScreen()) {
      isItemPaletteOpen.set(false);
    }
  }
  
  // Drag state
  let draggedItem = $state<string | null>(null);
  let touchDragElement = $state<HTMLElement | null>(null);
  
  // Create drag handlers using shared utility
  const dragHandlers = createPaletteDragHandlers(
    {
      previewSize: 48,
      borderColor: ACCENT_COLOR,
      dataKey: 'assetKey',
      eventName: EVENTS.ASSET_DROPPED,
      onDrop: closeOnNarrowScreen,
    },
    () => ({ draggedKey: draggedItem, touchDragElement }),
    (updates) => {
      if ('draggedKey' in updates) draggedItem = updates.draggedKey ?? null;
      if ('touchDragElement' in updates) touchDragElement = updates.touchDragElement ?? null;
    }
  );
  
  function stopMouseDown(event: PointerEvent) {
    event.stopPropagation();
  }
  
  function closePalette() {
    isItemPaletteOpen.set(false);
  }
  
  /** Double-click to place item in center of screen */
  function handleDoubleClick(itemKey: string) {
    // Get canvas element to find its center
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Send screen coordinates (center of visible canvas)
    // These will be converted to world coordinates by the controller
    const canvasX = rect.width / 2;
    const canvasY = rect.height / 2;
    
    EventBus.emit(EVENTS.ASSET_DROPPED, { assetKey: itemKey, canvasX, canvasY });
    closeOnNarrowScreen();
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

{#if $isItemPaletteOpen && $builderEditMode === 'items'}
  <DraggablePanel 
    panelId="item-palette"
    title="Items"
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
        {#each items as item}
          <div 
            class="palette-item"
            data-ui
            class:dragging={draggedItem === item.key}
            draggable="true"
            ondragstart={(e) => dragHandlers.onDragStart(e, item.key)}
            ondragend={dragHandlers.onDragEnd}
            ontouchstart={(e) => dragHandlers.onTouchStart(e, item.key)}
            ondblclick={() => handleDoubleClick(item.key)}
            title="{item.name} (double-click to place)"
            role="button"
            tabindex="0"
            style:--accent-color={ACCENT_COLOR}
          >
            <img 
              src={item.path} 
              alt={item.name}
              class="item-preview"
            />
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
    padding: 8px;
    background: #252540;
    border: 2px solid #333;
    cursor: grab;
    transition: all 0.1s ease-out;
    aspect-ratio: 1;
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
    width: 80%;
    height: 80%;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
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
      gap: 4px;
      padding: 6px;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
    }
    
    .palette-item {
      padding: 4px;
      border-width: 1px;
      box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
    }
    
    .item-preview {
      width: 70%;
      height: 70%;
    }
  }
</style>
