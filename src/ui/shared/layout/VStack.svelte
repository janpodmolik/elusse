<script lang="ts">
  /**
   * VStack - Vertical stack layout (like SwiftUI)
   * Children are arranged vertically with optional spacing
   */
  interface Props {
    gap?: string;
    align?: 'start' | 'center' | 'end' | 'stretch';
    children?: any;
  }
  
  let {
    gap = '10px',
    align = 'stretch',
    children
  }: Props = $props();
</script>

<div class="vstack" style="gap: {gap}; align-items: {align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align};">
  {@render children?.()}
</div>

<style>
  .vstack {
    display: flex;
    flex-direction: column;
    pointer-events: auto;
  }
</style>
