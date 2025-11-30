/**
 * Input Utilities
 * Shared helper functions for input handling
 */

/**
 * Global flag for palette dragging state
 * Used by camera controller to disable scrolling during palette drag
 */
let _isPaletteDragging = false;

/**
 * Global flag indicating pointer is over UI element
 * When true, Phaser should ignore input events
 */
let _isPointerOverUI = false;

/**
 * Set the palette dragging state
 * Called from AssetPalette and FramePalette during drag operations
 */
export function setPaletteDragging(isDragging: boolean): void {
  _isPaletteDragging = isDragging;
}

/**
 * Check if currently dragging from a palette
 */
export function isPaletteDragging(): boolean {
  return _isPaletteDragging;
}

/**
 * Check if pointer is currently over a UI element
 * Used by Phaser to skip input handling when UI is in the way
 */
export function isPointerOverUI(): boolean {
  return _isPointerOverUI;
}

/**
 * Check if an element is part of the UI layer (not the game canvas)
 * Uses data-ui attribute as primary indicator, with fallbacks for common patterns
 */
function isUIElement(element: Element | null): boolean {
  if (!element) return false;
  
  // Canvas is NOT a UI element
  if (element.tagName === 'CANVAS') return false;
  
  // Primary check: data-ui attribute (recommended for all UI elements)
  if (element.closest('[data-ui]')) return true;
  
  // Fallback: Check if element is inside #game-ui wrapper
  const gameUI = document.getElementById('game-ui');
  if (gameUI && gameUI.contains(element)) return true;
  
  // Fallback: Common interactive elements
  if (element.closest('button')) return true;
  
  return false;
}

/**
 * Initialize global UI input blocking
 * Call this once at app startup to set up event listeners
 */
export function initUIInputBlocking(): void {
  // Track pointer position to determine if over UI
  document.addEventListener('pointerdown', (e) => {
    _isPointerOverUI = isUIElement(e.target as Element);
  }, { capture: true });
  
  document.addEventListener('pointermove', (e) => {
    // Only update during active pointer (button pressed)
    if (e.buttons > 0) return;
    _isPointerOverUI = isUIElement(e.target as Element);
  }, { capture: true });
  
  document.addEventListener('pointerup', () => {
    // Small delay to allow click handlers to process
    setTimeout(() => {
      _isPointerOverUI = false;
    }, 10);
  }, { capture: true });
  
  // Touch events
  document.addEventListener('touchstart', (e) => {
    _isPointerOverUI = isUIElement(e.target as Element);
  }, { capture: true, passive: true });
  
  document.addEventListener('touchend', () => {
    setTimeout(() => {
      _isPointerOverUI = false;
    }, 10);
  }, { capture: true, passive: true });
}

/**
 * Check if user is currently typing in a text input field.
 * Used to disable game keyboard shortcuts while editing text.
 * 
 * @returns true if active element is an input, textarea, or contenteditable
 */
export function isTypingInTextField(): boolean {
  const activeElement = document.activeElement;
  if (!activeElement) return false;
  
  const tagName = activeElement.tagName.toUpperCase();
  return (
    tagName === 'INPUT' || 
    tagName === 'TEXTAREA' || 
    activeElement.getAttribute('contenteditable') === 'true'
  );
}

/**
 * Convert world coordinates to screen coordinates
 * Uses camera.worldView for correct FIT mode support
 * 
 * This is the same calculation used by FrameContent.svelte for text positioning,
 * and should be used consistently across all UI overlays (buttons, selection indicators, etc.)
 * 
 * @param worldX - X position in world coordinates
 * @param worldY - Y position in world coordinates
 * @param camera - Phaser camera instance
 * @returns Screen coordinates { screenX, screenY }
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: Phaser.Cameras.Scene2D.Camera
): { screenX: number; screenY: number } {
  // Use worldView for accurate world-to-screen conversion
  // worldView represents the visible area in world coordinates
  // This correctly handles FIT mode where scrollX/scrollY don't match worldView
  const screenX = (worldX - camera.worldView.x) * camera.zoom;
  const screenY = (worldY - camera.worldView.y) * camera.zoom;
  return { screenX, screenY };
}

/**
 * Convert screen/canvas coordinates to world coordinates
 * Inverse of worldToScreen - uses camera.worldView for correct FIT mode support
 * 
 * @param screenX - X position in screen/canvas coordinates (relative to canvas top-left)
 * @param screenY - Y position in screen/canvas coordinates (relative to canvas top-left)
 * @param camera - Phaser camera instance
 * @returns World coordinates { worldX, worldY }
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: Phaser.Cameras.Scene2D.Camera
): { worldX: number; worldY: number } {
  // Inverse of worldToScreen
  // Use worldView for accurate screen-to-world conversion in FIT mode
  const worldX = screenX / camera.zoom + camera.worldView.x;
  const worldY = screenY / camera.zoom + camera.worldView.y;
  return { worldX, worldY };
}
