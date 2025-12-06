<script lang="ts">
  import { activeDialogText, playerScreenPosition } from '../../stores';
  import { 
    NARROW_SCREEN_BREAKPOINT, 
    DIALOG_BUBBLE_VERTICAL_OFFSET
  } from '../../constants/uiConstants';
  
  // Calculate bubble bottom position (bubble sits above player)
  // Using bottom anchor so bubble grows upward
  let bubbleBottom = $derived(Math.max(10, window.innerHeight - $playerScreenPosition.y + DIALOG_BUBBLE_VERTICAL_OFFSET));
  
  // Check if we're on a narrow screen
  let isNarrowScreen = $derived(window.innerWidth <= NARROW_SCREEN_BREAKPOINT);
  
  // On narrow screens, center the bubble; on wide screens, follow player
  let bubbleLeft = $derived(isNarrowScreen ? 50 : $playerScreenPosition.x);
  let bubbleStyle = $derived(isNarrowScreen ? 'percent' : 'px');
</script>

{#if $activeDialogText}
  <div 
    class="dialog-bubble" 
    class:narrow={isNarrowScreen}
    style="bottom: {bubbleBottom}px; left: {bubbleLeft}{bubbleStyle};"
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
    
    /* Size constraints - match constants in uiConstants.ts */
    max-width: 500px;  /* DIALOG_BUBBLE_MAX_WIDTH */
    max-height: 400px; /* DIALOG_BUBBLE_MAX_HEIGHT */
    
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
    left: 50%;
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
    left: 50%;
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
    white-space: pre-wrap;
    word-wrap: break-word;
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
    transform: translateX(-50%);
    max-width: calc(100% - 20px);
    left: 50% !important;
  }
  
  .dialog-bubble.narrow::after,
  .dialog-bubble.narrow::before {
    left: 50%;
  }
</style>
