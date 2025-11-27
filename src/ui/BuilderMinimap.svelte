<script lang="ts">
  import { builderCameraInfo, isBuilderZoomedOut } from '../stores/builderStores';
  import { EventBus, EVENTS, type MinimapNavigateEvent } from '../events/EventBus';
  
  // Minimap dimensions (normal and enlarged)
  const MINIMAP_WIDTH = 120;
  const MINIMAP_HEIGHT = 60;
  const ENLARGED_WIDTH = 200;
  const ENLARGED_HEIGHT = 100;
  
  // Drag state
  let isDragging = $state(false);
  let containerRef = $state<HTMLDivElement | null>(null);
  
  // Current dimensions based on drag state
  let currentWidth = $derived(isDragging ? ENLARGED_WIDTH : MINIMAP_WIDTH);
  let currentHeight = $derived(isDragging ? ENLARGED_HEIGHT : MINIMAP_HEIGHT);
  
  // Calculate viewport indicator position and size
  let viewportStyle = $derived.by(() => {
    const info = $builderCameraInfo;
    if (!info || info.worldWidth === 0) return 'display: none;';
    
    const scaleX = currentWidth / info.worldWidth;
    const scaleY = currentHeight / info.worldHeight;
    
    // Viewport rectangle (what camera sees)
    const viewWidth = (info.viewWidth / info.zoom) * scaleX;
    const viewHeight = (info.viewHeight / info.zoom) * scaleY;
    const viewX = info.scrollX * scaleX;
    const viewY = info.scrollY * scaleY;
    
    return `
      left: ${Math.max(0, viewX)}px;
      top: ${Math.max(0, viewY)}px;
      width: ${Math.min(viewWidth, currentWidth - viewX)}px;
      height: ${Math.min(viewHeight, currentHeight - viewY)}px;
    `;
  });
  
  // Calculate player position on minimap
  let playerStyle = $derived.by(() => {
    const info = $builderCameraInfo;
    if (!info || info.worldWidth === 0) return 'display: none;';
    
    const scaleX = currentWidth / info.worldWidth;
    const scaleY = currentHeight / info.worldHeight;
    
    const playerX = info.playerX * scaleX;
    const playerY = info.playerY * scaleY;
    
    return `
      left: ${playerX}px;
      top: ${playerY}px;
    `;
  });
  
  function navigateToPosition(clientX: number, clientY: number) {
    const info = $builderCameraInfo;
    if (!info || info.worldWidth === 0 || !containerRef) return;
    
    const rect = containerRef.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const clickY = clientY - rect.top;
    
    // Convert minimap coords to world coords
    const worldX = (clickX / currentWidth) * info.worldWidth;
    const worldY = (clickY / currentHeight) * info.worldHeight;
    
    EventBus.emit<MinimapNavigateEvent>(EVENTS.MINIMAP_NAVIGATE, { worldX, worldY });
  }
  
  function handleMouseDown(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();
    
    isDragging = true;
    navigateToPosition(event.clientX, event.clientY);
    
    // Add global listeners for drag
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }
  
  function handleMouseMove(event: MouseEvent) {
    if (!isDragging) return;
    event.preventDefault();
    navigateToPosition(event.clientX, event.clientY);
  }
  
  function handleMouseUp() {
    isDragging = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }
  
  // Touch support
  function handleTouchStart(event: TouchEvent) {
    event.stopPropagation();
    event.preventDefault();
    
    isDragging = true;
    const touch = event.touches[0];
    navigateToPosition(touch.clientX, touch.clientY);
    
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  }
  
  function handleTouchMove(event: TouchEvent) {
    if (!isDragging) return;
    event.preventDefault();
    const touch = event.touches[0];
    navigateToPosition(touch.clientX, touch.clientY);
  }
  
  function handleTouchEnd() {
    isDragging = false;
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  }
</script>

<!-- Hide minimap when zoomed out (full map is already visible) -->
{#if !$isBuilderZoomedOut}
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div 
  class="minimap-container"
  class:enlarged={isDragging}
  style="width: {currentWidth}px; height: {currentHeight}px;"
  bind:this={containerRef}
  onmousedown={handleMouseDown}
  ontouchstart={handleTouchStart}
>
  <!-- Map background -->
  <div class="minimap-bg"></div>
  
  <!-- Viewport indicator (what camera sees) -->
  <div class="viewport-indicator" style={viewportStyle}></div>
  
  <!-- Player position -->
  <div class="player-marker" style={playerStyle}></div>
  
  <!-- Border frame -->
  <div class="minimap-frame"></div>
</div>
{/if}

<style>
  .minimap-container {
    position: fixed;
    bottom: calc(10px + env(safe-area-inset-bottom));
    left: calc(10px + env(safe-area-inset-left));
    cursor: pointer;
    z-index: 1000;
    user-select: none;
    -webkit-user-select: none;
    pointer-events: auto;
    transition: width 0.15s ease-out, height 0.15s ease-out;
  }
  
  .minimap-container.enlarged {
    cursor: grabbing;
  }
  
  .minimap-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      to bottom,
      #1a2a3a 0%,
      #2a3a4a 60%,
      #3a4a3a 80%,
      #4a5a4a 100%
    );
    opacity: 0.9;
    pointer-events: none;
  }
  
  .viewport-indicator {
    position: absolute;
    background: rgba(74, 144, 226, 0.3);
    border: 2px solid #4a90e2;
    box-sizing: border-box;
    pointer-events: none;
  }
  
  .player-marker {
    position: absolute;
    width: 6px;
    height: 6px;
    background: #fff;
    border: 1px solid #333;
    border-radius: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
  }
  
  .enlarged .player-marker {
    width: 8px;
    height: 8px;
  }
  
  .minimap-frame {
    position: absolute;
    inset: 0;
    border: 3px solid #333;
    box-shadow: 
      inset 0 0 0 1px rgba(255, 255, 255, 0.1),
      4px 4px 0 rgba(0, 0, 0, 0.4);
    pointer-events: none;
  }
  
  .enlarged .minimap-frame {
    border-color: #4a90e2;
  }
  
  /* Hide on very small screens */
  @media (max-width: 400px) {
    .minimap-container {
      display: none;
    }
  }
</style>
