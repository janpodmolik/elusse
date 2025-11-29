/**
 * Frame Utilities
 * Shared utilities for frame rendering in Phaser scenes
 */

import Phaser from 'phaser';

/**
 * Frame container type for Phaser scenes
 * Used by both BuilderFramesController and GameFrameManager
 */
export interface FrameContainer {
  sprite: Phaser.GameObjects.Sprite;
  background: Phaser.GameObjects.Graphics;
  data: import('../types/FrameTypes').PlacedFrame;
}

/**
 * Draw rounded rectangle background for frame
 */
export function drawFrameBackground(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  cornerRadius: number = 4
): void {
  graphics.clear();
  const fillColor = parseInt(color.replace('#', ''), 16);
  graphics.fillStyle(fillColor, 1);
  graphics.fillRoundedRect(x - width / 2, y - height / 2, width, height, cornerRadius);
}

/**
 * Double-click detection helper
 * Returns true if this click should be treated as a double-click
 */
export class DoubleClickDetector {
  private lastClickTime: number = 0;
  private lastClickedId: string | null = null;
  private readonly threshold: number;

  constructor(thresholdMs: number = 300) {
    this.threshold = thresholdMs;
  }

  /**
   * Check if current click is a double-click on the same target
   * @param targetId - Unique identifier for the clicked element
   * @returns true if this is a double-click
   */
  check(targetId: string): boolean {
    const now = Date.now();
    const isDoubleClick = 
      this.lastClickedId === targetId && 
      (now - this.lastClickTime) < this.threshold;
    
    if (isDoubleClick) {
      this.reset();
      return true;
    }
    
    this.lastClickTime = now;
    this.lastClickedId = targetId;
    return false;
  }

  /**
   * Reset the detector state
   */
  reset(): void {
    this.lastClickTime = 0;
    this.lastClickedId = null;
  }
}
