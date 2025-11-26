<script lang="ts">
  let dismissed = $state(false);
  
  function dismiss() {
    dismissed = true;
  }
</script>

{#if !dismissed}
  <div class="landscape-hint">
    <div class="hint-content">
      <div class="rotate-icon">📱↻</div>
      <p class="hint-text">Rotate your phone for a better experience</p>
      <button class="dismiss-btn" onclick={dismiss}>OK</button>
    </div>
  </div>
{/if}

<style>
  .landscape-hint {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    align-items: center;
    justify-content: center;
    z-index: 9999;
    /* Hidden by default, shown via media query */
    display: none;
  }
  
  /* Show only on mobile portrait */
  @media (max-width: 768px) and (orientation: portrait) {
    .landscape-hint {
      display: flex;
    }
  }
  
  .hint-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 32px;
    background: #1a1a2e;
    border: 4px solid #333;
    box-shadow: 8px 8px 0 rgba(0, 0, 0, 0.5);
    max-width: 280px;
    text-align: center;
  }
  
  .rotate-icon {
    font-size: 48px;
    animation: rotate-hint 2s ease-in-out infinite;
  }
  
  @keyframes rotate-hint {
    0%, 100% { transform: rotate(0deg); }
    25% { transform: rotate(-15deg); }
    75% { transform: rotate(15deg); }
  }
  
  .hint-text {
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    color: #fff;
    line-height: 1.6;
    margin: 0;
  }
  
  .dismiss-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    padding: 12px 32px;
    background: #4a90e2;
    color: #fff;
    border: 3px solid #333;
    cursor: pointer;
    text-transform: uppercase;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
    transition: all 0.1s ease;
  }
  
  .dismiss-btn:hover {
    background: #5da0f2;
  }
  
  .dismiss-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.4);
  }
</style>
