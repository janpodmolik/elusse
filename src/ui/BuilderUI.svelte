<script lang="ts">
  import { builderEditMode, setBuilderEditMode, gridSnappingEnabled, toggleGridSnapping, isAssetPaletteOpen, isFramePaletteOpen, isSocialPaletteOpen, toggleAssetPalette, toggleFramePalette, toggleSocialPalette, selectedItemId, selectedFrameId, selectedDialogZoneId, selectedSocialId } from '../stores/builderStores';
  import { switchToGame } from '../utils/sceneManager';
  import { EventBus, EVENTS } from '../events/EventBus';
import AssetPalette from './AssetPalette.svelte';
import FramePalette from './FramePalette.svelte';
import SocialsPalette from './SocialsPalette.svelte';
import PixelButton from './PixelButton.svelte';
import DialogZonePanel from './DialogZonePanel.svelte';
  import FramePanel from './FramePanel.svelte';
  import SocialsPanel from './SocialsPanel.svelte';
  import FrameContent from './FrameContent.svelte';
  import TempZoneButton from './TempZoneButton.svelte';
  import DialogModeHint from './DialogModeHint.svelte';
  import ItemControlsOverlay from './ItemControlsOverlay.svelte';
  import FrameControlsOverlay from './FrameControlsOverlay.svelte';
  import DialogZoneControlsOverlay from './DialogZoneControlsOverlay.svelte';
  import SocialControlsOverlay from './SocialControlsOverlay.svelte';
  import { HStack, VStack, FixedPosition } from './layout';

  const NARROW_SCREEN_THRESHOLD = 600;
  
  // Track if buttons should be hidden (narrow screen + item/frame/zone selected)
  let isNarrowScreen = $state(typeof window !== 'undefined' ? window.innerWidth < NARROW_SCREEN_THRESHOLD : false);
  
  // Reactive: hide buttons when something is selected on narrow screen
  let hideButtons = $derived(isNarrowScreen && ($selectedItemId !== null || $selectedFrameId !== null || $selectedDialogZoneId !== null || $selectedSocialId !== null));
  
  // Listen for window resize
  $effect(() => {
    function handleResize() {
      isNarrowScreen = window.innerWidth < NARROW_SCREEN_THRESHOLD;
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  function handleSave() {
    switchToGame();
  }
  
  function handleToggleGridSnapping() {
    toggleGridSnapping();
  }
  
  function handleCreateZone() {
    EventBus.emit(EVENTS.DIALOG_ZONE_CREATE);
  }
</script>

<!-- Item controls overlay (positioned above selected item) -->
<ItemControlsOverlay />

<!-- Frame controls overlay (positioned above selected frame) -->
<FrameControlsOverlay />

<!-- Dialog zone controls overlay (positioned above selected zone) -->
<DialogZoneControlsOverlay />

<!-- Social controls overlay (positioned above selected social) -->
<SocialControlsOverlay />

<!-- Conditional panels based on mode -->
{#if $builderEditMode === 'items'}
  <AssetPalette />
{:else if $builderEditMode === 'dialogs'}
  <DialogZonePanel />
{:else if $builderEditMode === 'frames'}
  <FramePalette />
{:else if $builderEditMode === 'socials'}
  <SocialsPalette />
{/if}
<!-- FramePanel shows whenever a frame is selected, regardless of mode -->
<FramePanel />
<SocialsPanel />
<FrameContent />

<!-- Temporary zone button (shown on click in dialog mode) -->
<TempZoneButton />

<!-- Hint for dialog mode FIT view -->
<DialogModeHint />

<!-- Top-left: Save, Snap buttons -->
<FixedPosition position="top-left">
  <div class="left-buttons" class:hide-left={hideButtons}>
    <PixelButton variant="green" width="100px" onclick={handleSave}>
      SAVE
    </PixelButton>
    
    <PixelButton 
      variant={$gridSnappingEnabled ? 'blue' : 'orange'}
      width="80px"
      onclick={handleToggleGridSnapping}
      title="Toggle grid snapping"
    >
      {$gridSnappingEnabled ? 'FREE' : 'SNAP'}
    </PixelButton>
  </div>
</FixedPosition>

<!-- Top-right: Mode selection buttons (ASSETS, FRAMES, DIALOGS) -->
<FixedPosition position="top-right">
  <div class="right-buttons" class:hide-right={hideButtons}>
    <VStack align="end">
      <PixelButton 
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

    <PixelButton 
      variant={$builderEditMode === 'socials' && $isSocialPaletteOpen ? 'orange' : 'orange'}
      onclick={() => {
        if ($builderEditMode === 'socials') {
          toggleSocialPalette();
        } else {
          setBuilderEditMode('socials');
          isSocialPaletteOpen.set(true);
        }
      }}
      title="Edit social icons"
    >
      SOCIALS
    </PixelButton>

    <HStack>
      {#if $builderEditMode === 'dialogs'}
        <PixelButton 
          variant="cyan"
          width="100px"
          onclick={handleCreateZone}
          title="Create new dialog zone at center of view"
        >
          + ZONE
        </PixelButton>
      {/if}
      
      <PixelButton 
        variant={$builderEditMode === 'dialogs' ? 'orange' : 'cyan'}
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
    </HStack>
    </VStack>
  </div>
</FixedPosition>

<style>
  .left-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-width: calc(100vw - 140px);
    transition: transform 0.25s ease-out, opacity 0.25s ease-out;
  }
  
  .right-buttons {
    transition: transform 0.25s ease-out, opacity 0.25s ease-out;
  }
  
  /* Slide buttons off screen when item/frame selected on narrow display */
  .left-buttons.hide-left {
    transform: translateX(-120%);
    opacity: 0;
    pointer-events: none;
  }
  
  .right-buttons.hide-right {
    transform: translateX(120%);
    opacity: 0;
    pointer-events: none;
  }
  
  @media (max-width: 500px) {
    .left-buttons {
      flex-direction: column;
      max-width: none;
    }
  }
</style>


