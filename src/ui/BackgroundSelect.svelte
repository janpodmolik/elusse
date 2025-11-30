<script lang="ts">
  import { AVAILABLE_BACKGROUNDS, backgroundManager } from '../data/background';
  import { hasSelectedBackground, currentBackground } from '../stores';
  import { startGameScene } from '../utils/sceneManager';

  const backgrounds = AVAILABLE_BACKGROUNDS;

  /** Get preview image path for a background */
  function getPreviewPath(folder: string): string {
    // Use relative path that works with Vite's base URL configuration
    return `./assets/backgrounds/${folder}/preview.png`;
  }

  function selectBackground(index: number) {
    backgroundManager.setBackgroundByIndex(index);
    currentBackground.set(backgrounds[index].name);
    hasSelectedBackground.set(true);
    startGameScene();
  }
</script>

<div class="background-select-screen">
  <div class="content">
    <h1 class="title">SELECT BACKGROUND</h1>
    
    <div class="backgrounds-grid">
      {#each backgrounds as bg, index}
        <button
          class="background-card"
          onclick={() => selectBackground(index)}
          type="button"
        >
          <div class="preview-container">
            <img 
              src={getPreviewPath(bg.folder)}
              alt={bg.name}
              class="preview-image"
            />
          </div>
          <span class="background-name">{bg.name}</span>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .background-select-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    font-family: 'Press Start 2P', monospace;
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    padding: 20px;
  }

  .title {
    color: #fff;
    font-size: 24px;
    text-shadow: 4px 4px 0 rgba(0, 0, 0, 0.5);
    margin: 0;
    text-align: center;
  }

  .backgrounds-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 30px;
    justify-content: center;
    max-width: 900px;
  }

  .background-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.4);
    border: 4px solid #4a90e2;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.1s;
  }

  .background-card:hover {
    transform: scale(1.02);
    border-color: #6bb3ff;
  }

  .background-card:active {
    transform: scale(0.98);
  }

  .preview-container {
    width: 280px;
    height: 180px;
    overflow: hidden;
    border: 2px solid #333;
    background: #000;
  }

  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    image-rendering: pixelated;
  }

  .background-name {
    color: #fff;
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    text-transform: uppercase;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
  }

  /* Mobile optimization */
  @media (max-width: 700px) {
    .title {
      font-size: 16px;
    }

    .backgrounds-grid {
      gap: 20px;
    }

    .background-card {
      padding: 12px;
    }

    .preview-container {
      width: 200px;
      height: 130px;
    }

    .background-name {
      font-size: 10px;
    }
  }

  @media (max-width: 480px) {
    .title {
      font-size: 14px;
    }

    .preview-container {
      width: 160px;
      height: 100px;
    }

    .background-name {
      font-size: 8px;
    }
  }
</style>
