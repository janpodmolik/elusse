<script lang="ts">
  import { onMount } from 'svelte';
  import DraggablePanel from './DraggablePanel.svelte';
  import { FRAMES } from '../data/frames';
  import { EventBus, EVENTS } from '../events/EventBus';
  import { builderEditMode, isFramePaletteOpen, builderCameraInfo, openFramePanel } from '../stores/builderStores';
  import { createPaletteDragHandlers } from '../utils/paletteDrag';
  import { get } from 'svelte/store';
  
  const ACCENT_COLOR = '#9b59b6'; // Purple for frames
  
  const frames = FRAMES;
  
  // Drag state
  let draggedFrame = $state<string | null>(null);
  let touchDragElement = $state<HTMLElement | null>(null);
  
  // Create drag handlers using shared utility
  const dragHandlers = createPaletteDragHandlers(
    {
      previewSize: 64,
      borderColor: ACCENT_COLOR,
      dataKey: 'frameKey',
      eventName: EVENTS.FRAME_DROPPED,
      onDrop: () => {
        // Always close palette after dropping a frame
        isFramePaletteOpen.set(false);
      },
    },
    () => ({ draggedKey: draggedFrame, touchDragElement }),
    (updates) => {
      if ('draggedKey' in updates) draggedFrame = updates.draggedKey ?? null;
      if ('touchDragElement' in updates) touchDragElement = updates.touchDragElement ?? null;
    }
  );
  
  function stopMouseDown(event: PointerEvent) {
    event.stopPropagation();
  }
  
  function closePalette() {
    isFramePaletteOpen.set(false);
  }
  
  /** Double-click to place frame in center of screen */
  function handleDoubleClick(frameKey: string) {
    const cam = get(builderCameraInfo);
    const centerX = cam.scrollX + cam.viewWidth / 2;
    const centerY = cam.scrollY + cam.viewHeight / 2;
    EventBus.emit(EVENTS.FRAME_DROPPED, { frameKey, canvasX: centerX, canvasY: centerY });
    // Close palette and open frame panel for the newly placed frame
    isFramePaletteOpen.set(false);
    openFramePanel();
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
            class="palette-item"
            class:dragging={draggedFrame === frame.key}
            draggable="true"
            ondragstart={(e) => dragHandlers.onDragStart(e, frame.key)}
            ondragend={dragHandlers.onDragEnd}
            ontouchstart={(e) => dragHandlers.onTouchStart(e, frame.key)}
            ondblclick={() => handleDoubleClick(frame.key)}
            title="{frame.name} (double-click to place)"
            role="button"
            tabindex="0"
            style:--accent-color={ACCENT_COLOR}
          >
            <img 
              src={frame.path} 
              alt={frame.name}
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
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
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
    width: 85%;
    height: 85%;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
    transform: rotate(90deg);
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
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    }
    
    .palette-item {
      padding: 6px;
      border-width: 2px;
      box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
    }
  }
</style>
