<script lang="ts">
  import { activeDialogText, playerScreenPosition } from '../stores';
  
  // Max dimensions for the bubble
  const MAX_WIDTH = 300;
  const MAX_HEIGHT = 200;
  
  // Offset above player sprite (just above the cat's head)
  const VERTICAL_OFFSET = 70;
  
  // Check if we have both title and content (for divider)
  let hasBoth = $derived($activeDialogText?.title && $activeDialogText?.content);
  
  // Calculate bubble bottom position (bubble sits above player)
  // Using bottom anchor so bubble grows upward
  let bubbleBottom = $derived(Math.max(10, window.innerHeight - $playerScreenPosition.y + VERTICAL_OFFSET));
  let bubbleLeft = $derived($playerScreenPosition.x);
</script>

{#if $activeDialogText}
  <div class="dialog-bubble" style="max-width: {MAX_WIDTH}px; max-height: {MAX_HEIGHT}px; bottom: {bubbleBottom}px; left: {bubbleLeft}px;">
    {#if $activeDialogText.title}
      <div class="dialog-title" class:has-divider={hasBoth}>{$activeDialogText.title}</div>
    {/if}
    {#if $activeDialogText.content}
      <div class="dialog-content">{$activeDialogText.content}</div>
    {/if}
  </div>
{/if}

<style>
  .dialog-bubble {
    position: fixed;
    transform: translateX(-50%);
    
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
  
  .dialog-title {
    font-size: 11px;
    font-weight: bold;
    color: #1a1a2e;
    text-shadow: 1px 1px 0 rgba(255, 255, 255, 0.5);
  }
  
  .dialog-title.has-divider {
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 4px solid #ddd;
  }
  
  .dialog-content {
    font-size: 10px;
    line-height: 1.8;
    color: #444;
    overflow-y: auto;
    max-height: 150px;
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
  
  @media (max-width: 400px) {
    .dialog-bubble {
      left: 10px;
      right: 10px;
      transform: none;
      max-width: calc(100% - 20px);
    }
    
    .dialog-bubble::after,
    .dialog-bubble::before {
      left: 50%;
    }
  }
</style>
