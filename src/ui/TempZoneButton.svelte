<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { EventBus, EVENTS } from '../events/EventBus';
  import { builderEditMode, isDraggingInBuilder, builderCameraInfo } from '../stores/builderStores';
  import PixelButton from './PixelButton.svelte';
  
  /** Position in screen coordinates */
  let position = $state<{ screenX: number; screenY: number; worldX: number } | null>(null);
  
  /** Timer for auto-hide */
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  
  /** Event subscription */
  let subscription: { unsubscribe: () => void } | null = null;
  
  /** Track camera position when button was shown */
  let initialCameraX = $state<number | null>(null);
  
  function handleShow(data: { screenX: number; screenY: number; worldX: number }) {
    // Clear existing timer
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
    
    position = data;
    // Remember camera position when button appeared
    initialCameraX = $builderCameraInfo?.scrollX ?? null;
    
    // Auto-hide after 2 seconds
    hideTimer = setTimeout(() => {
      position = null;
      initialCameraX = null;
    }, 2000);
  }
  
  function handleCreateZone() {
    if (!position) return;
    
    // Emit event to create zone at the stored world position
    EventBus.emit(EVENTS.DIALOG_ZONE_CREATE_AT, { worldX: position.worldX });
    
    // Hide button
    position = null;
    initialCameraX = null;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }
  
  function handleHide() {
    position = null;
    initialCameraX = null;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }
  
  onMount(() => {
    subscription = EventBus.on<{ screenX: number; screenY: number; worldX: number }>(
      EVENTS.TEMP_ZONE_BUTTON_SHOW,
      handleShow
    );
    
    // Also listen for hide event
    const hideSub = EventBus.on(EVENTS.TEMP_ZONE_BUTTON_HIDE, handleHide);
    
    return () => {
      subscription?.unsubscribe();
      hideSub.unsubscribe();
    };
  });
  
  onDestroy(() => {
    if (hideTimer) {
      clearTimeout(hideTimer);
    }
  });
  
  // Hide when mode changes away from dialogs
  $effect(() => {
    if ($builderEditMode !== 'dialogs') {
      position = null;
      initialCameraX = null;
    }
  });
  
  // Hide when camera scrolls (button would look disconnected from click position)
  $effect(() => {
    const cameraX = $builderCameraInfo?.scrollX;
    if (position && initialCameraX !== null && cameraX !== undefined) {
      // If camera moved more than 10px, hide the button
      if (Math.abs(cameraX - initialCameraX) > 10) {
        position = null;
        initialCameraX = null;
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = null;
        }
      }
    }
  });
</script>

{#if position && $builderEditMode === 'dialogs'}
  <div 
    class="temp-zone-button"
    style="left: {position.screenX}px; top: {position.screenY - 50}px;{$isDraggingInBuilder ? ' pointer-events: none;' : ''}"
  >
    <PixelButton 
      variant="cyan"
      width="90px"
      onclick={handleCreateZone}
    >
      + ZONE
    </PixelButton>
  </div>
{/if}

<style>
  .temp-zone-button {
    position: fixed;
    transform: translateX(-50%);
    z-index: 1000;
    pointer-events: auto;
    animation: fadeIn 0.15s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>
