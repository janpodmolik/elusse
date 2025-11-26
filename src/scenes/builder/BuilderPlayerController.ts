import Phaser from 'phaser';
import { updatePlayerPosition } from '../../stores/builderStores';

/**
 * BuilderPlayerController - Manages player sprite and interactions in builder mode
 */
export class BuilderPlayerController {
  private scene: Phaser.Scene;
  private player!: Phaser.GameObjects.Sprite;
  private worldWidth: number;
  private worldHeight: number;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  /**
   * Create and setup player sprite
   */
  create(startX: number, startY: number): Phaser.GameObjects.Sprite {
    this.player = this.scene.add.sprite(startX, startY, 'cat-idle-orange', 0);
    this.player.setScale(5);
    this.player.setDepth(10);
    this.player.setInteractive({ draggable: true, cursor: 'grab' });

    this.setupDragHandlers();

    return this.player;
  }

  private setupDragHandlers(): void {
    this.player.on('dragstart', () => {
      this.player.setTint(0x00ff00);
      this.scene.data.set('isDraggingObject', true);
    });
    
    this.player.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // Constrain to world bounds
      const x = Phaser.Math.Clamp(dragX, 50, this.worldWidth - 50);
      const y = Phaser.Math.Clamp(dragY, 50, this.worldHeight - 50);
      
      this.player.setPosition(x, y);
      updatePlayerPosition(Math.round(x), Math.round(y));
    });
    
    this.player.on('dragend', () => {
      this.player.clearTint();
      this.scene.data.set('isDraggingObject', false);
      
      updatePlayerPosition(
        Math.round(this.player.x),
        Math.round(this.player.y)
      );
    });
  }

  /**
   * Get player sprite instance
   */
  getSprite(): Phaser.GameObjects.Sprite {
    return this.player;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.player) {
      this.player.destroy();
    }
  }
}
