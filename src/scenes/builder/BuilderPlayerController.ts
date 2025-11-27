import Phaser from 'phaser';
import { updatePlayerPosition, builderEditMode } from '../../stores/builderStores';
import {
  GROUND_HEIGHT,
  PLAYER_SPRITE_FRAME_HEIGHT,
  PLAYER_SCALE,
  PLAYER_DEPTH,
  DRAG_MARGIN_HORIZONTAL,
  DRAG_MARGIN_TOP,
  DRAG_MARGIN_BOTTOM,
  DRAG_TINT
} from './builderConstants';

/**
 * BuilderPlayerController - Manages player sprite and interactions in builder mode
 */
export class BuilderPlayerController {
  private scene: Phaser.Scene;
  private player!: Phaser.GameObjects.Sprite;
  private worldWidth: number;
  private worldHeight: number;
  private groundY: number;
  private unsubscribers: Array<() => void> = [];

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.groundY = worldHeight - GROUND_HEIGHT;
  }

  /**
   * Create and setup player sprite
   */
  create(startX: number, startY: number): Phaser.GameObjects.Sprite {
    this.player = this.scene.add.sprite(startX, startY, 'cat-idle-white', 0);
    this.player.setScale(PLAYER_SCALE);
    this.player.setDepth(PLAYER_DEPTH);
    
    // Use smaller hit area to avoid overlapping with nearby items
    // Sprite is 48x48 pixels - use central 32x40 area for interaction
    const hitArea = new Phaser.Geom.Rectangle(8, 4, 32, 40);
    this.player.setInteractive({
      hitArea,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      draggable: true,
      cursor: 'grab'
    });

    // Store player sprite in scene data for camera controller access
    this.scene.data.set('playerSprite', this.player);

    this.setupDragHandlers();
    this.setupEditModeSubscription();

    return this.player;
  }
  
  /**
   * Subscribe to edit mode changes to enable/disable player interaction
   */
  private setupEditModeSubscription(): void {
    const unsubscribe = builderEditMode.subscribe(mode => {
      if (mode === 'dialogs') {
        // Disable player interaction and make semi-transparent
        this.player.disableInteractive();
        this.player.setAlpha(0.6);
      } else {
        // Re-enable in items mode and restore opacity
        const hitArea = new Phaser.Geom.Rectangle(8, 4, 32, 40);
        this.player.setInteractive({
          hitArea,
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          draggable: true,
          cursor: 'grab'
        });
        this.player.setAlpha(1);
      }
    });
    this.unsubscribers.push(unsubscribe);
  }

  private setupDragHandlers(): void {
    this.player.on('dragstart', () => {
      this.player.setTint(DRAG_TINT);
      this.scene.data.set('isDraggingObject', true);
    });
    
    this.player.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // Constrain to world bounds (allow dragging below ground to test placement)
      const x = Phaser.Math.Clamp(dragX, DRAG_MARGIN_HORIZONTAL, this.worldWidth - DRAG_MARGIN_HORIZONTAL);
      const y = Phaser.Math.Clamp(dragY, DRAG_MARGIN_TOP, this.worldHeight - DRAG_MARGIN_BOTTOM);
      
      this.player.setPosition(x, y);
      updatePlayerPosition(Math.round(x), Math.round(y));
    });
    
    this.player.on('dragend', () => {
      this.player.clearTint();
      this.scene.data.set('isDraggingObject', false);
      
      // Check if player is below ground line (red line)
      let finalY = this.player.y;
      
      // Calculate player's bottom position
      const spriteHeight = PLAYER_SPRITE_FRAME_HEIGHT * PLAYER_SCALE;
      const playerBottom = this.player.y + (spriteHeight / 2); // origin is at center
      
      if (playerBottom > this.groundY) {
        // Teleport player so feet are on ground level
        // Position = groundY - half sprite height (to align bottom with groundY)
        finalY = this.groundY - (spriteHeight / 2);
        this.player.setY(finalY);
      }
      
      updatePlayerPosition(
        Math.round(this.player.x),
        Math.round(finalY)
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
    // Unsubscribe from stores
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    
    if (this.player) {
      this.player.destroy();
    }
  }
}
