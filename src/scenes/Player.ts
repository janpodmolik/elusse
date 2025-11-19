import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private animState: 'idle' | 'running' | 'jumping' = 'idle';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    
    // Create placeholder sprite (32x32 colored rectangle)
    const graphics = scene.add.graphics();
    graphics.fillStyle(0xff6b9d, 1);
    graphics.fillRect(0, 0, 32, 32);
    graphics.generateTexture('player-placeholder', 32, 32);
    graphics.destroy();

    this.setTexture('player-placeholder');
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Setup physics
    this.setCollideWorldBounds(true);
    this.setBounce(0.1);
    this.setSize(28, 28);
    this.setOffset(2, 4);

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

  private setupTouchControls(): void {
    const scene = this.scene;
    let touchLeft = false;
    let touchRight = false;
    let touchJump = false;

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const x = pointer.x;
      const y = pointer.y;
      const screenWidth = scene.scale.width;
      const screenHeight = scene.scale.height;

      // Ignore touch if clicking on language button (top-right corner)
      if (x > screenWidth - 120 && y < 60) {
        return;
      }

      // Left half = move left
      if (x < screenWidth / 3) {
        touchLeft = true;
        touchRight = false;
      }
      // Right half = move right
      else if (x > (screenWidth * 2) / 3) {
        touchRight = true;
        touchLeft = false;
      }
      // Top third = jump
      if (y < screenHeight / 3) {
        touchJump = true;
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

  update(): void {
    const touchState = (this as any).touchState;
    const onGround = this.body && (this.body as Phaser.Physics.Arcade.Body).touching.down;

    // Horizontal movement
    let moveLeft = this.keyA?.isDown || this.cursors?.left?.isDown || touchState?.left || false;
    let moveRight = this.keyD?.isDown || this.cursors?.right?.isDown || touchState?.right || false;

    if (moveLeft) {
      this.setVelocityX(-200);
      this.setFlipX(true);
      if (onGround) this.animState = 'running';
    } else if (moveRight) {
      this.setVelocityX(200);
      this.setFlipX(false);
      if (onGround) this.animState = 'running';
    } else {
      this.setVelocityX(0);
      if (onGround) this.animState = 'idle';
    }

    // Jump
    const jumpPressed = this.keySpace?.isDown || this.keyW?.isDown || this.cursors?.space?.isDown || this.cursors?.up?.isDown || touchState?.jump || false;
    if (jumpPressed && onGround) {
      this.setVelocityY(-400);
      this.animState = 'jumping';
    }

    // Update animation state when not on ground
    if (!onGround && this.body && (this.body as Phaser.Physics.Arcade.Body).velocity.y !== 0) {
      this.animState = 'jumping';
    }

    // TODO: Play animations when sprite sheet is loaded
    // For now, just change tint based on state
    switch (this.animState) {
      case 'idle':
        this.setTint(0xff6b9d);
        break;
      case 'running':
        this.setTint(0xff9dc6);
        break;
      case 'jumping':
        this.setTint(0xffc6e3);
        break;
    }
  }
}
