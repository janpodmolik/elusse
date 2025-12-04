<script lang="ts">
  /**
   * HStack - Horizontal stack layout (like SwiftUI)
   * Children are arranged horizontally with optional spacing
   */
  interface Props {
    gap?: string;
    align?: 'start' | 'center' | 'end' | 'stretch';
    children?: any;
  }
  
  let {
    gap = '10px',
    align = 'center',
    children
  }: Props = $props();
</script>

<div class="hstack" style="gap: {gap}; align-items: {align === 'start' ? 'flex-start' : align === 'end' ? 'flex-end' : align};">
  {@render children?.()}
</div>

<style>
  .hstack {
    display: flex;
    flex-direction: row;
    pointer-events: auto;
  }
</style>
