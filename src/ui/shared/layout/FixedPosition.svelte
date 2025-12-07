<script lang="ts">
  /**
   * FixedPosition - Positions content at fixed screen location
   * Use for UI overlays that should stay in place
   */
  import { isDraggingInBuilder } from '../../../stores/builderStores';
  
  interface Props {
    position: 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center';
    padding?: string;
    children?: any;
  }
  
  let {
    position,
    padding = '10px',
    children
  }: Props = $props();
</script>

<div class="fixed fixed--{position}" class:dragging-in-builder={$isDraggingInBuilder} style="--padding: {padding};">
  {@render children?.()}
</div>

<style>
  .fixed {
    position: fixed;
    z-index: 1100;
    pointer-events: none;
  }
  
  .fixed > :global(*) {
    pointer-events: auto;
  }
  
  .fixed.dragging-in-builder > :global(*) {
    pointer-events: none;
  }
  
  /* Top positions */
  .fixed--top-left {
    top: calc(var(--padding) + env(safe-area-inset-top));
    left: calc(var(--padding) + env(safe-area-inset-left));
  }
  
  .fixed--top-right {
    top: calc(var(--padding) + env(safe-area-inset-top));
    right: calc(var(--padding) + env(safe-area-inset-right));
  }
  
  .fixed--top-center {
    top: calc(var(--padding) + env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
  }
  
  /* Bottom positions */
  .fixed--bottom-left {
    bottom: calc(var(--padding) + env(safe-area-inset-bottom));
    left: calc(var(--padding) + env(safe-area-inset-left));
  }
  
  .fixed--bottom-right {
    bottom: calc(var(--padding) + env(safe-area-inset-bottom));
    right: calc(var(--padding) + env(safe-area-inset-right));
  }
  
  .fixed--bottom-center {
    bottom: calc(var(--padding) + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
  }
  
  /* Mobile adjustments */
  @media (max-width: 600px) {
    .fixed {
      --padding: 5px;
    }
  }
</style>
