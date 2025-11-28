/**
 * Frame definitions for placeable text frames/bubbles
 */

import type { FrameDefinition } from '../types/FrameTypes';

/**
 * Central registry of all available frames
 */
export const FRAMES: FrameDefinition[] = [
  { key: 'base_1', name: 'Frame 1', path: 'assets/frames/base 1.png', scale: 4 },
  { key: 'base_2', name: 'Frame 2', path: 'assets/frames/base 2.png', scale: 4 },
  { key: 'base_3', name: 'Frame 3', path: 'assets/frames/base 3.png', scale: 4 },
  { key: 'base_4', name: 'Frame 4', path: 'assets/frames/base 4.png', scale: 4 },
  { key: 'base_5', name: 'Frame 5', path: 'assets/frames/base 5.png', scale: 4 },
  { key: 'base_6', name: 'Frame 6', path: 'assets/frames/base 6.png', scale: 4 },
  { key: 'base_7', name: 'Frame 7', path: 'assets/frames/base 7.png', scale: 4 },
  { key: 'base_8', name: 'Frame 8', path: 'assets/frames/base 8.png', scale: 4 },
  { key: 'base_9', name: 'Frame 9', path: 'assets/frames/base 9.png', scale: 4 },
  { key: 'base_10', name: 'Frame 10', path: 'assets/frames/base 10.png', scale: 4 },
  { key: 'base_11', name: 'Frame 11', path: 'assets/frames/base 11.png', scale: 4 },
  { key: 'base_12', name: 'Frame 12', path: 'assets/frames/base 12.png', scale: 4 },
  { key: 'base_13', name: 'Frame 13', path: 'assets/frames/base 13.png', scale: 4 },
  { key: 'base_14', name: 'Frame 14', path: 'assets/frames/base 14.png', scale: 4 },
  { key: 'base_15', name: 'Frame 15', path: 'assets/frames/base 15.png', scale: 4 },
  { key: 'base_16', name: 'Frame 16', path: 'assets/frames/base 16.png', scale: 4 },
  { key: 'base_17', name: 'Frame 17', path: 'assets/frames/base 17.png', scale: 4 },
  { key: 'base_18', name: 'Frame 18', path: 'assets/frames/base 18.png', scale: 4 },
  { key: 'base_19', name: 'Frame 19', path: 'assets/frames/base 19.png', scale: 4 },
  { key: 'base_20', name: 'Frame 20', path: 'assets/frames/base 20.png', scale: 4 },
  { key: 'base_21', name: 'Frame 21', path: 'assets/frames/base 21.png', scale: 4 },
  { key: 'base_22', name: 'Frame 22', path: 'assets/frames/base 22.png', scale: 4 },
  { key: 'base_23', name: 'Frame 23', path: 'assets/frames/base 23.png', scale: 4 },
  { key: 'base_24', name: 'Frame 24', path: 'assets/frames/base 24.png', scale: 4 },
  { key: 'base_25', name: 'Frame 25', path: 'assets/frames/base 25.png', scale: 4 },
];

/**
 * Get frame definition by key
 */
export function getFrame(key: string): FrameDefinition | undefined {
  return FRAMES.find(frame => frame.key === key);
}

/**
 * Get default scale for a frame
 */
export function getFrameScale(key: string): number {
  return getFrame(key)?.scale || 4;
}
