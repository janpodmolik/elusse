<script lang="ts">
  import { isBuilderZoomedOut, builderEditMode, setBuilderEditMode, gridSnappingEnabled, toggleGridSnapping, isAssetPaletteOpen, isFramePaletteOpen, toggleAssetPalette, toggleFramePalette } from '../stores/builderStores';
  import { switchToGame, toggleBuilderZoom } from '../utils/sceneManager';
  import { EventBus, EVENTS } from '../events/EventBus';
  import AssetPalette from './AssetPalette.svelte';
  import FramePalette from './FramePalette.svelte';
  import PixelButton from './PixelButton.svelte';
  import BuilderMinimap from './BuilderMinimap.svelte';
  import LandscapeHint from './LandscapeHint.svelte';
  import DialogZonePanel from './DialogZonePanel.svelte';
  import FramePanel from './FramePanel.svelte';
  import FrameContent from './FrameContent.svelte';
  import TempZoneButton from './TempZoneButton.svelte';
  import DialogModeHint from './DialogModeHint.svelte';
  import ItemControlsOverlay from './ItemControlsOverlay.svelte';
  import FrameControlsOverlay from './FrameControlsOverlay.svelte';
  import { HStack, VStack, FixedPosition } from './layout';

  function handleSave() {
    switchToGame();
  }
  
  function handleZoomToggle() {
    toggleBuilderZoom();
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

<!-- Conditional panels based on mode -->
{#if $builderEditMode === 'items'}
  <AssetPalette />
{:else if $builderEditMode === 'dialogs'}
  <DialogZonePanel />
{:else if $builderEditMode === 'frames'}
  <FramePalette />
{/if}
<!-- FramePanel shows whenever a frame is selected, regardless of mode -->
<FramePanel />
<FrameContent />
<BuilderMinimap />
<LandscapeHint />

<!-- Temporary zone button (shown on click in dialog mode) -->
<TempZoneButton />

<!-- Hint for dialog mode FIT view -->
<DialogModeHint />

<!-- Top-left: Save, Zoom, Snap buttons -->
<FixedPosition position="top-left">
  <div class="left-buttons">
    <PixelButton variant="green" width="100px" onclick={handleSave}>
      SAVE
    </PixelButton>
    
    <PixelButton 
      variant={$isBuilderZoomedOut ? 'orange' : 'blue'}
      width="80px"
      onclick={handleZoomToggle}
      title="Toggle zoom (F)"
    >
      {$isBuilderZoomedOut ? '1:1' : 'FIT'}
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
</FixedPosition>

<style>
  .left-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-width: calc(100vw - 140px);
  }
  
  @media (max-width: 500px) {
    .left-buttons {
      flex-direction: column;
      max-width: none;
    }
  }
</style>


