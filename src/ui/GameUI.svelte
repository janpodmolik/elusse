<script lang="ts">
  import { 
    currentLanguage, 
    currentSkin, 
    currentBackground, 
    isLoading, 
    showControlsDialog, 
    isTouchDevice,
    hasPlayerMoved,
    backgroundChangeCounter
  } from '../stores';
  import { isBuilderMode } from '../stores/builderStores';
  import { localization } from '../data/localization';
  import { catSkinManager } from '../data/catSkin';
  import { backgroundManager } from '../data/background';
  import BuilderUI from './BuilderUI.svelte';
  import PixelButton from './PixelButton.svelte';
  import { switchToBuilder, getCurrentMapConfig } from '../utils/sceneManager';

  let dialogElement: HTMLDialogElement;

  // Reactive statement to handle dialog visibility
  $: if (dialogElement) {
    if ($showControlsDialog) {
      dialogElement.showModal();
    } else {
      dialogElement.close();
    }
  }

  // Check if player has moved and close dialog
  $: if ($hasPlayerMoved && dialogElement?.open) {
    showControlsDialog.set(false);
  }

  function handleLanguageToggle() {
    const newLang = localization.toggleLanguage();
    currentLanguage.set(newLang);
  }

  function handleSkinToggle() {
    const newSkin = catSkinManager.toggleSkin();
    currentSkin.set(newSkin);
  }

  function handleBackgroundToggle() {
    backgroundManager.toggleBackground();
    currentBackground.set(backgroundManager.getCurrentConfig().name);
    // Trigger background reload in GameScene by incrementing counter
    backgroundChangeCounter.update(n => n + 1);
  }

  // Listen to document pointerdown for dialog closing
  function handlePointerDown(e: PointerEvent) {
    if (!dialogElement?.open) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('.pixel-button')) {
      return;
    }
    
    showControlsDialog.set(false);
  }

  function handleBuilderToggle() {
    const currentMapConfig = getCurrentMapConfig();
    
    if (!currentMapConfig) {
      console.error('Cannot enter builder mode: map config not found');
      return;
    }

    switchToBuilder(currentMapConfig);
  }

</script>

<svelte:document on:pointerdown={handlePointerDown} />

<div class="game-ui-wrapper">
  <!-- Builder Mode UI -->
  {#if $isBuilderMode}
    <BuilderUI />
  {/if}

  <!-- Builder Mode Toggle Button (only in play mode) -->
  {#if !$isBuilderMode}
    <PixelButton 
      position="top-left"
      variant="green"
      width="120px"
      onclick={handleBuilderToggle}
      title="Toggle Builder Mode"
    >
      BUILD
    </PixelButton>
  {/if}

  <!-- Language & Skin & Background Buttons (only in play mode) -->
  {#if !$isBuilderMode}
    <PixelButton 
      position="top-right"
      variant="default"
      width="100px"
      onclick={handleLanguageToggle}
      title="Toggle Language (L)"
    >
      {$currentLanguage.toUpperCase()}
    </PixelButton>

    <PixelButton 
      position="stack-2"
      variant="default"
      width="100px"
      onclick={handleSkinToggle}
      title="Toggle Skin (C)"
    >
      {$currentSkin.toUpperCase()}
    </PixelButton>

    <PixelButton 
      position="stack-3"
      variant="default"
      width="120px"
      onclick={handleBackgroundToggle}
      title="Toggle Background (B)"
    >
      {$currentBackground}
    </PixelButton>
  {/if}

  <!-- Controls Dialog -->
  <dialog 
    bind:this={dialogElement}
    class="pixel-dialog"
  >
    <h1>CONTROLS</h1>
    <div class="controls-content">
      {#if $isTouchDevice}
        <!-- Touch controls -->
        <div class="touch-controls">
          <p class="touch-text">Tap and hold<br>where you want<br>to move</p>
        </div>
      {:else}
        <!-- Desktop controls -->
        <div class="desktop-controls">
          <div class="key-row">
            <div class="pixel-key">A</div>
            <div class="pixel-key">W</div>
            <div class="pixel-key">D</div>
          </div>
          <p class="or-text">or</p>
          <div class="key-row">
            <div class="pixel-key">←</div>
            <div class="pixel-key">↑</div>
            <div class="pixel-key">→</div>
          </div>
        </div>
      {/if}
    </div>
  </dialog>

  <!-- Loading Overlay -->
  {#if $isLoading}
    <div class="loader-overlay">
      <div class="pixel-loader"></div>
    </div>
  {/if}
</div>

<style>
  .game-ui-wrapper {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none; /* Allow clicks through to canvas */
    z-index: 1000;
    font-family: 'Press Start 2P', cursive;
  }

  /* Re-enable pointer events on interactive elements */
  .game-ui-wrapper :global(button),
  .game-ui-wrapper :global(dialog) {
    pointer-events: auto;
  }

  /* All other styles are inherited from styles.css */
</style>
