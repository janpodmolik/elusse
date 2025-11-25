import Phaser from 'phaser';
import { catSkinManager, CatSkin } from '../data/catSkin';
import { hasPlayerMoved } from '../stores';

// Touch control constants
const TOUCH_THRESHOLD_X = 20;  // Horizontal movement threshold
const TOUCH_THRESHOLD_Y = 80;  // Jump threshold (how far above player to tap)
const LANGUAGE_BUTTON_WIDTH = 120;
const LANGUAGE_BUTTON_HEIGHT = 60;
const SKIN_BUTTON_WIDTH = 120;
const SKIN_BUTTON_HEIGHT = 60;
const SKIN_BUTTON_Y_OFFSET = 60; // Skin button is 60px below language button

// Movement constants
const MOVE_SPEED = 350;
const JUMP_STRENGTH = -500;

// Jump animation constants
const FAST_VELOCITY_THRESHOLD = 100; // Velocity threshold for fast movement
const SLOW_VELOCITY_THRESHOLD = 20;  // Velocity threshold for slow/peak movement
const JUMP_ROTATION_FULL = 15;       // Full rotation angle for fast jumping
const JUMP_ROTATION_SLIGHT = 8;      // Slight rotation angle for peak

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private animState: 'idle' | 'running' | 'jumping' = 'idle';
  private currentSkin: CatSkin;
  private hasNotifiedMovement: boolean = false;
  private hasReceivedInput: boolean = false;
  private touchHandlers?: {
    pointerdown: (pointer: Phaser.Input.Pointer) => void;
    pointermove: (pointer: Phaser.Input.Pointer) => void;
    pointerup: () => void;
  };
  private touchState?: {
    left: boolean;
    right: boolean;
    jump: boolean;
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    // Get current skin from manager
    const initialSkin = catSkinManager.getSkin();
    super(scene, x, y, `cat-idle-${initialSkin}`);
    
    this.currentSkin = initialSkin;
    
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Create animations
    this.createAnimations();

    // Setup physics
    this.setCollideWorldBounds(true);
    this.setBounce(0);
    this.setSize(40, 40);
    this.setOffset(4, 8);
    this.setScale(5);

    // Start with idle animation
    this.play(`cat-idle-${this.currentSkin}`);

    // Setup controls
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keyA = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
      this.keyD = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
      this.keyW = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
      this.keySpace = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // Setup touch controls (invisible zones)
    this.setupTouchControls();
  }

  private createAnimations(): void {
    const scene = this.scene;
    const skins = catSkinManager.getAllSkins();

    // Create animations for all skins
    skins.forEach(skin => {
      // Create idle animation (4 frames)
      if (!scene.anims.exists(`cat-idle-${skin}`)) {
        scene.anims.create({
          key: `cat-idle-${skin}`,
          frames: scene.anims.generateFrameNumbers(`cat-idle-${skin}`, { start: 0, end: 3 }),
          frameRate: 6,
          repeat: -1
        });
      }

      // Create walk animation (6 frames)
      if (!scene.anims.exists(`cat-walk-${skin}`)) {
        scene.anims.create({
          key: `cat-walk-${skin}`,
          frames: scene.anims.generateFrameNumbers(`cat-walk-${skin}`, { start: 0, end: 5 }),
          frameRate: 12,
          repeat: -1
        });
      }

      // Create jump up animation (frame 2 from walk - cat flying up)
      if (!scene.anims.exists(`cat-jump-up-${skin}`)) {
        scene.anims.create({
          key: `cat-jump-up-${skin}`,
          frames: [{ key: `cat-walk-${skin}`, frame: 2 }],
          frameRate: 1,
          repeat: 0
        });
      }

      // Create jump peak up animation (frame 3 from walk - slowing down at top)
      if (!scene.anims.exists(`cat-jump-peak-up-${skin}`)) {
        scene.anims.create({
          key: `cat-jump-peak-up-${skin}`,
          frames: [{ key: `cat-walk-${skin}`, frame: 3 }],
          frameRate: 1,
          repeat: 0
        });
      }

      // Create jump peak down animation (frame 3 from walk - starting to fall)
      if (!scene.anims.exists(`cat-jump-peak-down-${skin}`)) {
        scene.anims.create({
          key: `cat-jump-peak-down-${skin}`,
          frames: [{ key: `cat-walk-${skin}`, frame: 3 }],
          frameRate: 1,
          repeat: 0
        });
      }

      // Create jump down animation (frame 4 from walk - cat flying down)
      if (!scene.anims.exists(`cat-jump-down-${skin}`)) {
        scene.anims.create({
          key: `cat-jump-down-${skin}`,
          frames: [{ key: `cat-walk-${skin}`, frame: 4 }],
          frameRate: 1,
          repeat: 0
        });
      }
    });
  }

  private setupTouchControls(): void {
    const scene = this.scene;
    let touchLeft = false;
    let touchRight = false;
    let touchJump = false;

    const handlePointer = (pointer: Phaser.Input.Pointer) => {
      const x = pointer.x;
      const y = pointer.y;
      const screenWidth = scene.scale.width;

      // Ignore language button area (top right)
      if (x > screenWidth - LANGUAGE_BUTTON_WIDTH && y < LANGUAGE_BUTTON_HEIGHT) {
        return;
      }

      // Ignore skin button area (below language button)
      if (x > screenWidth - SKIN_BUTTON_WIDTH && 
          y >= SKIN_BUTTON_Y_OFFSET && 
          y < SKIN_BUTTON_Y_OFFSET + SKIN_BUTTON_HEIGHT) {
        return;
      }

      // Calculate position relative to player
      const camera = scene.cameras.main;
      const playerScreenX = this.x - camera.scrollX;
      const playerScreenY = this.y - camera.scrollY;
      const deltaX = x - playerScreenX;
      const deltaY = y - playerScreenY;

      // Determine movement direction
      if (deltaX < -TOUCH_THRESHOLD_X) {
        touchLeft = true;
        touchRight = false;
      } else if (deltaX > TOUCH_THRESHOLD_X) {
        touchRight = true;
        touchLeft = false;
      } else {
        touchLeft = false;
        touchRight = false;
      }

      // Jump if touching above player
      touchJump = deltaY < -TOUCH_THRESHOLD_Y;
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
      touchLeft = false;
      touchRight = false;
      touchJump = false;
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

    // Store touch state for update method
    this.touchState = {
      get left() { return touchLeft; },
      get right() { return touchRight; },
      get jump() { return touchJump; },
    };
  }

  public changeSkin(newSkin: CatSkin): void {
    this.currentSkin = newSkin;
    // Replay current animation with new skin
    const currentAnim = this.anims.currentAnim?.key;
    if (currentAnim) {
      // Extract animation type from current animation key
      const animType = currentAnim.split('-').slice(1, -1).join('-');
      const newAnimKey = `cat-${animType}-${newSkin}`;
      if (this.scene.anims.exists(newAnimKey)) {
        this.play(newAnimKey);
      }
    }
  }

  private updateJumpAnimation(velocityY: number): void {
    if (velocityY < -FAST_VELOCITY_THRESHOLD) {
      // Going up fast
      if (this.anims.currentAnim?.key !== `cat-jump-up-${this.currentSkin}`) {
        this.play(`cat-jump-up-${this.currentSkin}`);
      }
      this.setAngle(this.flipX ? JUMP_ROTATION_FULL : -JUMP_ROTATION_FULL);
    } else if (velocityY < -SLOW_VELOCITY_THRESHOLD) {
      // Slowing down going up
      if (this.anims.currentAnim?.key !== `cat-jump-peak-up-${this.currentSkin}`) {
        this.play(`cat-jump-peak-up-${this.currentSkin}`);
      }
      this.setAngle(this.flipX ? JUMP_ROTATION_SLIGHT : -JUMP_ROTATION_SLIGHT);
    } else if (velocityY <= FAST_VELOCITY_THRESHOLD) {
      // At peak or starting to fall
      if (this.anims.currentAnim?.key !== `cat-jump-peak-down-${this.currentSkin}`) {
        this.play(`cat-jump-peak-down-${this.currentSkin}`);
      }
      this.setAngle(this.flipX ? -JUMP_ROTATION_SLIGHT : JUMP_ROTATION_SLIGHT);
    } else {
      // Falling fast
      if (this.anims.currentAnim?.key !== `cat-jump-down-${this.currentSkin}`) {
        this.play(`cat-jump-down-${this.currentSkin}`);
      }
      this.setAngle(this.flipX ? -JUMP_ROTATION_FULL : JUMP_ROTATION_FULL);
    }
  }

  update(): void {
    const touchState = this.touchState;
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Use blocked.down which is more reliable than touching.down
    const onGround = body && (body.blocked.down || body.touching.down);

    // Horizontal movement
    let moveLeft = this.keyA?.isDown || this.cursors?.left?.isDown || touchState?.left || false;
    let moveRight = this.keyD?.isDown || this.cursors?.right?.isDown || touchState?.right || false;

    // Jump
    const jumpPressed = this.keySpace?.isDown || this.keyW?.isDown || this.cursors?.space?.isDown || this.cursors?.up?.isDown || touchState?.jump || false;

    // Track if user has given any input (not just falling)
    if ((moveLeft || moveRight || jumpPressed) && !this.hasReceivedInput) {
      this.hasReceivedInput = true;
    }

    // Notify scene on first keyboard movement
    const isMoving = moveLeft || moveRight;
    if (this.hasReceivedInput && (isMoving || jumpPressed) && !this.hasNotifiedMovement) {
      this.hasNotifiedMovement = true;
      hasPlayerMoved.set(true);
    }

    if (moveLeft) {
      this.setVelocityX(-MOVE_SPEED);
      this.setFlipX(true);
      if (onGround) this.animState = 'running';
    } else if (moveRight) {
      this.setVelocityX(MOVE_SPEED);
      this.setFlipX(false);
      if (onGround) this.animState = 'running';
    } else {
      this.setVelocityX(0);
      if (onGround) this.animState = 'idle';
    }
    
    if (jumpPressed && onGround) {
      this.setVelocityY(JUMP_STRENGTH);
      this.animState = 'jumping';
    }

    // Update animation state when not on ground
    if (!onGround && this.body && (this.body as Phaser.Physics.Arcade.Body).velocity.y !== 0) {
      this.animState = 'jumping';
    }

    // Play appropriate animation
    switch (this.animState) {
      case 'idle':
        if (this.anims.currentAnim?.key !== `cat-idle-${this.currentSkin}`) {
          this.play(`cat-idle-${this.currentSkin}`);
        }
        this.setAngle(0); // Reset rotation
        break;
      case 'running':
        if (this.anims.currentAnim?.key !== `cat-walk-${this.currentSkin}`) {
          this.play(`cat-walk-${this.currentSkin}`);
        }
        this.setAngle(0); // Reset rotation
        break;
      case 'jumping':
        const velocityY = (this.body as Phaser.Physics.Arcade.Body).velocity.y;
        this.updateJumpAnimation(velocityY);
        break;
    }
  }

  destroy(fromScene?: boolean): void {
    // Clean up touch event listeners
    if (this.touchHandlers) {
      this.scene.input.off('pointerdown', this.touchHandlers.pointerdown);
      this.scene.input.off('pointermove', this.touchHandlers.pointermove);
      this.scene.input.off('pointerup', this.touchHandlers.pointerup);
      this.touchHandlers = undefined;
    }
    
    // Call parent destroy
    super.destroy(fromScene);
  }
}
