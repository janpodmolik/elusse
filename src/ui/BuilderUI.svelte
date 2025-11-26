<script lang="ts">
  import { builderConfig, itemDepthLayer, toggleItemDepthLayer, selectedItemId, updateItemDepth, deletePlacedItem, clearSelection } from '../stores/builderStores';
  import { switchToGame } from '../utils/sceneManager';
  import AssetPalette from './AssetPalette.svelte';

  // Display current player position
  let playerX = $state($builderConfig?.playerStartX || 0);
  let playerY = $state($builderConfig?.playerStartY || 0);

  $effect(() => {
    if ($builderConfig) {
      playerX = $builderConfig.playerStartX;
      playerY = $builderConfig.playerStartY;
    }
  });

  function handleSave() {
    if (!$builderConfig) {
      console.error('Cannot save: builder config not found');
      return;
    }

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

<div class="builder-bar">
  <button class="pixel-button pixel-button--save" onclick={handleSave}>
    SAVE
  </button>
  
  <div class="builder-info">
    <div class="builder-position">
      <span class="info-label">Player:</span>
      <span class="info-value">X: {Math.round(playerX)}, Y: {Math.round(playerY)}</span>
    </div>
    
    {#if $selectedItemId}
      <div class="builder-controls">
        <button 
          class="pixel-button pixel-button--depth" 
          class:behind={$itemDepthLayer === 'behind'}
          class:front={$itemDepthLayer === 'front'}
          onclick={handleToggleDepth}
          title="Toggle item depth: behind or in front of player"
        >
          {$itemDepthLayer === 'behind' ? '⬇ Behind' : '⬆ Front'}
        </button>
        
        <button 
          class="pixel-button pixel-button--delete" 
          onclick={handleDelete}
          title="Delete selected item"
        >
          🗑 DELETE
        </button>
      </div>
    {/if}
  </div>
  
  <div class="builder-help">
    <span class="help-text">Drag items to move</span>
    <span class="help-text">Click to select</span>
  </div>
</div>

<style>
  .builder-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 50px;
    background: rgba(0, 0, 0, 0.9);
    border-bottom: 2px solid #00ff00;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 999;
    font-family: 'Courier New', monospace;
    color: white;
    font-size: 13px;
  }

  .pixel-button--save {
    position: static !important;
    width: 120px;
    background: rgba(0, 255, 0, 0.2);
    border-color: #00ff00;
    color: #00ff00;
    font-size: 11px;
  }

  .pixel-button--save:hover {
    background: rgba(0, 255, 0, 0.3);
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
  }
  
  .builder-info {
    display: flex;
    gap: 24px;
    align-items: center;
  }

  .builder-position {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  .builder-controls {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .info-label {
    color: rgba(255, 255, 255, 0.6);
  }

  .info-value {
    color: #00ff00;
    font-weight: bold;
    font-family: monospace;
  }
  
  .pixel-button--depth {
    position: static !important;
    width: 100px;
    height: 28px;
    font-size: 10px;
    transition: all 0.2s;
  }
  
  .pixel-button--depth.behind {
    background: rgba(100, 100, 255, 0.2);
    border-color: #6666ff;
    color: #6666ff;
  }
  
  .pixel-button--depth.behind:hover {
    background: rgba(100, 100, 255, 0.3);
    box-shadow: 0 0 10px rgba(100, 100, 255, 0.5);
  }
  
  .pixel-button--depth.front {
    background: rgba(255, 165, 0, 0.2);
    border-color: #ffa500;
    color: #ffa500;
  }
  
  .pixel-button--depth.front:hover {
    background: rgba(255, 165, 0, 0.3);
    box-shadow: 0 0 10px rgba(255, 165, 0, 0.5);
  }
  
  .pixel-button--delete {
    position: static !important;
    width: 100px;
    height: 28px;
    font-size: 10px;
    background: rgba(255, 0, 0, 0.2);
    border-color: #ff0000;
    color: #ff0000;
  }
  
  .pixel-button--delete:hover {
    background: rgba(255, 0, 0, 0.3);
    box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
  }
  
  .builder-help {
    display: flex;
    gap: 16px;
  }
  
  .help-text {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.4);
  }
</style>
