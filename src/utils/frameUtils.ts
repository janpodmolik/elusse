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
