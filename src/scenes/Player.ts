import Phaser from 'phaser';

// Touch control constants
const TOUCH_THRESHOLD_X = 20;  // Horizontal movement threshold
const TOUCH_THRESHOLD_Y = 80;  // Jump threshold (how far above player to tap)
const LANGUAGE_BUTTON_WIDTH = 120;
const LANGUAGE_BUTTON_HEIGHT = 60;

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

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'cat-idle');
    
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
    this.play('cat-idle');

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

    // Create idle animation (4 frames)
    if (!scene.anims.exists('cat-idle')) {
      scene.anims.create({
        key: 'cat-idle',
        frames: scene.anims.generateFrameNumbers('cat-idle', { start: 0, end: 3 }),
        frameRate: 6,
        repeat: -1
      });
    }

    // Create walk animation (6 frames)
    if (!scene.anims.exists('cat-walk')) {
      scene.anims.create({
        key: 'cat-walk',
        frames: scene.anims.generateFrameNumbers('cat-walk', { start: 0, end: 5 }),
        frameRate: 12,
        repeat: -1
      });
    }

    // Create jump up animation (frame 2 from walk - cat flying up)
    if (!scene.anims.exists('cat-jump-up')) {
      scene.anims.create({
        key: 'cat-jump-up',
        frames: [{ key: 'cat-walk', frame: 2 }],
        frameRate: 1,
        repeat: 0
      });
    }

    // Create jump peak up animation (frame 3 from walk - slowing down at top)
    if (!scene.anims.exists('cat-jump-peak-up')) {
      scene.anims.create({
        key: 'cat-jump-peak-up',
        frames: [{ key: 'cat-walk', frame: 3 }],
        frameRate: 1,
        repeat: 0
      });
    }

    // Create jump peak down animation (frame 3 from walk - starting to fall)
    if (!scene.anims.exists('cat-jump-peak-down')) {
      scene.anims.create({
        key: 'cat-jump-peak-down',
        frames: [{ key: 'cat-walk', frame: 3 }],
        frameRate: 1,
        repeat: 0
      });
    }

    // Create jump down animation (frame 4 from walk - cat flying down)
    if (!scene.anims.exists('cat-jump-down')) {
      scene.anims.create({
        key: 'cat-jump-down',
        frames: [{ key: 'cat-walk', frame: 4 }],
        frameRate: 1,
        repeat: 0
      });
    }
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

      // Ignore language button area
      if (x > screenWidth - LANGUAGE_BUTTON_WIDTH && y < LANGUAGE_BUTTON_HEIGHT) {
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

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      handlePointer(pointer);
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (pointer.isDown) {
        handlePointer(pointer);
      }
    });

    scene.input.on('pointerup', () => {
      touchLeft = false;
      touchRight = false;
      touchJump = false;
    });

    // Store touch state for update method
    (this as any).touchState = {
      get left() { return touchLeft; },
      get right() { return touchRight; },
      get jump() { return touchJump; },
    };
  }

  private updateJumpAnimation(velocityY: number): void {
    if (velocityY < -FAST_VELOCITY_THRESHOLD) {
      // Going up fast
      if (this.anims.currentAnim?.key !== 'cat-jump-up') {
        this.play('cat-jump-up');
      }
      this.setAngle(this.flipX ? JUMP_ROTATION_FULL : -JUMP_ROTATION_FULL);
    } else if (velocityY < -SLOW_VELOCITY_THRESHOLD) {
      // Slowing down going up
      if (this.anims.currentAnim?.key !== 'cat-jump-peak-up') {
        this.play('cat-jump-peak-up');
      }
      this.setAngle(this.flipX ? JUMP_ROTATION_SLIGHT : -JUMP_ROTATION_SLIGHT);
    } else if (velocityY <= FAST_VELOCITY_THRESHOLD) {
      // At peak or starting to fall
      if (this.anims.currentAnim?.key !== 'cat-jump-peak-down') {
        this.play('cat-jump-peak-down');
      }
      this.setAngle(this.flipX ? -JUMP_ROTATION_SLIGHT : JUMP_ROTATION_SLIGHT);
    } else {
      // Falling fast
      if (this.anims.currentAnim?.key !== 'cat-jump-down') {
        this.play('cat-jump-down');
      }
      this.setAngle(this.flipX ? -JUMP_ROTATION_FULL : JUMP_ROTATION_FULL);
    }
  }

  update(): void {
    const touchState = (this as any).touchState;
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Use blocked.down which is more reliable than touching.down
    const onGround = body && (body.blocked.down || body.touching.down);

    // Horizontal movement
    let moveLeft = this.keyA?.isDown || this.cursors?.left?.isDown || touchState?.left || false;
    let moveRight = this.keyD?.isDown || this.cursors?.right?.isDown || touchState?.right || false;

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

    // Jump
    const jumpPressed = this.keySpace?.isDown || this.keyW?.isDown || this.cursors?.space?.isDown || this.cursors?.up?.isDown || touchState?.jump || false;
    
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
        if (this.anims.currentAnim?.key !== 'cat-idle') {
          this.play('cat-idle');
        }
        this.setAngle(0); // Reset rotation
        break;
      case 'running':
        if (this.anims.currentAnim?.key !== 'cat-walk') {
          this.play('cat-walk');
        }
        this.setAngle(0); // Reset rotation
        break;
      case 'jumping':
        const velocityY = (this.body as Phaser.Physics.Arcade.Body).velocity.y;
        this.updateJumpAnimation(velocityY);
        break;
    }
  }
}
