<script lang="ts">
  import { gameFrameColor, gameWorldDimensions } from '../stores';

  // Frame border thickness in pixels
  const FRAME_THICKNESS = 16;
  
  // Get current frame color from store
  $: frameColor = $gameFrameColor;
  
  // Get game world dimensions from store
  $: dimensions = $gameWorldDimensions;
  
  // Calculate frame position and size based on world dimensions
  $: frameStyle = `
    top: ${dimensions.offsetY}px;
    left: ${dimensions.offsetX}px;
    width: ${dimensions.worldWidth}px;
    height: ${dimensions.worldHeight}px;
  `;
</script>

<div class="game-frame" style="--frame-thickness: {FRAME_THICKNESS}px; --frame-color: {frameColor}; {frameStyle}">
  <!-- Top border -->
  <div class="frame-border frame-top"></div>
  <!-- Bottom border -->
  <div class="frame-border frame-bottom"></div>
  <!-- Left border -->
  <div class="frame-border frame-left"></div>
  <!-- Right border -->
  <div class="frame-border frame-right"></div>
  
  <!-- Corner decorations (optional pixelart corners) -->
  <div class="frame-corner corner-top-left"></div>
  <div class="frame-corner corner-top-right"></div>
  <div class="frame-corner corner-bottom-left"></div>
  <div class="frame-corner corner-bottom-right"></div>
</div>

<style>
  .game-frame {
    position: fixed;
    pointer-events: none;
    z-index: 100;
    /* Dimensions set dynamically via style attribute */
  }

  .frame-border {
    position: absolute;
    background: var(--frame-color, #2a1a0a);
    /* Pixelated inner shadow effect */
    box-shadow: 
      inset 0 0 0 2px rgba(255, 255, 255, 0.1),
      inset 0 0 0 4px rgba(0, 0, 0, 0.3);
    image-rendering: pixelated;
  }

  .frame-top {
    top: 0;
    left: 0;
    right: 0;
    height: var(--frame-thickness);
    /* Wood grain effect - horizontal stripes */
    background: linear-gradient(
      180deg,
      var(--frame-color) 0%,
      color-mix(in srgb, var(--frame-color) 85%, white) 15%,
      var(--frame-color) 30%,
      color-mix(in srgb, var(--frame-color) 90%, black) 50%,
      var(--frame-color) 70%,
      color-mix(in srgb, var(--frame-color) 80%, white) 85%,
      var(--frame-color) 100%
    );
    border-bottom: 2px solid rgba(0, 0, 0, 0.5);
  }

  .frame-bottom {
    bottom: 0;
    left: 0;
    right: 0;
    height: var(--frame-thickness);
    background: linear-gradient(
      0deg,
      var(--frame-color) 0%,
      color-mix(in srgb, var(--frame-color) 85%, white) 15%,
      var(--frame-color) 30%,
      color-mix(in srgb, var(--frame-color) 90%, black) 50%,
      var(--frame-color) 70%,
      color-mix(in srgb, var(--frame-color) 80%, white) 85%,
      var(--frame-color) 100%
    );
    border-top: 2px solid rgba(0, 0, 0, 0.5);
  }

  .frame-left {
    top: var(--frame-thickness);
    bottom: var(--frame-thickness);
    left: 0;
    width: var(--frame-thickness);
    background: linear-gradient(
      90deg,
      var(--frame-color) 0%,
      color-mix(in srgb, var(--frame-color) 85%, white) 15%,
      var(--frame-color) 30%,
      color-mix(in srgb, var(--frame-color) 90%, black) 50%,
      var(--frame-color) 70%,
      color-mix(in srgb, var(--frame-color) 80%, white) 85%,
      var(--frame-color) 100%
    );
    border-right: 2px solid rgba(0, 0, 0, 0.5);
  }

  .frame-right {
    top: var(--frame-thickness);
    bottom: var(--frame-thickness);
    right: 0;
    width: var(--frame-thickness);
    background: linear-gradient(
      270deg,
      var(--frame-color) 0%,
      color-mix(in srgb, var(--frame-color) 85%, white) 15%,
      var(--frame-color) 30%,
      color-mix(in srgb, var(--frame-color) 90%, black) 50%,
      var(--frame-color) 70%,
      color-mix(in srgb, var(--frame-color) 80%, white) 85%,
      var(--frame-color) 100%
    );
    border-left: 2px solid rgba(0, 0, 0, 0.5);
  }

  /* Corner decorations */
  .frame-corner {
    position: absolute;
    width: var(--frame-thickness);
    height: var(--frame-thickness);
    background: var(--frame-color);
    /* Darker corner for depth */
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--frame-color) 70%, black) 0%,
      var(--frame-color) 50%,
      color-mix(in srgb, var(--frame-color) 85%, white) 100%
    );
  }

  .corner-top-left {
    top: 0;
    left: 0;
  }

  .corner-top-right {
    top: 0;
    right: 0;
    background: linear-gradient(
      225deg,
      color-mix(in srgb, var(--frame-color) 70%, black) 0%,
      var(--frame-color) 50%,
      color-mix(in srgb, var(--frame-color) 85%, white) 100%
    );
  }

  .corner-bottom-left {
    bottom: 0;
    left: 0;
    background: linear-gradient(
      45deg,
      color-mix(in srgb, var(--frame-color) 70%, black) 0%,
      var(--frame-color) 50%,
      color-mix(in srgb, var(--frame-color) 85%, white) 100%
    );
  }

  .corner-bottom-right {
    bottom: 0;
    right: 0;
    background: linear-gradient(
      315deg,
      color-mix(in srgb, var(--frame-color) 70%, black) 0%,
      var(--frame-color) 50%,
      color-mix(in srgb, var(--frame-color) 85%, white) 100%
    );
  }
</style>
