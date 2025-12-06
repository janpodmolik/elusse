<script lang="ts">
  import { selectedItemId, selectedItem, selectedItemPhysicsEnabled, selectedItemFlipX, selectedItemScreenPosition, builderEditMode, updateItemPhysics, updateItemFlipX, deletePlacedItem, clearSelection, isDraggingInBuilder } from '../../stores/builderStores';
  import { itemSupportsPhysics } from '../../data/items/index';
  import PixelButton from '../shared/PixelButton.svelte';
  
  // Check if selected item supports physics
  let canHavePhysics = $derived($selectedItem ? itemSupportsPhysics($selectedItem.assetKey) : false);
  
  // Calculate final position with edge clamping
  let controlsPosition = $derived.by(() => {
    const pos = $selectedItemScreenPosition;
    if (!pos) return null;
    
    const padding = 10;
    const buttonRowHeight = 40;
    // Estimate controls width based on number of buttons
    // ~85px per button, 3 buttons + gaps + padding = ~290px
    const controlsWidth = canHavePhysics ? 290 : 200;
    
    // Try to position above the item first
    let y = pos.screenY - pos.itemHeight / 2 - 45;
    
    // If buttons would go above screen, position below the item instead
    const minY = padding + buttonRowHeight;
    if (y < minY) {
      y = pos.screenY + pos.itemHeight / 2 + 10;
    }
    
    // Clamp Y to not go below visible area
    const maxY = window.innerHeight - buttonRowHeight - padding;
    if (y > maxY) {
      y = maxY;
    }
    
    // Position X centered on item
    let x = pos.screenX;
    
    // Clamp X to stay within screen (accounting for translateX(-50%))
    const halfWidth = controlsWidth / 2;
    const minX = halfWidth + padding;
    const maxX = window.innerWidth - halfWidth - padding;
    if (x < minX) x = minX;
    if (x > maxX) x = maxX;
    
    return { x, y };
  });
  
  function handleTogglePhysics() {
    if (!$selectedItemId) return;
    updateItemPhysics($selectedItemId, !$selectedItemPhysicsEnabled);
  }
  
  function handleToggleFlipX() {
    if (!$selectedItemId) return;
    updateItemFlipX($selectedItemId, !$selectedItemFlipX);
  }
  
  function handleDelete() {
    if (!$selectedItemId) return;
    deletePlacedItem($selectedItemId);
    clearSelection();
  }
</script>

{#if $builderEditMode !== 'dialogs' && $selectedItemId && controlsPosition}
  <div 
    class="item-controls"
    style="left: {controlsPosition.x}px; top: {controlsPosition.y}px;{$isDraggingInBuilder ? ' pointer-events: none;' : ''}"
  >
    <div class="controls-row">
      <PixelButton
        variant={$selectedItemFlipX ? 'orange' : 'blue'}
        title="Flip item horizontally"
        onclick={handleToggleFlipX}
      >
        Flip
      </PixelButton>
      
      {#if canHavePhysics}
        <PixelButton
          variant={$selectedItemPhysicsEnabled ? 'orange' : 'blue'}
          title="Toggle physics: item will block player movement"
          onclick={handleTogglePhysics}
        >
          {$selectedItemPhysicsEnabled ? 'Ghost' : 'Solid'}
        </PixelButton>
      {/if}
      
      <PixelButton
        variant="red"
        title="Delete selected item"
        onclick={handleDelete}
      >
        DEL
      </PixelButton>
    </div>
  </div>
{/if}

<style>
  .item-controls {
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
