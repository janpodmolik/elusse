import Phaser from 'phaser';
import { updatePlayerPosition, builderEditMode } from '../../stores/builderStores';
import { setupSpriteInteraction } from '../../utils/spriteInteraction';
import {
  PLAYER_SPRITE,
  getPlayerGroundY,
  isPlayerBelowGround,
} from '../../constants/playerConstants';
import {
  DRAG_MARGIN_HORIZONTAL,
  DRAG_MARGIN_TOP,
  DRAG_TINT
} from './builderConstants';

/**
 * BuilderPlayerController - Manages player sprite and interactions in builder mode
 * 
 * Uses shared spriteInteraction utility for consistent behavior with frames and assets.
 */
export class BuilderPlayerController {
  private scene: Phaser.Scene;
  private player!: Phaser.GameObjects.Sprite;
  private worldWidth: number;
  private worldHeight: number;
  private unsubscribers: Array<() => void> = [];
  private interactionCleanup: (() => void) | null = null;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  /**
   * Create and setup player sprite
   */
  create(startX: number, startY: number): Phaser.GameObjects.Sprite {
    // Ensure player starts on ground, not floating or underground
    const safeY = Math.min(startY, getPlayerGroundY(this.worldHeight));
    
    this.player = this.scene.add.sprite(startX, safeY, 'cat-idle-white', 0);
    this.player.setScale(PLAYER_SPRITE.SCALE);
    this.player.setDepth(PLAYER_SPRITE.DEPTH);

    // Store player sprite in scene data for camera controller access
    this.scene.data.set('playerSprite', this.player);

    this.setupInteraction();
    this.setupEditModeSubscription();

    return this.player;
  }
  
  /**
   * Setup interaction using shared utility
   */
  private setupInteraction(): void {
    // Use smaller hit area to avoid overlapping with nearby items
    // Sprite is 48x48 pixels - use central 32x40 area for interaction
    const hitArea = new Phaser.Geom.Rectangle(8, 4, 32, 40);
    
    this.interactionCleanup = setupSpriteInteraction({
      sprite: this.player,
      scene: this.scene,
      useGridSnapping: false, // Player doesn't use grid snapping
      cursor: 'grab',
      hitArea, // Custom hit area for better interaction
      constraints: {
        minX: DRAG_MARGIN_HORIZONTAL,
        maxX: this.worldWidth - DRAG_MARGIN_HORIZONTAL,
        minY: DRAG_MARGIN_TOP,
        // No maxY constraint - allow dragging below ground, will snap back in onDragEnd
      },
      callbacks: {
        onDragStart: () => {
          this.player.setTint(DRAG_TINT);
          this.scene.data.set('isDraggingObject', true);
        },
        onDrag: (x, y) => {
          updatePlayerPosition(Math.round(x), Math.round(y));
        },
        onDragEnd: (_x, _y) => {
          this.player.clearTint();
          this.scene.data.set('isDraggingObject', false);
          
          // Check if player is below ground line and correct if needed
          let finalY = this.player.y;
          
          if (isPlayerBelowGround(this.player.y, this.worldHeight)) {
            // Teleport player so feet are on ground level
            finalY = getPlayerGroundY(this.worldHeight);
            this.player.setY(finalY);
          }
          
          updatePlayerPosition(
            Math.round(this.player.x),
            Math.round(finalY)
          );
        }
      }
    });
  }
  
  /**
   * Subscribe to edit mode changes to enable/disable player interaction
   */
  private setupEditModeSubscription(): void {
    const unsubscribe = builderEditMode.subscribe(mode => {
      if (mode === 'dialogs') {
        // Disable player interaction and make semi-transparent
        if (this.interactionCleanup) {
          this.interactionCleanup();
          this.interactionCleanup = null;
        }
        this.player.disableInteractive();
        this.player.setAlpha(0.6);
      } else {
        // Re-enable in items/frames mode and restore opacity
        this.player.setAlpha(1);
        if (!this.interactionCleanup) {
          this.setupInteraction();
        }
      }
    });
    this.unsubscribers.push(unsubscribe);
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
    
    // Cleanup interaction
    if (this.interactionCleanup) {
      this.interactionCleanup();
      this.interactionCleanup = null;
    }
    
    if (this.player) {
      this.player.destroy();
    }
  }
}
