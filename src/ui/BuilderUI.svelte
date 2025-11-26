<script lang="ts">
  import { itemDepthLayer, toggleItemDepthLayer, selectedItemId, updateItemDepth, deletePlacedItem, clearSelection, isBuilderZoomedOut } from '../stores/builderStores';
  import { switchToGame, toggleBuilderZoom } from '../utils/sceneManager';
  import { getItemDepth } from '../constants/depthLayers';
  import AssetPalette from './AssetPalette.svelte';
  import PixelButton from './PixelButton.svelte';
  import BuilderMinimap from './BuilderMinimap.svelte';
  import LandscapeHint from './LandscapeHint.svelte';

  function handleSave() {
    switchToGame();
  }
  
  function handleZoomToggle() {
    toggleBuilderZoom();
  }
  
  function handleToggleDepth() {
    if (!$selectedItemId) return;
    
    // Calculate new depth based on CURRENT state (before toggle)
    // Current is 'behind', so new will be 'front' after toggle
    const newLayer = $itemDepthLayer === 'behind' ? 'front' : 'behind';
    const newDepth = getItemDepth(newLayer);
    
    // Toggle the state
    toggleItemDepthLayer();
    
    // Update selected item with new depth
    updateItemDepth($selectedItemId, newDepth);
  }
  
  function handleDelete() {
    if (!$selectedItemId) return;
    deletePlacedItem($selectedItemId);
    clearSelection();
  }
</script>

<AssetPalette />
<BuilderMinimap />
<LandscapeHint />

<!-- Top-left buttons -->
<div class="top-left-buttons">
  <!-- Save button -->
  <PixelButton 
    variant="green" 
    width="100px"
    onclick={handleSave}
  >
    SAVE
  </PixelButton>
  
  <!-- Zoom toggle button -->
  <PixelButton 
    variant={$isBuilderZoomedOut ? 'orange' : 'blue'}
    width="80px"
    onclick={handleZoomToggle}
    title="Toggle zoom (F)"
  >
    {$isBuilderZoomedOut ? '1:1' : 'FIT'}
  </PixelButton>
</div>

<!-- Item controls - top center (when item selected) -->
{#if $selectedItemId}
  <div class="item-controls">
    <PixelButton
      variant={$itemDepthLayer === 'behind' ? 'blue' : 'orange'}
      title="Toggle item depth: behind or in front of player"
      onclick={handleToggleDepth}
    >
      {$itemDepthLayer === 'behind' ? 'Behind' : 'Front'}
    </PixelButton>
    
    <PixelButton
      variant="red"
      title="Delete selected item"
      onclick={handleDelete}
    >
      DELETE
    </PixelButton>
  </div>
{/if}

<style>
  .top-left-buttons {
    position: fixed;
    top: calc(10px + env(safe-area-inset-top));
    left: calc(10px + env(safe-area-inset-left));
    display: flex;
    gap: 10px;
    z-index: 1000;
    pointer-events: auto;
  }
  
  .top-left-buttons :global(.pixel-btn) {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
  }
  
  .item-controls {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    z-index: 1000;
    pointer-events: auto;
  }
  
  .item-controls :global(.pixel-btn) {
    position: relative;
    top: auto;
    left: auto;
    right: auto;
  }

  @media (max-width: 600px) {
    .top-left-buttons {
      top: calc(5px + env(safe-area-inset-top));
      left: calc(5px + env(safe-area-inset-left));
      gap: 6px;
    }
    
    .top-left-buttons :global(.pixel-btn) {
      font-size: 10px;
      padding: 10px 12px;
      border-width: 2px;
    }
    
    .item-controls {
      top: 10px;
      gap: 8px;
    }
    
    .item-controls :global(.pixel-btn) {
      font-size: 10px;
      padding: 10px 16px;
      border-width: 2px;
    }
  }
</style>


