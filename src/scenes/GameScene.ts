import Phaser from 'phaser';
import { Player } from './Player';
import { localization } from '../data/localization';
import { catSkinManager, AVAILABLE_SKINS, CatSkin } from '../data/catSkin';
import { backgroundManager, AVAILABLE_BACKGROUNDS } from '../data/background';
import { loadBackgroundAssets } from './BackgroundLoader';
import { currentLanguage, currentSkin, currentBackground, isLoading, backgroundChangeCounter } from '../stores';

// Configuration constants
const WORLD_CONFIG = {
  WIDTH: 2000,
  HEIGHT: 800,
};

const PLAYER_CONFIG = {
  START_X: 250,
  START_Y: 450,
};

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private languageToggleKey!: Phaser.Input.Keyboard.Key;
  private skinToggleKey!: Phaser.Input.Keyboard.Key;
  private backgroundToggleKey!: Phaser.Input.Keyboard.Key;

  // Parallax backgrounds (flexible layer count)
  private bgLayers: Phaser.GameObjects.Image[] = [];
  private baseLayer: Phaser.GameObjects.TileSprite | null = null;
  private loadedBackgrounds: Set<string> = new Set();

  // Store unsubscribe functions
  private unsubscribers: Array<() => void> = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load default background images
    const defaultConfig = backgroundManager.getCurrentConfig();
    this.load.image(`bg0-${defaultConfig.folder}`, `assets/backgrounds/${defaultConfig.folder}/0.png`);
    for (let i = 0; i < defaultConfig.scrollFactors.length; i++) {
      const layerNum = i + 1;
      this.load.image(
        `bg${layerNum}-${defaultConfig.folder}`,
        `assets/backgrounds/${defaultConfig.folder}/${layerNum}.png`
      );
    }
    this.loadedBackgrounds.add(defaultConfig.folder);

    // Load cat sprite sheets for all available skins
    AVAILABLE_SKINS.forEach(skin => {
      this.load.spritesheet(`cat-idle-${skin}`, `assets/sprites/${skin}/Idle.png`, {
        frameWidth: 48,
        frameHeight: 48,
      });
      this.load.spritesheet(`cat-walk-${skin}`, `assets/sprites/${skin}/Walk.png`, {
        frameWidth: 48,
        frameHeight: 48,
      });
    });
  }

  create(): void {
    // Create parallax background layers
    this.createParallaxBackground();

    const groundHeight = 40;
    const groundY = WORLD_CONFIG.HEIGHT - groundHeight;
    
    const ground = this.add.rectangle(
      0, 
      groundY, 
      WORLD_CONFIG.WIDTH, 
      groundHeight, 
      0x000000, 
      0 // Alpha 0 for invisible
    ).setOrigin(0, 0);
    
    this.physics.add.existing(ground, true); // true = static body

    // Create player
    this.player = new Player(this, PLAYER_CONFIG.START_X, PLAYER_CONFIG.START_Y);

    // Add collision between player and ground
    this.physics.add.collider(this.player, ground);

    // Setup camera to follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);

    // Setup toggle keys (L: language, C: skin, B: background)
    if (this.input.keyboard) {
      this.languageToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
      this.skinToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
      this.backgroundToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);
    }

    // Subscribe to store changes to react to UI updates
    const skinUnsubscribe = currentSkin.subscribe((skin: string) => {
      const catSkin = skin as CatSkin;
      if (this.player && AVAILABLE_SKINS.includes(catSkin)) {
        this.player.changeSkin(catSkin);
      }
    });

    // Subscribe to background change requests from UI
    const backgroundUnsubscribe = backgroundChangeCounter.subscribe(async () => {
      // Trigger background reload when counter changes
      await this.reloadBackground();
    });

    // Store unsubscribe functions for cleanup
    this.unsubscribers.push(skinUnsubscribe, backgroundUnsubscribe);
  }

  private createParallaxBackground(): void {
    const config = backgroundManager.getCurrentConfig();
    const viewportHeight = Math.max(WORLD_CONFIG.HEIGHT, this.scale.height);
    
    // Create repeating base layer (0.png) that tiles to cover any viewport size
    this.baseLayer = this.add.tileSprite(
      0, 
      0, 
      WORLD_CONFIG.WIDTH, 
      viewportHeight,
      `bg0-${config.folder}`
    );
    this.baseLayer.setOrigin(0, 0);
    this.baseLayer.setScrollFactor(1.0);
    this.baseLayer.setDepth(-11); // Behind all other layers
    
    // Create parallax layers based on config
    for (let i = 0; i < config.scrollFactors.length; i++) {
      const layerNum = i + 1;
      const layer = this.add.image(0, 0, `bg${layerNum}-${config.folder}`);
      layer.setOrigin(0, 0);
      layer.setScrollFactor(config.scrollFactors[i]);
      layer.setDepth(-10 + layerNum);
      layer.setDisplaySize(WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
      
      this.bgLayers.push(layer);
    }
  }

  private toggleLanguage(): void {
    const newLang = localization.toggleLanguage();
    currentLanguage.set(newLang);
  }

  private toggleSkin(): void {
    const newSkin = catSkinManager.toggleSkin();
    currentSkin.set(newSkin);
    this.player.changeSkin(newSkin);
  }

  private async toggleBackground(): Promise<void> {
    backgroundManager.toggleBackground();
    await this.reloadBackground();
  }

  private async loadBackgroundIfNeeded(config: typeof AVAILABLE_BACKGROUNDS[0]): Promise<boolean> {
    // Skip if already loaded
    if (this.loadedBackgrounds.has(config.folder)) {
      return true;
    }

    // Load background assets
    const success = await loadBackgroundAssets(this, config);
    if (success) {
      this.loadedBackgrounds.add(config.folder);
    }
    return success;
  }

  private async reloadBackground(): Promise<void> {
    let config = backgroundManager.getCurrentConfig();
    
    // Show loader
    isLoading.set(true);

    // Load background if needed
    let success = await this.loadBackgroundIfNeeded(config);
    
    // Fallback to forest on error
    if (!success) {
      console.error(`Failed to load background: ${config.folder}, falling back to forest`);
      backgroundManager.setBackground('forest');
      config = backgroundManager.getCurrentConfig();
      success = await this.loadBackgroundIfNeeded(config);
      
      if (!success) {
        console.error('Failed to load fallback background');
        isLoading.set(false);
        return;
      }
    }

    // Destroy old layers
    this.baseLayer?.destroy();
    this.bgLayers.forEach(layer => layer.destroy());
    this.bgLayers = [];

    // Create new layers
    this.createParallaxBackground();

    // Hide loader and update UI
    isLoading.set(false);
    currentBackground.set(config.name);
  }

  shutdown(): void {
    // Clean up store subscriptions to prevent memory leaks
    this.unsubscribers.forEach(unsubscribe => unsubscribe());
    this.unsubscribers = [];
  }

  update(): void {
    this.player.update();

    // Toggle language with L key
    if (Phaser.Input.Keyboard.JustDown(this.languageToggleKey)) {
      this.toggleLanguage();
    }

    // Toggle skin with C key
    if (Phaser.Input.Keyboard.JustDown(this.skinToggleKey)) {
      this.toggleSkin();
    }

    // Toggle background with B key
    if (Phaser.Input.Keyboard.JustDown(this.backgroundToggleKey)) {
      this.toggleBackground();
    }
  }
}
