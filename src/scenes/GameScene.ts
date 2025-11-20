import Phaser from 'phaser';
import { Player } from './Player';
import { localization } from '../data/localization';

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
  private languageText!: Phaser.GameObjects.Text;

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

    // Setup language toggle (L key)
    if (this.input.keyboard) {
      this.languageToggleKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    }

    // Create language toggle button (fixed to camera, clickable)
    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x000000, 0.7);
    buttonBg.fillRoundedRect(0, 0, 100, 40, 8);
    buttonBg.lineStyle(3, 0xffffff, 1);
    buttonBg.strokeRoundedRect(0, 0, 100, 40, 8);
    buttonBg.generateTexture('lang-button-bg', 100, 40);
    buttonBg.destroy();

    const buttonContainer = this.add.container(this.scale.width - 110, 10);
    buttonContainer.setScrollFactor(0);
    buttonContainer.setDepth(2000);

    const buttonBackground = this.add.image(0, 0, 'lang-button-bg').setOrigin(0, 0);
    
    this.languageText = this.add.text(50, 20, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
    });
    this.languageText.setOrigin(0.5, 0.5);
    this.languageText.setScrollFactor(0);

    buttonContainer.add([buttonBackground, this.languageText]);

    // Make container interactive (better for mobile touch)
    buttonContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 100, 40),
      Phaser.Geom.Rectangle.Contains
    );
    buttonContainer.on('pointerdown', () => {
      this.toggleLanguage();
    });

    // Add hover effect
    buttonContainer.on('pointerover', () => {
      buttonContainer.setScale(1.05);
    });
    buttonContainer.on('pointerout', () => {
      buttonContainer.setScale(1);
    });

    this.updateLanguageText();
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

  private updateLanguageText(): void {
    const lang = localization.getLanguage();
    this.languageText.setText(lang.toUpperCase());
  }

  private toggleLanguage(): void {
    localization.toggleLanguage();
    this.updateLanguageText();
  }

  update(): void {
    this.player.update();

    // Toggle language with L key
    if (Phaser.Input.Keyboard.JustDown(this.languageToggleKey)) {
      this.toggleLanguage();
    }
  }
}
