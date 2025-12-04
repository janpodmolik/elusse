import Phaser from 'phaser';
import {
  GRID_SIZE,
  GRID_LINE_COLOR,
  GRID_LINE_ALPHA,
  GRID_LINE_WIDTH,
  GROUND_HEIGHT,
  GROUND_LINE_COLOR,
  GROUND_LINE_WIDTH,
  GROUND_LINE_ALPHA,
  GROUND_AREA_ALPHA,
  GROUND_AREA_LINE_WIDTH,
  GROUND_AREA_LINE_ALPHA,
  OVERLAY_DEPTH
} from './builderConstants';
import { backgroundManager } from '../../data/background';

/**
 * BuilderGridOverlay - Manages grid visualization for builder mode
 */
export class BuilderGridOverlay {
  private scene: Phaser.Scene;
  private graphics!: Phaser.GameObjects.Graphics;
  private worldWidth: number;
  private worldHeight: number;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  /**
   * Create and draw grid overlay
   */
  create(): Phaser.GameObjects.Graphics {
    this.graphics = this.scene.add.graphics();
    this.graphics.setDepth(OVERLAY_DEPTH);
    this.draw();
    return this.graphics;
  }

  /**
   * Draw the grid lines
   */
  private draw(): void {
    this.graphics.clear();
    this.graphics.lineStyle(GRID_LINE_WIDTH, GRID_LINE_COLOR, GRID_LINE_ALPHA);

    const viewportHeight = Math.max(this.worldHeight, this.scene.scale.height);

    // Vertical lines
    for (let x = 0; x <= this.worldWidth; x += GRID_SIZE) {
      this.graphics.beginPath();
      this.graphics.moveTo(x, 0);
      this.graphics.lineTo(x, viewportHeight);
      this.graphics.strokePath();
    }

    // Horizontal lines
    for (let y = 0; y <= viewportHeight; y += GRID_SIZE) {
      this.graphics.beginPath();
      this.graphics.moveTo(0, y);
      this.graphics.lineTo(this.worldWidth, y);
      this.graphics.strokePath();
    }

    // Highlight ground level
    const groundHeight = backgroundManager.getCurrentConfig().groundHeight ?? GROUND_HEIGHT;
    const groundY = this.worldHeight - groundHeight;
    this.graphics.lineStyle(GROUND_LINE_WIDTH, GROUND_LINE_COLOR, GROUND_LINE_ALPHA);
    this.graphics.beginPath();
    this.graphics.moveTo(0, groundY);
    this.graphics.lineTo(this.worldWidth, groundY);
    this.graphics.strokePath();
    
    // Ground reference area
    this.graphics.lineStyle(GROUND_AREA_LINE_WIDTH, GROUND_LINE_COLOR, GROUND_AREA_LINE_ALPHA);
    this.graphics.fillStyle(GROUND_LINE_COLOR, GROUND_AREA_ALPHA);
    this.graphics.fillRect(0, groundY, this.worldWidth, viewportHeight - groundY);
  }

  /**
   * Get graphics instance
   */
  getGraphics(): Phaser.GameObjects.Graphics {
    return this.graphics;
  }

  /**
   * Redraw grid (useful after resize)
   */
  redraw(): void {
    this.draw();
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
    }
  }
}
