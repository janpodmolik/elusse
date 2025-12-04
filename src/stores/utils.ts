/**
 * Store Utilities
 */

/**
 * Get current value from a store synchronously
 * Useful in Phaser scenes where you need immediate value
 */
export function getStoreValue<T>(store: { subscribe: (fn: (value: T) => void) => () => void }): T {
  let value: T;
  const unsubscribe = store.subscribe((v) => { value = v; });
  unsubscribe();
  return value!;
}
