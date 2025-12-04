import Phaser from 'phaser';
import { skinManager, getSkinScale, AVAILABLE_SKINS } from '../data/skinConfig';
import { hasPlayerMoved } from '../stores';
import { 
  PLAYER_SPRITE,
  getPlayerGroundY,
  getStaticPlayerPhysicsBody,
  STATIC_SELECTION_RATIOS,
} from '../constants/playerConstants';
import { 
  PlayerAnimations, 
  PlayerInputController, 
  MOVEMENT_CONFIG, 
  type AnimationState,
  type IPlayer,
  type PlayerType,
  type Position,
  type HitBounds,
} from './index';

/**
 * Player - Main player character sprite
 * 
 * Uses composition with:
 * - PlayerAnimations for animation management
 * - PlayerInputController for keyboard/touch input
 * 
 * Implements IPlayer interface for unified player abstraction.
 */
export class Player extends Phaser.Physics.Arcade.Sprite implements IPlayer {
  private animations: PlayerAnimations;
  private inputController: PlayerInputController;
  private animState: AnimationState = 'idle';
  private hasNotifiedMovement: boolean = false;
  private hasReceivedInput: boolean = false;
  private currentSkin: typeof AVAILABLE_SKINS[0];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Get the selected skin from skinManager
    const initialSkinId: string = skinManager.getSkinId();
    super(scene, x, y, `${initialSkinId}-idle`);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Initialize animation manager (animations already created by skinLoader)
    this.animations = new PlayerAnimations(scene, initialSkinId);

    // Initialize input controller
    this.inputController = new PlayerInputController({
      scene,
      getPlayerPosition: () => ({ x: this.x, y: this.y }),
    });

    // Setup physics
    this.setCollideWorldBounds(true);
    this.setBounce(0);
    
    // Get skin-specific scale
    this.currentSkin = AVAILABLE_SKINS.find(s => s.id === initialSkinId) ?? AVAILABLE_SKINS[0];
    const scale = getSkinScale(this.currentSkin);
    const frameWidth = this.currentSkin.frameWidth ?? 48;
    const frameHeight = this.currentSkin.frameHeight ?? 48;
    
    // Physics body size - small hitbox at feet (shared calculation)
    const physicsBody = getStaticPlayerPhysicsBody(frameWidth, frameHeight);
    this.setSize(physicsBody.width, physicsBody.height);
    this.setOffset(physicsBody.offsetX, physicsBody.offsetY);
    this.setScale(scale);
    this.setDepth(PLAYER_SPRITE.DEPTH);

    // Start with idle animation
    this.animations.play(this, 'idle');
  }
  
  // ========== IPlayer Implementation ==========
  
  /**
   * Get current world position
   */
  getPosition(): Position {
    return { x: this.x, y: this.y };
  }
  
  /**
   * Set world position (IPlayer interface version)
   * Note: This shadows Phaser's setPosition but with void return for interface compatibility
   */
  setPlayerPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
  
  /**
   * Get the Y coordinate for standing on ground
   */
  getGroundY(worldHeight: number): number {
    return getPlayerGroundY(worldHeight);
  }
  
  /**
   * Get player type for positioning calculations
   */
  getPlayerType(): PlayerType {
    return 'static';
  }
  
  /**
   * Get world-space hit bounds for selection/interaction
   * Static player uses origin (0, 0) at top-left
   */
  getHitBounds(): HitBounds {
    const scale = getSkinScale(this.currentSkin);
    const frameWidth = (this.currentSkin.frameWidth ?? 48) * scale;
    const frameHeight = (this.currentSkin.frameHeight ?? 48) * scale;
    const selectionWidth = frameWidth * STATIC_SELECTION_RATIOS.WIDTH;
    const offsetX = (frameWidth - selectionWidth) / 2;
    const originX = this.originX ?? 0.5;
    const originY = this.originY ?? 0.5;
    const baseX = this.x - (frameWidth * originX);
    const baseY = this.y - (frameHeight * originY);
    
    return {
      x: baseX + offsetX,
      y: baseY,
      width: selectionWidth,
      height: frameHeight,
    };
  }
  
  /**
   * Set facing direction
   */
  setFacing(direction: 'left' | 'right'): void {
    const facingLeft = this.currentSkin.facingLeft ?? false;
    if (direction === 'left') {
      this.setFlipX(!facingLeft);
    } else {
      this.setFlipX(facingLeft);
    }
  }
  
  /**
   * Play animation by name
   */
  playAnimation(animName: string): void {
    if (animName === 'idle' || animName === 'run') {
      this.animations.play(this, animName);
    }
  }
  
  /**
   * Apply tint color
   */
  setTint(tint: number): this {
    return super.setTint(tint);
  }
  
  /**
   * Clear tint
   */
  clearTint(): this {
    return super.clearTint();
  }
  
  /**
   * Set alpha/opacity
   */
  setAlpha(alpha: number): this {
    return super.setAlpha(alpha);
  }
  
  /**
   * Get underlying Phaser game object
   */
  getGameObject(): Phaser.GameObjects.Sprite {
    return this;
  }

  public changeSkin(newSkinId: string): void {
    // Update scale for new skin
    this.currentSkin = AVAILABLE_SKINS.find(s => s.id === newSkinId) ?? AVAILABLE_SKINS[0];
    const scale = getSkinScale(this.currentSkin);
    const frameWidth = this.currentSkin.frameWidth ?? 48;
    const frameHeight = this.currentSkin.frameHeight ?? 48;
    
    // Update physics body for new skin dimensions
    const bodyWidth = Math.round(frameWidth * 0.33);
    const bodyHeight = Math.round(frameHeight * 0.25);
    const offsetX = Math.round((frameWidth - bodyWidth) / 2);
    const offsetY = Math.round(frameHeight * 0.75);
    this.setSize(bodyWidth, bodyHeight);
    this.setOffset(offsetX, offsetY);
    this.setScale(scale);
    
    this.animations.handleSkinChange(this, newSkinId);
  }

  update(): void {
    const input = this.inputController.getInputState();

    // Track first input
    if (this.inputController.hasAnyInput() && !this.hasReceivedInput) {
      this.hasReceivedInput = true;
    }

    // Notify on first movement
    if (this.hasReceivedInput && this.inputController.hasAnyInput() && !this.hasNotifiedMovement) {
      this.hasNotifiedMovement = true;
      hasPlayerMoved.set(true);
    }

    // Apply horizontal movement
    // For sprites facing left by default, invert flipX logic
    const facingLeft = this.currentSkin.facingLeft ?? false;
    if (input.left) {
      this.setVelocityX(-MOVEMENT_CONFIG.SPEED);
      this.setFlipX(!facingLeft); // Normal: true, FacingLeft: false
      this.animState = 'running';
    } else if (input.right) {
      this.setVelocityX(MOVEMENT_CONFIG.SPEED);
      this.setFlipX(facingLeft);  // Normal: false, FacingLeft: true
      this.animState = 'running';
    } else {
      this.setVelocityX(0);
      this.animState = 'idle';
    }

    // Play appropriate animation
    switch (this.animState) {
      case 'idle':
        this.playAnimation('idle');
        break;
      case 'running':
        this.playAnimation('run');
        break;
    }
  }

  destroy(fromScene?: boolean): void {
    this.inputController.destroy();
    super.destroy(fromScene);
  }
}
