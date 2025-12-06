/**
 * Game State Stores
 * Game specific state like camera, world dimensions, etc.
 */
import { writable } from 'svelte/store';

// ==================== Game Frame ====================

/** Current game frame border color */
export const gameFrameColor = writable<string>('#2a1a0a');

/** Whether the game frame is visible */
export const gameFrameVisible = writable<boolean>(true);

// ==================== Player Screen Position ====================

/** Player's screen position (for UI positioning like dialog bubbles) */
export const playerScreenPosition = writable<{ x: number; y: number }>({ x: 0, y: 0 });

/** Update player screen position (called from GameScene update) */
export function setPlayerScreenPosition(x: number, y: number): void {
  playerScreenPosition.set({ x, y });
}

// ==================== Game Camera Info ====================

/** Game camera info for Svelte overlays */
export const gameCameraInfo = writable<{ scrollX: number; scrollY: number; zoom: number }>({ 
  scrollX: 0, 
  scrollY: 0, 
  zoom: 1 
});

/** Update game camera info (called from GameScene update) */
export function setGameCameraInfo(scrollX: number, scrollY: number, zoom: number = 1): void {
  gameCameraInfo.set({ scrollX, scrollY, zoom });
}

// ==================== Game World Dimensions ====================

/** Game world dimensions for frame overlay positioning */
export const gameWorldDimensions = writable<{ 
  worldWidth: number; 
  worldHeight: number;
  offsetX: number;
  offsetY: number;
}>({ 
  worldWidth: 640, 
  worldHeight: 640,
  offsetX: 0,
  offsetY: 0
});

/** Update game world dimensions (called from GameScene on create and resize) */
export function setGameWorldDimensions(
  worldWidth: number, 
  worldHeight: number, 
  viewportWidth: number, 
  viewportHeight: number,
  zoom: number = 1
): void {
  // Calculate scaled world size
  const scaledWorldWidth = worldWidth * zoom;
  const scaledWorldHeight = worldHeight * zoom;
  
  // Calculate offset when viewport is larger than scaled world
  const offsetX = Math.max(0, (viewportWidth - scaledWorldWidth) / 2);
  const offsetY = Math.max(0, (viewportHeight - scaledWorldHeight) / 2);
  
  gameWorldDimensions.set({ 
    worldWidth: scaledWorldWidth, 
    worldHeight: scaledWorldHeight, 
    offsetX, 
    offsetY 
  });
}

// ==================== Frame Click Blocking ====================

/** 
 * Flag to block player input when frame link is clicked
 * Prevents jump loop when window loses focus during redirect
 */
export const frameClickBlocked = writable<boolean>(false);

/** Block player input temporarily (called when frame with URL is clicked) */
export function blockFrameClick(): void {
  frameClickBlocked.set(true);
  // Auto-reset after short delay
  setTimeout(() => frameClickBlocked.set(false), 150);
}

// ==================== Builder Camera Info ====================

/** Current builder camera zoom level (minZoom = fit-to-screen, 1 = 1:1 pixels) */
export const builderZoomLevel = writable<number>(1);

/** Set zoom level (called from BuilderCameraController) */
export function setBuilderZoomLevel(level: number): void {
  builderZoomLevel.set(level);
}

export interface CameraInfo {
  scrollX: number;
  scrollY: number;
  viewWidth: number;
  viewHeight: number;
  worldWidth: number;
  worldHeight: number;
  zoom: number;
  playerX: number;
  playerY: number;
}

/** Camera state for minimap rendering */
export const builderCameraInfo = writable<CameraInfo>({
  scrollX: 0,
  scrollY: 0,
  viewWidth: 0,
  viewHeight: 0,
  worldWidth: 0,
  worldHeight: 0,
  zoom: 1,
  playerX: 0,
  playerY: 0,
});

/** Update camera info (called from BuilderScene on each frame) */
export function updateCameraInfo(info: Partial<CameraInfo>): void {
  builderCameraInfo.update(state => ({ ...state, ...info }));
}
