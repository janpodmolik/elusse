/**
 * ModularCharacterBuilder - Shared utility for building modular characters
 * 
 * Centralizes the logic for:
 * - Loading textures for a character selection
 * - Creating animations
 * - Building sprite layers in correct order
 * - Applying consistent flip behavior (using flipX, not negative scale)
 * 
 * Used by:
 * - ModularPlayer (game scene)
 * - BuilderPlayerController (builder scene)
 * - CharacterPreviewScene (character builder UI)
 */

import Phaser from 'phaser';
import {
  type ModularCharacterSelection,
  MODULAR_FRAME,
  MODULAR_ANIMATIONS,
  LAYER_ORDER,
  getItemsForSelection,
  getModularAssetPath,
  getModularTextureKey,
  getItemById,
  sortClothingByLayer,
  getHatsFromClothing,
} from '../../data/modularConfig';

// Default scale for modular characters (matching legacy player size)
export const MODULAR_SCALE = 3;

/**
 * Preload all textures needed for a character selection
 */
export async function preloadModularCharacter(
  scene: Phaser.Scene,
  selection: ModularCharacterSelection
): Promise<void> {
  const items = getItemsForSelection(selection);

  return new Promise((resolve) => {
    let needsLoad = false;

    items.forEach(item => {
      const key = getModularTextureKey(item);
      if (!scene.textures.exists(key)) {
        needsLoad = true;
        const path = getModularAssetPath(item);
        scene.load.spritesheet(key, path, {
          frameWidth: MODULAR_FRAME.WIDTH,
          frameHeight: MODULAR_FRAME.HEIGHT,
        });
      }
    });

    if (!needsLoad) {
      resolve();
      return;
    }

    scene.load.once('complete', () => {
      // Create animations for each texture
      items.forEach(item => {
        const key = getModularTextureKey(item);
        createAnimationsForTexture(scene, key);
      });
      resolve();
    });

    scene.load.start();
  });
}

/**
 * Create animations for a modular texture
 */
export function createAnimationsForTexture(scene: Phaser.Scene, textureKey: string): void {
  MODULAR_ANIMATIONS.forEach(anim => {
    const animKey = `${textureKey}-${anim.name}`;
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: scene.anims.generateFrameNumbers(textureKey, {
          start: anim.from,
          end: anim.to,
        }),
        frameRate: anim.frameRate,
        repeat: -1,
      });
    }
  });
}

/**
 * Get ordered list of item IDs for building layers
 */
export function getOrderedItemIds(selection: ModularCharacterSelection): string[] {
  const itemIds: string[] = [];

  // Build in layer order: skins -> clothing (no hats) -> hair
  LAYER_ORDER.forEach(category => {
    switch (category) {
      case 'skins':
        if (selection.skin) itemIds.push(selection.skin);
        break;
      case 'hair':
        if (selection.hair) itemIds.push(selection.hair);
        break;
      case 'clothing':
        // Add clothing items in layer order (excludes hats)
        itemIds.push(...sortClothingByLayer(selection.clothing));
        break;
    }
  });

  // Add hats AFTER hair (on top of everything)
  const hatIds = getHatsFromClothing(selection.clothing);
  itemIds.push(...hatIds);

  return itemIds;
}

export interface BuildCharacterOptions {
  /** Play animation or show static frame (default: false = static) */
  animated?: boolean;
  /** Initial animation to play if animated (default: 'idle') */
  animation?: string;
  /** Initial facing direction (default: 'right') */
  facing?: 'left' | 'right';
  /** Scale factor (default: MODULAR_SCALE = 3) */
  scale?: number;
}

export interface BuiltCharacter {
  /** The container holding all layer sprites */
  container: Phaser.GameObjects.Container;
  /** Array of layer sprites in render order */
  sprites: Phaser.GameObjects.Sprite[];
  /** Scale factor applied to the container */
  scale: number;
  /** Set facing direction */
  setFacing: (direction: 'left' | 'right') => void;
  /** Play animation on all layers */
  playAnimation: (animName: string) => void;
  /** Set static frame on all layers */
  setFrame: (frame: number) => void;
  /** Apply tint to all layers */
  setTint: (tint: number) => void;
  /** Clear tint from all layers */
  clearTint: () => void;
  /** Set alpha on all layers */
  setAlpha: (alpha: number) => void;
  /** Get world-space hit bounds for interaction */
  getHitBounds: () => { x: number; y: number; width: number; height: number };
  /** Cleanup */
  destroy: () => void;
}

/**
 * Build a modular character from a selection
 * 
 * Creates a container with properly ordered sprite layers.
 * Uses flipX for direction changes (not negative scale) to avoid hit area issues.
 */
export function buildModularCharacter(
  scene: Phaser.Scene,
  x: number,
  y: number,
  selection: ModularCharacterSelection,
  options: BuildCharacterOptions = {}
): BuiltCharacter {
  const {
    animated = false,
    animation = 'idle',
    facing = 'right',
    scale = MODULAR_SCALE,
  } = options;

  const container = scene.add.container(x, y);
  const sprites: Phaser.GameObjects.Sprite[] = [];

  // Apply positive scale (use flipX for direction, not negative scale)
  container.setScale(scale);

  // Build layers
  const itemIds = getOrderedItemIds(selection);

  itemIds.forEach(itemId => {
    const item = getItemById(itemId);
    if (!item) return;

    const textureKey = getModularTextureKey(item);
    if (!scene.textures.exists(textureKey)) return;

    const sprite = scene.add.sprite(0, 0, textureKey);
    sprite.setOrigin(0.5, 0.5);
    
    // IMPORTANT: Disable input on child sprites so container receives events
    // Without this, child sprites intercept clicks meant for the container
    sprite.disableInteractive();

    if (animated) {
      const animKey = `${textureKey}-${animation}`;
      if (scene.anims.exists(animKey)) {
        sprite.play(animKey);
      }
    } else {
      sprite.setFrame(0);
    }

    container.add(sprite);
    sprites.push(sprite);
  });

  // Apply initial facing direction
  // Modular sprites face LEFT by default, so flip for right
  const shouldFlip = facing === 'right';
  sprites.forEach(sprite => sprite.setFlipX(shouldFlip));

  // Return interface for controlling the character
  return {
    container,
    sprites,
    scale,

    setFacing(direction: 'left' | 'right') {
      const flip = direction === 'right';
      sprites.forEach(sprite => sprite.setFlipX(flip));
    },

    playAnimation(animName: string) {
      sprites.forEach(sprite => {
        const textureKey = sprite.texture.key;
        const animKey = `${textureKey}-${animName}`;
        if (scene.anims.exists(animKey)) {
          sprite.play(animKey, true);
        }
      });
    },

    setFrame(frame: number) {
      sprites.forEach(sprite => sprite.setFrame(frame));
    },

    setTint(tint: number) {
      sprites.forEach(sprite => sprite.setTint(tint));
    },

    clearTint() {
      sprites.forEach(sprite => sprite.clearTint());
    },

    setAlpha(alpha: number) {
      sprites.forEach(sprite => sprite.setAlpha(alpha));
    },
    
    /**
     * Get world-space hit bounds for interaction
     * Takes container position and scale into account
     */
    getHitBounds() {
      const scaledWidth = MODULAR_FRAME.WIDTH * scale;
      const scaledHeight = MODULAR_FRAME.HEIGHT * scale;
      return {
        x: container.x - scaledWidth / 2,
        y: container.y - scaledHeight / 2,
        width: scaledWidth,
        height: scaledHeight,
      };
    },
    


    destroy() {
      sprites.forEach(sprite => sprite.destroy());
      container.destroy();
    },
  };
}

/**
 * Get hit area for modular character interaction
 * Returns a rectangle suitable for setInteractive()
 */
export function getModularHitArea(_scale: number = MODULAR_SCALE): Phaser.Geom.Rectangle {
  const width = MODULAR_FRAME.WIDTH;
  const height = MODULAR_FRAME.HEIGHT;
  // Center the hit area on origin (0, 0)
  return new Phaser.Geom.Rectangle(
    -width / 2,
    -height / 2,
    width,
    height
  );
}
