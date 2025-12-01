import Phaser from 'phaser';
import { get } from 'svelte/store';
import type { PlacedSocial } from '../../types/SocialTypes';
import { generateSocialId, DEFAULT_SOCIAL_SCALE } from '../../types/SocialTypes';
import { selectedSocialId, deletePlacedSocial, addPlacedSocial, selectSocial, builderEditMode, placedSocials, updatePlacedSocial, openSocialPanel, updateSelectedSocialScreenPosition } from '../../stores/builderStores';
import { EventBus, EVENTS, type SocialDroppedEvent } from '../../events/EventBus';
import { isTypingInTextField, worldToScreen } from '../../utils/inputUtils';
import { DEPTH_LAYERS } from '../../constants/depthLayers';
import { SELECTION_COLORS } from '../../constants/colors';
import { setupSpriteInteraction, DoubleClickDetector } from '../../utils/spriteInteraction';
import { DRAG_TINT } from './builderConstants';

/**
 * BuilderSocialsController - Manages placed social icons and their interactions
 * 
 * IMPORTANT: When creating new interactive object types, remember to:
 * 1. Add the data key to INTERACTIVE_DATA_KEYS in src/items/ItemSelectionManager.ts
 * 2. Use sprite.setData('socialId', id) - the key must match INTERACTIVE_DATA_KEYS.SOCIAL
 * 
 * This ensures background click deselection works correctly for the new object type.
 */
export class BuilderSocialsController {
  private scene: Phaser.Scene;
  private worldWidth: number;
  private worldHeight: number;
  private socials: Map<string, { sprite: Phaser.GameObjects.Sprite; data: PlacedSocial }> = new Map();
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
   * Preload social assets
   */
  static preloadAssets(scene: Phaser.Scene): void {
    // Load all social icons
    scene.load.image('social_discord', 'assets/socials/Discord.png');
    scene.load.image('social_facebook', 'assets/socials/Facebook.png');
    scene.load.image('social_instagram', 'assets/socials/Instagram.png');
    scene.load.image('social_kofi', 'assets/socials/Ko Fi.png');
    scene.load.image('social_linkedin', 'assets/socials/LinkedIn.png');
    scene.load.image('social_patreon', 'assets/socials/Patreon.png');
    scene.load.image('social_tiktok', 'assets/socials/TikTok.png');
    scene.load.image('social_twitch', 'assets/socials/Twitch.png');
    scene.load.image('social_twitter', 'assets/socials/Twitter.png');
    scene.load.image('social_whatsapp', 'assets/socials/Whatsapp.png');
    scene.load.image('social_youtube', 'assets/socials/Youtube.png');
  }

  /**
   * Create and setup socials manager
   */
  create(existingSocials: PlacedSocial[]): void {
    // Create selection graphics
    this.selectionGraphics = this.scene.add.graphics();
    this.selectionGraphics.setDepth(DEPTH_LAYERS.SELECTION_GRAPHICS);
    
    // Load existing socials
    if (existingSocials && existingSocials.length > 0) {
      existingSocials.forEach(social => this.createSocial(social));
    }
    
    this.setupStoreSubscriptions();
    this.setupSocialDropListener();
    this.setupDeleteKeys();
  }

  /**
   * Create a single social sprite
   */
  private createSocial(socialData: PlacedSocial): void {
    const textureKey = `social_${socialData.socialKey}`;
    
    // Check if texture exists
    if (!this.scene.textures.exists(textureKey)) {
      console.warn(`Social texture not found: ${textureKey}`);
      return;
    }
    
    const scale = socialData.scale ?? DEFAULT_SOCIAL_SCALE;
    const depth = socialData.depth ?? DEPTH_LAYERS.ITEMS_FRONT;
    
    // Create sprite
    const sprite = this.scene.add.sprite(socialData.x, socialData.y, textureKey);
    sprite.setScale(scale);
    sprite.setDepth(depth);
    sprite.setOrigin(0.5, 0.5);
    sprite.setData('socialId', socialData.id);
    
    // Store social container
    this.socials.set(socialData.id, { sprite, data: socialData });
    
    // Make interactive
    this.makeInteractive(socialData.id);
  }

  /**
   * Update social visuals (scale, texture)
   */
  private updateSocialVisuals(socialId: string): void {
    const container = this.socials.get(socialId);
    if (!container) return;
    
    const { sprite, data } = container;
    
    // Update texture if socialKey changed
    const textureKey = `social_${data.socialKey}`;
    if (sprite.texture.key !== textureKey && this.scene.textures.exists(textureKey)) {
      sprite.setTexture(textureKey);
    }
    
    // Update scale
    const scale = data.scale ?? DEFAULT_SOCIAL_SCALE;
    sprite.setScale(scale);
  }

  /**
   * Make a social sprite interactive using shared sprite interaction utility
   */
  private makeInteractive(socialId: string): void {
    const container = this.socials.get(socialId);
    if (!container) return;
    
    const { sprite } = container;
    
    const cleanup = setupSpriteInteraction({
      sprite,
      scene: this.scene,
      cursor: 'grab',
      useGridSnapping: true,
      // Constrain to world bounds
      constraints: {
        minX: 0,
        maxX: this.worldWidth,
        minY: 0,
        maxY: this.worldHeight,
      },
      callbacks: {
        onSelect: () => {
          selectSocial(socialId);
          this.updateSelectionVisuals();
        },
        isSelected: () => {
          return get(selectedSocialId) === socialId;
        },
        onDoubleClick: () => {
          if (this.doubleClickDetector.check(socialId)) {
            openSocialPanel();
            return true; // Prevent drag start
          }
          return false;
        },
        onDragStart: () => {
          sprite.setTint(DRAG_TINT);
        },
        onDrag: () => {
          this.updateSelectionVisuals();
        },
        onDragEnd: (x, y) => {
          // Clear drag tint
          sprite.clearTint();
          // Update store with new position
          const container = this.socials.get(socialId);
          if (container) {
            container.data.x = Math.round(x);
            container.data.y = Math.round(y);
            updatePlacedSocial(socialId, { x: container.data.x, y: container.data.y });
          }
        }
      }
    });
    
    this.cleanupFunctions.set(socialId, cleanup);
  }

  private setupStoreSubscriptions(): void {
    // Subscribe to selection changes
    const selectedUnsubscribe = selectedSocialId.subscribe(id => {
      this.scene.data.set('selectedSocialId', id);
      this.updateSelectionVisuals();
    });
    this.unsubscribers.push(selectedUnsubscribe);
    
    // Subscribe to edit mode changes
    // Only disable socials when in dialogs mode (socials, items and frames share interaction)
    const editModeUnsubscribe = builderEditMode.subscribe(mode => {
      if (mode === 'dialogs') {
        // Clear selection and disable interactions only in dialogs mode
        selectSocial(null);
        this.setInteractiveEnabled(false);
      } else {
        // Re-enable in items, frames or socials mode
        this.setInteractiveEnabled(true);
      }
    });
    this.unsubscribers.push(editModeUnsubscribe);
    
    // Subscribe to socials config changes for sync
    let previousSocials: PlacedSocial[] = [];
    const socialsUnsubscribe = placedSocials.subscribe(currentSocials => {
      // Check for deleted socials
      previousSocials.forEach(oldSocial => {
        const stillExists = currentSocials.find(s => s.id === oldSocial.id);
        if (!stillExists) {
          this.removeSocial(oldSocial.id);
        }
      });
      
      // Check for updated socials
      currentSocials.forEach(newSocialData => {
        const oldSocialData = previousSocials.find(s => s.id === newSocialData.id);
        const existingSocial = this.socials.get(newSocialData.id);
        
        if (existingSocial && oldSocialData) {
          const scaleChanged = oldSocialData.scale !== newSocialData.scale;
          const socialKeyChanged = oldSocialData.socialKey !== newSocialData.socialKey;
          
          existingSocial.data = newSocialData;
          
          if (scaleChanged || socialKeyChanged) {
            this.updateSocialVisuals(newSocialData.id);
            if (this.scene.data.get('selectedSocialId') === newSocialData.id) {
              this.updateSelectionVisuals();
            }
          }
        }
      });
      
      previousSocials = currentSocials.map(s => ({ ...s }));
    });
    this.unsubscribers.push(socialsUnsubscribe);
  }

  private setupSocialDropListener(): void {
    const subscription = EventBus.on<SocialDroppedEvent>(EVENTS.SOCIAL_DROPPED, (data) => {
      const { socialKey, canvasX, canvasY } = data;
      
      // Convert canvas coordinates to world coordinates
      const camera = this.scene.cameras.main;
      const worldPoint = camera.getWorldPoint(canvasX, canvasY);
      
      // Clamp to world bounds immediately
      const clampedX = Math.max(0, Math.min(this.worldWidth, worldPoint.x));
      const clampedY = Math.max(0, Math.min(this.worldHeight, worldPoint.y));
      
      // Create new social with DEFAULT_SOCIAL_SCALE (Medium size)
      const newSocial: PlacedSocial = {
        id: generateSocialId(),
        socialKey,
        x: Math.round(clampedX),
        y: Math.round(clampedY),
        scale: DEFAULT_SOCIAL_SCALE,
        depth: DEPTH_LAYERS.ITEMS_FRONT,
      };
      
      // Add to store and create sprite
      addPlacedSocial(newSocial);
      this.createSocial(newSocial);
      selectSocial(newSocial.id);
    });
    
    this.unsubscribers.push(() => subscription.unsubscribe());
  }

  private setupDeleteKeys(): void {
    const deleteKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE, false);
    const backspaceKey = this.scene.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE, false);
    
    const handleDelete = () => {
      // Ignore when typing in input fields
      if (isTypingInTextField()) return;
      
      // Only delete in socials mode
      let currentMode = 'items';
      const unsub = builderEditMode.subscribe(m => currentMode = m);
      unsub();
      if (currentMode !== 'socials') return;
      
      const selectedId = this.scene.data.get('selectedSocialId');
      if (selectedId) {
        deletePlacedSocial(selectedId);
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
    
    const selectedId = this.scene.data.get('selectedSocialId') as string | null;
    if (!selectedId) {
      updateSelectedSocialScreenPosition(null);
      return;
    }
    
    const container = this.socials.get(selectedId);
    if (!container) {
      updateSelectedSocialScreenPosition(null);
      return;
    }
    
    const sprite = container.sprite;
    const bounds = sprite.getBounds();
    
    // Update screen position for UI overlay
    const camera = this.scene.cameras.main;
    const { screenX, screenY } = worldToScreen(sprite.x, sprite.y, camera);
    updateSelectedSocialScreenPosition({
      screenX,
      screenY,
      socialHeight: bounds.height * camera.zoom
    });
    
    // Draw selection rectangle - Pink color for socials (from centralized colors)
    this.selectionGraphics.lineStyle(3, SELECTION_COLORS.SOCIAL.hex, 1);
    this.selectionGraphics.strokeRect(
      bounds.x - 4,
      bounds.y - 4,
      bounds.width + 8,
      bounds.height + 8
    );
  }

  /**
   * Remove social by ID
   */
  private removeSocial(id: string): void {
    const container = this.socials.get(id);
    if (container) {
      container.sprite.destroy();
      this.socials.delete(id);
    }
    
    // Cleanup interaction handler
    const cleanup = this.cleanupFunctions.get(id);
    if (cleanup) {
      cleanup();
      this.cleanupFunctions.delete(id);
    }
    
    this.updateSelectionVisuals();
  }

  /**
   * Enable or disable all social interactions
   */
  setInteractiveEnabled(enabled: boolean): void {
    this.socials.forEach(({ sprite }) => {
      if (enabled) {
        sprite.setInteractive();
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
    
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions.clear();
    
    this.socials.forEach(({ sprite }) => {
      sprite.destroy();
    });
    this.socials.clear();
    
    if (this.selectionGraphics) {
      this.selectionGraphics.destroy();
      this.selectionGraphics = null;
    }
  }
}
