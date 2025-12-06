<script lang="ts">
  import { activeNPCDialog, activeNPCDialogText } from '../../stores/dialogStores';
  import { DIALOG_BUBBLE_VERTICAL_OFFSET } from '../../constants/uiConstants';
  
  // Calculate bubble position (bubble sits above NPC)
  let bubbleBottom = $derived.by(() => {
    if (!$activeNPCDialog) return 0;
    // Position above the NPC sprite
    const npcTop = $activeNPCDialog.screenY - $activeNPCDialog.npcHeight / 2;
    return Math.max(10, window.innerHeight - npcTop + DIALOG_BUBBLE_VERTICAL_OFFSET);
  });
  
  // Center on NPC horizontally
  let bubbleLeft = $derived($activeNPCDialog?.screenX ?? 0);
</script>

{#if $activeNPCDialogText && $activeNPCDialog}
  <div 
    class="npc-dialog-bubble"
    style="bottom: {bubbleBottom}px; left: {bubbleLeft}px;"
  >
    {#if $activeNPCDialogText.content}
      <div class="dialog-content">{$activeNPCDialogText.content}</div>
    {/if}
  </div>
{/if}

<style>
  .npc-dialog-bubble {
    position: fixed;
    transform: translateX(-50%);
    
    /* Size constraints */
    max-width: 400px;
    max-height: 300px;
    
    background: #fff8e8;
    border: 4px solid #e67e22;
    padding: 12px 16px;
    
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    line-height: 1.6;
    color: #333;
    
    z-index: 900;
    pointer-events: none;
    
    /* Pixel art style */
    border-radius: 0;
    
    /* Pixel art shadow - orange tinted */
    box-shadow:
      4px 4px 0 0 rgba(230, 126, 34, 0.4),
      inset 2px 2px 0 0 rgba(255, 255, 255, 0.5);
    
    /* Entrance animation */
    animation: bubbleIn 0.15s ease-out;
  }
  
  /* Outer triangle (border) - orange */
  .npc-dialog-bubble::after {
    content: '';
    position: absolute;
    bottom: -16px;
    left: 50%;
    transform: translateX(-50%);
    
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 16px solid #e67e22;
  }
  
  /* Inner triangle (fill) */
  .npc-dialog-bubble::before {
    content: '';
    position: absolute;
    bottom: -9px;
    left: 50%;
    transform: translateX(-50%);
    
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 12px solid #fff8e8;
    z-index: 1;
  }
  
  .dialog-content {
    overflow-wrap: break-word;
    word-break: break-word;
    white-space: pre-wrap;
  }
  
  @keyframes bubbleIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
</style>
