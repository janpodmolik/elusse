<script lang="ts">
  import { itemDepthLayer, toggleItemDepthLayer, selectedItemId, updateItemDepth, deletePlacedItem, clearSelection, isBuilderZoomedOut, builderEditMode, setBuilderEditMode, selectedItem, selectedItemPhysicsEnabled, updateItemPhysics, gridSnappingEnabled, toggleGridSnapping, isAssetPaletteOpen, isFramePaletteOpen, toggleAssetPalette, toggleFramePalette } from '../stores/builderStores';
  import { switchToGame, toggleBuilderZoom } from '../utils/sceneManager';
  import { getItemDepth } from '../constants/depthLayers';
  import { assetSupportsPhysics } from '../data/assets';
  import { EventBus, EVENTS } from '../events/EventBus';
  import AssetPalette from './AssetPalette.svelte';
  import FramePalette from './FramePalette.svelte';
  import PixelButton from './PixelButton.svelte';
  import BuilderMinimap from './BuilderMinimap.svelte';
  import LandscapeHint from './LandscapeHint.svelte';
  import DialogZonePanel from './DialogZonePanel.svelte';
  import FramePanel from './FramePanel.svelte';
  import FrameContent from './FrameContent.svelte';
  import { HStack, VStack, FixedPosition } from './layout';

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
    const newLayer = $itemDepthLayer === 'behind' ? 'front' : 'behind';
    const newDepth = getItemDepth(newLayer);
    toggleItemDepthLayer();
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
  
  function handleCreateZone() {
    EventBus.emit(EVENTS.DIALOG_ZONE_CREATE);
  }
</script>

<!-- Conditional panels based on mode -->
{#if $builderEditMode === 'items'}
  <AssetPalette />
{:else if $builderEditMode === 'dialogs'}
  <DialogZonePanel />
{:else if $builderEditMode === 'frames'}
  <FramePalette />
  <FramePanel />
{/if}
<FrameContent />
<BuilderMinimap />
<LandscapeHint />

<!-- Top-left: Save, Zoom, Snap buttons -->
<FixedPosition position="top-left">
  <HStack>
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
      variant={$gridSnappingEnabled ? 'orange' : 'blue'}
      width="80px"
      onclick={handleToggleGridSnapping}
      title="Toggle grid snapping"
    >
      {$gridSnappingEnabled ? 'SNAP' : 'FREE'}
    </PixelButton>
  </HStack>
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

<!-- Top-center: Item controls (when item selected) -->
{#if $builderEditMode === 'items' && $selectedItemId}
  <FixedPosition position="top-center">
    <HStack>
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
    </HStack>
  </FixedPosition>
{/if}


