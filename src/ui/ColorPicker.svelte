<script lang="ts">
  interface Props {
    /** Array of color hex strings */
    colors: readonly string[] | string[];
    /** Currently selected color */
    selectedColor: string;
    /** Callback when color is selected */
    onselect: (color: string) => void;
    /** Label text */
    label?: string;
    /** Accent color for selection (default: blue) */
    accentColor?: string;
  }
  
  let { 
    colors, 
    selectedColor, 
    onselect, 
    label = 'Color',
    accentColor = '#88ddff'
  }: Props = $props();
  
  let isOpen = $state(false);
  
  function handleSelect(color: string) {
    onselect(color);
    isOpen = false;
  }
  
  function toggle() {
    isOpen = !isOpen;
  }
</script>

<div class="color-section">
  <span class="color-label-title">{label}</span>
  <button 
    class="color-button"
    onclick={toggle}
    title="Change color"
    style:--accent-color={accentColor}
  >
    <span class="color-preview" style:background={selectedColor}></span>
    <span class="color-label">Change</span>
  </button>
  
  {#if isOpen}
    <div class="color-picker">
      {#each colors as color}
        <button
          class="color-swatch"
          class:selected={selectedColor === color}
          style:background={color}
          style:--accent-color={accentColor}
          onclick={() => handleSelect(color)}
          title={color}
        ></button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .color-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  
  .color-label-title {
    color: #aaa;
    font-size: 9px;
    text-transform: uppercase;
  }
  
  .color-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    background: rgba(40, 40, 50, 0.8);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    cursor: pointer;
    transition: border-color 0.2s;
    font-family: inherit;
  }
  
  .color-button:hover {
    border-color: var(--accent-color);
  }
  
  .color-preview {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    flex-shrink: 0;
  }
  
  .color-label {
    color: #888;
    font-family: 'Press Start 2P', monospace;
    font-size: 9px;
  }
  
  .color-picker {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6px;
    padding: 8px;
    background: rgba(20, 20, 30, 0.9);
    border: 2px solid #4a4a5a;
    border-radius: 4px;
    margin-top: 4px;
  }
  
  .color-swatch {
    width: 100%;
    aspect-ratio: 1;
    border: 3px solid transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: transform 0.15s, border-color 0.15s;
    box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  }
  
  .color-swatch:hover {
    transform: scale(1.1);
    border-color: rgba(255, 255, 255, 0.5);
  }
  
  .color-swatch.selected {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 50%, transparent);
  }
</style>
