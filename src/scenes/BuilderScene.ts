import Phaser from 'phaser';
import { loadBackgroundAssets } from './BackgroundLoader';
import { createParallaxBackground, updateParallaxTiling, destroyParallaxLayers, type ParallaxLayers } from './ParallaxHelper';
import { updatePlayerPosition } from '../stores/builderStores';
import { backgroundManager } from '../data/background';
import type { MapConfig } from '../data/mapConfig';

/**
 * BuilderScene - Interactive map builder with visual editor
 * Allows drag & drop positioning of player, grid overlay, and live preview
 */
export class BuilderScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private parallaxLayers: ParallaxLayers | null = null;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  
  // Current builder configuration
  private config!: MapConfig;
  
  // Camera pan state
  private isPanningCamera: boolean = false;
  private panStartX: number = 0;
  private cameraDragStartX: number = 0;

  constructor() {
    super({ key: 'BuilderScene' });
  }

  init(data: { config: MapConfig }): void {
    this.config = data.config;
  }

  preload(): void {
    // Load player sprites (orange skin for preview)
    this.load.spritesheet('cat-idle-orange', 'assets/sprites/orange/Idle.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
  }

  create(): void {
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);

    // Load and create background
    this.createBackground();

    // Create grid overlay
    this.createGrid();

    // Create ground visual reference
    this.createGroundReference();

    // Create player sprite (non-physics, just visual)
    this.createPlayerSprite();

    // Setup camera
    this.setupCamera();

    // Setup input handlers
    this.setupInput();
  }

  private async createBackground(): Promise<void> {
    const config = backgroundManager.getCurrentConfig();
    
    // Load background assets if not already loaded
    try {
      await loadBackgroundAssets(this, config);
    } catch (error) {
      console.error('Failed to load background:', error);
      return;
    }

    // Destroy existing layers
    if (this.parallaxLayers) {
      destroyParallaxLayers(this.parallaxLayers);
      this.parallaxLayers = null;
    }

    // Create new parallax layers using shared helper
    this.parallaxLayers = createParallaxBackground(
      this,
      this.config.worldWidth,
      this.config.worldHeight,
      config
    );
  }

  private createGrid(): void {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.setDepth(1000); // On top of everything
    this.drawGrid();
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x00ff00, 0.3);

    const gridSize = 100;
    const viewportHeight = Math.max(this.config.worldHeight, this.scale.height);

    // Vertical lines
    for (let x = 0; x <= this.config.worldWidth; x += gridSize) {
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(x, 0);
      this.gridGraphics.lineTo(x, viewportHeight);
      this.gridGraphics.strokePath();
    }

    // Horizontal lines
    for (let y = 0; y <= viewportHeight; y += gridSize) {
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(0, y);
      this.gridGraphics.lineTo(this.config.worldWidth, y);
      this.gridGraphics.strokePath();
    }

    // Highlight ground level
    const groundY = this.config.worldHeight - 40;
    this.gridGraphics.lineStyle(2, 0xff0000, 0.6);
    this.gridGraphics.beginPath();
    this.gridGraphics.moveTo(0, groundY);
    this.gridGraphics.lineTo(this.config.worldWidth, groundY);
    this.gridGraphics.strokePath();
    
    // Extend ground reference area to full viewport height
    this.gridGraphics.lineStyle(1, 0xff0000, 0.2);
    this.gridGraphics.fillStyle(0xff0000, 0.1);
    this.gridGraphics.fillRect(0, groundY, this.config.worldWidth, viewportHeight - groundY);
  }

  private createGroundReference(): void {
    const groundHeight = 40;
    const groundY = this.config.worldHeight - groundHeight;
    
    const ground = this.add.rectangle(
      0,
      groundY,
      this.config.worldWidth,
      groundHeight,
      0x8b7355,
      0.3
    );
    ground.setOrigin(0, 0);
    ground.setDepth(-1);
  }

  private createPlayerSprite(): void {
    this.player = this.add.sprite(
      this.config.playerStartX,
      this.config.playerStartY,
      'cat-idle-orange',
      0
    );
    this.player.setScale(5);
    this.player.setDepth(10);
    this.player.setInteractive({ draggable: true, cursor: 'grab' });

    // Add visual indicator that player is draggable
    const circle = this.add.circle(0, 0, 8, 0x00ff00, 0.8);
    circle.setDepth(11);
    
    // Update circle position with player
    this.events.on('update', () => {
      circle.setPosition(this.player.x, this.player.y - 140);
    });

    // Drag events
    this.player.on('dragstart', this.onPlayerDragStart, this);
    this.player.on('drag', this.onPlayerDrag, this);
    this.player.on('dragend', this.onPlayerDragEnd, this);
  }

  private onPlayerDragStart(): void {
    this.player.setTint(0x00ff00);
  }

  private onPlayerDrag(_pointer: Phaser.Input.Pointer, dragX: number, dragY: number): void {
    // Constrain to world bounds
    const x = Phaser.Math.Clamp(dragX, 50, this.config.worldWidth - 50);
    const y = Phaser.Math.Clamp(dragY, 50, this.config.worldHeight - 50);
    
    this.player.setPosition(x, y);
    
    // Update store in real-time during drag
    updatePlayerPosition(Math.round(x), Math.round(y));
  }

  private onPlayerDragEnd(): void {
    this.player.clearTint();
    
    // Update builder store with new position
    updatePlayerPosition(
      Math.round(this.player.x),
      Math.round(this.player.y)
    );
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    camera.setBounds(0, 0, this.config.worldWidth, this.config.worldHeight);
    camera.setZoom(1);
    
    // Start camera centered on player
    camera.centerOn(this.config.playerStartX, this.config.worldHeight / 2);
  }

  private setupInput(): void {
    // Mouse wheel for horizontal scrolling (both horizontal wheel and shift+vertical wheel)
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], deltaX: number, deltaY: number) => {
      const camera = this.cameras.main;
      
      // Use horizontal delta if available, otherwise use vertical delta (inverted for natural scrolling)
      const scrollAmount = deltaX !== 0 ? deltaX : deltaY;
      const newScrollX = camera.scrollX + scrollAmount;
      
      camera.setScroll(
        Phaser.Math.Clamp(newScrollX, 0, this.config.worldWidth - camera.width),
        camera.scrollY
      );
    });

    // Right-click or middle-mouse to pan camera
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isPanningCamera = true;
        this.panStartX = pointer.x;
        this.cameraDragStartX = this.cameras.main.scrollX;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanningCamera) {
        const deltaX = pointer.x - this.panStartX;
        const newScrollX = this.cameraDragStartX - deltaX;
        
        this.cameras.main.setScroll(
          Phaser.Math.Clamp(newScrollX, 0, this.config.worldWidth - this.cameras.main.width),
          this.cameras.main.scrollY
        );
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) {
        this.isPanningCamera = false;
      }
    });

    // Arrow keys for camera panning
    const cursors = this.input.keyboard!.createCursorKeys();
    this.events.on('update', () => {
      const camera = this.cameras.main;
      const panSpeed = 10;

      if (cursors.left!.isDown) {
        camera.scrollX = Math.max(0, camera.scrollX - panSpeed);
      } else if (cursors.right!.isDown) {
        camera.scrollX = Math.min(
          this.config.worldWidth - camera.width,
          camera.scrollX + panSpeed
        );
      }

      if (cursors.up!.isDown) {
        camera.scrollY = Math.max(0, camera.scrollY - panSpeed);
      } else if (cursors.down!.isDown) {
        camera.scrollY = Math.min(
          this.config.worldHeight - camera.height,
          camera.scrollY + panSpeed
        );
      }
    });
  }

  update(): void {
    // Update base layer tiling for infinite scrolling effect
    if (this.parallaxLayers) {
      updateParallaxTiling(this.parallaxLayers.baseLayer, this.cameras.main);
    }
  }
}
