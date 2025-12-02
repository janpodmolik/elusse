import Phaser from 'phaser';
import { skinManager } from '../data/skinConfig';
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
    // Physics body size (before scale) - small hitbox at feet
    // Cat sprite is 48x48, we want a small body at the bottom center
    this.setSize(16, 12);
    this.setOffset(16, 36); // Center horizontally, bottom of sprite
    this.setScale(PLAYER_SPRITE.SCALE);
    this.setDepth(PLAYER_SPRITE.DEPTH);

    // Start with idle animation
    this.animations.play(this, 'idle');
  }

  public changeSkin(newSkinId: string): void {
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
    if (input.left) {
      this.setVelocityX(-MOVEMENT_CONFIG.SPEED);
      this.setFlipX(true);
      this.animState = 'running';
    } else if (input.right) {
      this.setVelocityX(MOVEMENT_CONFIG.SPEED);
      this.setFlipX(false);
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
