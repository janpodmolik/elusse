import Phaser from 'phaser';
import type { MapConfig } from '../../data/mapConfig';
import { setGameWorldDimensions, setGameCameraInfo } from '../../stores/gameStores';

/**
 * GameCameraController - Manages camera behavior for GameScene
 * 
 * Handles camera bounds, zoom, player following, and resize adaptation.
 * Ensures full world height is always visible with appropriate zoom.
 * 
 * @responsibilities
 * - Setting up camera bounds with zoom adjustment
 * - Following player with configurable lerp
 * - Handling viewport resize
 * - Updating camera info for UI overlays
 */
export class GameCameraController {
  private scene: Phaser.Scene;
  private mapConfig: MapConfig | null = null;
  
  /** Camera follow lerp values (0-1, lower = smoother) */
  private static readonly FOLLOW_LERP_X = 0.1;
  private static readonly FOLLOW_LERP_Y = 0.1;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Set map configuration for bounds calculation.
   */
  public setConfig(config: MapConfig): void {
    this.mapConfig = config;
  }

  /**
   * Start following a game object (player).
   * 
   * @param target - The game object to follow
   * @param roundPixels - Whether to round pixel positions (default true)
   */
  public followPlayer(target: Phaser.GameObjects.GameObject, roundPixels: boolean = true): void {
    const camera = this.scene.cameras.main;
    camera.startFollow(
      target, 
      roundPixels, 
      GameCameraController.FOLLOW_LERP_X, 
      GameCameraController.FOLLOW_LERP_Y
    );
  }

  /**
   * Setup camera bounds with zoom adjustment to always show full world height.
   * Calculates appropriate zoom level and centers the viewport if needed.
   */
  public setupBounds(): void {
    if (!this.mapConfig) {
      console.warn('[GameCameraController] Cannot setup bounds: no config set');
      return;
    }

    const camera = this.scene.cameras.main;
    const viewportHeight = camera.height;
    const viewportWidth = camera.width;
    
    // Calculate zoom to ensure full world height is always visible
    // If viewport is shorter than world, we need to zoom out
    const zoomToFitHeight = viewportHeight / this.mapConfig.worldHeight;
    const zoom = Math.min(1, zoomToFitHeight); // Never zoom in beyond 1x
    
    camera.setZoom(zoom);
    
    // Effective viewport size after zoom
    const effectiveViewportHeight = viewportHeight / zoom;
    const effectiveViewportWidth = viewportWidth / zoom;
    
    // Calculate bounds - allow negative values to center when viewport > world
    let boundsY = 0;
    let boundsHeight = this.mapConfig.worldHeight;
    
    if (effectiveViewportHeight > this.mapConfig.worldHeight) {
      // Viewport is taller than world - center vertically
      boundsY = (this.mapConfig.worldHeight - effectiveViewportHeight) / 2;
      boundsHeight = effectiveViewportHeight;
    }
    
    // Similarly for X axis
    let boundsX = 0;
    let boundsWidth = this.mapConfig.worldWidth;
    
    if (effectiveViewportWidth > this.mapConfig.worldWidth) {
      boundsX = (this.mapConfig.worldWidth - effectiveViewportWidth) / 2;
      boundsWidth = effectiveViewportWidth;
    }
    
    camera.setBounds(boundsX, boundsY, boundsWidth, boundsHeight);
    
    // Update game world dimensions for UI overlay
    setGameWorldDimensions(
      this.mapConfig.worldWidth,
      this.mapConfig.worldHeight,
      viewportWidth,
      viewportHeight,
      zoom
    );
  }

  /**
   * Handle viewport resize.
   * Recalculates camera bounds and zoom.
   */
  public handleResize(): void {
    // Guard: only handle resize when camera exists
    if (!this.scene.cameras?.main || !this.mapConfig) return;
    
    this.setupBounds();
  }

  /**
   * Update camera info for UI overlays.
   * Should be called every frame in update().
   */
  public updateCameraInfo(): void {
    const camera = this.scene.cameras.main;
    setGameCameraInfo(camera.scrollX, camera.scrollY, camera.zoom);
  }

  /**
   * Get current camera.
   */
  public getCamera(): Phaser.Cameras.Scene2D.Camera {
    return this.scene.cameras.main;
  }

  /**
   * Get current zoom level.
   */
  public getZoom(): number {
    return this.scene.cameras.main.zoom;
  }

  /**
   * Get camera scroll position.
   */
  public getScrollPosition(): { scrollX: number; scrollY: number } {
    const camera = this.scene.cameras.main;
    return { scrollX: camera.scrollX, scrollY: camera.scrollY };
  }
}
