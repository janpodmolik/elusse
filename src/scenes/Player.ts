import Phaser from 'phaser';
import { skinManager, getSkinScale, AVAILABLE_SKINS } from '../data/skinConfig';
import { hasPlayerMoved } from '../stores';
import { PLAYER_SPRITE } from '../constants/playerConstants';
import { PlayerAnimations, PlayerInputController, MOVEMENT_CONFIG, type AnimationState } from '../entities';

/**
 * Player - Main player character sprite
 * 
 * Uses composition with:
 * - PlayerAnimations for animation management
 * - PlayerInputController for keyboard/touch input
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
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
    
    // Physics body size (before scale) - small hitbox at feet
    // Adjust offset based on frame dimensions
    const bodyWidth = Math.round(frameWidth * 0.33);
    const bodyHeight = Math.round(frameHeight * 0.25);
    const offsetX = Math.round((frameWidth - bodyWidth) / 2);
    const offsetY = Math.round(frameHeight * 0.75);
    this.setSize(bodyWidth, bodyHeight);
    this.setOffset(offsetX, offsetY);
    this.setScale(scale);
    this.setDepth(PLAYER_SPRITE.DEPTH);

    // Start with idle animation
    this.animations.play(this, 'idle');
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
        this.animations.play(this, 'idle');
        break;
      case 'running':
        this.animations.play(this, 'run');
        break;
    }
  }

  destroy(fromScene?: boolean): void {
    this.inputController.destroy();
    super.destroy(fromScene);
  }
}
