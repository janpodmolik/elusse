import Phaser from 'phaser';
import { loadBackgroundAssets } from './BackgroundLoader';
import { createParallaxBackground, updateParallaxTiling, destroyParallaxLayers, type ParallaxLayers } from './ParallaxHelper';
import { updatePlayerPosition, selectedItemId, deletePlacedItem, addPlacedItem, selectItem, itemDepthLayer, builderConfig } from '../stores/builderStores';
import { backgroundManager } from '../data/background';
import type { MapConfig, PlacedItem } from '../data/mapConfig';
import { PlacedItemManager } from './PlacedItemManager';

/**
 * Default scale factors for different asset types
 */
const ASSET_SCALES: Record<string, number> = {
  'tent': 6,
  'lamp': 8,
  'sign_left': 7,
  'sign_right': 7,
  'stone_0': 4,
  'stone_1': 5,
  'stone_2': 4,
};

/**
 * Depth values for item placement relative to player
 * Player has depth: 10
 */
const DEPTH_VALUES = {
  BEHIND: 5,   // Items behind player
  FRONT: 15    // Items in front of player
} as const;

/**
 * BuilderScene - Interactive map builder with visual editor
 * Allows drag & drop positioning of player, grid overlay, and live preview
 */
export class BuilderScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private parallaxLayers: ParallaxLayers | null = null;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  public itemManager!: PlacedItemManager; // Public for UI access
  
  // Current builder configuration
  private config!: MapConfig;
  
  // Store subscriptions cleanup
  private unsubscribers: Array<() => void> = [];
  
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
    
    // Load UI assets for placed items
    PlacedItemManager.preloadAssets(this);
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
    
    // Create placed items manager
    this.createPlacedItems();

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

    // Player drag handlers
    this.player.on('dragstart', this.onPlayerDragStart, this);
    this.player.on('drag', this.onPlayerDrag, this);
    this.player.on('dragend', this.onPlayerDragEnd, this);
    
    // Player click handler - notify when clicked while palette is open
    this.player.on('pointerdown', () => {
      // Convert world coordinates to screen coordinates
      const screenX = (this.player.x - this.cameras.main.scrollX) * this.cameras.main.zoom;
      const screenY = (this.player.y - this.cameras.main.scrollY) * this.cameras.main.zoom;
      
      window.dispatchEvent(new CustomEvent('playerClickedWhilePaletteOpen', {
        detail: { x: screenX, y: screenY }
      }));
    });
    
    // Palette state listener - disable player drag when palette is open
    const handlePaletteState = (event: CustomEvent) => {
      const { isOpen } = event.detail;
      
      if (isOpen) {
        // Disable player dragging
        this.input.setDraggable(this.player, false);
        this.player.input!.cursor = 'not-allowed';
        this.player.setAlpha(0.5);
      } else {
        // Re-enable player dragging
        this.input.setDraggable(this.player, true);
        this.player.input!.cursor = 'grab';
        this.player.setAlpha(1);
      }
    };
    
    window.addEventListener('paletteStateChanged', handlePaletteState as EventListener);
    
    // Cleanup listener on shutdown
    this.events.once('shutdown', () => {
      window.removeEventListener('paletteStateChanged', handlePaletteState as EventListener);
    });
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

  private createPlacedItems(): void {
    const groundY = this.config.worldHeight - 40;
    
    // Create item manager in builder mode
    this.itemManager = new PlacedItemManager(this, groundY, true);
    
    // Load existing items from config
    if (this.config.placedItems && this.config.placedItems.length > 0) {
      this.itemManager.createItems(this.config.placedItems);
    }
    
    // Setup background click for deselection
    this.itemManager.setupBackgroundDeselect();
    
    // Subscribe to selection changes to update visuals
    const selectedUnsubscribe = selectedItemId.subscribe(id => {
      this.data.set('selectedItemId', id);
      this.itemManager.updateSelectionVisuals();
    });
    this.unsubscribers.push(selectedUnsubscribe);
    
    // Subscribe to config changes to sync item updates and deletions
    let previousItems: PlacedItem[] = [];
    const configUnsubscribe = builderConfig.subscribe(config => {
      if (!config?.placedItems) return;
      
      const currentItems = config.placedItems;
      
      // Check for deleted items
      previousItems.forEach(oldItem => {
        const stillExists = currentItems.find(item => item.id === oldItem.id);
        if (!stillExists) {
          // Item was deleted from store, remove sprite
          this.itemManager.removeItem(oldItem.id);
        }
      });
      
      // Check for updated items
      currentItems.forEach(newItemData => {
        const oldItemData = previousItems.find(item => item.id === newItemData.id);
        if (oldItemData && JSON.stringify(oldItemData) !== JSON.stringify(newItemData)) {
          // Item was updated, sync with sprite
          this.itemManager.updateItem(newItemData.id, newItemData);
        }
      });
      
      previousItems = currentItems.map(item => ({ ...item }));
    });
    this.unsubscribers.push(configUnsubscribe);
    
    // Listen for asset drop events from AssetPalette
    const handleAssetDrop = (event: CustomEvent) => {
      const { assetKey, canvasX, canvasY } = event.detail;
      
      // Convert canvas coordinates to world coordinates
      const camera = this.cameras.main;
      const worldX = camera.scrollX + canvasX / camera.zoom;
      const worldY = camera.scrollY + canvasY / camera.zoom;
      
      // Get current depth layer preference
      let currentDepthLayer: 'behind' | 'front' = 'behind';
      const unsubscribe = itemDepthLayer.subscribe(layer => {
        currentDepthLayer = layer;
      });
      unsubscribe();
      
      // Create new item at drop position with appropriate scale and depth
      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        assetKey,
        x: Math.round(worldX),
        y: 0,
        scale: ASSET_SCALES[assetKey] || 1,
        depth: currentDepthLayer === 'behind' ? DEPTH_VALUES.BEHIND : DEPTH_VALUES.FRONT,
        yOffset: Math.round(worldY - groundY),
      };
      
      // Add to store and create sprite
      addPlacedItem(newItem);
      this.itemManager.createItem(newItem);
      
      // Select the newly added item
      selectItem(newItem.id);
    };
    
    window.addEventListener('assetDropped', handleAssetDrop as EventListener);
    
    // Clean up listener when scene shuts down
    this.events.once('shutdown', () => {
      window.removeEventListener('assetDropped', handleAssetDrop as EventListener);
    });
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
    
    // Delete key to remove selected item
    const deleteKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.DELETE);
    const backspaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
    
    const handleDelete = () => {
      const selectedId = this.data.get('selectedItemId');
      if (selectedId) {
        deletePlacedItem(selectedId);
        // Sprite removal is now handled automatically by builderConfig subscriber
      }
    };
    
    deleteKey.on('down', handleDelete);
    backspaceKey.on('down', handleDelete);
  }

  update(): void {
    // Update base layer tiling for infinite scrolling effect
    if (this.parallaxLayers) {
      updateParallaxTiling(this.parallaxLayers.baseLayer, this.cameras.main);
    }
  }

  shutdown(): void {
    // Clean up store subscriptions
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
    
    // Clean up item manager
    if (this.itemManager) {
      this.itemManager.destroy();
    }
  }
}
