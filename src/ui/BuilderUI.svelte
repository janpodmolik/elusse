<script lang="ts">
  import { itemDepthLayer, toggleItemDepthLayer, selectedItemId, updateItemDepth, deletePlacedItem, clearSelection, isBuilderZoomedOut, builderEditMode, setBuilderEditMode, selectedItem, selectedItemPhysicsEnabled, updateItemPhysics, gridSnappingEnabled, toggleGridSnapping, isAssetPaletteOpen, isFramePaletteOpen, toggleAssetPalette, toggleFramePalette } from '../stores/builderStores';
  import { switchToGame, toggleBuilderZoom } from '../utils/sceneManager';
  import { getItemDepth } from '../constants/depthLayers';
  import { assetSupportsPhysics } from '../data/assets';
  import AssetPalette from './AssetPalette.svelte';
  import FramePalette from './FramePalette.svelte';
  import PixelButton from './PixelButton.svelte';
  import BuilderMinimap from './BuilderMinimap.svelte';
  import LandscapeHint from './LandscapeHint.svelte';
  import DialogZonePanel from './DialogZonePanel.svelte';
  import FramePanel from './FramePanel.svelte';

  // Check if selected item supports physics
  let canHavePhysics = $derived($selectedItem ? assetSupportsPhysics($selectedItem.assetKey) : false);

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
  
  function handleTogglePhysics() {
    if (!$selectedItemId) return;
    updateItemPhysics($selectedItemId, !$selectedItemPhysicsEnabled);
  }
  
  function handleDelete() {
    if (!$selectedItemId) return;
    deletePlacedItem($selectedItemId);
    clearSelection();
  }
  
  function handleToggleGridSnapping() {
    toggleGridSnapping();
  }
</script>

{#if $builderEditMode === 'items'}
  <AssetPalette />
{:else if $builderEditMode === 'dialogs'}
  <DialogZonePanel />
{:else if $builderEditMode === 'frames'}
  <FramePalette />
  <FramePanel />
{/if}
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
  
  <!-- Grid snap toggle button -->
  <PixelButton 
    variant={$gridSnappingEnabled ? 'orange' : 'blue'}
    width="80px"
    onclick={handleToggleGridSnapping}
    title="Toggle grid snapping"
  >
    {$gridSnappingEnabled ? 'SNAP' : 'FREE'}
  </PixelButton>
</div>

<!-- Mode selection buttons on right side -->
<PixelButton 
  position="top-right"
  variant={$builderEditMode === 'items' && $isAssetPaletteOpen ? 'orange' : 'blue'}
  onclick={() => {
    if ($builderEditMode === 'items') {
      toggleAssetPalette();
    } else {
      setBuilderEditMode('items');
      isAssetPaletteOpen.set(true);
    }
  }}
  title="Edit assets/items"
>
  ASSETS
</PixelButton>

<PixelButton 
  position="stack-2"
  variant={$builderEditMode === 'dialogs' ? 'orange' : 'blue'}
  onclick={() => {
    if ($builderEditMode === 'dialogs') {
      setBuilderEditMode('items');
    } else {
      setBuilderEditMode('dialogs');
    }
  }}
  title="Edit dialog zones"
>
  DIALOGS
</PixelButton>

<PixelButton 
  position="stack-3"
  variant={$builderEditMode === 'frames' && $isFramePaletteOpen ? 'orange' : 'purple'}
  onclick={() => {
    if ($builderEditMode === 'frames') {
      toggleFramePalette();
    } else {
      setBuilderEditMode('frames');
      isFramePaletteOpen.set(true);
    }
  }}
  title="Edit text frames"
>
  FRAMES
</PixelButton>

<!-- Item controls - top center (when item selected in items mode) -->
{#if $builderEditMode === 'items' && $selectedItemId}
  <div class="item-controls">
    <PixelButton
      variant={$itemDepthLayer === 'behind' ? 'blue' : 'orange'}
      title={$selectedItemPhysicsEnabled ? "Solid items must be behind player" : "Toggle item depth: behind or in front of player"}
      onclick={handleToggleDepth}
      disabled={$selectedItemPhysicsEnabled}
    >
      {$itemDepthLayer === 'behind' ? 'Behind' : 'Front'}
    </PixelButton>
    
    {#if canHavePhysics}
      <PixelButton
        variant={$selectedItemPhysicsEnabled ? 'orange' : 'blue'}
        title="Toggle physics: item will block player movement"
        onclick={handleTogglePhysics}
      >
        {$selectedItemPhysicsEnabled ? 'Solid' : 'Ghost'}
      </PixelButton>
    {/if}
    
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
    top: calc(10px + env(safe-area-inset-top));
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
      flex-direction: column;
      gap: 6px;
    }
    
    .top-left-buttons :global(.pixel-btn) {
      font-size: 10px;
      padding: 10px 12px;
      border-width: 2px;
    }
    
    /* On narrow screens, move item controls below top buttons */
    .item-controls {
      top: calc(155px + env(safe-area-inset-top));
      left: calc(5px + env(safe-area-inset-left));
      transform: none;
      gap: 6px;
    }
    
    .item-controls :global(.pixel-btn) {
      font-size: 10px;
      padding: 10px 12px;
      border-width: 2px;
    }
  }
  
  @media (max-width: 400px) {
    /* On very narrow screens, stack vertically if needed */
    .item-controls {
      top: calc(155px + env(safe-area-inset-top));
    }
  }
</style>


