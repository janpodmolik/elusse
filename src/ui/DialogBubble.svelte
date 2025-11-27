<script lang="ts">
  import { activeDialogText } from '../stores';
  
  // Get player screen position from Phaser (passed via store or event)
  // For now, we'll position it centered horizontally and at a fixed vertical position
  // TODO: Make it follow player sprite using Phaser camera conversion
  
  // Max dimensions for the bubble
  const MAX_WIDTH = 300;
  const MAX_HEIGHT = 200;
</script>

{#if $activeDialogText}
  <div class="dialog-bubble" style="max-width: {MAX_WIDTH}px; max-height: {MAX_HEIGHT}px;">
    {#if $activeDialogText.title}
      <div class="dialog-title">{$activeDialogText.title}</div>
    {/if}
    {#if $activeDialogText.content}
      <div class="dialog-content">{$activeDialogText.content}</div>
    {/if}
  </div>
{/if}

<style>
  .dialog-bubble {
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    
    background: rgba(255, 255, 255, 0.95);
    border: 4px solid #333;
    border-radius: 12px;
    padding: 12px 16px;
    
    font-family: 'Press Start 2P', monospace;
    color: #333;
    
    z-index: 900;
    pointer-events: none;
    
    /* Speech bubble tail */
    box-shadow: 
      0 4px 20px rgba(0, 0, 0, 0.3),
      inset 0 0 0 2px rgba(255, 255, 255, 0.5);
    
    /* Entrance animation */
    animation: bubbleIn 0.2s ease-out;
  }
  
  .dialog-bubble::after {
    content: '';
    position: absolute;
    bottom: -16px;
    left: 50%;
    transform: translateX(-50%);
    
    /* Triangle tail */
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 16px solid #333;
  }
  
  .dialog-bubble::before {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    
    /* Inner triangle */
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 12px solid rgba(255, 255, 255, 0.95);
    z-index: 1;
  }
  
  .dialog-title {
    font-size: 11px;
    font-weight: bold;
    color: #1a1a2e;
    margin-bottom: 8px;
    padding-bottom: 6px;
    border-bottom: 2px solid #ddd;
  }
  
  .dialog-content {
    font-size: 10px;
    line-height: 1.6;
    color: #444;
    overflow-y: auto;
    max-height: 150px;
  }
  
  @keyframes bubbleIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
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
