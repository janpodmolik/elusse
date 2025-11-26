<script lang="ts">
  interface Props {
    onclick?: (event: MouseEvent) => void;
    position?: 'top-left' | 'top-right' | 'stack-2' | 'stack-3';
    variant?: 'default' | 'green' | 'blue' | 'orange' | 'red';
    disabled?: boolean;
    title?: string;
    width?: string;
    children?: any;
  }
  
  let {
    onclick,
    position = 'top-right',
    variant = 'default',
    disabled = false,
    title = '',
    width = '100px',
    children
  }: Props = $props();
  
  // Color maps for variants
  const colors = {
    default: { base: '#4a90e2', hover: '#357abd', active: '#2a5f8f' },
    green: { base: '#27ae60', hover: '#229954', active: '#1e8449' },
    blue: { base: '#3498db', hover: '#2980b9', active: '#21618c' },
    orange: { base: '#ffa500', hover: '#ff8c00', active: '#e67e00' },
    red: { base: '#e74c3c', hover: '#c0392b', active: '#a02e22' }
  };
  
  // Use $derived for reactive color computation when variant changes
  const currentColor = $derived(colors[variant]);
</script>

<button
  class="pixel-btn pixel-btn--{position}"
  class:disabled
  style="--btn-width: {width}; --color-base: {currentColor.base}; --color-hover: {currentColor.hover}; --color-active: {currentColor.active}"
  {onclick}
  {disabled}
  {title}
>
  {@render children?.()}
</button>

<style>
  .pixel-btn {
    position: fixed;
    width: var(--btn-width, 100px);
    height: 40px;
    padding: 0;
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

  /* Position variants */
  .pixel-btn--top-left {
    top: calc(10px + env(safe-area-inset-top));
    left: calc(10px + env(safe-area-inset-left));
  }

  .pixel-btn--top-right,
  .pixel-btn--stack-2,
  .pixel-btn--stack-3 {
    right: calc(10px + env(safe-area-inset-right));
  }

  .pixel-btn--top-right {
    top: calc(10px + env(safe-area-inset-top));
  }

  .pixel-btn--stack-2 {
    top: calc(60px + env(safe-area-inset-top));
  }

  .pixel-btn--stack-3 {
    top: calc(110px + env(safe-area-inset-top));
  }

  /* Mobile optimization */
  @media (max-width: 600px) {
    .pixel-btn {
      width: calc(var(--btn-width, 100px) * 0.8);
      height: 35px;
      font-size: 10px;
      border-width: 2px;
    }

    .pixel-btn--top-left {
      top: calc(5px + env(safe-area-inset-top));
      left: calc(5px + env(safe-area-inset-left));
    }

    .pixel-btn--top-right,
    .pixel-btn--stack-2,
    .pixel-btn--stack-3 {
      right: calc(5px + env(safe-area-inset-right));
    }

    .pixel-btn--top-right {
      top: calc(5px + env(safe-area-inset-top));
    }

    .pixel-btn--stack-2 {
      top: calc(45px + env(safe-area-inset-top));
    }

    .pixel-btn--stack-3 {
      top: calc(85px + env(safe-area-inset-top));
    }
  }
</style>
