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
