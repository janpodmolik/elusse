/**
 * ModularPlayer - Player character using modular layered sprites
 * 
 * Renders multiple sprite layers (skins, clothing, hair, hats) synchronized
 * together to create a customized character.
 * 
 * Uses shared ModularCharacterVisual for consistent rendering.
 * Implements IPlayer interface for unified player abstraction.
 */

import Phaser from 'phaser';
import { type ModularCharacterSelection } from '../data/modularConfig';
import { hasPlayerMoved } from '../stores';
import { 
  PLAYER_SPRITE, 
  MODULAR_PLAYER_SIZE,
  getModularPlayerGroundY,
  getModularPlayerPhysicsBody,
} from '../constants/playerConstants';
import { 
  PlayerInputController, 
  MOVEMENT_CONFIG,
  type IPlayer,
  type PlayerType,
  type Position,
  type HitBounds,
} from '../entities';
import {
  preloadModularCharacter,
  MODULAR_SCALE,
} from './shared/ModularCharacterBuilder';
import { ModularCharacterVisual } from '../entities/ModularCharacterVisual';

type AnimationState = 'idle' | 'running';

export class ModularPlayer extends Phaser.GameObjects.Container implements IPlayer {
  private character: ModularCharacterVisual | null = null;
  private selection: ModularCharacterSelection;
  private animState: AnimationState = 'idle';
  private hasNotifiedMovement: boolean = false;
  private hasReceivedInput: boolean = false;
  private currentFacing: 'left' | 'right' = 'right';
  
  // Input - using shared PlayerInputController
  private inputController: PlayerInputController;
  
  // Velocity for movement
  private velocityX: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, selection: ModularCharacterSelection) {
    super(scene, x, y);
    
    this.selection = selection;
    
    // Add to scene
    scene.add.existing(this);
    
    // Add physics body to container
    scene.physics.add.existing(this);
    
    // Setup physics - prevent going out of bounds
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(true);
      body.setBounce(0);
      
      // Physics body size - smaller hitbox at feet (shared calculation)
      const physicsBody = getModularPlayerPhysicsBody();
      body.setSize(physicsBody.width, physicsBody.height);
      body.setOffset(physicsBody.offsetX, physicsBody.offsetY);
    }
    
    // Setup input using shared controller (supports arrows, WASD, and touch)
    this.inputController = new PlayerInputController({
      scene,
      getPlayerPosition: () => ({ x: this.x, y: this.y }),
    });
    
    // Set depth
    this.setDepth(PLAYER_SPRITE.DEPTH);
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
    return getModularPlayerGroundY(worldHeight);
  }
  
  /**
   * Get player type for positioning calculations
   */
  getPlayerType(): PlayerType {
    return 'modular';
  }
  
  /**
   * Get world-space hit bounds for selection/interaction
   * Returns bounds in world coordinates (after scale applied)
   */
  getHitBounds(): HitBounds {
    const scaledWidth = MODULAR_PLAYER_SIZE.WIDTH;
    const scaledHeight = MODULAR_PLAYER_SIZE.HEIGHT;
    
    // Container position is center of the character
    return {
      x: this.x - scaledWidth / 2,
      y: this.y - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
    };
  }
  
  /**
   * Set facing direction (public for IPlayer interface)
   */
  setFacing(direction: 'left' | 'right'): void {
    if (this.currentFacing === direction) return;
    this.currentFacing = direction;
    this.character?.setFacing(direction);
  }
  
  /**
   * Apply tint color to all sprites
   */
  setTint(tint: number): void {
    this.character?.setTint(tint);
  }
  
  /**
   * Clear tint from all sprites
   */
  clearTint(): void {
    this.character?.clearTint();
  }
  
  /**
   * Set alpha/opacity
   */
  setAlpha(alpha: number): this {
    this.character?.setAlpha(alpha);
    return this;
  }
  
  /**
   * Get underlying Phaser game object
   */
  getGameObject(): Phaser.GameObjects.Container {
    return this;
  }
  
  /**
   * Preload all textures needed for this character
   */
  public static async preloadCharacter(
    scene: Phaser.Scene, 
    selection: ModularCharacterSelection
  ): Promise<void> {
    return preloadModularCharacter(scene, selection);
  }
  
  /**
   * Build/rebuild the character sprites using shared builder
   */
  public buildCharacter() {
    // Cleanup old character if exists
    if (this.character) {
      this.character.destroy();
    }
    
    // Build using shared utility - animated, facing right
    this.character = new ModularCharacterVisual(
      this.scene,
      0, 0, // Position at container origin
      this.selection,
      {
        animated: true,
        animation: 'idle',
        facing: 'right',
        scale: MODULAR_SCALE,
      }
    );
    
    // Add the character container as a child of this container
    this.add(this.character);
    this.currentFacing = 'right';
  }
  
  /**
   * Play animation on all layers (IPlayer interface)
   */
  public playAnimation(animName: string): void {
    this.character?.playAnimation(animName);
  }
  
  /**
   * Update player (call from scene update)
   */
  update() {
    const input = this.inputController.getInputState();
    const { left, right } = input;
    
    // Track first input
    if (this.inputController.hasAnyInput() && !this.hasReceivedInput) {
      this.hasReceivedInput = true;
    }
    
    // Notify on first movement
    if (this.hasReceivedInput && this.inputController.hasAnyInput() && !this.hasNotifiedMovement) {
      this.hasNotifiedMovement = true;
      hasPlayerMoved.set(true);
    }
    
    // Movement
    if (left) {
      this.velocityX = -MOVEMENT_CONFIG.SPEED;
      this.setFacing('left');
      this.animState = 'running';
    } else if (right) {
      this.velocityX = MOVEMENT_CONFIG.SPEED;
      this.setFacing('right');
      this.animState = 'running';
    } else {
      this.velocityX = 0;
      this.animState = 'idle';
    }
    
    // Apply movement
    this.x += this.velocityX * (this.scene.game.loop.delta / 1000);
    
    // Play animation
    switch (this.animState) {
      case 'idle':
        this.playAnimation('idle');
        break;
      case 'running':
        this.playAnimation('run');
        break;
    }
  }
  
  /**
   * Cleanup (IPlayer interface)
   */
  destroy(fromScene?: boolean): void {
    this.inputController.destroy();
    if (this.character) {
      this.character.destroy();
      this.character = null;
    }
    super.destroy(fromScene);
  }
}
