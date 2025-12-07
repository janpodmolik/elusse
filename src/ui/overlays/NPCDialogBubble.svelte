<script lang="ts">
  import { activeNPCDialog, activeNPCDialogText, activeDialogText } from '../../stores/dialogStores';
  import { DIALOG_BUBBLE_VERTICAL_OFFSET } from '../../constants/uiConstants';
  
  const MAX_BUBBLE_WIDTH = 300;
  const BUBBLE_MARGIN = 20;
  const PLAYER_BUBBLE_HEIGHT = 120; // Estimated height of player bubble + gap
  
  // Check if player dialog is also active (to avoid overlap)
  let playerDialogActive = $derived(!!$activeDialogText);
  
  // Calculate bubble position (bubble sits above NPC)
  let bubbleBottom = $derived.by(() => {
    if (!$activeNPCDialog) return 0;
    // Position above the NPC sprite
    const npcTop = $activeNPCDialog.screenY - $activeNPCDialog.npcHeight / 2;
    let bottom = Math.max(10, window.innerHeight - npcTop + DIALOG_BUBBLE_VERTICAL_OFFSET);
    
    // If player dialog is active, push NPC bubble higher
    if (playerDialogActive) {
      bottom += PLAYER_BUBBLE_HEIGHT;
    }
    
    return bottom;
  });
  
  // Position bubble directly at NPC position
  let bubbleLeft = $derived.by(() => {
    if (!$activeNPCDialog) return 0;
    return $activeNPCDialog.screenX;
  });
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
    
    /* Shrink to content */
    display: flex;
    flex-direction: column;
    width: max-content;
    min-width: 60px;
    max-width: 300px;
    max-height: 300px;
    
    background: #f8f8f8;
    border: 4px solid #333;
    padding: 12px 16px;
    
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    line-height: 1.6;
    color: #333;
    
    z-index: 900;
    pointer-events: none;
    
    /* Pixel art style */
    border-radius: 0;
    
    /* Pixel art shadow */
    box-shadow:
      4px 4px 0 0 rgba(0, 0, 0, 0.3),
      inset 2px 2px 0 0 rgba(255, 255, 255, 0.5);
    
    /* Entrance animation */
    animation: bubbleIn 0.15s ease-out;
  }
  
  /* Outer triangle (border) */
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
    border-top: 16px solid #333;
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
    border-top: 12px solid #f8f8f8;
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
