import Phaser from 'phaser';
import { setPinchingInBuilder } from '../../stores/builderStores';
import { setBuilderZoomLevel } from '../../stores/gameStores';
import { isTypingInTextField, isPaletteDragging, isPointerOverUI } from '../../utils/inputUtils';
import { isTouchOnSelectedSprite } from '../../items/ItemSelectionManager';

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
  private zoomTargetWorldPoint: { x: number; y: number } | null = null; // World point to zoom towards
  
  // Pinch zoom state
  private pinchStartDistance: number = 0;
  private pinchStartZoom: number = 1;
  private activeTouches: Map<number, { x: number; y: number }> = new Map();
  private pinchEndTime: number = 0; // Timestamp when pinch ended
  private isPinching: boolean = false; // Whether pinch is currently active
  private readonly PINCH_COOLDOWN = 150; // ms to ignore drag after pinch ends
  
  // Touch tap detection
  private touchStartTime: number = 0;
  private touchStartPos: { x: number; y: number } | null = null;
  private touchOnSelectedSprite: boolean = false; // Whether touch started on a selected sprite
  private readonly TAP_MAX_DURATION = 200; // ms - max time for a tap
  private readonly TAP_MAX_DISTANCE = 10; // pixels - max movement for a tap

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
   * Set camera position and zoom (for restoring saved state)
   */
  setPosition(scrollX: number, scrollY: number, zoom: number): void {
    this.currentZoom = Phaser.Math.Clamp(zoom, this.minZoom, MAX_ZOOM);
    this.targetZoom = this.currentZoom;
    this.camera.setZoom(this.currentZoom);
    this.camera.scrollX = scrollX;
    this.camera.scrollY = scrollY;
    this.clampScroll();
    setBuilderZoomLevel(this.currentZoom);
  }

  /**
   * Get current camera position and zoom
   */
  getPosition(): { scrollX: number; scrollY: number; zoom: number } {
    return {
      scrollX: this.camera.scrollX,
      scrollY: this.camera.scrollY,
      zoom: this.currentZoom
    };
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
   * @param forCentering - if true, returns bounds that force centering when view > world
   */
  private getScrollBounds(forCentering: boolean = true): { minX: number; maxX: number; minY: number; maxY: number } {
    const viewWidth = this.camera.width / this.currentZoom;
    const viewHeight = this.camera.height / this.currentZoom;
    
    let minX: number, maxX: number, minY: number, maxY: number;
    
    if (viewWidth > this.worldWidth) {
      if (forCentering) {
        // Lock to center
        minX = maxX = (this.worldWidth - viewWidth) / 2;
      } else {
        // Allow freedom - world can be anywhere in view
        minX = this.worldWidth - viewWidth;
        maxX = 0;
      }
    } else {
      minX = 0;
      maxX = this.worldWidth - viewWidth;
    }
    
    if (viewHeight > this.worldHeight) {
      if (forCentering) {
        minY = maxY = (this.worldHeight - viewHeight) / 2;
      } else {
        minY = this.worldHeight - viewHeight;
        maxY = 0;
      }
    } else {
      minY = 0;
      maxY = this.worldHeight - viewHeight;
    }
    
    return { minX, maxX, minY, maxY };
  }

  /**
   * Clamp scroll position to valid bounds (forces centering when view > world)
   */
  private clampScroll(): void {
    const bounds = this.getScrollBounds(true);
    this.camera.scrollX = Phaser.Math.Clamp(this.camera.scrollX, bounds.minX, bounds.maxX);
    this.camera.scrollY = Phaser.Math.Clamp(this.camera.scrollY, bounds.minY, bounds.maxY);
  }
  
  /**
   * Soft clamp - only prevents scrolling beyond world edges, doesn't force centering
   */
  private softClampScroll(): void {
    const bounds = this.getScrollBounds(false);
    this.camera.scrollX = Phaser.Math.Clamp(this.camera.scrollX, bounds.minX, bounds.maxX);
    this.camera.scrollY = Phaser.Math.Clamp(this.camera.scrollY, bounds.minY, bounds.maxY);
  }
  
  /**
   * Apply pan delta from drag gesture
   */
  private applyPanDelta(currentX: number, currentY: number, startX: number, startY: number, cameraStartX: number, cameraStartY: number): void {
    const bounds = this.getScrollBounds();
    const deltaX = (currentX - startX) / this.currentZoom;
    const deltaY = (currentY - startY) / this.currentZoom;
    this.camera.scrollX = Phaser.Math.Clamp(cameraStartX - deltaX, bounds.minX, bounds.maxX);
    this.camera.scrollY = Phaser.Math.Clamp(cameraStartY - deltaY, bounds.minY, bounds.maxY);
  }

  /**
   * Zoom towards a specific screen point (keeps that world point under cursor)
   */
  private zoomToPoint(screenX: number, screenY: number, newZoom: number): void {
    const worldPoint = this.camera.getWorldPoint(screenX, screenY);
    this.zoomToWorldPoint(worldPoint.x, worldPoint.y, newZoom);
  }
  
  /**
   * Zoom towards a specific world point
   */
  private zoomToWorldPoint(worldX: number, worldY: number, newZoom: number): void {
    const oldScrollX = this.camera.scrollX;
    const oldScrollY = this.camera.scrollY;
    const oldZoom = this.currentZoom;
    
    // Apply new zoom
    this.currentZoom = newZoom;
    this.camera.setZoom(newZoom);
    this.updateCameraBounds();
    
    // Calculate new scroll to keep world point at same screen position
    this.camera.scrollX = worldX - (worldX - oldScrollX) * oldZoom / newZoom;
    this.camera.scrollY = worldY - (worldY - oldScrollY) * oldZoom / newZoom;
    
    this.softClampScroll();
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
        // Mouse wheel zoom - store cursor world position for zoom target
        const zoomDelta = -deltaY * ZOOM_SPEED * 3; // Multiply for more responsive wheel
        this.targetZoom = Phaser.Math.Clamp(this.targetZoom + zoomDelta, this.minZoom, MAX_ZOOM);
        // Store the world position under cursor to zoom towards
        const worldPoint = this.camera.getWorldPoint(pointer.x, pointer.y);
        this.zoomTargetWorldPoint = { x: worldPoint.x, y: worldPoint.y };
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
        
        // Start pinch when we have 2 touches
        if (this.activeTouches.size === 2) {
          this.isPinching = true;
          this.startPinch();
          // Cancel any touch pan/drag that might have started
          this.touchStartPos = null;
          this.touchOnSelectedSprite = false;
          this.scene.data.set('touchDraggingSprite', false);
          return;
        }
        
        // Single touch - record start for tap detection
        // Don't start pan immediately, wait for movement
        if (this.activeTouches.size === 1 && !this.isPinching) {
          this.touchStartTime = Date.now();
          this.touchStartPos = { x: pointer.x, y: pointer.y };
          this.dragScrollStartX = pointer.x;
          this.dragScrollStartY = pointer.y;
          this.dragScrollCameraStartX = this.camera.scrollX;
          this.dragScrollCameraStartY = this.camera.scrollY;
          
          // Check if touch is on a selected sprite - if so, allow drag instead of pan
          // Uses centralized isTouchOnSelectedSprite from ItemSelectionManager
          this.touchOnSelectedSprite = isTouchOnSelectedSprite(this.scene, pointer);
          this.scene.data.set('touchDraggingSprite', false); // Will be set true if drag starts
          this.scene.data.set('touchStartOnSelectedSprite', this.touchOnSelectedSprite);
          this.scene.data.set('touchStartWorldX', pointer.worldX);
          this.scene.data.set('touchStartWorldY', pointer.worldY);
        }
        return; // Don't process further for touch - wait for move/up
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
      // Touch handling
      if (pointer.wasTouch) {
        // Update touch position
        if (this.activeTouches.has(pointer.id)) {
          this.activeTouches.set(pointer.id, { x: pointer.x, y: pointer.y });
        }
        
        // Handle pinch if we have 2+ touches
        if (this.activeTouches.size >= 2 && this.isPinching) {
          this.handlePinch();
          return;
        }
        
        // Skip if pinching or in cooldown
        if (this.isPinching || Date.now() - this.pinchEndTime < this.PINCH_COOLDOWN) {
          return;
        }
        
        // If sprite is being dragged by touch, don't do pan
        if (this.scene.data.get('touchDraggingSprite')) {
          return;
        }
        
        // Single touch - check if we should start pan or sprite drag
        if (this.touchStartPos && !this.isDraggingToScroll) {
          const deltaX = Math.abs(pointer.x - this.touchStartPos.x);
          const deltaY = Math.abs(pointer.y - this.touchStartPos.y);
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          // Check if it's not a tap (moved too much)
          if (distance > this.TAP_MAX_DISTANCE) {
            // If touch started on selected sprite, let sprite handle drag
            if (this.touchOnSelectedSprite) {
              // Signal to spriteInteraction that drag should start
              this.scene.data.set('touchDragStarted', true);
              this.scene.data.set('touchDraggingSprite', true);
              this.touchStartPos = null;
              return;
            }
            
            // Not over UI and not dragging object? Start pan
            if (!isPointerOverUI() && !this.isDraggingObject() && !this.scene.data.get('isDraggingItem')) {
              this.isDraggingToScroll = true;
              this.touchStartPos = null; // No longer a potential tap
            }
          }
        }
        
        // Apply touch pan
        if (this.isDraggingToScroll) {
          this.applyPanDelta(pointer.x, pointer.y, this.dragScrollStartX, this.dragScrollStartY, this.dragScrollCameraStartX, this.dragScrollCameraStartY);
        }
        return;
      }
      
      // Desktop mouse handling
      // Disable panning when dragging from palette or during reset
      if (isPaletteDragging() || this.isAnimatingReset) return;
      
      if (this.isPanning) {
        this.applyPanDelta(pointer.x, pointer.y, this.panStartX, this.panStartY, this.cameraDragStartX, this.cameraDragStartY);
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
        this.applyPanDelta(pointer.x, pointer.y, this.dragScrollStartX, this.dragScrollStartY, this.dragScrollCameraStartX, this.dragScrollCameraStartY);
      }
    });

    // Pointer up - stop panning/drag-scroll, end pinch, detect tap
    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Touch handling
      if (pointer.wasTouch) {
        // End pinch if we had 2+ touches
        if (this.isPinching) {
          this.pinchEndTime = Date.now();
          this.isPinching = false;
          setPinchingInBuilder(false);
        }
        
        // Check for tap (short touch without much movement)
        if (this.touchStartPos && !this.isDraggingToScroll) {
          const duration = Date.now() - this.touchStartTime;
          const deltaX = Math.abs(pointer.x - this.touchStartPos.x);
          const deltaY = Math.abs(pointer.y - this.touchStartPos.y);
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
          
          // It's a tap! Emit a synthetic tap event for sprites to handle
          if (duration < this.TAP_MAX_DURATION && distance < this.TAP_MAX_DISTANCE) {
            // Store tap info in scene data for sprites to check
            this.scene.data.set('lastTapTime', Date.now());
            this.scene.data.set('lastTapWorldX', pointer.worldX);
            this.scene.data.set('lastTapWorldY', pointer.worldY);
          }
        }
        
        this.touchStartPos = null;
        this.touchOnSelectedSprite = false;
        this.activeTouches.delete(pointer.id);
        
        // Reset touch drag state
        this.scene.data.set('touchDraggingSprite', false);
        this.scene.data.set('touchDragStarted', false);
        this.scene.data.set('touchStartOnSelectedSprite', false);
        
        // Reset pan state
        if (this.isDraggingToScroll) {
          this.isDraggingToScroll = false;
        }
        return;
      }
      
      // Desktop mouse handling
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
        this.touchStartPos = null;
        this.touchOnSelectedSprite = false;
        // End pinch if touch leaves
        if (this.isPinching && this.activeTouches.size < 2) {
          this.isPinching = false;
          this.pinchEndTime = Date.now();
          setPinchingInBuilder(false);
        }
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
    
    // Notify store that pinch is active (disables sprite interactions)
    setPinchingInBuilder(true);
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
        
        // Zoom towards world point if available, otherwise screen center
        if (this.zoomTargetWorldPoint) {
          this.zoomToWorldPoint(this.zoomTargetWorldPoint.x, this.zoomTargetWorldPoint.y, newZoom);
        } else {
          this.zoomToPoint(this.camera.width / 2, this.camera.height / 2, newZoom);
        }
        
        // Clear zoom target point when zoom is complete
        if (Math.abs(this.currentZoom - this.targetZoom) < 0.001) {
          this.zoomTargetWorldPoint = null;
        }
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
    return this.scene.data.get('isDraggingObject') === true || 
           this.scene.data.get('isDraggingItem') === true;
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
