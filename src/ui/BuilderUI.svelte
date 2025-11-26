<script lang="ts">
  import { itemDepthLayer, toggleItemDepthLayer, selectedItemId, updateItemDepth, deletePlacedItem, clearSelection } from '../stores/builderStores';
  import { switchToGame } from '../utils/sceneManager';
  import AssetPalette from './AssetPalette.svelte';
  import PlayerWarning from './PlayerWarning.svelte';
  import PixelButton from './PixelButton.svelte';

  function handleSave() {
    switchToGame();
  }
  
  function handleToggleDepth() {
    if (!$selectedItemId) return;
    
    // Calculate new depth based on CURRENT state (before toggle)
    const newDepth = $itemDepthLayer === 'behind' ? 15 : 5;
    
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
<PlayerWarning />

<!-- Save button - top left -->
<PixelButton 
  position="top-left" 
  variant="green" 
  width="120px"
  onclick={handleSave}
>
  SAVE
</PixelButton>

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


