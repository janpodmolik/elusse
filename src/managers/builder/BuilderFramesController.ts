import Phaser from 'phaser';
import { get } from 'svelte/store';
import type { PlacedFrame } from '../../types/FrameTypes';
import { generateFrameId, DEFAULT_FRAME_COLOR, DEFAULT_FRAME_SCALE } from '../../types/FrameTypes';
import { selectedFrameId, deletePlacedFrame, addPlacedFrame, selectFrame, builderEditMode, placedFrames, updatePlacedFrame, updateDraggingFramePosition, clearDraggingFramePosition, updateSelectedFrameScreenPosition } from '../../stores/builderStores';
import { openFramePanel } from '../../stores/uiStores';
import { EventBus, EVENTS, type FrameDroppedEvent } from '../../events/EventBus';
import { isTypingInTextField, worldToScreen } from '../../utils/inputUtils';
import { getFrameScale, getFrameDimensions } from '../../data/frames';
import { DEPTH_LAYERS } from '../../constants/depthLayers';
import { SELECTION_COLORS } from '../../constants/colors';
import { type FrameContainer, drawFrameBackground } from '../../utils/frameUtils';
import { setupSpriteInteraction, DoubleClickDetector } from '../../utils/spriteInteraction';
import { DRAG_TINT } from './builderConstants';

/**
 * BuilderFramesController - Manages placed frames and their interactions
 * Note: Text is rendered via Svelte FrameContent component
 * 
 * IMPORTANT: When creating new interactive object types, remember to:
 * 1. Add the data key to INTERACTIVE_DATA_KEYS in src/items/ItemSelectionManager.ts
 * 2. Use sprite.setData('frameId', id) - the key must match INTERACTIVE_DATA_KEYS.FRAME
 * 
 * This ensures background click deselection works correctly for the new object type.
 */
export class BuilderFramesController {
  private scene: Phaser.Scene;
  private worldWidth: number;
  private worldHeight: number;
  private frames: Map<string, FrameContainer> = new Map();
  private unsubscribers: Array<() => void> = [];
  private selectionGraphics: Phaser.GameObjects.Graphics | null = null;
  private cleanupFunctions: Map<string, () => void> = new Map();
  private doubleClickDetector = new DoubleClickDetector();

  constructor(scene: Phaser.Scene, worldWidth: number, worldHeight: number) {
    this.scene = scene;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
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
    
    // Note: Background deselect is handled by ItemSelectionManager.setupBackgroundDeselect
    // which calls clearSelection() - this clears all selections including frames
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
    sprite.setData('frameId', frameData.id); // Store frame ID for touch detection
    
    // Store frame container (text is rendered via Svelte overlay)
    const container: FrameContainer = { sprite, background, data: frameData };
    this.frames.set(frameData.id, container);
    
    // Make interactive
    this.makeInteractive(container, frameData.id);
  }

  /**
   * Update frame visuals (rotation, scale, background, texture)
   */
  private updateFrameVisuals(container: FrameContainer): void {
    const { sprite, background, data } = container;
    
    // Update texture if frameKey changed
    const textureKey = `frame_${data.frameKey}`;
    if (sprite.texture.key !== textureKey && this.scene.textures.exists(textureKey)) {
      sprite.setTexture(textureKey);
    }
    
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
   * Make a frame container interactive using shared sprite interaction utility
   */
  private makeInteractive(container: FrameContainer, frameId: string): void {
    const { sprite } = container;
    
    const cleanup = setupSpriteInteraction({
      sprite,
      scene: this.scene,
      cursor: 'grab',
      useGridSnapping: true,
      // Constrain to world bounds (allow frames to go right to edge)
      constraints: {
        minX: 0,
        maxX: this.worldWidth,
        minY: 0,
        maxY: this.worldHeight,
      },
      callbacks: {
        onSelect: () => {
          selectFrame(frameId);
          this.updateSelectionVisuals();
        },
        isSelected: () => {
          // Check if this frame is currently selected
          return get(selectedFrameId) === frameId;
        },
        onDoubleClick: () => {
          if (this.doubleClickDetector.check(frameId)) {
            openFramePanel();
            return true; // Prevent drag start
          }
          return false;
        },
        onDragStart: () => {
          sprite.setTint(DRAG_TINT);
        },
        onDrag: (x, y) => {
          // Move background along with sprite
          this.moveContainer(container, x, y);
          this.updateSelectionVisuals();
          // Update real-time position for Svelte overlay
          updateDraggingFramePosition(frameId, x, y);
        },
        onDragEnd: (x, y) => {
          // Clear drag tint
          sprite.clearTint();
          // Clear dragging position
          clearDraggingFramePosition(frameId);
          // Update store with new position
          container.data.x = Math.round(x);
          container.data.y = Math.round(y);
          updatePlacedFrame(frameId, { x: container.data.x, y: container.data.y });
        }
      }
    });
    
    this.cleanupFunctions.set(frameId, cleanup);
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
          const frameKeyChanged = oldFrameData.frameKey !== newFrameData.frameKey;
          
          existingFrame.data = newFrameData;
          
          if (colorChanged || textColorChanged || textSizeChanged || textsChanged || rotationChanged || scaleChanged || frameKeyChanged) {
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
      
      // Clamp to world bounds immediately
      const clampedX = Math.max(0, Math.min(this.worldWidth, worldPoint.x));
      const clampedY = Math.max(0, Math.min(this.worldHeight, worldPoint.y));
      
      // Create new frame
      const newFrame: PlacedFrame = {
        id: generateFrameId(),
        frameKey,
        x: Math.round(clampedX),
        y: Math.round(clampedY),
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
    if (!selectedId) {
      // Clear screen position when no frame is selected
      updateSelectedFrameScreenPosition(null);
      return;
    }
    
    const frame = this.frames.get(selectedId);
    if (!frame) {
      updateSelectedFrameScreenPosition(null);
      return;
    }
    
    const sprite = frame.sprite;
    const bounds = sprite.getBounds();
    
    // Update screen position for UI overlay
    // Use worldToScreen for correct FIT mode support
    const camera = this.scene.cameras.main;
    const { screenX, screenY } = worldToScreen(sprite.x, sprite.y, camera);
    updateSelectedFrameScreenPosition({
      screenX,
      screenY,
      frameHeight: bounds.height * camera.zoom
    });
    
    // Draw selection rectangle - Purple color for frames (from centralized colors)
    this.selectionGraphics.lineStyle(3, SELECTION_COLORS.FRAME.hex, 1);
    this.selectionGraphics.strokeRect(
      bounds.x - 4,
      bounds.y - 4,
      bounds.width + 8,
      bounds.height + 8
    );
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
        // Re-enable without overwriting the interactive config set by setupSpriteInteraction
        sprite.setInteractive();
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
