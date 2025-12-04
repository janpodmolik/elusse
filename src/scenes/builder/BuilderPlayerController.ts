import Phaser from 'phaser';
import { updatePlayerPosition, builderEditMode, selectPlayer, isPlayerSelected } from '../../stores/builderStores';
import { setupSpriteInteraction } from '../../utils/spriteInteraction';
import { get } from 'svelte/store';
import { skinManager, getSkinScale, AVAILABLE_SKINS } from '../../data/skinConfig';
import {
  PLAYER_SPRITE,
  MODULAR_PLAYER_SIZE,
  getPlayerGroundY,
  getModularPlayerGroundY,
  isPlayerBelowGround,
  isModularPlayerBelowGround,
  STATIC_SELECTION_RATIOS,
} from '../../constants/playerConstants';
import { SELECTION_COLORS } from '../../constants/colors';
import {
  DRAG_MARGIN_HORIZONTAL,
  DRAG_MARGIN_TOP,
  DRAG_TINT,
  DEBUG_HIT_AREAS,
  DEBUG_HIT_AREA_COLOR,
  DEBUG_HIT_AREA_ALPHA,
  DEBUG_HIT_AREA_STROKE_WIDTH,
  DEBUG_HIT_AREA_STROKE_ALPHA,
} from './builderConstants';
import { type ModularCharacterSelection } from '../../data/modularConfig';
import { getSavedCharacterSelection } from '../ModularPlayer';
import {
  preloadModularCharacter,
  MODULAR_SCALE,
} from '../shared/ModularCharacterBuilder';
import { ModularCharacterVisual } from '../../entities/ModularCharacterVisual';

// Selection highlight color - Green for player (from centralized colors)
const SELECTION_TINT = SELECTION_COLORS.PLAYER.hex;

/**
 * BuilderPlayerController - Manages player sprite and interactions in builder mode
 * 
 * Supports both static skins (succubus) and modular characters.
 * Uses unified setupSpriteInteraction for consistent behavior.
 */
export class BuilderPlayerController {
  private scene: Phaser.Scene;
  private player!: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container;
  private modularCharacter: ModularCharacterVisual | null = null;
  private worldWidth: number;
  private worldHeight: number;
  private unsubscribers: Array<() => void> = [];
  private interactionCleanup: (() => void) | null = null;
  private useModular: boolean = false;
  private modularSelection: ModularCharacterSelection | null = null;
  private debugGraphics: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    
    // Check if we should use modular player
    const useModularSetting = localStorage.getItem('useModularPlayer');
    this.modularSelection = getSavedCharacterSelection();
    this.useModular = useModularSetting === 'true' && this.modularSelection !== null;
  }

  /**
   * Preload modular character textures
   */
  async preload(): Promise<void> {
    if (!this.useModular || !this.modularSelection) return;
    await preloadModularCharacter(this.scene, this.modularSelection);
  }

  /**
   * Create and setup player sprite
   */
  create(startX: number, startY: number): Phaser.GameObjects.Sprite | Phaser.GameObjects.Container {
    if (this.useModular && this.modularSelection) {
      // Use modular-specific ground calculation from the start
      const modularGroundY = getModularPlayerGroundY(this.worldHeight);
      const safeY = Math.min(startY, modularGroundY);
      return this.createModularPlayer(startX, safeY);
    } else {
      // Use static player ground calculation
      const safeY = Math.min(startY, getPlayerGroundY(this.worldHeight));
      return this.createStaticPlayer(startX, safeY);
    }
  }
  
  /**
   * Create static (legacy) player sprite
   */
  private createStaticPlayer(startX: number, startY: number): Phaser.GameObjects.Sprite {
    const skinId = skinManager.getSkinId();
    const skin = AVAILABLE_SKINS.find(s => s.id === skinId) ?? AVAILABLE_SKINS[0];
    const scale = getSkinScale(skin);
    
    const sprite = this.scene.add.sprite(startX, startY, `${skinId}-idle`, 0);
    sprite.setScale(scale);
    sprite.setDepth(PLAYER_SPRITE.DEPTH);
    sprite.setData('isPlayer', true);
    
    this.player = sprite;
    this.scene.data.set('playerSprite', this.player);

    this.setupInteraction();
    this.setupEditModeSubscription();
    this.setupSelectionSubscription();

    return sprite;
  }
  
  /**
   * Create modular character player using shared builder
   */
  private createModularPlayer(startX: number, startY: number): Phaser.GameObjects.Container {
    // Y position is already calculated correctly by create() using getModularPlayerGroundY()
    // No need to recalculate here
    
    // Use shared builder - static display, facing right
    this.modularCharacter = new ModularCharacterVisual(
      this.scene,
      startX,
      startY,
      this.modularSelection!,
      {
        animated: false,
        facing: 'right',
        scale: MODULAR_SCALE,
      }
    );
    
    const container = this.modularCharacter;
    container.setDepth(PLAYER_SPRITE.DEPTH);
    container.setData('isPlayer', true);
    
    this.player = container;
    this.scene.data.set('playerSprite', this.player);

    this.setupInteraction();
    this.setupEditModeSubscription();
    this.setupSelectionSubscription();

    return container;
  }
  
  /**
   * Unified interaction setup for both sprite and container
   * Uses setupSpriteInteraction utility for consistent behavior
   */
  private setupInteraction(): void {
    // Calculate hit area based on player type
    let hitArea: Phaser.Geom.Rectangle;
    
    if (this.useModular && this.modularCharacter) {
      // For containers, hit area must be relative to container position (0,0)
      // Containers ALWAYS have origin at (0,0), unlike sprites which can have center origin
      // Our sprites inside are centered, so we need to offset the hit area
      hitArea = new Phaser.Geom.Rectangle(
        -MODULAR_PLAYER_SIZE.FRAME_WIDTH / 2,
        -MODULAR_PLAYER_SIZE.FRAME_HEIGHT / 2,
        MODULAR_PLAYER_SIZE.FRAME_WIDTH,
        MODULAR_PLAYER_SIZE.FRAME_HEIGHT
      );
      
      // DON'T call setSize() - it overrides our custom hit area!
      // Just use the custom hit area in setInteractive()
      
      // Store hit area for debug visualization
      this.scene.data.set('modularPlayerHitArea', hitArea);
    } else {
      // For static sprite: hit area based on frame dimensions
      const skinId = skinManager.getSkinId();
      const skin = AVAILABLE_SKINS.find(s => s.id === skinId) ?? AVAILABLE_SKINS[0];
      const frameWidth = skin.frameWidth ?? 48;
      const frameHeight = skin.frameHeight ?? 48;
      const selectionWidth = frameWidth * STATIC_SELECTION_RATIOS.WIDTH;
      const offsetX = (frameWidth - selectionWidth) / 2;
      hitArea = new Phaser.Geom.Rectangle(offsetX, 0, selectionWidth, frameHeight);
    }
    
    this.interactionCleanup = setupSpriteInteraction({
      sprite: this.player,
      scene: this.scene,
      useGridSnapping: false,
      cursor: 'grab',
      hitArea,
      constraints: {
        minX: DRAG_MARGIN_HORIZONTAL,
        maxX: this.worldWidth - DRAG_MARGIN_HORIZONTAL,
        minY: DRAG_MARGIN_TOP,
      },
      callbacks: {
        onSelect: () => {
          selectPlayer(true);
        },
        isSelected: () => {
          return get(isPlayerSelected);
        },
        onDragStart: () => {
          this.applyTint(DRAG_TINT);
          this.scene.data.set('isDraggingObject', true);
        },
        onDrag: (x, y) => {
          updatePlayerPosition(Math.round(x), Math.round(y));
          // Update debug visualization position
          this.updateDebugVisualization();
        },
        onDragEnd: (_x, _y) => {
          this.updateSelectionVisual(get(isPlayerSelected));
          this.scene.data.set('isDraggingObject', false);
          
          let finalY = this.player.y;
          
          // Use type-specific ground check
          if (this.useModular) {
            if (isModularPlayerBelowGround(this.player.y, this.worldHeight)) {
              finalY = getModularPlayerGroundY(this.worldHeight);
              this.player.setY(finalY);
            }
          } else {
            if (isPlayerBelowGround(this.player.y, this.worldHeight)) {
              finalY = getPlayerGroundY(this.worldHeight);
              this.player.setY(finalY);
            }
          }
          
          updatePlayerPosition(Math.round(this.player.x), Math.round(finalY));
          // Update debug visualization after snap
          this.updateDebugVisualization();
        }
      }
    });
    
    // Setup debug hit area visualization
    if (DEBUG_HIT_AREAS) {
      this.createDebugVisualization();
    }
  }
  
  /**
   * Create debug graphics for hit area visualization
   */
  private createDebugVisualization(): void {
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
    }
    
    this.debugGraphics = this.scene.add.graphics();
    this.debugGraphics.setDepth(PLAYER_SPRITE.DEPTH + 1);
    this.updateDebugVisualization();
  }
  
  /**
   * Update debug hit area visualization to match player position
   */
  private updateDebugVisualization(): void {
    if (!this.debugGraphics || !DEBUG_HIT_AREAS) return;
    
    this.debugGraphics.clear();
    
    let bounds: { x: number; y: number; width: number; height: number };
    
    if (this.useModular && this.modularCharacter) {
      bounds = this.modularCharacter.getHitBounds();
      
      // Draw visual bounds in GREEN
      this.debugGraphics.fillStyle(0x00ff00, 0.2);
      this.debugGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      this.debugGraphics.lineStyle(3, 0x00ff00, 0.8);
      this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // Get the actual interactive hit area from container
      const container = this.player as Phaser.GameObjects.Container;
      const hitArea = this.scene.data.get('modularPlayerHitArea') as Phaser.Geom.Rectangle;
      
      if (hitArea && container.input) {
        // Calculate world position of interactive hit area
        // Hit area coordinates are relative to container position
        const scale = container.scaleX;
        const interactiveBounds = {
          x: container.x + (hitArea.x * scale),
          y: container.y + (hitArea.y * scale),
          width: hitArea.width * scale,
          height: hitArea.height * scale,
        };
        
        // Draw interactive area in RED
        this.debugGraphics.fillStyle(0xff0000, 0.3);
        this.debugGraphics.fillRect(interactiveBounds.x, interactiveBounds.y, interactiveBounds.width, interactiveBounds.height);
        this.debugGraphics.lineStyle(3, 0xff0000, 1.0);
        this.debugGraphics.strokeRect(interactiveBounds.x, interactiveBounds.y, interactiveBounds.width, interactiveBounds.height);
      }
    } else {
      // Calculate bounds for static sprite
      // Static sprites have origin (0, 0) at top-left by default in Phaser
      // But we need to account for the actual origin the sprite is using
      const sprite = this.player as Phaser.GameObjects.Sprite;
      const skinId = skinManager.getSkinId();
      const skin = AVAILABLE_SKINS.find(s => s.id === skinId) ?? AVAILABLE_SKINS[0];
      const scale = getSkinScale(skin);
      const frameWidth = (skin.frameWidth ?? 48) * scale;
      const frameHeight = (skin.frameHeight ?? 48) * scale;
      const selectionWidth = frameWidth * STATIC_SELECTION_RATIOS.WIDTH;
      const offsetX = (frameWidth - selectionWidth) / 2;
      
      // Account for sprite origin (default is 0.5, 0.5 in Phaser for sprites)
      const originX = sprite.originX ?? 0.5;
      const originY = sprite.originY ?? 0.5;
      
      bounds = {
        x: sprite.x - (frameWidth * originX) + offsetX,
        y: sprite.y - (frameHeight * originY),
        width: selectionWidth,
        height: frameHeight,
      };
      
      // Draw filled area with transparency
      this.debugGraphics.fillStyle(DEBUG_HIT_AREA_COLOR, DEBUG_HIT_AREA_ALPHA);
      this.debugGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // Draw stroke
      this.debugGraphics.lineStyle(DEBUG_HIT_AREA_STROKE_WIDTH, DEBUG_HIT_AREA_COLOR, DEBUG_HIT_AREA_STROKE_ALPHA);
      this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }
  
  /**
   * Subscribe to selection changes to show visual feedback
   */
  private setupSelectionSubscription(): void {
    const unsubscribe = isPlayerSelected.subscribe(selected => {
      this.updateSelectionVisual(selected);
      // Sync to scene data for camera controller
      this.scene.data.set('isPlayerSelected', selected);
    });
    this.unsubscribers.push(unsubscribe);
  }
  
  /**
   * Update visual selection state
   */
  private updateSelectionVisual(selected: boolean): void {
    if (!this.player) return;
    
    if (this.modularCharacter) {
      if (selected) {
        this.modularCharacter.setTint(SELECTION_TINT);
      } else {
        this.modularCharacter.clearTint();
      }
    } else {
      const sprite = this.player as Phaser.GameObjects.Sprite;
      if (selected) {
        sprite.setTint(SELECTION_TINT);
      } else {
        sprite.clearTint();
      }
    }
  }
  
  /**
   * Apply tint to player (for drag feedback)
   */
  private applyTint(tint: number): void {
    if (this.modularCharacter) {
      this.modularCharacter.setTint(tint);
    } else {
      (this.player as Phaser.GameObjects.Sprite).setTint(tint);
    }
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
        this.setAlpha(0.6);
      } else {
        // Re-enable in items/frames mode and restore opacity
        this.setAlpha(1);
        if (!this.interactionCleanup) {
          this.setupInteraction();
        }
      }
    });
    this.unsubscribers.push(unsubscribe);
  }
  
  /**
   * Set alpha on player
   */
  private setAlpha(alpha: number): void {
    if (this.modularCharacter) {
      this.modularCharacter.setAlpha(alpha);
    } else {
      this.player.setAlpha(alpha);
    }
  }

  /**
   * Get player sprite/container instance
   */
  getSprite(): Phaser.GameObjects.Sprite | Phaser.GameObjects.Container {
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
    
    // Cleanup debug graphics
    if (this.debugGraphics) {
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
    
    // Cleanup modular character or static player
    if (this.modularCharacter) {
      this.modularCharacter.destroy();
      this.modularCharacter = null;
    } else if (this.player) {
      this.player.destroy();
    }
  }
}
