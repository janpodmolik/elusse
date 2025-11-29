import Phaser from 'phaser';
import { get } from 'svelte/store';
import type { PlacedFrame } from '../../types/FrameTypes';
import { generateFrameId, DEFAULT_FRAME_COLOR, DEFAULT_FRAME_SCALE } from '../../types/FrameTypes';
import { selectedFrameId, deletePlacedFrame, addPlacedFrame, selectFrame, builderEditMode, setBuilderEditMode, placedFrames, updatePlacedFrame, updateDraggingFramePosition, clearDraggingFramePosition, gridSnappingEnabled } from '../../stores/builderStores';
import { EventBus, EVENTS, type FrameDroppedEvent } from '../../events/EventBus';
import { isTypingInTextField } from '../../utils/inputUtils';
import { getFrameScale, getFrameDimensions } from '../../data/frames';
import { DEPTH_LAYERS } from '../../constants/depthLayers';
import { GRID_SIZE } from './builderConstants';
import { type FrameContainer, drawFrameBackground, DoubleClickDetector } from '../../utils/frameUtils';

/**
 * Snap coordinate to grid
 */
function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * BuilderFramesController - Manages placed frames and their interactions
 * Note: Text is rendered via Svelte FrameContent component
 */
export class BuilderFramesController {
  private scene: Phaser.Scene;
  private frames: Map<string, FrameContainer> = new Map();
  private unsubscribers: Array<() => void> = [];
  private selectionGraphics: Phaser.GameObjects.Graphics | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private doubleClickDetector = new DoubleClickDetector();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Preload frame assets
   */
  static preloadAssets(scene: Phaser.Scene): void {
    // Load all frame images
    for (let i = 1; i <= 25; i++) {
      scene.load.image(`frame_base_${i}`, `assets/frames/base ${i}.png`);
    }
  }

  /**
   * Create and setup frames manager
   */
  create(existingFrames: PlacedFrame[]): void {
    // Create selection graphics
    this.selectionGraphics = this.scene.add.graphics();
    this.selectionGraphics.setDepth(DEPTH_LAYERS.SELECTION_GRAPHICS);
    
    // Load existing frames
    if (existingFrames && existingFrames.length > 0) {
      existingFrames.forEach(frame => this.createFrame(frame));
    }
    
    this.setupBackgroundDeselect();
    this.setupStoreSubscriptions();
    this.setupFrameDropListener();
    this.setupDeleteKeys();
  }

  /**
   * Create a single frame with all visual elements
   * Note: Text is rendered via Svelte overlay
   */
  private createFrame(frameData: PlacedFrame): void {
    const textureKey = `frame_${frameData.frameKey}`;
    
    // Check if texture exists
    if (!this.scene.textures.exists(textureKey)) {
      console.warn(`Frame texture not found: ${textureKey}`);
      return;
    }
    
    const scale = frameData.scale ?? DEFAULT_FRAME_SCALE;
    const depth = frameData.depth ?? DEPTH_LAYERS.ITEMS_FRONT;
    const rotation = (frameData.rotation ?? 0) * (Math.PI / 180); // Convert degrees to radians
    const isRotated = frameData.rotation === 90;
    
    // Get dimensions using centralized utility
    const { innerWidth, innerHeight } = getFrameDimensions(scale, isRotated);
    
    // Create background graphics (below sprite)
    const background = this.scene.add.graphics();
    background.setDepth(depth - 0.1);
    drawFrameBackground(background, frameData.x, frameData.y, innerWidth, innerHeight, frameData.backgroundColor || DEFAULT_FRAME_COLOR);
    
    // Create sprite
    const sprite = this.scene.add.sprite(frameData.x, frameData.y, textureKey);
    sprite.setScale(scale);
    sprite.setDepth(depth);
    sprite.setOrigin(0.5, 0.5);
    sprite.setRotation(rotation);
    
    // Store frame container (text is rendered via Svelte overlay)
    const container: FrameContainer = { sprite, background, data: frameData };
    this.frames.set(frameData.id, container);
    
    // Make interactive
    this.makeInteractive(container, frameData.id);
  }

  /**
   * Update frame visuals (rotation, scale, background)
   */
  private updateFrameVisuals(container: FrameContainer): void {
    const { sprite, background, data } = container;
    
    // Update scale
    const scale = data.scale ?? DEFAULT_FRAME_SCALE;
    sprite.setScale(scale);
    
    // Update rotation
    const rotation = (data.rotation ?? 0) * (Math.PI / 180);
    sprite.setRotation(rotation);
    
    // Get dimensions using centralized utility
    const isRotated = data.rotation === 90;
    const { innerWidth, innerHeight } = getFrameDimensions(scale, isRotated);
    
    drawFrameBackground(background, sprite.x, sprite.y, innerWidth, innerHeight, data.backgroundColor || DEFAULT_FRAME_COLOR);
  }

  /**
   * Move sprite and background to new position
   */
  private moveContainer(container: FrameContainer, x: number, y: number): void {
    const { sprite, background, data } = container;
    sprite.setPosition(x, y);
    
    // Get dimensions using centralized utility
    const scale = data.scale ?? DEFAULT_FRAME_SCALE;
    const isRotated = data.rotation === 90;
    const { innerWidth, innerHeight } = getFrameDimensions(scale, isRotated);
    
    drawFrameBackground(background, x, y, innerWidth, innerHeight, data.backgroundColor || DEFAULT_FRAME_COLOR);
  }

  /**
   * Make a frame container interactive
   */
  private makeInteractive(container: FrameContainer, frameId: string): void {
    const { sprite } = container;
    
    sprite.setInteractive({ draggable: true, useHandCursor: true });
    
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) return;
      
      // Select this frame
      selectFrame(frameId);
      this.updateSelectionVisuals();
      
      // Check for double-click using shared detector
      if (this.doubleClickDetector.check(frameId)) {
        // Double-click: switch to frames mode (panel opens automatically when frame is selected)
        setBuilderEditMode('frames');
        return; // Don't start drag on double-click
      }
      
      // Start drag
      this.isDragging = true;
      this.scene.data.set('isDraggingItem', true);
      this.dragStartX = sprite.x - pointer.worldX;
      this.dragStartY = sprite.y - pointer.worldY;
    });
    
    sprite.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      if (!pointer.isDown) {
        this.isDragging = false;
        return;
      }
      
      let newX = pointer.worldX + this.dragStartX;
      let newY = pointer.worldY + this.dragStartY;
      
      // Apply grid snapping if enabled
      const isSnapEnabled = get(gridSnappingEnabled);
      if (isSnapEnabled) {
        newX = snapToGrid(newX, GRID_SIZE);
        newY = snapToGrid(newY, GRID_SIZE);
      }
      
      this.moveContainer(container, newX, newY);
      this.updateSelectionVisuals();
      
      // Update real-time position for Svelte overlay
      updateDraggingFramePosition(frameId, newX, newY);
    });
    
    sprite.on('pointerup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.scene.data.set('isDraggingItem', false);
      
      // Clear dragging position
      clearDraggingFramePosition(frameId);
      
      // Update store with new position
      container.data.x = Math.round(sprite.x);
      container.data.y = Math.round(sprite.y);
      updatePlacedFrame(frameId, { x: container.data.x, y: container.data.y });
    });
  }

  /**
   * Setup click on empty space to deselect
   */
  private setupBackgroundDeselect(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only in frames mode
      let currentMode = 'items';
      const unsub = builderEditMode.subscribe(m => currentMode = m);
      unsub();
      if (currentMode !== 'frames') return;
      
      // Skip if clicking on a frame
      const clickedObjects = this.scene.input.hitTestPointer(pointer);
      const clickedFrame = clickedObjects.some(obj => {
        for (const [_, frame] of this.frames) {
          if (frame.sprite === obj) return true;
        }
        return false;
      });
      
      if (!clickedFrame && !this.isDragging) {
        selectFrame(null);
        this.updateSelectionVisuals();
      }
    });
  }

  private setupStoreSubscriptions(): void {
    // Subscribe to selection changes
    const selectedUnsubscribe = selectedFrameId.subscribe(id => {
      this.scene.data.set('selectedFrameId', id);
      this.updateSelectionVisuals();
    });
    this.unsubscribers.push(selectedUnsubscribe);
    
    // Subscribe to edit mode changes
    // Only disable frames when in dialogs mode (frames and items share interaction)
    const editModeUnsubscribe = builderEditMode.subscribe(mode => {
      if (mode === 'dialogs') {
        // Clear selection and disable interactions only in dialogs mode
        selectFrame(null);
        this.setInteractiveEnabled(false);
      } else {
        // Re-enable in items or frames mode
        this.setInteractiveEnabled(true);
      }
    });
    this.unsubscribers.push(editModeUnsubscribe);
    
    // Subscribe to frames config changes for sync
    let previousFrames: PlacedFrame[] = [];
    const framesUnsubscribe = placedFrames.subscribe(currentFrames => {
      // Check for deleted frames
      previousFrames.forEach(oldFrame => {
        const stillExists = currentFrames.find(f => f.id === oldFrame.id);
        if (!stillExists) {
          this.removeFrame(oldFrame.id);
        }
      });
      
      // Check for updated frames (color, text, rotation, etc.)
      currentFrames.forEach(newFrameData => {
        const oldFrameData = previousFrames.find(f => f.id === newFrameData.id);
        const existingFrame = this.frames.get(newFrameData.id);
        
        if (existingFrame && oldFrameData) {
          // Check if anything visual changed
          const colorChanged = oldFrameData.backgroundColor !== newFrameData.backgroundColor;
          const textColorChanged = oldFrameData.textColor !== newFrameData.textColor;
          const textSizeChanged = oldFrameData.textSize !== newFrameData.textSize;
          const textsChanged = JSON.stringify(oldFrameData.texts) !== JSON.stringify(newFrameData.texts);
          const rotationChanged = oldFrameData.rotation !== newFrameData.rotation;
          const scaleChanged = oldFrameData.scale !== newFrameData.scale;
          
          existingFrame.data = newFrameData;
          
          if (colorChanged || textColorChanged || textSizeChanged || textsChanged || rotationChanged || scaleChanged) {
            this.updateFrameVisuals(existingFrame);
            // Update selection border if this frame is selected
            if (this.scene.data.get('selectedFrameId') === newFrameData.id) {
              this.updateSelectionVisuals();
            }
          }
        }
      });
      
      previousFrames = currentFrames.map(f => ({ ...f }));
    });
    this.unsubscribers.push(framesUnsubscribe);
  }

  private setupFrameDropListener(): void {
    const subscription = EventBus.on<FrameDroppedEvent>(EVENTS.FRAME_DROPPED, (data) => {
      const { frameKey, canvasX, canvasY } = data;
      
      // Convert canvas coordinates to world coordinates
      const camera = this.scene.cameras.main;
      const worldPoint = camera.getWorldPoint(canvasX, canvasY);
      
      // Create new frame
      const newFrame: PlacedFrame = {
        id: generateFrameId(),
        frameKey,
        x: Math.round(worldPoint.x),
        y: Math.round(worldPoint.y),
        scale: getFrameScale(frameKey),
        depth: DEPTH_LAYERS.ITEMS_FRONT,
        rotation: 90, // Default to landscape mode
        backgroundColor: DEFAULT_FRAME_COLOR,
        textColor: '#333333',
        textSize: 16,
        texts: [
          { language: 'cs', text: '' },
          { language: 'en', text: '' },
        ],
      };
      
      // Add to store and create sprite
      addPlacedFrame(newFrame);
      this.createFrame(newFrame);
      selectFrame(newFrame.id);
    });
    
    this.unsubscribers.push(() => subscription.unsubscribe());
  }

  private setupDeleteKeys(): void {
    const deleteKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE, false);
    const backspaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE, false);
    
    const handleDelete = () => {
      // Ignore when typing in input fields
      if (isTypingInTextField()) return;
      
      // Only delete in frames mode
      let currentMode = 'items';
      const unsub = builderEditMode.subscribe(m => currentMode = m);
      unsub();
      if (currentMode !== 'frames') return;
      
      const selectedId = this.scene.data.get('selectedFrameId');
      if (selectedId) {
        deletePlacedFrame(selectedId);
      }
    };
    
    deleteKey.on('down', handleDelete);
    backspaceKey.on('down', handleDelete);
  }

  /**
   * Update selection visual indicators
   */
  updateSelectionVisuals(): void {
    if (!this.selectionGraphics) return;
    
    this.selectionGraphics.clear();
    
    const selectedId = this.scene.data.get('selectedFrameId') as string | null;
    if (!selectedId) return;
    
    const frame = this.frames.get(selectedId);
    if (!frame) return;
    
    const sprite = frame.sprite;
    const bounds = sprite.getBounds();
    
    // Draw selection rectangle
    this.selectionGraphics.lineStyle(3, 0x9b59b6, 1); // Purple color for frames
    this.selectionGraphics.strokeRect(
      bounds.x - 4,
      bounds.y - 4,
      bounds.width + 8,
      bounds.height + 8
    );
    
    // Draw corner handles
    const handleSize = 8;
    this.selectionGraphics.fillStyle(0x9b59b6, 1);
    
    // Top-left
    this.selectionGraphics.fillRect(bounds.x - 4 - handleSize/2, bounds.y - 4 - handleSize/2, handleSize, handleSize);
    // Top-right
    this.selectionGraphics.fillRect(bounds.right + 4 - handleSize/2, bounds.y - 4 - handleSize/2, handleSize, handleSize);
    // Bottom-left
    this.selectionGraphics.fillRect(bounds.x - 4 - handleSize/2, bounds.bottom + 4 - handleSize/2, handleSize, handleSize);
    // Bottom-right
    this.selectionGraphics.fillRect(bounds.right + 4 - handleSize/2, bounds.bottom + 4 - handleSize/2, handleSize, handleSize);
  }

  /**
   * Remove frame by ID
   */
  private removeFrame(id: string): void {
    const frame = this.frames.get(id);
    if (frame) {
      frame.sprite.destroy();
      frame.background.destroy();
      this.frames.delete(id);
    }
    this.updateSelectionVisuals();
  }

  /**
   * Enable or disable all frame interactions
   */
  setInteractiveEnabled(enabled: boolean): void {
    this.frames.forEach(({ sprite, background }) => {
      if (enabled) {
        sprite.setInteractive({ draggable: true, useHandCursor: true });
        sprite.setAlpha(1);
        background.setAlpha(1);
      } else {
        sprite.disableInteractive();
        sprite.setAlpha(0.6);
        background.setAlpha(0.6);
      }
    });
    
    if (!enabled && this.selectionGraphics) {
      this.selectionGraphics.clear();
    }
  }

  /**
   * Cleanup subscriptions and sprites
   */
  destroy(): void {
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    this.frames.forEach(({ sprite, background }) => {
      sprite.destroy();
      background.destroy();
    });
    this.frames.clear();
    
    if (this.selectionGraphics) {
      this.selectionGraphics.destroy();
      this.selectionGraphics = null;
    }
  }
}
