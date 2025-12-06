/**
 * Item definition interfaces
 */

export interface ItemAnimationConfig {
  frameWidth: number;
  frameHeight: number;
  frameRate?: number;
  repeat?: number;
  startFrame?: number;
  endFrame?: number;
}

export interface ItemDefinition {
  /** Unique identifier for the item */
  key: string;
  /** Display name in UI */
  name: string;
  /** Path to the item file (relative to public/) */
  path: string;
  /** Default scale factor when placed in scene */
  scale: number;
  /** Group identifier for background filtering */
  group: string;
  /** Optional category for grouping in UI */
  category?: string;
  /** Whether this item supports physics body (can block player) */
  supportsPhysics?: boolean;
}
