<script lang="ts">
  import { placedFrames, builderCameraInfo, draggingFramePositions, isBuilderMode, builderPreviewLanguage } from '../stores/builderStores';
  import { currentLanguage, gameCameraInfo } from '../stores';
  import { DEFAULT_TEXT_COLOR, DEFAULT_TEXT_SIZE, DEFAULT_TEXT_ALIGN, DEFAULT_FRAME_SCALE, type PlacedFrame } from '../types/FrameTypes';
  import { getFrameDimensions } from '../data/frames';
  
  // Use store frames (same for both modes now)
  let frames = $derived($placedFrames);
  
  // Use appropriate camera store based on mode
  let cameraX = $derived($isBuilderMode ? $builderCameraInfo.scrollX : $gameCameraInfo.scrollX);
  let cameraY = $derived($isBuilderMode ? $builderCameraInfo.scrollY : $gameCameraInfo.scrollY);
  let cameraZoom = $derived($isBuilderMode ? $builderCameraInfo.zoom : $gameCameraInfo.zoom);
  
  // In builder mode, use preview language from panel; in game mode, use current game language
  let lang = $derived($isBuilderMode ? $builderPreviewLanguage : $currentLanguage);
  
  // Get real-time dragging positions (only in builder mode)
  // Note: In game mode, draggingFramePositions store is empty, no need for extra Map
  let draggingPositions = $derived($draggingFramePositions);
  
  /**
   * Get frame position - uses dragging position if available, otherwise stored position
   */
  function getFramePosition(frame: PlacedFrame): { x: number; y: number } {
    const draggingPos = draggingPositions.get(frame.id);
    if (draggingPos) {
      return draggingPos;
    }
    return { x: frame.x, y: frame.y };
  }
  
  /**
   * Get screen position and size for text overlay
   * Uses centralized getFrameDimensions() for consistent sizing with Phaser
   */
  function getTextPosition(frame: PlacedFrame): { x: number; y: number; width: number; height: number } {
    const scale = frame.scale ?? DEFAULT_FRAME_SCALE;
    const isRotated = frame.rotation === 90;
    
    // Get text area dimensions from centralized utility
    const { textWidth, textHeight } = getFrameDimensions(scale, isRotated);
    
    // Get real-time position (dragging or stored)
    const pos = getFramePosition(frame);
    
    // Convert world position to screen position
    const screenX = (pos.x - cameraX) * cameraZoom;
    const screenY = (pos.y - cameraY) * cameraZoom;
    
    return {
      x: screenX,
      y: screenY,
      width: textWidth * cameraZoom,
      height: textHeight * cameraZoom,
    };
  }
  
  /**
   * Get text content for current language
   */
  function getFrameText(frame: PlacedFrame): string {
    const langText = frame.texts.find(t => t.language === lang) 
      || frame.texts[0] 
      || { text: '' };
    return langText.text || '';
  }
</script>

<div class="frame-content-layer">
  {#each frames as frame (frame.id)}
    {@const textPos = getTextPosition(frame)}
    {@const text = getFrameText(frame)}
    {@const fontSize = (frame.textSize ?? DEFAULT_TEXT_SIZE) * cameraZoom}
    {@const textColor = frame.textColor ?? DEFAULT_TEXT_COLOR}
    {@const textAlign = frame.textAlign ?? DEFAULT_TEXT_ALIGN}
    
    <!-- Text overlay (background is rendered in Phaser) -->
    {#if text}
      <div 
        class="frame-text"
        class:align-top={textAlign === 'top'}
        class:align-center={textAlign === 'center'}
        class:align-bottom={textAlign === 'bottom'}
        style="
          left: {textPos.x}px;
          top: {textPos.y}px;
          width: {textPos.width}px;
          height: {textPos.height}px;
          font-size: {fontSize}px;
          color: {textColor};
        "
      >
        {text}
      </div>
    {/if}
  {/each}
</div>

<style>
  .frame-content-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
  }
  
  .frame-text {
    position: absolute;
    transform: translate(-50%, -50%);
    
    display: flex;
    justify-content: center;
    text-align: center;
    
    font-family: 'Press Start 2P', monospace;
    line-height: 1.4;
    
    /* Preserve newlines from textarea */
    white-space: pre-wrap;
    
    /* Word-based wrapping (not letter-based) */
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: normal;
    
    /* Hide overflow */
    overflow: hidden;
  }
  
  /* Text alignment variants */
  .frame-text.align-top {
    align-items: flex-start;
  }
  
  .frame-text.align-center {
    align-items: center;
  }
  
  .frame-text.align-bottom {
    align-items: flex-end;
  }
</style>
