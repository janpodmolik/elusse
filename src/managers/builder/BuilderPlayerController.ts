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
  GROUND_HEIGHT,
} from '../../constants/playerConstants';
import { backgroundManager } from '../../data/background';
import {
  DRAG_MARGIN_HORIZONTAL,
  DRAG_MARGIN_TOP,
  DEBUG_HIT_AREAS,
  DEBUG_HIT_AREA_COLOR,
  DEBUG_HIT_AREA_ALPHA,
  DEBUG_HIT_AREA_STROKE_WIDTH,
  DEBUG_HIT_AREA_STROKE_ALPHA,
  SELECTED_HIT_AREA_ALPHA,
  SELECTED_HIT_AREA_STROKE_WIDTH,
  SELECTED_HIT_AREA_STROKE_ALPHA,
} from './builderConstants';
import { type ModularCharacterSelection } from '../../data/modularConfig';
import { getSavedCharacterSelection } from '../../data/CharacterStorage';
import {
  preloadModularCharacter,
  MODULAR_SCALE,
} from '../../utils/ModularCharacterBuilder';
import { ModularCharacterVisual } from '../../entities/ModularCharacterVisual';

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
  private isSelected: boolean = false;

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
    const groundHeight = backgroundManager.getCurrentConfig().groundHeight ?? GROUND_HEIGHT;

    if (this.useModular && this.modularSelection) {
      // Use modular-specific ground calculation from the start
      const modularGroundY = getModularPlayerGroundY(this.worldHeight, groundHeight);
      const safeY = Math.min(startY, modularGroundY);
      return this.createModularPlayer(startX, safeY);
    } else {
      // Use static player ground calculation
      const safeY = Math.min(startY, getPlayerGroundY(this.worldHeight, groundHeight));
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
          this.scene.data.set('isDraggingObject', true);
        },
        onDrag: (x, y) => {
          updatePlayerPosition(Math.round(x), Math.round(y));
          // Update debug visualization position
          this.updateDebugVisualization();
        },
        onDragEnd: (_x, _y) => {
          this.scene.data.set('isDraggingObject', false);
          
          let finalY = this.player.y;
          const groundHeight = backgroundManager.getCurrentConfig().groundHeight ?? GROUND_HEIGHT;
          
          // Use type-specific ground check
          if (this.useModular) {
            if (isModularPlayerBelowGround(this.player.y, this.worldHeight, groundHeight)) {
              finalY = getModularPlayerGroundY(this.worldHeight, groundHeight);
              this.player.setY(finalY);
            }
          } else {
            if (isPlayerBelowGround(this.player.y, this.worldHeight, groundHeight)) {
              finalY = getPlayerGroundY(this.worldHeight, groundHeight);
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
    
    // Determine style based on selection state
    const alpha = this.isSelected ? SELECTED_HIT_AREA_ALPHA : DEBUG_HIT_AREA_ALPHA;
    const strokeWidth = this.isSelected ? SELECTED_HIT_AREA_STROKE_WIDTH : DEBUG_HIT_AREA_STROKE_WIDTH;
    const strokeAlpha = this.isSelected ? SELECTED_HIT_AREA_STROKE_ALPHA : DEBUG_HIT_AREA_STROKE_ALPHA;
    
    let bounds: { x: number; y: number; width: number; height: number } | null = null;
    
    if (this.useModular && this.modularCharacter) {
      // Get the actual interactive hit area from container
      const container = this.player as Phaser.GameObjects.Container;
      const hitArea = this.scene.data.get('modularPlayerHitArea') as Phaser.Geom.Rectangle;
      
      if (hitArea && container.input) {
        // Calculate world position of interactive hit area
        // Hit area coordinates are relative to container position
        const scale = container.scaleX;
        bounds = {
          x: container.x + (hitArea.x * scale),
          y: container.y + (hitArea.y * scale),
          width: hitArea.width * scale,
          height: hitArea.height * scale,
        };
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
    }

    if (bounds) {
      // Draw filled area with transparency
      this.debugGraphics.fillStyle(DEBUG_HIT_AREA_COLOR, alpha);
      this.debugGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      
      // Draw stroke
      this.debugGraphics.lineStyle(strokeWidth, DEBUG_HIT_AREA_COLOR, strokeAlpha);
      this.debugGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    }
  }
  
  /**
   * Subscribe to selection changes to show visual feedback
   */
  private setupSelectionSubscription(): void {
    const unsubscribe = isPlayerSelected.subscribe(selected => {
      this.isSelected = selected;
      this.updateDebugVisualization();
      // Sync to scene data for camera controller
      this.scene.data.set('isPlayerSelected', selected);
    });
    this.unsubscribers.push(unsubscribe);
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
