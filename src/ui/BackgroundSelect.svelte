<script lang="ts">
  import { AVAILABLE_BACKGROUNDS, backgroundManager } from '../data/background';
  import { AVAILABLE_SKINS, skinManager, type SkinConfig, getSkinAssetPath } from '../data/skinConfig';
  import { hasSelectedBackground, currentBackground, currentSkin } from '../stores';
  import { startGameScene } from '../utils/sceneManager';
  import PixelButton from './PixelButton.svelte';

  function goToBuilder() {
    window.location.href = './builder.html';
  }

  const backgrounds = AVAILABLE_BACKGROUNDS;
  const skins = AVAILABLE_SKINS;
  
  // Track selected skin (preselect cat_orange)
  let selectedSkinId = $state(skinManager.getSkinId());
  
  // Canvas refs for skin thumbnails (for skins without preview.png)
  let canvasRefs: Record<string, HTMLCanvasElement | null> = $state({});
  // Track which skins have preview images
  let hasPreview: Record<string, boolean> = $state({});
  
  // Check for preview images on mount
  $effect(() => {
    skins.forEach(skin => {
      const basePath = getSkinAssetPath(skin);
      const img = new Image();
      img.onload = () => { hasPreview[skin.id] = true; };
      img.onerror = () => { 
        hasPreview[skin.id] = false;
        // Load canvas fallback
        loadSkinThumbnail(skin);
      };
      img.src = `./${basePath}/preview.png`;
    });
  });
  
  /** Get preview image path for a skin */
  function getSkinPreviewPath(skin: SkinConfig): string {
    const basePath = getSkinAssetPath(skin);
    return `./${basePath}/preview.png`;
  }
  
  /** Load first frame from PNG spritesheet and render to canvas (fallback) */
  function loadSkinThumbnail(skin: SkinConfig): void {
    const canvas = canvasRefs[skin.id];
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const frameWidth = skin.frameWidth ?? 48;
    const frameHeight = skin.frameHeight ?? 48;
    const basePath = getSkinAssetPath(skin);
    
    const img = new Image();
    img.src = `./${basePath}/idle.png`;
    
    img.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      
      // Calculate scale to fit canvas while maintaining aspect ratio
      const scaleX = canvas.width / frameWidth;
      const scaleY = canvas.height / frameHeight;
      const scale = Math.min(scaleX, scaleY);
      
      const destWidth = frameWidth * scale;
      const destHeight = frameHeight * scale;
      const offsetX = (canvas.width - destWidth) / 2;
      const offsetY = (canvas.height - destHeight) / 2;
      
      // Draw first frame, scaled to fit canvas
      ctx.drawImage(
        img,
        0, 0, frameWidth, frameHeight,  // Source: first frame
        offsetX, offsetY, destWidth, destHeight  // Dest: centered in canvas
      );
    };
  }

  /** Get preview image path for a background */
  function getPreviewPath(folder: string): string {
    // Use relative path that works with Vite's base URL configuration
    return `./assets/backgrounds/${folder}/preview.png`;
  }
  
  function selectSkin(skinId: string) {
    selectedSkinId = skinId;
    skinManager.setSkin(skinId);
    currentSkin.set(skinId);
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
    <h1 class="title">SELECT CHARACTER</h1>
    
    <div class="skins-grid">
      {#each skins as skin}
        <button
          class="skin-card"
          class:selected={selectedSkinId === skin.id}
          onclick={() => selectSkin(skin.id)}
          type="button"
        >
          <div class="skin-preview-container">
            {#if hasPreview[skin.id]}
              <img 
                src={getSkinPreviewPath(skin)}
                alt={skin.name}
                class="skin-preview-img"
              />
            {:else}
              <canvas 
                bind:this={canvasRefs[skin.id]}
                width="96"
                height="96"
                class="skin-preview"
              ></canvas>
            {/if}
          </div>
          <span class="skin-name">{skin.name}</span>
        </button>
      {/each}
    </div>
    
    <div class="builder-link">
      <PixelButton variant="purple" onclick={goToBuilder}>
        ✨ CHARACTER BUILDER
      </PixelButton>
    </div>
    
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
    align-items: flex-start;
    justify-content: center;
    z-index: 2000;
    font-family: 'Press Start 2P', monospace;
    overflow-y: auto;
    overflow-x: hidden;
    /* Enable touch scrolling */
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
    pointer-events: auto;
  }

  .content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 40px;
    padding: 40px 20px;
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

  .skins-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
    max-width: 700px;
  }

  .builder-link {
    margin: -20px 0;
  }

  .skin-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.4);
    border: 4px solid #666;
    cursor: pointer;
    transition: transform 0.1s, border-color 0.1s;
  }

  .skin-card:hover {
    transform: scale(1.05);
    border-color: #888;
  }

  .skin-card.selected {
    border-color: #4ae24a;
    box-shadow: 0 0 20px rgba(74, 226, 74, 0.4);
  }

  .skin-card:active {
    transform: scale(0.95);
  }

  .skin-preview-container {
    width: 96px;
    height: 96px;
    overflow: hidden;
    border: 2px solid #333;
    background: #1a1a2e;
  }

  .skin-preview {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }

  .skin-preview-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    image-rendering: pixelated;
  }

  .skin-name {
    color: #fff;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    text-transform: uppercase;
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.5);
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

    .skins-grid {
      gap: 15px;
    }

    .skin-card {
      padding: 10px;
    }

    .skin-preview-container {
      width: 72px;
      height: 72px;
    }

    .skin-name {
      font-size: 6px;
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

    .skin-preview-container {
      width: 56px;
      height: 56px;
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
