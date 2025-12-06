<script lang="ts">
  import { onMount } from 'svelte';
  import DraggablePanel from '../shared/DraggablePanel.svelte';
  import { NPC_REGISTRY } from '../../data/npcs/npcRegistry';
  import { EventBus, EVENTS } from '../../events/EventBus';
  import { builderEditMode } from '../../stores/builderStores';
  import { isNPCPaletteOpen, toggleNPCPalette } from '../../stores/uiStores';
  import { createPaletteDragHandlers } from '../../utils/paletteDrag';
  
  const ACCENT_COLOR = '#e67e22'; // Orange for NPCs
  const NARROW_SCREEN_THRESHOLD = 600;
  
  function isNarrowScreen(): boolean {
    return window.innerWidth < NARROW_SCREEN_THRESHOLD;
  }
  
  function closeOnNarrowScreen() {
    if (isNarrowScreen()) {
      isNPCPaletteOpen.set(false);
    }
  }
  
  // Drag state
  let draggedItem = $state<string | null>(null);
  let touchDragElement = $state<HTMLElement | null>(null);
  
  const dragHandlers = createPaletteDragHandlers(
    {
      previewSize: 48,
      borderColor: ACCENT_COLOR,
      dataKey: 'assetKey',
      eventName: EVENTS.NPC_DROPPED,
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
    toggleNPCPalette();
  }
  
  function handleDoubleClick(npcId: string) {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const canvasX = rect.width / 2;
    const canvasY = rect.height / 2;
    
    EventBus.emit(EVENTS.NPC_DROPPED, { assetKey: npcId, canvasX, canvasY });
    
    // Close palette after placing
    isNPCPaletteOpen.set(false);
  }
  
  onMount(() => {
    return dragHandlers.setupCanvasListeners();
  });
  
  $effect(() => {
    return dragHandlers.setupTouchListeners();
  });
</script>

{#if $isNPCPaletteOpen && $builderEditMode === 'npcs'}
  <DraggablePanel 
    panelId="npc-palette"
    title="NPCs"
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
        {#each NPC_REGISTRY as npc}
          <div 
            class="palette-item"
            data-ui
            class:dragging={draggedItem === npc.id}
            draggable="true"
            ondragstart={(e) => dragHandlers.onDragStart(e, npc.id)}
            ondragend={dragHandlers.onDragEnd}
            ontouchstart={(e) => dragHandlers.onTouchStart(e, npc.id)}
            ondblclick={() => handleDoubleClick(npc.id)}
            title="{npc.name} (double-click to place)"
            role="button"
            tabindex="0"
            style:--accent-color={ACCENT_COLOR}
          >
            <div 
              class="animated-wrapper" 
              style:width="{npc.frameWidth}px" 
              style:height="{npc.frameHeight}px"
              data-drag-preview
            >
              <img 
                src={npc.path} 
                alt={npc.name}
                class="item-preview animated"
                style:width="{npc.frameWidth}px"
                style:height="{npc.frameHeight}px"
                style:object-fit="none"
                style:object-position="0 0"
              />
            </div>
            <span class="npc-name">{npc.name}</span>
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
  
  .animated-wrapper {
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
  }
  
  .item-preview.animated {
    width: auto;
    height: auto;
    max-width: none;
    max-height: none;
    image-rendering: pixelated;
  }
  
  .npc-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: #ccc;
    text-align: center;
    margin-top: 4px;
    line-height: 1.2;
  }
  
  /* Mobile optimization */
  @media (max-width: 600px) {
    .palette-grid {
      gap: 4px;
      padding: 6px;
      grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
    }
    
    .npc-name {
      font-size: 6px;
    }
  }
</style>
