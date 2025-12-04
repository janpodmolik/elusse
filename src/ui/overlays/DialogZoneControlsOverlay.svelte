<script lang="ts">
  import { selectedDialogZoneId, selectedDialogZoneScreenPosition, builderEditMode, deleteDialogZone, selectDialogZone, isDraggingInBuilder } from '../../stores/builderStores';
  import { openDialogZonePanel } from '../../stores/uiStores';
  import PixelButton from '../shared/PixelButton.svelte';
  
  // Calculate final position with edge clamping
  let controlsPosition = $derived.by(() => {
    const pos = $selectedDialogZoneScreenPosition;
    if (!pos) return null;
    
    const padding = 10;
    // 3 buttons stacked vertically (~120px total height)
    const controlsHeight = 120;
    const controlsWidth = 85;
    
    // Position near top of screen (zones are full height)
    let y = pos.screenY;
    
    // Clamp Y to stay within visible area
    const minY = padding + controlsHeight / 2;
    const maxY = window.innerHeight - controlsHeight / 2 - padding;
    if (y < minY) y = minY;
    if (y > maxY) y = maxY;
    
    // Position X centered on zone
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
    openDialogZonePanel();
  }
  
  function handleDelete() {
    if (!$selectedDialogZoneId) return;
    deleteDialogZone($selectedDialogZoneId);
    selectDialogZone(null);
  }
  
  function handleDeselect() {
    selectDialogZone(null);
  }
</script>

{#if $builderEditMode === 'dialogs' && $selectedDialogZoneId && controlsPosition}
  <div 
    class="zone-controls"
    style="left: {controlsPosition.x}px; top: {controlsPosition.y}px;{$isDraggingInBuilder ? ' pointer-events: none;' : ''}"
  >
    <div class="controls-row">
      <PixelButton
        variant="cyan"
        title="Edit zone content (or double-click)"
        onclick={handleEdit}
      >
        EDIT
      </PixelButton>
      
      <PixelButton
        variant="red"
        title="Delete selected zone"
        onclick={handleDelete}
      >
        DEL
      </PixelButton>
      
      <PixelButton
        variant="default"
        title="Deselect zone"
        onclick={handleDeselect}
      >
        DONE
      </PixelButton>
    </div>
  </div>
{/if}

<style>
  .zone-controls {
    position: fixed;
    transform: translate(-50%, -50%);
    z-index: 900;
    pointer-events: auto;
  }
  
  .controls-row {
    display: flex;
    flex-direction: column;
    align-items: center;
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
