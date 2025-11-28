import Phaser from 'phaser';
import type { PlacedFrame } from '../../types/FrameTypes';
import { generateFrameId, DEFAULT_FRAME_COLOR, DEFAULT_FRAME_SCALE } from '../../types/FrameTypes';
import { selectedFrameId, deletePlacedFrame, addPlacedFrame, selectFrame, builderEditMode, placedFrames, updatePlacedFrame } from '../../stores/builderStores';
import { EventBus, EVENTS, type FrameDroppedEvent } from '../../events/EventBus';
import { isTypingInTextField } from '../../utils/inputUtils';
import { getFrameScale } from '../../data/frames';
import { DEPTH_LAYERS } from '../../constants/depthLayers';

/**
 * BuilderFramesController - Manages placed frames and their interactions
 */
export class BuilderFramesController {
  private scene: Phaser.Scene;
  private frames: Map<string, { sprite: Phaser.GameObjects.Sprite; data: PlacedFrame }> = new Map();
  private unsubscribers: Array<() => void> = [];
  private selectionGraphics: Phaser.GameObjects.Graphics | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

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
   * Create a single frame sprite
   */
  private createFrame(frameData: PlacedFrame): void {
    const textureKey = `frame_${frameData.frameKey}`;
    
    // Check if texture exists
    if (!this.scene.textures.exists(textureKey)) {
      console.warn(`Frame texture not found: ${textureKey}`);
      return;
    }
    
    const sprite = this.scene.add.sprite(frameData.x, frameData.y, textureKey);
    sprite.setScale(frameData.scale ?? DEFAULT_FRAME_SCALE);
    sprite.setDepth(frameData.depth ?? DEPTH_LAYERS.ITEMS_FRONT);
    sprite.setOrigin(0.5, 0.5);
    
    // Apply tint based on background color
    this.applyBackgroundColor(sprite, frameData.backgroundColor);
    
    // Store frame reference
    this.frames.set(frameData.id, { sprite, data: frameData });
    
    // Make interactive
    this.makeInteractive(sprite, frameData.id);
  }

  /**
   * Apply background color as tint to sprite
   */
  private applyBackgroundColor(sprite: Phaser.GameObjects.Sprite, color: string): void {
    // Convert hex color to number for tint
    const tintColor = parseInt(color.replace('#', ''), 16);
    sprite.setTint(tintColor);
  }

  /**
   * Make a frame sprite interactive
   */
  private makeInteractive(sprite: Phaser.GameObjects.Sprite, frameId: string): void {
    sprite.setInteractive({ draggable: true, useHandCursor: true });
    
    sprite.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) return;
      
      // Select this frame
      selectFrame(frameId);
      this.updateSelectionVisuals();
      
      // Start drag
      this.isDragging = true;
      this.dragStartX = sprite.x - pointer.worldX;
      this.dragStartY = sprite.y - pointer.worldY;
    });
    
    sprite.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDragging) return;
      if (!pointer.isDown) {
        this.isDragging = false;
        return;
      }
      
      sprite.x = pointer.worldX + this.dragStartX;
      sprite.y = pointer.worldY + this.dragStartY;
      this.updateSelectionVisuals();
    });
    
    sprite.on('pointerup', () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      
      // Update store with new position
      const frame = this.frames.get(frameId);
      if (frame) {
        frame.data.x = Math.round(sprite.x);
        frame.data.y = Math.round(sprite.y);
        updatePlacedFrame(frameId, { x: frame.data.x, y: frame.data.y });
      }
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
    const editModeUnsubscribe = builderEditMode.subscribe(mode => {
      if (mode !== 'frames') {
        // Clear selection and disable interactions
        selectFrame(null);
        this.setInteractiveEnabled(false);
      } else {
        // Re-enable in frames mode
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
      
      // Check for updated frames (e.g., color change)
      currentFrames.forEach(newFrameData => {
        const oldFrameData = previousFrames.find(f => f.id === newFrameData.id);
        const existingFrame = this.frames.get(newFrameData.id);
        
        if (existingFrame && oldFrameData) {
          // Update color if changed
          if (oldFrameData.backgroundColor !== newFrameData.backgroundColor) {
            this.applyBackgroundColor(existingFrame.sprite, newFrameData.backgroundColor);
          }
          existingFrame.data = newFrameData;
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
        backgroundColor: DEFAULT_FRAME_COLOR,
        texts: [
          { language: 'cs', title: '', content: '' },
          { language: 'en', title: '', content: '' },
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
      this.frames.delete(id);
    }
    this.updateSelectionVisuals();
  }

  /**
   * Enable or disable all frame interactions
   */
  setInteractiveEnabled(enabled: boolean): void {
    this.frames.forEach(({ sprite }) => {
      if (enabled) {
        sprite.setInteractive({ draggable: true, useHandCursor: true });
        sprite.setAlpha(1);
      } else {
        sprite.disableInteractive();
        sprite.setAlpha(0.6);
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
    
    this.frames.forEach(({ sprite }) => sprite.destroy());
    this.frames.clear();
    
    if (this.selectionGraphics) {
      this.selectionGraphics.destroy();
      this.selectionGraphics = null;
    }
  }
}
