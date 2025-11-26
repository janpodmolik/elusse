import Phaser from 'phaser';

// Zoom constants
const MIN_ZOOM = 0.3;  // Minimum zoom (zoomed out) - keeps text readable
const DEFAULT_ZOOM = 1; // Normal zoom level
const ZOOM_DURATION = 400; // Animation duration in ms

/**
 * BuilderCameraController - Handles all camera controls for the builder
 * Includes mouse wheel, drag-to-pan, keyboard controls (arrows + WASD)
 */
export class BuilderCameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private worldWidth: number;
  private worldHeight: number;
  
  // Mouse panning state (right/middle click)
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private cameraDragStartX: number = 0;
  
  // Drag-and-scroll state (left click)
  private isDraggingToScroll: boolean = false;
  private dragScrollStartX: number = 0;
  private dragScrollStartY: number = 0;
  private dragScrollCameraStartX: number = 0;
  private dragScrollCameraStartY: number = 0;
  
  // Zoom state
  private isZoomedOut: boolean = false;
  private savedScrollX: number = 0;
  private savedScrollY: number = 0;
  
  // Callback for zoom state changes
  private onZoomChange?: (isZoomedOut: boolean) => void;

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.camera = scene.cameras.main;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  /**
   * Initialize camera and all input handlers
   */
  setup(): void {
    this.setupCamera();
    this.setupMouseControls();
    this.setupKeyboardControls();
  }

  private setupCamera(): void {
    this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
    this.camera.setZoom(1);
  }

  /**
   * Center camera on specific coordinates
   */
  centerOn(x: number, y: number): void {
    this.camera.centerOn(x, y);
  }

  private setupMouseControls(): void {
    // Mouse wheel for horizontal scrolling
    this.scene.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: any[], deltaX: number, deltaY: number) => {
      // Disable scrolling when zoomed out
      if (this.isZoomedOut) return;
      
      const scrollAmount = deltaX !== 0 ? deltaX : deltaY;
      const newScrollX = this.camera.scrollX + scrollAmount;
      
      this.camera.setScroll(
        Phaser.Math.Clamp(newScrollX, 0, this.worldWidth - this.camera.width),
        this.camera.scrollY
      );
    });

    // Pointer down - detect right/middle click panning or left-click drag-scroll
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Disable all camera panning/dragging when zoomed out
      if (this.isZoomedOut) return;
      
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.cameraDragStartX = this.camera.scrollX;
      } else if (pointer.leftButtonDown() && !this.isDraggingObject()) {
        // Left-click drag-and-scroll (only if not dragging an object)
        const isDraggingItem = this.scene.data.get('isDraggingItem') === true;
        if (!isDraggingItem) {
          this.dragScrollStartX = pointer.x;
          this.dragScrollStartY = pointer.y;
          this.dragScrollCameraStartX = this.camera.scrollX;
          this.dragScrollCameraStartY = this.camera.scrollY;
        }
      }
    });

    // Pointer move - handle panning and drag-scroll
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Disable all camera movement when zoomed out
      if (this.isZoomedOut) return;
      
      if (this.isPanning) {
        const deltaX = pointer.x - this.panStartX;
        const newScrollX = this.cameraDragStartX - deltaX;
        
        this.camera.setScroll(
          Phaser.Math.Clamp(newScrollX, 0, this.worldWidth - this.camera.width),
          this.camera.scrollY
        );
      } else if (pointer.leftButtonDown() && !this.isDraggingToScroll && !this.isDraggingObject()) {
        // Check if we've moved enough to start drag-and-scroll
        const isDraggingItem = this.scene.data.get('isDraggingItem') === true;
        if (!isDraggingItem) {
          const deltaX = Math.abs(pointer.x - this.dragScrollStartX);
          const deltaY = Math.abs(pointer.y - this.dragScrollStartY);
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          if (distance > 10) {
            this.isDraggingToScroll = true;
            this.scene.input.setDefaultCursor('grabbing');
          }
        }
      }
      
      if (this.isDraggingToScroll) {
        const deltaX = pointer.x - this.dragScrollStartX;
        const deltaY = pointer.y - this.dragScrollStartY;
        
        const newScrollX = this.dragScrollCameraStartX - deltaX;
        const newScrollY = this.dragScrollCameraStartY - deltaY;
        
        this.camera.setScroll(
          Phaser.Math.Clamp(newScrollX, 0, this.worldWidth - this.camera.width),
          Phaser.Math.Clamp(newScrollY, 0, this.worldHeight - this.camera.height)
        );
      }
    });

    // Pointer up - stop panning/drag-scroll
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) {
        this.isPanning = false;
      }
      
      if (this.isDraggingToScroll) {
        this.isDraggingToScroll = false;
        this.scene.input.setDefaultCursor('default');
      }
    });
  }

  private setupKeyboardControls(): void {
    // Arrow keys and WASD
    const cursors = this.scene.input.keyboard!.createCursorKeys();
    const wasdKeys = {
      w: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      a: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      s: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      d: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    
    // Spacebar to center on player (disabled when zoomed out)
    const spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.on('down', () => {
      if (this.isZoomedOut) return;
      this.centerOnPlayer();
    });
    
    // F key to toggle zoom-to-fit
    const fKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    fKey.on('down', () => {
      this.toggleZoomToFit();
    });
    
    this.scene.events.on('update', () => {
      // Disable keyboard panning when zoomed out
      if (this.isZoomedOut) return;
      
      const panSpeed = 10;

      // Horizontal movement (A/D or Left/Right arrows)
      if (cursors.left!.isDown || wasdKeys.a.isDown) {
        this.camera.scrollX = Math.max(0, this.camera.scrollX - panSpeed);
      } else if (cursors.right!.isDown || wasdKeys.d.isDown) {
        this.camera.scrollX = Math.min(
          this.worldWidth - this.camera.width,
          this.camera.scrollX + panSpeed
        );
      }

      // Vertical movement (W/S or Up/Down arrows)
      if (cursors.up!.isDown || wasdKeys.w.isDown) {
        this.camera.scrollY = Math.max(0, this.camera.scrollY - panSpeed);
      } else if (cursors.down!.isDown || wasdKeys.s.isDown) {
        this.camera.scrollY = Math.min(
          this.worldHeight - this.camera.height,
          this.camera.scrollY + panSpeed
        );
      }
    });
  }

  /**
   * Center camera on player sprite (triggered by spacebar)
   */
  private centerOnPlayer(): void {
    const playerSprite = this.scene.data.get('playerSprite') as Phaser.GameObjects.Sprite | undefined;
    if (playerSprite) {
      this.camera.centerOn(playerSprite.x, playerSprite.y);
    }
  }

  /**
   * Check if player or any object is being dragged
   */
  private isDraggingObject(): boolean {
    return this.scene.data.get('isDraggingObject') === true;
  }

  /**
   * Set callback for zoom state changes
   */
  setOnZoomChange(callback: (isZoomedOut: boolean) => void): void {
    this.onZoomChange = callback;
  }

  /**
   * Get current zoom state
   */
  getIsZoomedOut(): boolean {
    return this.isZoomedOut;
  }

  /**
   * Toggle between zoomed-out overview and normal view
   */
  toggleZoomToFit(): void {
    if (this.isZoomedOut) {
      this.resetZoom();
    } else {
      this.zoomToFit();
    }
  }

  /**
   * Zoom out to show the entire map
   */
  zoomToFit(): void {
    if (this.isZoomedOut) return;
    
    // Save current position for return
    this.savedScrollX = this.camera.scrollX;
    this.savedScrollY = this.camera.scrollY;
    
    // Calculate zoom level to fit entire map
    const zoomX = this.camera.width / this.worldWidth;
    const zoomY = this.camera.height / this.worldHeight;
    let targetZoom = Math.min(zoomX, zoomY);
    
    // Clamp to minimum zoom for readability
    targetZoom = Math.max(targetZoom, MIN_ZOOM);
    
    // Calculate center of the map
    const centerX = this.worldWidth / 2;
    const centerY = this.worldHeight / 2;
    
    // Temporarily remove camera bounds for zooming out
    this.camera.removeBounds();
    
    // Animate zoom and pan to center
    this.camera.pan(centerX, centerY, ZOOM_DURATION, 'Sine.easeInOut');
    this.camera.zoomTo(targetZoom, ZOOM_DURATION, 'Sine.easeInOut', false, (_cam, progress) => {
      if (progress === 1) {
        this.isZoomedOut = true;
        this.onZoomChange?.(true);
      }
    });
  }

  /**
   * Reset zoom to normal (1:1) and restore previous position
   */
  resetZoom(): void {
    if (!this.isZoomedOut) return;
    
    // Animate back to saved position and normal zoom
    const targetX = this.savedScrollX + this.camera.width / 2;
    const targetY = this.savedScrollY + this.camera.height / 2;
    
    this.camera.pan(targetX, targetY, ZOOM_DURATION, 'Sine.easeInOut');
    this.camera.zoomTo(DEFAULT_ZOOM, ZOOM_DURATION, 'Sine.easeInOut', false, (_cam, progress) => {
      if (progress === 1) {
        // Restore camera bounds after zoom completes
        this.camera.setBounds(0, 0, this.worldWidth, this.worldHeight);
        this.isZoomedOut = false;
        this.onZoomChange?.(false);
      }
    });
  }

  /**
   * Cleanup when destroying
   */
  destroy(): void {
    // Input handlers are automatically cleaned up by Phaser when scene shuts down
  }
}
