<script lang="ts">
  import { activeDialogText, playerScreenPosition } from '../../stores';
  import { 
    NARROW_SCREEN_BREAKPOINT, 
    DIALOG_BUBBLE_VERTICAL_OFFSET
  } from '../../constants/uiConstants';
  
  const MAX_BUBBLE_WIDTH = 320;
  const BUBBLE_MARGIN = 20;
  
  // Calculate bubble bottom position (bubble sits above player)
  // Using bottom anchor so bubble grows upward
  let bubbleBottom = $derived(Math.max(10, window.innerHeight - $playerScreenPosition.y + DIALOG_BUBBLE_VERTICAL_OFFSET));
  
  // Check if we're on a narrow screen
  let isNarrowScreen = $derived(window.innerWidth <= NARROW_SCREEN_BREAKPOINT);
  
  // Clamp bubble position to stay on screen (use max width for safe margin)
  let clampedLeft = $derived.by(() => {
    if (isNarrowScreen) return window.innerWidth / 2;
    const halfWidth = MAX_BUBBLE_WIDTH / 2;
    const minX = halfWidth + BUBBLE_MARGIN;
    const maxX = window.innerWidth - halfWidth - BUBBLE_MARGIN;
    return Math.max(minX, Math.min(maxX, $playerScreenPosition.x));
  });
  
  // Calculate arrow offset (how much the arrow should shift from center)
  let arrowOffset = $derived.by(() => {
    if (isNarrowScreen) return 0;
    return $playerScreenPosition.x - clampedLeft;
  });
</script>

{#if $activeDialogText}
  <div 
    class="dialog-bubble" 
    class:narrow={isNarrowScreen}
    style="bottom: {bubbleBottom}px; left: {clampedLeft}px; --arrow-offset: {arrowOffset}px;"
  >
    {#if $activeDialogText.content}
      <div class="dialog-content">{$activeDialogText.content}</div>
    {/if}
  </div>
{/if}

<style>
  .dialog-bubble {
    position: fixed;
    transform: translateX(-50%);
    
    /* Shrink to content */
    display: flex;
    flex-direction: column;
    width: max-content;
    min-width: 60px;
    max-width: 320px;
    max-height: 400px;
    
    background: #f8f8f8;
    border: 4px solid #333;
    padding: 12px 16px;
    
    font-family: 'Press Start 2P', monospace;
    color: #333;
    
    z-index: 900;
    pointer-events: none;
    
    /* Pixel art style - no rounded corners */
    border-radius: 0;
    
    /* Pixel art shadow */
    box-shadow:
      4px 4px 0 0 rgba(0, 0, 0, 0.3),
      inset 2px 2px 0 0 rgba(255, 255, 255, 0.5);
    
    /* Entrance animation */
    animation: bubbleIn 0.15s ease-out;
  }
  
  /* Outer triangle (border) */
  .dialog-bubble::after {
    content: '';
    position: absolute;
    bottom: -16px;
    left: calc(50% + var(--arrow-offset, 0px));
    transform: translateX(-50%);
    
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 16px solid #333;
  }
  
  /* Inner triangle (fill) */
  .dialog-bubble::before {
    content: '';
    position: absolute;
    bottom: -9px;
    left: calc(50% + var(--arrow-offset, 0px));
    transform: translateX(-50%);
    
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 12px solid #f8f8f8;
    z-index: 1;
  }
  
  .dialog-content {
    font-size: 10px;
    line-height: 1.8;
    color: #444;
    overflow-y: auto;
    max-height: 320px;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  
  @keyframes bubbleIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  /* Narrow screen adjustments */
  .dialog-bubble.narrow {
    max-width: calc(100vw - 40px);
  }
  
  .dialog-bubble.narrow::after,
  .dialog-bubble.narrow::before {
    left: 50%;
  }
</style>
