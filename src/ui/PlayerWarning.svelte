<script lang="ts">
  let showWarning = $state(false);
  let playerX = $state(0);
  let playerY = $state(0);
  let isPaletteOpen = $state(false);
  let warningTimeout: number | null = null;
  
  function clearWarning() {
    showWarning = false;
    if (warningTimeout) {
      clearTimeout(warningTimeout);
      warningTimeout = null;
    }
  }
  
  function handlePaletteState(event: CustomEvent) {
    isPaletteOpen = event.detail.isOpen;
    if (!isPaletteOpen) clearWarning();
  }
  
  function handlePlayerClick(event: CustomEvent) {
    if (!isPaletteOpen) return;
    
    const { x, y } = event.detail;
    playerX = x;
    playerY = y;
    showWarning = true;
    
    if (warningTimeout) clearTimeout(warningTimeout);
    
    warningTimeout = window.setTimeout(() => {
      showWarning = false;
      warningTimeout = null;
    }, 3000);
  }
  
  $effect(() => {
    const events = [
      ['paletteStateChanged', handlePaletteState],
      ['playerClickedWhilePaletteOpen', handlePlayerClick]
    ] as const;
    
    events.forEach(([event, handler]) => {
      window.addEventListener(event, handler as EventListener);
    });
    
    return () => {
      events.forEach(([event, handler]) => {
        window.removeEventListener(event, handler as EventListener);
      });
      clearWarning();
    };
  });
</script>

{#if showWarning}
  <div 
    class="warning"
    style:left="{playerX}px"
    style:top="{playerY - 80}px"
  >
    ⚠️ Close assets to move player
  </div>
{/if}

<style>
  .warning {
    position: fixed;
    padding: 8px 16px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #ffd700;
    border-radius: 8px;
    color: #ffd700;
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 2000;
    transform: translateX(-50%);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  @media (max-width: 600px) {
    .warning {
      font-size: 8px;
      padding: 6px 12px;
    }
  }
</style>
