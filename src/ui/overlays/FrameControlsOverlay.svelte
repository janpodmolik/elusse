<script lang="ts">
  import { selectedFrameId, selectedFrameScreenPosition, builderEditMode, deletePlacedFrame, selectFrame, isDraggingInBuilder } from '../../stores/builderStores';
  import { openFramePanel } from '../../stores/uiStores';
  import PixelButton from '../shared/PixelButton.svelte';
  
  // Calculate final position with edge clamping
  let controlsPosition = $derived.by(() => {
    const pos = $selectedFrameScreenPosition;
    if (!pos) return null;
    
    const padding = 10;
    const buttonRowHeight = 40;
    // 2 buttons (~85px each) + gaps + padding = ~190px
    const controlsWidth = 190;
    
    // Try to position above the frame first
    let y = pos.screenY - pos.frameHeight / 2 - 45;
    
    // If buttons would go above screen, position below the frame instead
    const minY = padding + buttonRowHeight;
    if (y < minY) {
      y = pos.screenY + pos.frameHeight / 2 + 10;
    }
    
    // Clamp Y to not go below visible area
    const maxY = window.innerHeight - buttonRowHeight - padding;
    if (y > maxY) {
      y = maxY;
    }
    
    // Position X centered on frame
    let x = pos.screenX;
    
    // Clamp X to stay within screen (accounting for translateX(-50%))
    const halfWidth = controlsWidth / 2;
    const minX = halfWidth + padding;
    const maxX = window.innerWidth - halfWidth - padding;
    if (x < minX) x = minX;
    if (x > maxX) x = maxX;
    
    return { x, y };
  });
  
  function handleEdit() {
    openFramePanel();
  }
  
  function handleDelete() {
    if (!$selectedFrameId) return;
    deletePlacedFrame($selectedFrameId);
    selectFrame(null);
  }
</script>

{#if $builderEditMode !== 'dialogs' && $selectedFrameId && controlsPosition}
  <div 
    class="frame-controls"
    style="left: {controlsPosition.x}px; top: {controlsPosition.y}px;{$isDraggingInBuilder ? ' pointer-events: none;' : ''}"
  >
    <div class="controls-row">
      <PixelButton
        variant="purple"
        title="Edit frame content (or double-click)"
        onclick={handleEdit}
      >
        EDIT
      </PixelButton>
      
      <PixelButton
        variant="red"
        title="Delete selected frame"
        onclick={handleDelete}
      >
        DEL
      </PixelButton>
    </div>
  </div>
{/if}

<style>
  .frame-controls {
    position: fixed;
    transform: translateX(-50%);
    z-index: 900;
    pointer-events: auto;
  }
  
  .controls-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 4px;
    max-width: calc(100vw - 20px);
  }
  
  /* On very narrow screens, make buttons smaller */
  @media (max-width: 400px) {
    .controls-row {
      gap: 2px;
      padding: 2px;
    }
  }
</style>
