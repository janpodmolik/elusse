import Phaser from 'phaser';
import { Player } from './Player';
import { localization } from '../data/localization';
import { catSkinManager, AVAILABLE_SKINS } from '../data/catSkin';
import { UIManager } from '../ui/UIManager';

// Configuration constants
const WORLD_CONFIG = {
  WIDTH: 2000,
  HEIGHT: 800,
  GROUND_Y: 500,
  GROUND_HEIGHT: 50,
};

const PLAYER_CONFIG = {
  START_X: 250,
  START_Y: 450,
};

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private languageToggleKey!: Phaser.Input.Keyboard.Key;
  private skinToggleKey!: Phaser.Input.Keyboard.Key;
  private uiManager!: UIManager;

  // Parallax backgrounds (6 layers)
  private bgLayers: Phaser.GameObjects.Image[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Load background images
    this.load.image('bg0', 'assets/backgrounds/0.png'); // Repeating base layer
    for (let i = 1; i <= 6; i++) {
      this.load.image(`bg${i}`, `assets/backgrounds/${i}.png`);
    }

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
    // Set world bounds
    this.physics.world.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);

    // Create parallax background layers
    this.createParallaxBackground();

    const groundHeight = 80;
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
    this.cameras.main.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Setup language toggle (L key) and skin toggle (C key)
    if (this.input.keyboard) {
      this.languageToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
      this.skinToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    }

    // Initialize HTML UI Manager
    this.uiManager = new UIManager();
    
    // Connect UI callbacks to game logic
    this.uiManager.onLanguageToggle = () => this.toggleLanguage();
    this.uiManager.onSkinToggle = () => this.toggleSkin();
    
    // Update initial UI state
    this.uiManager.updateLanguageText(localization.getLanguage());
    this.uiManager.updateSkinText(catSkinManager.getSkin());
    
    // Show controls hint on first visit
    const isTouchDevice = this.sys.game.device.input.touch;
    this.uiManager.showControlsDialogIfNeeded(isTouchDevice);
  }

  private createParallaxBackground(): void {
    // Create repeating base layer (0.png) that tiles vertically
    const baseLayer = this.add.tileSprite(
      0, 
      0, 
      WORLD_CONFIG.WIDTH, 
      WORLD_CONFIG.HEIGHT * 3, // Make it tall enough to cover extended vertical space
      'bg0'
    );
    baseLayer.setOrigin(0, 0);
    baseLayer.setScrollFactor(1.0);
    baseLayer.setDepth(-11); // Behind all other layers
    
    const scrollFactors = [
      1.0,  // Layer 1: ground (moves fully with camera)
      0.8, // Layer 2: furthest trees (almost static - moves only 2%)
      0.85, // Layer 3: far trees (almost static)
      0.9, // Layer 4: mid trees (almost static)  
      0.95, // Layer 5: near trees (almost static)
      1.0   // Layer 6: foreground (moves fully with camera)
    ];
    
    for (let i = 1; i <= 6; i++) {
      const layer = this.add.image(0, 0, `bg${i}`);
      layer.setOrigin(0, 0);
      layer.setScrollFactor(scrollFactors[i - 1]);
      layer.setDepth(-10 + i);
      layer.setDisplaySize(WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
      
      this.bgLayers.push(layer);
    }
  }

  private toggleLanguage(): void {
    const newLang = localization.toggleLanguage();
    this.uiManager.updateLanguageText(newLang);
  }

  private toggleSkin(): void {
    const newSkin = catSkinManager.toggleSkin();
    this.uiManager.updateSkinText(newSkin);
    this.player.changeSkin(newSkin);
  }

  public notifyPlayerMoved(): void {
    this.uiManager.notifyPlayerMoved();
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
  }
}
