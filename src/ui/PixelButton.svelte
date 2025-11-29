<script lang="ts">
  interface Props {
    onclick?: (event: MouseEvent) => void;
    variant?: 'default' | 'green' | 'blue' | 'orange' | 'red' | 'purple' | 'cyan';
    disabled?: boolean;
    title?: string;
    width?: string;
    children?: any;
  }
  
  let {
    onclick,
    variant = 'default',
    disabled = false,
    title = '',
    width,
    children
  }: Props = $props();
  
  // Color maps for variants
  const colors = {
    default: { base: '#4a90e2', hover: '#357abd', active: '#2a5f8f' },
    green: { base: '#27ae60', hover: '#229954', active: '#1e8449' },
    blue: { base: '#3498db', hover: '#2980b9', active: '#21618c' },
    orange: { base: '#ffa500', hover: '#ff8c00', active: '#e67e00' },
    red: { base: '#e74c3c', hover: '#c0392b', active: '#a02e22' },
    purple: { base: '#9b59b6', hover: '#8e44ad', active: '#7d3c98' },
    cyan: { base: '#17a2b8', hover: '#138496', active: '#0f6674' }
  };
  
  // Use $derived for reactive color computation when variant changes
  const currentColor = $derived(colors[variant]);
  
  // Compute width style - only set if explicitly provided
  const widthStyle = $derived(width ? `--btn-width: ${width};` : '');
</script>

<button
  class="pixel-btn"
  class:disabled
  style="{widthStyle} --color-base: {currentColor.base}; --color-hover: {currentColor.hover}; --color-active: {currentColor.active}"
  {onclick}
  {disabled}
  {title}
>
  {@render children?.()}
</button>

<style>
  .pixel-btn {
    width: var(--btn-width, auto);
    height: 40px;
    padding: 12px 16px;
    background: var(--color-base);
    border: 3px solid #333;
    color: white;
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    text-transform: uppercase;
    white-space: nowrap;
    cursor: pointer;
    user-select: none;
    outline: none;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.3);
  }

  .pixel-btn:hover:not(.disabled) {
    background: var(--color-hover);
  }

  .pixel-btn:active:not(.disabled) {
    background: var(--color-active);
  }

  .pixel-btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Mobile optimization */
  @media (max-width: 600px) {
    .pixel-btn {
      height: 35px;
      font-size: 10px;
      padding: 10px 12px;
      border-width: 2px;
    }
  }
</style>
