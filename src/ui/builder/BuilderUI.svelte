<script lang="ts">
  import { builderEditMode, setBuilderEditMode, gridSnappingEnabled, toggleGridSnapping, selectedItemId, selectedDialogZoneId, selectedSocialId } from '../../stores/builderStores';
  import { 
    isItemPaletteOpen, 
    isSocialPaletteOpen, 
    isNPCPaletteOpen, 
    isSocialPanelOpen,
    isDialogZonePanelOpen,
    isNPCConfigPanelOpen,
    toggleItemPalette, 
    toggleSocialPalette, 
    toggleNPCPalette 
  } from '../../stores/uiStores';
  import { switchToGame } from '../../utils/sceneManager';
  import { EventBus, EVENTS } from '../../events/EventBus';
import ItemPalette from './ItemPalette.svelte';
import SocialsPalette from './SocialsPalette.svelte';
import NPCPalette from './NPCPalette.svelte';
import PixelButton from '../shared/PixelButton.svelte';
import DialogZonePanel from './DialogZonePanel.svelte';
  import SocialsPanel from './SocialsPanel.svelte';
  import NPCConfigPanel from './NPCConfigPanel.svelte';
  import TempZoneButton from './TempZoneButton.svelte';
  import DialogModeHint from '../overlays/DialogModeHint.svelte';
  import ItemControlsOverlay from '../overlays/ItemControlsOverlay.svelte';
  import NPCControlsOverlay from '../overlays/NPCControlsOverlay.svelte';
  import DialogZoneControlsOverlay from '../overlays/DialogZoneControlsOverlay.svelte';
  import SocialControlsOverlay from '../overlays/SocialControlsOverlay.svelte';
  import { HStack, VStack, FixedPosition } from '../shared/layout';

  const NARROW_SCREEN_THRESHOLD = 600;
  
  // Track if buttons should be hidden (narrow screen + item/frame/zone selected)
  let isNarrowScreen = $state(typeof window !== 'undefined' ? window.innerWidth < NARROW_SCREEN_THRESHOLD : false);
  
  // Reactive: hide buttons when something is selected on narrow screen
  let hideButtons = $derived(isNarrowScreen && ($selectedItemId !== null || $selectedDialogZoneId !== null || $selectedSocialId !== null));
  
  // Listen for window resize
  $effect(() => {
    function handleResize() {
      isNarrowScreen = window.innerWidth < NARROW_SCREEN_THRESHOLD;
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  // Global double-click handler to close panels
  function handleGlobalDoubleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    // If click is inside a draggable panel, ignore
    if (target.closest('.draggable-panel')) {
      return;
    }
    // If click is on canvas (Phaser scene), ignore - let Phaser handle double-clicks
    if (target.tagName === 'CANVAS') {
      return;
    }
    
    // Close all panels
    isItemPaletteOpen.set(false);
    isSocialPaletteOpen.set(false);
    isNPCPaletteOpen.set(false);
    isSocialPanelOpen.set(false);
    isDialogZonePanelOpen.set(false);
    isNPCConfigPanelOpen.set(false);
  }

  $effect(() => {
    window.addEventListener('dblclick', handleGlobalDoubleClick);
    return () => window.removeEventListener('dblclick', handleGlobalDoubleClick);
  });

  function handleSave() {
    console.log('[BuilderUI] handleSave called, switching to game...');
    const result = switchToGame();
    console.log('[BuilderUI] switchToGame result:', result);
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

<!-- NPC controls overlay (positioned above selected NPC) -->
<NPCControlsOverlay />

<!-- Dialog zone controls overlay (positioned above selected zone) -->
<DialogZoneControlsOverlay />

<!-- Social controls overlay (positioned above selected social) -->
<SocialControlsOverlay />

<!-- Conditional panels based on mode -->
{#if $builderEditMode === 'items'}
  <ItemPalette />
{:else if $builderEditMode === 'dialogs'}
  <DialogZonePanel />
{:else if $builderEditMode === 'socials'}
  <SocialsPalette />
{:else if $builderEditMode === 'npcs'}
  <NPCPalette />
{/if}
<SocialsPanel />
<NPCConfigPanel />

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

<!-- Top-right: Mode selection buttons (ITEMS, SOCIALS, NPCS, DIALOGS) -->
<FixedPosition position="top-right">
  <div class="right-buttons" class:hide-right={hideButtons}>
    <VStack align="end">
      <PixelButton 
      variant={$builderEditMode === 'items' && $isItemPaletteOpen ? 'orange' : 'blue'}
      onclick={() => {
        if ($builderEditMode === 'items') {
          toggleItemPalette();
        } else {
          setBuilderEditMode('items');
          isItemPaletteOpen.set(true);
        }
      }}
      title="Edit items"
    >
      ITEMS
    </PixelButton>

    <PixelButton 
      variant={$builderEditMode === 'socials' && $isSocialPaletteOpen ? 'orange' : 'pink'}
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

    <PixelButton 
      variant={$builderEditMode === 'npcs' && $isNPCPaletteOpen ? 'orange' : 'green'}
      onclick={() => {
        if ($builderEditMode === 'npcs') {
          toggleNPCPalette();
        } else {
          setBuilderEditMode('npcs');
          isNPCPaletteOpen.set(true);
        }
      }}
      title="Edit NPCs"
    >
      NPCS
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


