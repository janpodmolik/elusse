<script lang="ts">
  import { onMount } from 'svelte';
  import DraggablePanel from '../shared/DraggablePanel.svelte';
  import { SOCIALS } from '../../data/socials';
  import { EventBus, EVENTS } from '../../events/EventBus';
  import { builderEditMode } from '../../stores/builderStores';
  import { isSocialPaletteOpen } from '../../stores/uiStores';
  import { createPaletteDragHandlers } from '../../utils/paletteDrag';
  import { SELECTION_COLORS } from '../../constants/colors';
  
  const ACCENT_COLOR = SELECTION_COLORS.SOCIAL.css;
  
  const socials = SOCIALS;
  
  // Drag state
  let draggedSocial = $state<string | null>(null);
  let touchDragElement = $state<HTMLElement | null>(null);
  
  // Create drag handlers using shared utility
  const dragHandlers = createPaletteDragHandlers(
    {
      previewSize: 64,
      borderColor: ACCENT_COLOR,
      dataKey: 'socialKey',
      eventName: EVENTS.SOCIAL_DROPPED,
      onDrop: () => {
        // Always close palette after dropping a social
        isSocialPaletteOpen.set(false);
      },
    },
    () => ({ draggedKey: draggedSocial, touchDragElement }),
    (updates) => {
      if ('draggedKey' in updates) draggedSocial = updates.draggedKey ?? null;
      if ('touchDragElement' in updates) touchDragElement = updates.touchDragElement ?? null;
    }
  );
  
  function stopMouseDown(event: PointerEvent) {
    event.stopPropagation();
  }
  
  function closePalette() {
    isSocialPaletteOpen.set(false);
  }
  
  /** Double-click to place social in center of screen */
  function handleDoubleClick(socialKey: string) {
    // Get canvas element to find its center
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    // Send screen coordinates (center of visible canvas)
    // These will be converted to world coordinates by the controller
    const canvasX = rect.width / 2;
    const canvasY = rect.height / 2;
    
    EventBus.emit(EVENTS.SOCIAL_DROPPED, { socialKey, canvasX, canvasY });
    // Close palette after placing social
    isSocialPaletteOpen.set(false);
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

{#if $isSocialPaletteOpen && $builderEditMode === 'socials'}
  <DraggablePanel 
    panelId="social-palette"
    title="Socials"
    initialRight={10}
    initialTop={60}
    width={280}
    height={350}
    minWidth={200}
    minHeight={200}
    maxWidth={500}
    maxHeight={500}
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
        {#each socials as social}
          <div 
            class="palette-item"
            data-ui
            class:dragging={draggedSocial === social.key}
            draggable="true"
            ondragstart={(e) => dragHandlers.onDragStart(e, social.key)}
            ondragend={dragHandlers.onDragEnd}
            ontouchstart={(e) => dragHandlers.onTouchStart(e, social.key)}
            ondblclick={() => handleDoubleClick(social.key)}
            title="{social.name} (double-click to place)"
            role="button"
            tabindex="0"
            style:--accent-color={ACCENT_COLOR}
          >
            <img 
              src={social.path} 
              alt={social.name}
              class="item-preview"
            />
            <span class="item-name">{social.name}</span>
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
    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
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
    width: 48px;
    height: 48px;
    object-fit: contain;
    image-rendering: pixelated;
    filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.5));
  }
  
  .item-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 6px;
    color: #aaa;
    margin-top: 4px;
    text-align: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
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
      grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
    }
    
    .palette-item {
      padding: 4px;
      border-width: 1px;
      box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.3);
    }
    
    .item-preview {
      width: 28px;
      height: 28px;
    }
    
    .item-name {
      font-size: 5px;
      margin-top: 2px;
    }
  }
</style>
