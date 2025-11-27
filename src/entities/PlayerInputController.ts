/**
 * PlayerInputController - Handles all player input (keyboard and touch)
 * 
 * Separates input handling from player sprite for:
 * - Better testability
 * - Reusability across different player types
 * - Cleaner separation of concerns
 */

import Phaser from 'phaser';

// Touch control constants
export const TOUCH_CONFIG = {
  THRESHOLD_X: 20,
  THRESHOLD_Y: 80,
  // UI ignore zones
  LANGUAGE_BUTTON: { width: 120, height: 60 },
  SKIN_BUTTON: { width: 120, height: 60, yOffset: 60 },
} as const;

// Movement constants
export const MOVEMENT_CONFIG = {
  SPEED: 350,
  JUMP_STRENGTH: -500,
} as const;

export interface InputState {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface PlayerInputControllerOptions {
  scene: Phaser.Scene;
  getPlayerPosition: () => { x: number; y: number };
}

/**
 * PlayerInputController - Manages keyboard and touch input for player
 */
export class PlayerInputController {
  private scene: Phaser.Scene;
  private getPlayerPosition: () => { x: number; y: number };
  
  // Keyboard controls - arrow keys (no down key needed for platformer)
  private keyUp?: Phaser.Input.Keyboard.Key;
  private keyLeft?: Phaser.Input.Keyboard.Key;
  private keyRight?: Phaser.Input.Keyboard.Key;
  // WASD + Space
  private keyA?: Phaser.Input.Keyboard.Key;
  private keyD?: Phaser.Input.Keyboard.Key;
  private keyW?: Phaser.Input.Keyboard.Key;
  private keySpace?: Phaser.Input.Keyboard.Key;
  
  // Touch state
  private touchLeft: boolean = false;
  private touchRight: boolean = false;
  private touchJump: boolean = false;
  
  // Touch handlers for cleanup
  private touchHandlers?: {
    pointerdown: (pointer: Phaser.Input.Pointer) => void;
    pointermove: (pointer: Phaser.Input.Pointer) => void;
    pointerup: () => void;
  };

  constructor(options: PlayerInputControllerOptions) {
    this.scene = options.scene;
    this.getPlayerPosition = options.getPlayerPosition;
    
    this.setupKeyboardControls();
    this.setupTouchControls();
  }

  /**
   * Setup keyboard input
   */
  private setupKeyboardControls(): void {
    if (this.scene.input.keyboard) {
      // Note: enableCapture=false allows keys to reach input fields in UI
      // Arrow keys (no down key needed for platformer)
      this.keyUp = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false);
      this.keyLeft = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false);
      this.keyRight = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false);
      // WASD + Space
      this.keyA = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false);
      this.keyD = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false);
      this.keyW = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false);
      this.keySpace = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false);
    }
  }

  /**
   * Setup touch controls
   */
  private setupTouchControls(): void {
    const scene = this.scene;

    const handlePointer = (pointer: Phaser.Input.Pointer) => {
      const x = pointer.x;
      const y = pointer.y;
      const screenWidth = scene.scale.width;

      // Ignore language button area (top right)
      if (x > screenWidth - TOUCH_CONFIG.LANGUAGE_BUTTON.width && y < TOUCH_CONFIG.LANGUAGE_BUTTON.height) {
        return;
      }

      // Ignore skin button area (below language button)
      if (x > screenWidth - TOUCH_CONFIG.SKIN_BUTTON.width && 
          y >= TOUCH_CONFIG.SKIN_BUTTON.yOffset && 
          y < TOUCH_CONFIG.SKIN_BUTTON.yOffset + TOUCH_CONFIG.SKIN_BUTTON.height) {
        return;
      }

      // Calculate position relative to player
      const camera = scene.cameras.main;
      const playerPos = this.getPlayerPosition();
      const playerScreenX = playerPos.x - camera.scrollX;
      const playerScreenY = playerPos.y - camera.scrollY;
      const deltaX = x - playerScreenX;
      const deltaY = y - playerScreenY;

      // Determine movement direction
      if (deltaX < -TOUCH_CONFIG.THRESHOLD_X) {
        this.touchLeft = true;
        this.touchRight = false;
      } else if (deltaX > TOUCH_CONFIG.THRESHOLD_X) {
        this.touchRight = true;
        this.touchLeft = false;
      } else {
        this.touchLeft = false;
        this.touchRight = false;
      }

      // Jump if touching above player
      this.touchJump = deltaY < -TOUCH_CONFIG.THRESHOLD_Y;
    };

    const pointerdownHandler = (pointer: Phaser.Input.Pointer) => {
      handlePointer(pointer);
    };

    const pointermoveHandler = (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        handlePointer(pointer);
      }
    };

    const pointerupHandler = () => {
      this.touchLeft = false;
      this.touchRight = false;
      this.touchJump = false;
    };

    scene.input.on('pointerdown', pointerdownHandler);
    scene.input.on('pointermove', pointermoveHandler);
    scene.input.on('pointerup', pointerupHandler);

    // Store handlers for cleanup
    this.touchHandlers = {
      pointerdown: pointerdownHandler,
      pointermove: pointermoveHandler,
      pointerup: pointerupHandler,
    };
  }

  /**
   * Get current input state
   */
  getInputState(): InputState {
    const left = this.keyA?.isDown || this.keyLeft?.isDown || this.touchLeft || false;
    const right = this.keyD?.isDown || this.keyRight?.isDown || this.touchRight || false;
    const jump = this.keySpace?.isDown || this.keyW?.isDown || 
                 this.keyUp?.isDown || this.touchJump || false;
    
    return { left, right, jump };
  }

  /**
   * Check if any input is active
   */
  hasAnyInput(): boolean {
    const state = this.getInputState();
    return state.left || state.right || state.jump;
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    if (this.touchHandlers) {
      this.scene.input.off('pointerdown', this.touchHandlers.pointerdown);
      this.scene.input.off('pointermove', this.touchHandlers.pointermove);
      this.scene.input.off('pointerup', this.touchHandlers.pointerup);
      this.touchHandlers = undefined;
    }
  }
}
