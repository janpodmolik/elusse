<script lang="ts">
  import { builderConfig } from '../stores/builderStores';
  import { switchToGame } from '../utils/sceneManager';

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
</script>

<div class="builder-bar">
  <button class="pixel-button pixel-button--save" onclick={handleSave}>
    SAVE
  </button>
  
  <div class="builder-position">
    <span class="position-label">Player:</span>
    <span class="position-value">X: {Math.round(playerX)}, Y: {Math.round(playerY)}</span>
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

  .builder-position {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .position-label {
    color: rgba(255, 255, 255, 0.6);
  }

  .position-value {
    color: #00ff00;
    font-weight: bold;
    font-family: monospace;
  }
</style>
