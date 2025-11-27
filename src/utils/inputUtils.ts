/**
 * Input Utilities
 * Shared helper functions for input handling
 */

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
