import Phaser from 'phaser';
import {
  type ModularCharacterSelection,
  MODULAR_FRAME,
  getModularTextureKey,
  getItemById,
} from '../data/modularConfig';
import {
  getOrderedItemIds,
  MODULAR_SCALE
} from '../scenes/shared/ModularCharacterBuilder';

export interface ModularCharacterVisualOptions {
  /** Play animation or show static frame (default: false = static) */
  animated?: boolean;
  /** Initial animation to play if animated (default: 'idle') */
  animation?: string;
  /** Initial facing direction (default: 'right') */
  facing?: 'left' | 'right';
  /** Scale factor (default: MODULAR_SCALE = 3) */
  scale?: number;
}

/**
 * ModularCharacterVisual - Unified visual representation of a modular character
 * 
 * Renders multiple sprite layers (skins, clothing, hair, hats) synchronized
 * together to create a customized character.
 * 
 * Used by:
 * - ModularPlayer (GameScene)
 * - BuilderPlayerController (BuilderScene)
 * - CharacterPreviewScene (UI)
 */
export class ModularCharacterVisual extends Phaser.GameObjects.Container {
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private selection: ModularCharacterSelection;
  private currentAnimation: string = 'idle';
  private isAnimated: boolean = false;
  private facing: 'left' | 'right' = 'right';
  private visualScale: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    selection: ModularCharacterSelection,
    options: ModularCharacterVisualOptions = {}
  ) {
    super(scene, x, y);

    this.selection = selection;
    this.isAnimated = options.animated ?? false;
    this.currentAnimation = options.animation ?? 'idle';
    this.facing = options.facing ?? 'right';
    this.visualScale = options.scale ?? MODULAR_SCALE;

    // Apply scale
    this.setScale(this.visualScale);

    // Build initial layers
    this.rebuildLayers();

    // Add to scene
    scene.add.existing(this);
  }

  /**
   * Update the character with a new selection
   */
  public updateSelection(selection: ModularCharacterSelection): void {
    this.selection = selection;
    this.rebuildLayers();
  }

  /**
   * Rebuild all sprite layers based on current selection
   */
  private rebuildLayers(): void {
    // Clear existing sprites
    this.sprites.forEach(sprite => sprite.destroy());
    this.sprites = [];
    this.removeAll(true);

    // Get ordered items
    const itemIds = getOrderedItemIds(this.selection);

    itemIds.forEach(itemId => {
      const item = getItemById(itemId);
      if (!item) return;

      const textureKey = getModularTextureKey(item);
      if (!this.scene.textures.exists(textureKey)) return;

      const sprite = this.scene.add.sprite(0, 0, textureKey);
      sprite.setOrigin(0.5, 0.5);
      
      // Disable input on child sprites so container receives events
      sprite.disableInteractive();

      // Apply current state
      if (this.isAnimated) {
        const animKey = `${textureKey}-${this.currentAnimation}`;
        if (this.scene.anims.exists(animKey)) {
          sprite.play(animKey);
        }
      } else {
        sprite.setFrame(0);
      }

      // Apply facing
      const shouldFlip = this.facing === 'right';
      sprite.setFlipX(shouldFlip);

      this.add(sprite);
      this.sprites.push(sprite);
    });
  }

  /**
   * Set facing direction
   */
  public setFacing(direction: 'left' | 'right'): void {
    if (this.facing === direction) return;
    
    this.facing = direction;
    const shouldFlip = direction === 'right';
    this.sprites.forEach(sprite => sprite.setFlipX(shouldFlip));
  }

  /**
   * Play an animation on all layers
   */
  public playAnimation(animName: string): void {
    this.currentAnimation = animName;
    this.isAnimated = true;

    this.sprites.forEach(sprite => {
      const textureKey = sprite.texture.key;
      const animKey = `${textureKey}-${animName}`;
      if (this.scene.anims.exists(animKey)) {
        sprite.play(animKey, true);
      }
    });
  }

  /**
   * Set a static frame on all layers
   */
  public setStaticFrame(frame: number): void {
    this.isAnimated = false;
    this.sprites.forEach(sprite => {
      sprite.stop();
      sprite.setFrame(frame);
    });
  }

  /**
   * Apply tint to all layers
   */
  public setTint(tint: number): this {
    this.sprites.forEach(sprite => sprite.setTint(tint));
    return this;
  }

  /**
   * Clear tint from all layers
   */
  public clearTint(): this {
    this.sprites.forEach(sprite => sprite.clearTint());
    return this;
  }

  /**
   * Set alpha on all layers
   */
  public setAlpha(alpha: number): this {
    this.sprites.forEach(sprite => sprite.setAlpha(alpha));
    return this;
  }

  /**
   * Get world-space hit bounds for interaction
   */
  public getHitBounds(): { x: number; y: number; width: number; height: number } {
    const scaledWidth = MODULAR_FRAME.WIDTH * this.visualScale;
    const scaledHeight = MODULAR_FRAME.HEIGHT * this.visualScale;
    return {
      x: this.x - scaledWidth / 2,
      y: this.y - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
    };
  }
}
