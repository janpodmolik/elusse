import Phaser from 'phaser';

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
    this.graphics.setDepth(1000); // On top of everything
    this.draw();
    return this.graphics;
  }

  /**
   * Draw the grid lines
   */
  private draw(): void {
    this.graphics.clear();
    this.graphics.lineStyle(1, 0x00ff00, 0.3);

    const gridSize = 100;
    const viewportHeight = Math.max(this.worldHeight, this.scene.scale.height);

    // Vertical lines
    for (let x = 0; x <= this.worldWidth; x += gridSize) {
      this.graphics.beginPath();
      this.graphics.moveTo(x, 0);
      this.graphics.lineTo(x, viewportHeight);
      this.graphics.strokePath();
    }

    // Horizontal lines
    for (let y = 0; y <= viewportHeight; y += gridSize) {
      this.graphics.beginPath();
      this.graphics.moveTo(0, y);
      this.graphics.lineTo(this.worldWidth, y);
      this.graphics.strokePath();
    }

    // Highlight ground level
    const groundY = this.worldHeight - 40;
    this.graphics.lineStyle(2, 0xff0000, 0.6);
    this.graphics.beginPath();
    this.graphics.moveTo(0, groundY);
    this.graphics.lineTo(this.worldWidth, groundY);
    this.graphics.strokePath();
    
    // Ground reference area
    this.graphics.lineStyle(1, 0xff0000, 0.2);
    this.graphics.fillStyle(0xff0000, 0.1);
    this.graphics.fillRect(0, groundY, this.worldWidth, viewportHeight - groundY);
  }

  /**
   * Get graphics instance
   */
  getGraphics(): Phaser.GameObjects.Graphics {
    return this.graphics;
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
