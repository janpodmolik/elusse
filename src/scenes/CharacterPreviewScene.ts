/**
 * CharacterPreviewScene
 * 
 * Phaser scene for previewing modular character customization.
 * Renders layered sprites and synchronizes animations.
 * 
 * Spritesheet layout: 10 columns × 7 rows
 * Each animation occupies its own row.
 */

import Phaser from 'phaser';
import {
  type ModularCharacterSelection,
  type ModularItem,
  type ModularCategory,
  MODULAR_FRAME,
  MODULAR_ANIMATIONS,
  LAYER_ORDER,
  getItemsForSelection,
  getModularAssetPath,
  getModularTextureKey,
  getItemById,
  sortClothingByLayer,
  getHatsFromClothing,
} from '../data/modularConfig';

export default class CharacterPreviewScene extends Phaser.Scene {
  private layerSprites: Phaser.GameObjects.Sprite[] = [];
  private loadedTextures: Set<string> = new Set();
  private currentAnimName: string = 'idle';
  private currentSelection: ModularCharacterSelection | null = null;
  
  constructor() {
    super({ key: 'CharacterPreviewScene' });
  }
  
  create() {
    // Listen for resize events
    this.scale.on('resize', this.onResize, this);
    
    // Emit ready event for Svelte
    this.game.events.emit('ready');
  }
  
  /**
   * Handle resize - reposition and rescale character
   */
  private onResize() {
    if (this.layerSprites.length > 0) {
      this.repositionCharacter();
    }
  }
  
  /**
   * Calculate display scale based on canvas size
   */
  private getDisplayScale(): number {
    const minDimension = Math.min(this.cameras.main.width, this.cameras.main.height);
    // Scale to fit ~70% of the canvas height
    return Math.max(3, Math.floor(minDimension / 64 * 0.65));
  }
  
  /**
   * Reposition and rescale all sprites
   * Character sprite has empty space above head, so we offset Y slightly up
   */
  private repositionCharacter() {
    const centerX = this.cameras.main.width / 2;
    // Offset up by ~10% of height to account for empty space above character's head
    const centerY = this.cameras.main.height / 2 - (this.cameras.main.height * 0.05);
    const scale = this.getDisplayScale();
    
    this.layerSprites.forEach(sprite => {
      sprite.setPosition(centerX, centerY);
      sprite.setScale(scale);
    });
  }
  
  /**
   * Update character with new selection (called from Svelte)
   */
  public updateCharacter(selection: ModularCharacterSelection) {
    this.currentSelection = selection;
    
    const items = getItemsForSelection(selection);
    this.loadTextures(items).then(() => {
      this.rebuildCharacter();
    });
  }
  
  /**
   * Load textures for items
   */
  private async loadTextures(items: ModularItem[]): Promise<void> {
    const toLoad = items.filter(item => {
      const key = getModularTextureKey(item);
      return !this.loadedTextures.has(key);
    });
    
    if (toLoad.length === 0) return;
    
    return new Promise((resolve) => {
      toLoad.forEach(item => {
        const key = getModularTextureKey(item);
        const path = getModularAssetPath(item);
        
        this.load.spritesheet(key, path, {
          frameWidth: MODULAR_FRAME.WIDTH,
          frameHeight: MODULAR_FRAME.HEIGHT,
        });
      });
      
      this.load.once('complete', () => {
        toLoad.forEach(item => {
          const key = getModularTextureKey(item);
          this.loadedTextures.add(key);
          this.createAnimationsForTexture(key);
        });
        resolve();
      });
      
      this.load.start();
    });
  }
  
  /**
   * Create all animations for a texture
   */
  private createAnimationsForTexture(textureKey: string) {
    MODULAR_ANIMATIONS.forEach(anim => {
      const animKey = `${textureKey}-${anim.name}`;
      
      if (this.anims.exists(animKey)) return;
      
      this.anims.create({
        key: animKey,
        frames: this.anims.generateFrameNumbers(textureKey, {
          start: anim.from,
          end: anim.to,
        }),
        frameRate: anim.frameRate,
        repeat: anim.name === 'death' ? 0 : -1,
      });
    });
  }
  
  /**
   * Rebuild character display - destroys old sprites and creates new ones
   * Layer order: skins -> clothing (no hats) -> hair -> hats
   */
  private rebuildCharacter() {
    // Destroy ALL existing layer sprites
    this.layerSprites.forEach(sprite => {
      if (sprite && sprite.active) {
        sprite.destroy();
      }
    });
    this.layerSprites = [];
    
    if (!this.currentSelection) return;
    
    const { width, height } = this.cameras.main;
    const centerX = width / 2;
    // Offset Y slightly up to account for empty space above character head
    const centerY = height / 2 - (height * 0.05);
    const scale = this.getDisplayScale();
    
    // Build layers in order: skins -> clothing (no hats) -> hair
    LAYER_ORDER.forEach(category => {
      const itemIds = this.getItemIdsForCategory(category);
      
      itemIds.forEach(itemId => {
        const item = getItemById(itemId);
        if (!item) return;
        
        const textureKey = getModularTextureKey(item);
        if (!this.textures.exists(textureKey)) return;
        
        const sprite = this.add.sprite(centerX, centerY, textureKey);
        sprite.setScale(scale);
        sprite.setOrigin(0.5, 0.5);
        
        this.layerSprites.push(sprite);
      });
    });
    
    // Add hats AFTER hair (on top of everything)
    const hatIds = getHatsFromClothing(this.currentSelection.clothing);
    hatIds.forEach(hatId => {
      const item = getItemById(hatId);
      if (!item) return;
      
      const textureKey = getModularTextureKey(item);
      if (!this.textures.exists(textureKey)) return;
      
      const sprite = this.add.sprite(centerX, centerY, textureKey);
      sprite.setScale(scale);
      sprite.setOrigin(0.5, 0.5);
      
      this.layerSprites.push(sprite);
    });
    
    // Play animation on all sprites
    this.playAnimationOnAll(this.currentAnimName);
  }
  
  /**
   * Get item IDs for a category (sorted by layer order for clothing)
   */
  private getItemIdsForCategory(category: ModularCategory): string[] {
    if (!this.currentSelection) return [];
    
    switch (category) {
      case 'skins':
        return this.currentSelection.skin ? [this.currentSelection.skin] : [];
      case 'hair':
        return this.currentSelection.hair ? [this.currentSelection.hair] : [];
      case 'clothing':
        // Sort clothing by subcategory layer order (underwear -> legs -> chest -> feet -> hats)
        return sortClothingByLayer(this.currentSelection.clothing);
      default:
        return [];
    }
  }
  
  /**
   * Play animation on all layer sprites
   */
  private playAnimationOnAll(animName: string) {
    this.layerSprites.forEach(sprite => {
      const textureKey = sprite.texture.key;
      const animKey = `${textureKey}-${animName}`;
      
      if (this.anims.exists(animKey)) {
        sprite.play(animKey);
      }
    });
  }
  
  /**
   * Play a specific animation (called from Svelte)
   */
  public playAnimation(animName: string) {
    this.currentAnimName = animName;
    this.playAnimationOnAll(animName);
  }
  
  /**
   * Sync animations across all layers
   */
  update() {
    if (this.layerSprites.length <= 1) return;
    
    const first = this.layerSprites[0];
    if (!first?.anims?.currentFrame) return;
    
    const targetIndex = first.anims.currentFrame.index;
    
    for (let i = 1; i < this.layerSprites.length; i++) {
      const sprite = this.layerSprites[i];
      const anim = sprite.anims.currentAnim;
      
      if (anim && sprite.anims.currentFrame?.index !== targetIndex) {
        const frame = anim.frames[targetIndex];
        if (frame) {
          sprite.anims.setCurrentFrame(frame);
        }
      }
    }
  }
}
