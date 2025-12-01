import Phaser from 'phaser';
import { setBuilderZoomLevel } from '../../stores/builderStores';
import { isTypingInTextField, isPaletteDragging, isPointerOverUI } from '../../utils/inputUtils';

// Zoom constants
const MAX_ZOOM = 1;           // Maximum zoom (1:1 pixels)
const ZOOM_SPEED = 0.001;     // Wheel zoom sensitivity
const ZOOM_LERP = 0.15;       // Lerp factor for smooth zoom
const RESET_DURATION = 400;   // Animation duration for reset-to-fit in ms

/**
 * BuilderCameraController - Handles all camera controls for the builder
 * Continuous zoom system with pinch-to-zoom, wheel zoom, and drag-to-pan
 * 
 * Default state: fit-to-screen (minZoom)
 * Max zoom: 1:1 (MAX_ZOOM = 1)
 */
export class BuilderCameraController {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;
  private worldWidth: number;
  private worldHeight: number;
  
  // Mouse panning state (right/middle click)
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private cameraDragStartX: number = 0;
  private cameraDragStartY: number = 0;
  
  // Drag-and-scroll state (left click)
  private isDraggingToScroll: boolean = false;
  private dragScrollStartX: number = 0;
  private dragScrollStartY: number = 0;
  private dragScrollCameraStartX: number = 0;
  private dragScrollCameraStartY: number = 0;
  
  // Continuous zoom state
  private currentZoom: number = 1;
  private targetZoom: number = 1;
  private minZoom: number = 0.1;  // Will be calculated dynamically
  private isAnimatingReset: boolean = false;
  
  // Pinch zoom state
  private pinchStartDistance: number = 0;
  private pinchStartZoom: number = 1;
  private activeTouches: Map<number, { x: number; y: number }> = new Map();
  private pinchEndTime: number = 0; // Timestamp when pinch ended
  private readonly PINCH_COOLDOWN = 150; // ms to ignore drag after pinch ends

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
    this.calculateMinZoom();
    this.setupCamera();
    this.setupMouseControls();
    this.setupKeyboardControls();
    this.setupUpdateLoop();
  }

  /**
   * Calculate minimum zoom to fit world in screen
   */
  private calculateMinZoom(): void {
    const zoomX = this.camera.width / this.worldWidth;
    const zoomY = this.camera.height / this.worldHeight;
    this.minZoom = Math.min(zoomX, zoomY);
  }

  private setupCamera(): void {
    // Start at fit-to-screen zoom
    this.currentZoom = this.minZoom;
    this.targetZoom = this.minZoom;
    this.camera.setZoom(this.minZoom);
    
    // Calculate view size at current zoom
    const viewWidth = this.camera.width / this.minZoom;
    const viewHeight = this.camera.height / this.minZoom;
    
    // Set bounds to allow centering when world is smaller than view
    // Bounds need to be large enough to allow negative scroll for centering
    const boundsX = Math.min(0, (this.worldWidth - viewWidth) / 2);
    const boundsY = Math.min(0, (this.worldHeight - viewHeight) / 2);
    const boundsW = Math.max(this.worldWidth, viewWidth);
    const boundsH = Math.max(this.worldHeight, viewHeight);
    
    this.camera.setBounds(boundsX, boundsY, boundsW, boundsH);
    
    // Center on world center
    this.camera.centerOn(this.worldWidth / 2, this.worldHeight / 2);
    
    console.log('Setup camera:', {
      minZoom: this.minZoom,
      cameraSize: { w: this.camera.width, h: this.camera.height },
      viewSize: { w: viewWidth, h: viewHeight },
      worldSize: { w: this.worldWidth, h: this.worldHeight },
      bounds: { x: boundsX, y: boundsY, w: boundsW, h: boundsH },
      scroll: { x: this.camera.scrollX, y: this.camera.scrollY },
    });
    
    // Update store
    setBuilderZoomLevel(this.minZoom);
  }

  /**
   * Center camera on specific coordinates
   */
  centerOn(x: number, y: number): void {
    this.camera.centerOn(x, y);
    this.clampScroll();
  }

  /**
   * Handle window resize - recalculate minZoom and clamp
   */
  handleResize(): void {
    this.calculateMinZoom();
    
    // Clamp current zoom to new minZoom
    if (this.currentZoom < this.minZoom) {
      this.currentZoom = this.minZoom;
      this.targetZoom = this.minZoom;
      this.camera.setZoom(this.minZoom);
    }
    if (this.targetZoom < this.minZoom) {
      this.targetZoom = this.minZoom;
    }
    
    // Update bounds for new zoom
    this.updateCameraBounds();
    this.clampScroll();
    setBuilderZoomLevel(this.currentZoom);
  }

  /**
   * Update camera bounds based on current zoom level
   */
  private updateCameraBounds(): void {
    const viewWidth = this.camera.width / this.currentZoom;
    const viewHeight = this.camera.height / this.currentZoom;
    
    // Set bounds to allow centering when world is smaller than view
    const boundsX = Math.min(0, (this.worldWidth - viewWidth) / 2);
    const boundsY = Math.min(0, (this.worldHeight - viewHeight) / 2);
    const boundsW = Math.max(this.worldWidth, viewWidth);
    const boundsH = Math.max(this.worldHeight, viewHeight);
    
    this.camera.setBounds(boundsX, boundsY, boundsW, boundsH);
  }

  /**
   * Get scroll bounds based on current zoom
   */
  private getScrollBounds(): { minX: number; maxX: number; minY: number; maxY: number } {
    const viewWidth = this.camera.width / this.currentZoom;
    const viewHeight = this.camera.height / this.currentZoom;
    
    // When view is larger than world, lock scroll to center
    // When view is smaller than world, allow scrolling within world bounds
    if (viewWidth >= this.worldWidth && viewHeight >= this.worldHeight) {
      // Both dimensions fit - lock to center
      const centerX = (this.worldWidth - viewWidth) / 2;
      const centerY = (this.worldHeight - viewHeight) / 2;
      return { minX: centerX, maxX: centerX, minY: centerY, maxY: centerY };
    }
    
    // At least one dimension needs scrolling
    const minX = viewWidth > this.worldWidth ? (this.worldWidth - viewWidth) / 2 : 0;
    const maxX = viewWidth > this.worldWidth ? minX : this.worldWidth - viewWidth;
    const minY = viewHeight > this.worldHeight ? (this.worldHeight - viewHeight) / 2 : 0;
    const maxY = viewHeight > this.worldHeight ? minY : this.worldHeight - viewHeight;
    
    return { minX, maxX, minY, maxY };
  }

  /**
   * Clamp scroll position to valid bounds
   */
  private clampScroll(): void {
    const bounds = this.getScrollBounds();
    this.camera.scrollX = Phaser.Math.Clamp(this.camera.scrollX, bounds.minX, bounds.maxX);
    this.camera.scrollY = Phaser.Math.Clamp(this.camera.scrollY, bounds.minY, bounds.maxY);
  }

  /**
   * Zoom towards a specific screen point (keeps that world point under cursor)
   */
  private zoomToPoint(screenX: number, screenY: number, newZoom: number): void {
    // Get world point under cursor before zoom
    const worldPointBefore = this.camera.getWorldPoint(screenX, screenY);
    
    // Apply new zoom
    this.currentZoom = newZoom;
    this.camera.setZoom(newZoom);
    
    // Update camera bounds for new zoom level
    this.updateCameraBounds();
    
    // Get world point under cursor after zoom
    const worldPointAfter = this.camera.getWorldPoint(screenX, screenY);
    
    // Adjust scroll to keep the same world point under cursor
    this.camera.scrollX += worldPointBefore.x - worldPointAfter.x;
    this.camera.scrollY += worldPointBefore.y - worldPointAfter.y;
    
    this.clampScroll();
    setBuilderZoomLevel(this.currentZoom);
  }

  private setupMouseControls(): void {
    // Mouse wheel - zoom or pan based on modifier keys
    this.scene.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: any[], deltaX: number, deltaY: number, _deltaZ: number) => {
      if (this.isAnimatingReset) return;
      
      // Detect zoom gesture:
      // - ctrlKey = trackpad pinch (browser sends this)
      // - pure vertical scroll without horizontal = likely mouse wheel
      const isZoomGesture = pointer.event.ctrlKey || (Math.abs(deltaX) < 5 && Math.abs(deltaY) > 0);
      
      if (isZoomGesture && !pointer.event.ctrlKey) {
        // Mouse wheel zoom
        const zoomDelta = -deltaY * ZOOM_SPEED * 3; // Multiply for more responsive wheel
        this.targetZoom = Phaser.Math.Clamp(this.targetZoom + zoomDelta, this.minZoom, MAX_ZOOM);
      } else if (pointer.event.ctrlKey) {
        // Trackpad pinch zoom (ctrlKey is set by browser for pinch)
        const zoomDelta = -deltaY * ZOOM_SPEED;
        const newZoom = Phaser.Math.Clamp(this.currentZoom + zoomDelta, this.minZoom, MAX_ZOOM);
        this.targetZoom = newZoom;
        // Apply immediately for pinch feel
        this.zoomToPoint(pointer.x, pointer.y, newZoom);
      } else {
        // Regular trackpad pan (two-finger scroll)
        const bounds = this.getScrollBounds();
        this.camera.scrollX = Phaser.Math.Clamp(
          this.camera.scrollX + deltaX / this.currentZoom,
          bounds.minX,
          bounds.maxX
        );
        this.camera.scrollY = Phaser.Math.Clamp(
          this.camera.scrollY + deltaY / this.currentZoom,
          bounds.minY,
          bounds.maxY
        );
      }
    });

    // Pointer down - detect panning or drag-scroll, track touches for pinch
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Track touch for pinch detection
      if (pointer.wasTouch) {
        this.activeTouches.set(pointer.id, { x: pointer.x, y: pointer.y });
        console.log('Touch down:', pointer.id, 'Total touches:', this.activeTouches.size);
        
        // Start pinch when we have 2 touches
        if (this.activeTouches.size === 2) {
          console.log('Starting pinch!');
          this.startPinch();
          return;
        }
      }
      
      // Skip if pointer is over UI element
      if (isPointerOverUI()) return;
      
      // Disable panning when dragging from palette or during reset animation
      if (isPaletteDragging() || this.isAnimatingReset) return;
      
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
        this.cameraDragStartX = this.camera.scrollX;
        this.cameraDragStartY = this.camera.scrollY;
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

    // Pointer move - handle panning, drag-scroll, and pinch zoom
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Update touch position for pinch
      if (pointer.wasTouch && this.activeTouches.has(pointer.id)) {
        this.activeTouches.set(pointer.id, { x: pointer.x, y: pointer.y });
        
        // Handle pinch if we have 2 touches
        if (this.activeTouches.size === 2) {
          this.handlePinch();
          return;
        }
        
        // Skip touch drag if we're in pinch cooldown (prevents jump when ending pinch)
        if (Date.now() - this.pinchEndTime < this.PINCH_COOLDOWN) {
          return;
        }
      }
      
      // Disable panning when dragging from palette or during reset
      if (isPaletteDragging() || this.isAnimatingReset) return;
      
      const bounds = this.getScrollBounds();
      
      if (this.isPanning) {
        const deltaX = (pointer.x - this.panStartX) / this.currentZoom;
        const deltaY = (pointer.y - this.panStartY) / this.currentZoom;
        
        this.camera.scrollX = Phaser.Math.Clamp(
          this.cameraDragStartX - deltaX,
          bounds.minX,
          bounds.maxX
        );
        this.camera.scrollY = Phaser.Math.Clamp(
          this.cameraDragStartY - deltaY,
          bounds.minY,
          bounds.maxY
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
        const deltaX = (pointer.x - this.dragScrollStartX) / this.currentZoom;
        const deltaY = (pointer.y - this.dragScrollStartY) / this.currentZoom;
        
        this.camera.scrollX = Phaser.Math.Clamp(
          this.dragScrollCameraStartX - deltaX,
          bounds.minX,
          bounds.maxX
        );
        this.camera.scrollY = Phaser.Math.Clamp(
          this.dragScrollCameraStartY - deltaY,
          bounds.minY,
          bounds.maxY
        );
      }
    });

    // Pointer up - stop panning/drag-scroll, end pinch
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Remove touch from tracking
      if (pointer.wasTouch) {
        // If we were pinching (had 2 touches), record end time
        if (this.activeTouches.size === 2) {
          this.pinchEndTime = Date.now();
        }
        this.activeTouches.delete(pointer.id);
      }
      
      if (!pointer.rightButtonDown() && !pointer.middleButtonDown()) {
        this.isPanning = false;
      }
      
      if (this.isDraggingToScroll) {
        this.isDraggingToScroll = false;
        this.scene.input.setDefaultCursor('default');
      }
    });
    
    // Pointer out - clean up touches that leave the canvas
    this.scene.input.on('pointerout', (pointer: Phaser.Input.Pointer) => {
      if (pointer.wasTouch) {
        this.activeTouches.delete(pointer.id);
      }
    });
  }

  /**
   * Start pinch gesture tracking
   */
  private startPinch(): void {
    const touches = Array.from(this.activeTouches.values());
    if (touches.length !== 2) return;
    
    const [t1, t2] = touches;
    this.pinchStartDistance = Math.hypot(t2.x - t1.x, t2.y - t1.y);
    this.pinchStartZoom = this.currentZoom;
  }

  /**
   * Handle pinch gesture update
   */
  private handlePinch(): void {
    const touches = Array.from(this.activeTouches.values());
    if (touches.length !== 2) return;
    
    const [t1, t2] = touches;
    const currentDistance = Math.hypot(t2.x - t1.x, t2.y - t1.y);
    const midX = (t1.x + t2.x) / 2;
    const midY = (t1.y + t2.y) / 2;
    
    // Calculate zoom change
    const scale = currentDistance / this.pinchStartDistance;
    const newZoom = Phaser.Math.Clamp(this.pinchStartZoom * scale, this.minZoom, MAX_ZOOM);
    
    console.log('Pinch:', { scale, newZoom, currentDistance, startDistance: this.pinchStartDistance });
    
    // Apply zoom towards pinch midpoint
    this.targetZoom = newZoom;
    this.zoomToPoint(midX, midY, newZoom);
  }

  private setupKeyboardControls(): void {
    // Arrow keys
    const arrowKeys = {
      up: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.UP, false),
      down: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN, false),
      left: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT, false),
      right: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT, false),
    };
    // WASD
    const wasdKeys = {
      w: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      a: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      s: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      d: this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
    };
    
    // Spacebar to center on player
    const spaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false);
    spaceKey.on('down', () => {
      if (isTypingInTextField()) return;
      this.centerOnPlayer();
    });
    
    // F key to reset zoom to fit
    const fKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F, false);
    fKey.on('down', () => {
      if (isTypingInTextField()) return;
      this.resetToFit();
    });
    
    // Store keys for update loop
    this.scene.data.set('cameraArrowKeys', arrowKeys);
    this.scene.data.set('cameraWasdKeys', wasdKeys);
  }

  /**
   * Setup the update loop for lerp smoothing and keyboard panning
   */
  private setupUpdateLoop(): void {
    const arrowKeys = this.scene.data.get('cameraArrowKeys');
    const wasdKeys = this.scene.data.get('cameraWasdKeys');
    
    this.scene.events.on('update', () => {
      // Apply zoom lerp (smooth zoom towards target)
      if (!this.isAnimatingReset && Math.abs(this.currentZoom - this.targetZoom) > 0.0001) {
        const newZoom = Phaser.Math.Linear(this.currentZoom, this.targetZoom, ZOOM_LERP);
        
        // Zoom towards screen center for wheel zoom
        this.zoomToPoint(this.camera.width / 2, this.camera.height / 2, newZoom);
      }
      
      // Ignore keyboard panning when typing
      if (isTypingInTextField() || this.isAnimatingReset) return;
      
      const panSpeed = 10 / this.currentZoom; // Adjust pan speed for zoom level
      const bounds = this.getScrollBounds();

      // Horizontal movement (A/D or Left/Right arrows)
      if (arrowKeys?.left?.isDown || wasdKeys?.a?.isDown) {
        this.camera.scrollX = Phaser.Math.Clamp(
          this.camera.scrollX - panSpeed,
          bounds.minX,
          bounds.maxX
        );
      } else if (arrowKeys?.right?.isDown || wasdKeys?.d?.isDown) {
        this.camera.scrollX = Phaser.Math.Clamp(
          this.camera.scrollX + panSpeed,
          bounds.minX,
          bounds.maxX
        );
      }

      // Vertical movement (W/S or Up/Down arrows)
      if (arrowKeys?.up?.isDown || wasdKeys?.w?.isDown) {
        this.camera.scrollY = Phaser.Math.Clamp(
          this.camera.scrollY - panSpeed,
          bounds.minY,
          bounds.maxY
        );
      } else if (arrowKeys?.down?.isDown || wasdKeys?.s?.isDown) {
        this.camera.scrollY = Phaser.Math.Clamp(
          this.camera.scrollY + panSpeed,
          bounds.minY,
          bounds.maxY
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
      this.clampScroll();
    }
  }

  /**
   * Check if player or any object is being dragged
   */
  private isDraggingObject(): boolean {
    return this.scene.data.get('isDraggingObject') === true;
  }

  /**
   * Get current zoom level (0 to 1, where minZoom is fit-to-screen and 1 is 1:1)
   */
  getZoomLevel(): number {
    return this.currentZoom;
  }

  /**
   * Get minimum zoom (fit-to-screen)
   */
  getMinZoom(): number {
    return this.minZoom;
  }

  /**
   * Check if currently at minimum zoom (fit view)
   */
  isAtMinZoom(): boolean {
    return Math.abs(this.currentZoom - this.minZoom) < 0.001;
  }

  /**
   * Reset zoom to fit-to-screen with animation
   */
  resetToFit(): void {
    if (this.isAnimatingReset) return;
    
    this.isAnimatingReset = true;
    this.targetZoom = this.minZoom;
    
    // Calculate target scroll position to center world in viewport
    const viewWidth = this.camera.width / this.minZoom;
    const viewHeight = this.camera.height / this.minZoom;
    const targetScrollX = (this.worldWidth - viewWidth) / 2;
    const targetScrollY = (this.worldHeight - viewHeight) / 2;
    
    // Calculate center point for pan animation (convert scroll to center point)
    const centerX = targetScrollX + viewWidth / 2;
    const centerY = targetScrollY + viewHeight / 2;
    
    // Animate pan to center and zoom to fit
    this.camera.pan(centerX, centerY, RESET_DURATION, 'Sine.easeInOut');
    this.camera.zoomTo(this.minZoom, RESET_DURATION, 'Sine.easeInOut', false, (_cam, progress) => {
      if (progress === 1) {
        this.currentZoom = this.minZoom;
        // Ensure correct scroll position after animation
        this.camera.scrollX = targetScrollX;
        this.camera.scrollY = targetScrollY;
        this.isAnimatingReset = false;
        setBuilderZoomLevel(this.minZoom);
      }
    });
  }

  /**
   * Cleanup when destroying
   */
  destroy(): void {
    this.activeTouches.clear();
    // Input handlers are automatically cleaned up by Phaser when scene shuts down
  }
}
