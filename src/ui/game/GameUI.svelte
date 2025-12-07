<script lang="ts">
  import { 
    currentLanguage, 
    isLoading, 
    showControlsDialog, 
    isTouchDevice,
    hasPlayerMoved,
    hasSelectedBackground
  } from '../../stores';
  import { isBuilderMode } from '../../stores/builderStores';
  import { gameFrameVisible } from '../../stores/gameStores';
  import { localization } from '../../data/localization';
  import BuilderUI from '../builder/BuilderUI.svelte';
  import BackgroundSelect from '../shared/BackgroundSelect.svelte';
  import PixelButton from '../shared/PixelButton.svelte';
  import FixedPosition from '../shared/layout/FixedPosition.svelte';
  import DialogBubble from '../overlays/DialogBubble.svelte';
  import NPCDialogBubble from '../overlays/NPCDialogBubble.svelte';
  import GameFrame from './GameFrame.svelte';
  import { switchToBuilder, getCurrentMapConfig } from '../../utils/sceneManager';

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

<!-- Background Selection Screen (shown before game starts) -->
{#if !$hasSelectedBackground}
  <BackgroundSelect />
{:else}
  <div class="game-ui-wrapper">
    <!-- Game Frame (decorative border) - only in game mode and after loading -->
    {#if $gameFrameVisible && !$isBuilderMode && !$isLoading}
      <GameFrame />
    {/if}

    <!-- Builder Mode UI -->
    {#if $isBuilderMode}
      <BuilderUI />
    {:else}
      <!-- Game Mode: Dialog Bubble and NPC Dialog Bubble -->
      <DialogBubble />
      <NPCDialogBubble />
    {/if}

    <!-- Builder Mode Toggle Button (only in play mode) -->
    {#if !$isBuilderMode}
      <FixedPosition position="top-left">
        <PixelButton 
          variant="green"
          width="120px"
          onclick={handleBuilderToggle}
          title="Toggle Builder Mode"
        >
          BUILD
        </PixelButton>
      </FixedPosition>
    {/if}

    <!-- Language Button (only in play mode) -->
    {#if !$isBuilderMode}
      <FixedPosition position="top-right">
        <PixelButton 
          variant="default"
          width="100px"
          onclick={handleLanguageToggle}
          title="Toggle Language (L)"
        >
          {$currentLanguage.toUpperCase()}
        </PixelButton>
      </FixedPosition>
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
        <div class="loader-text">LOADING</div>
      </div>
    {/if}
  </div>
{/if}

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
