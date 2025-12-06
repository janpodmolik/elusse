<script lang="ts">
  import { selectedNPC, selectedNPCFlipX, selectedNPCScreenPosition, updateNPCFlipX, deletePlacedNPC } from '../../stores/builderStores';
  import { openNPCConfigPanel } from '../../stores/uiStores';
  import { clearSelection, isDraggingInBuilder, builderEditMode } from '../../stores/builderStores';
  import PixelButton from '../shared/PixelButton.svelte';
  
  // Calculate final position with edge clamping
  let controlsPosition = $derived.by(() => {
    const pos = $selectedNPCScreenPosition;
    if (!pos) return null;
    
    const padding = 10;
    const buttonRowHeight = 40;
    // Estimate controls width: ~85px per button, 3 buttons + gaps = ~270px
    const controlsWidth = 270;
    
    // Try to position above the NPC first
    let y = pos.screenY - pos.npcHeight / 2 - 45;
    
    // If buttons would go above screen, position below the NPC instead
    const minY = padding + buttonRowHeight;
    if (y < minY) {
      y = pos.screenY + pos.npcHeight / 2 + 10;
    }
    
    // Clamp Y to not go below visible area
    const maxY = window.innerHeight - buttonRowHeight - padding;
    if (y > maxY) {
      y = maxY;
    }
    
    // Position X centered on NPC
    let x = pos.screenX;
    
    // Clamp X to stay within screen (accounting for translateX(-50%))
    const halfWidth = controlsWidth / 2;
    const minX = halfWidth + padding;
    const maxX = window.innerWidth - halfWidth - padding;
    if (x < minX) x = minX;
    if (x > maxX) x = maxX;
    
    return { x, y };
  });
  
  function handleToggleFlipX() {
    if (!$selectedNPC) return;
    updateNPCFlipX($selectedNPC.id, !$selectedNPCFlipX);
  }
  
  function handleEdit() {
    openNPCConfigPanel();
  }
  
  function handleDelete() {
    if (!$selectedNPC) return;
    deletePlacedNPC($selectedNPC.id);
    clearSelection();
  }
</script>

{#if $builderEditMode !== 'dialogs' && $selectedNPC && controlsPosition}
  <div 
    class="npc-controls"
    style="left: {controlsPosition.x}px; top: {controlsPosition.y}px;{$isDraggingInBuilder ? ' pointer-events: none;' : ''}"
  >
    <div class="controls-row">
      <PixelButton
        variant={$selectedNPCFlipX ? 'orange' : 'blue'}
        title="Flip NPC horizontally"
        onclick={handleToggleFlipX}
      >
        Flip
      </PixelButton>
      
      <PixelButton
        variant="cyan"
        title="Edit NPC dialog"
        onclick={handleEdit}
      >
        EDIT
      </PixelButton>
      
      <PixelButton
        variant="red"
        title="Delete selected NPC"
        onclick={handleDelete}
      >
        DEL
      </PixelButton>
    </div>
  </div>
{/if}

<style>
  .npc-controls {
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
