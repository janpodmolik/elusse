<script lang="ts">
  import { builderEditMode, isBuilderZoomedOut } from '../stores/builderStores';
  import { toggleBuilderZoom } from '../utils/sceneManager';
  
  /** Whether the hint has been shown this session */
  let hasShownHint = $state(false);
  
  /** Whether hint is currently visible */
  let isVisible = $state(false);
  
  /** Timer for auto-hide */
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  
  // Show hint when entering dialog mode for first time (and not already zoomed out)
  $effect(() => {
    if ($builderEditMode === 'dialogs' && !hasShownHint && !$isBuilderZoomedOut) {
      hasShownHint = true;
      isVisible = true;
      
      // Auto-hide after 5 seconds
      hideTimer = setTimeout(() => {
        isVisible = false;
      }, 5000);
    }
  });
  
  // Hide when zooming out
  $effect(() => {
    if ($isBuilderZoomedOut && isVisible) {
      isVisible = false;
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
    }
  });
  
  function handleDismiss(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    isVisible = false;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }
  
  function handleZoomOut(e: Event) {
    e.stopPropagation(); // Prevent dismissing hint
    e.preventDefault();
    toggleBuilderZoom();
    isVisible = false;
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }
</script>

{#if isVisible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div 
    class="dialog-hint"
    data-ui
    onclick={handleDismiss}
    onpointerdown={(e) => e.stopPropagation()}
    ontouchstart={(e) => e.stopPropagation()}
  >
    <div class="hint-content">
      <span class="hint-icon">💡</span>
      <span class="hint-text">Tip: Use <strong>FIT</strong> view for dialog zones</span>
      <button class="hint-action" onclick={handleZoomOut}>FIT NOW</button>
    </div>
  </div>
{/if}

<style>
  .dialog-hint {
    position: fixed;
    top: 58px;
    left: 95px;
    right: 10px;
    max-width: 380px;
    z-index: 2000;
    animation: slideIn 0.3s ease-out;
    pointer-events: auto; /* Re-enable pointer events since parent wrapper has pointer-events: none */
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .hint-content {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 8px;
    background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
    border: 2px solid #3498db;
    border-radius: 4px;
    padding: 8px 10px;
    font-family: 'Press Start 2P', monospace;
    font-size: 8px;
    color: #ecf0f1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  .hint-icon {
    font-size: 12px;
    flex-shrink: 0;
  }
  
  .hint-text {
    flex: 1 1 auto;
    min-width: 120px;
    line-height: 1.4;
  }
  
  .hint-text strong {
    color: #3498db;
  }
  
  .hint-action {
    background: #3498db;
    border: none;
    border-radius: 3px;
    padding: 10px 16px;
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
    color: white;
    cursor: pointer;
    transition: background 0.2s;
    flex-shrink: 0;
  }
  
  .hint-action:hover {
    background: #2980b9;
  }
</style>
