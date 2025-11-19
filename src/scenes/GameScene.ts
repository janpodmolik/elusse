import Phaser from 'phaser';
import { Player } from './Player';
import { SpeechBubble } from '../ui/SpeechBubble';
import { DIALOGS } from '../data/dialogs';
import { localization } from '../data/localization';
import { DialogTriggerManager } from './DialogTriggerManager';

// Configuration constants
const WORLD_CONFIG = {
  WIDTH: 2000,
  HEIGHT: 800,
  GROUND_Y: 700,
  GROUND_HEIGHT: 50,
};

const PLAYER_CONFIG = {
  START_X: 100,
  START_Y: 600,
};

const PLATFORM_POSITIONS = [
  { x: 350, y: 640 },
  { x: 600, y: 630 },
  { x: 900, y: 635 },
  { x: 1250, y: 632 },
  { x: 1600, y: 630 },
];

const PLATFORM_HEIGHT = 20;
const PLATFORM_DIALOG_IDS = ['languages', 'passion'];
const DIALOG_COOLDOWN_MS = 1000;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private speechBubble!: SpeechBubble;
  private dialogTriggerManager!: DialogTriggerManager;
  private triggeredDialogs: Map<string, number> = new Map();
  private currentTrigger: Phaser.Physics.Arcade.Sprite | null = null;
  private languageToggleKey!: Phaser.Input.Keyboard.Key;
  private languageText!: Phaser.GameObjects.Text;

  // Parallax backgrounds
  private bg1!: Phaser.GameObjects.TileSprite;
  private bg2!: Phaser.GameObjects.TileSprite;

  constructor() {
    super({ key: 'GameScene' });
  }

  preload(): void {
    // Placeholder assets will be created procedurally
  }

  create(): void {
    // Set world bounds
    this.physics.world.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);

    // Create parallax background layers
    this.createParallaxBackground();

    // Create platforms
    this.createPlatforms();

    // Create player
    this.player = new Player(this, PLAYER_CONFIG.START_X, PLAYER_CONFIG.START_Y);
    this.physics.add.collider(this.player, this.platforms);

    // Setup camera to follow player
    this.cameras.main.setBounds(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Create speech bubble UI
    this.speechBubble = new SpeechBubble(this);

    // Create dialog trigger manager
    this.initializeDialogTriggers();

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

    // Make button interactive
    buttonBackground.setInteractive({ useHandCursor: true });
    buttonBackground.on('pointerdown', () => {
      this.toggleLanguage();
    });

    // Add hover effect
    buttonBackground.on('pointerover', () => {
      buttonContainer.setScale(1.05);
    });
    buttonBackground.on('pointerout', () => {
      buttonContainer.setScale(1);
    });

    this.updateLanguageText();
  }

  private createParallaxBackground(): void {
    // Create gradient background layers (placeholder)
    const graphics1 = this.add.graphics();
    graphics1.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xe0f6ff, 0xe0f6ff, 1);
    graphics1.fillRect(0, 0, 800, 800);
    graphics1.generateTexture('bg1', 800, 800);
    graphics1.destroy();

    const graphics2 = this.add.graphics();
    graphics2.fillStyle(0x90ee90, 0.3);
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * 800;
      const y = 600 + Math.random() * 150;
      graphics2.fillCircle(x, y, 20 + Math.random() * 30);
    }
    graphics2.generateTexture('bg2', 800, 800);
    graphics2.destroy();

    // Create tile sprites for parallax
    this.bg1 = this.add.tileSprite(0, 0, 2000, 800, 'bg1');
    this.bg1.setOrigin(0, 0);
    this.bg1.setScrollFactor(0);
    this.bg1.setDepth(-2);

    this.bg2 = this.add.tileSprite(0, 0, 2000, 800, 'bg2');
    this.bg2.setOrigin(0, 0);
    this.bg2.setScrollFactor(0.3);
    this.bg2.setDepth(-1);
  }

  private createPlatforms(): void {
    this.platforms = this.physics.add.staticGroup();

    // Ground platform (full width)
    const groundGraphics = this.add.graphics();
    groundGraphics.fillStyle(0x8b4513, 1);
    groundGraphics.fillRect(0, 0, WORLD_CONFIG.WIDTH, WORLD_CONFIG.GROUND_HEIGHT);
    groundGraphics.generateTexture('ground', WORLD_CONFIG.WIDTH, WORLD_CONFIG.GROUND_HEIGHT);
    groundGraphics.destroy();

    const ground = this.platforms.create(
      WORLD_CONFIG.WIDTH / 2,
      WORLD_CONFIG.GROUND_Y + WORLD_CONFIG.GROUND_HEIGHT / 2,
      'ground'
    ) as Phaser.Physics.Arcade.Sprite;
    ground.setOrigin(0.5, 0.5);
    ground.refreshBody();

    // Create platform texture
    const platformGraphics = this.add.graphics();
    platformGraphics.fillStyle(0x654321, 1);
    platformGraphics.fillRect(0, 0, 150, 20);
    platformGraphics.generateTexture('platform', 150, 20);
    platformGraphics.destroy();

    // Jumping platforms
    PLATFORM_POSITIONS.forEach(pos => {
      const platform = this.platforms.create(pos.x, pos.y, 'platform') as Phaser.Physics.Arcade.Sprite;
      platform.setOrigin(0.5, 0.5);
      platform.refreshBody();
    });
  }

  private createDialogTriggers(): void {
    DIALOGS.forEach(dialog => {
      this.dialogTriggerManager.createTrigger(dialog.id, dialog.x, dialog.width);
    });
  }

  private initializeDialogTriggers(): void {
    const platformSurfaceY = PLATFORM_POSITIONS[0].y - PLATFORM_HEIGHT / 2;
    this.dialogTriggerManager = new DialogTriggerManager(
      this,
      PLATFORM_DIALOG_IDS,
      WORLD_CONFIG.GROUND_Y,
      platformSurfaceY
    );
    this.createDialogTriggers();

    // Setup overlap detection
    this.physics.add.overlap(
      this.player,
      this.dialogTriggerManager.getGroup(),
      (player, trigger) => this.handleDialogTrigger(player as Phaser.Physics.Arcade.Sprite, trigger as Phaser.Physics.Arcade.Sprite),
      undefined,
      this
    );
  }

  private handleDialogTrigger(
    _player: Phaser.Physics.Arcade.Sprite,
    trigger: Phaser.Physics.Arcade.Sprite
  ): void {
    this.currentTrigger = trigger;
  }

  private updateLanguageText(): void {
    const lang = localization.getLanguage();
    this.languageText.setText(lang.toUpperCase());
  }

  private toggleLanguage(): void {
    localization.toggleLanguage();
    this.updateLanguageText();
    
    // Reset state
    this.triggeredDialogs.clear();
    this.currentTrigger = null;
    this.speechBubble.hide();
    
    // Recreate triggers with fresh visual indicators
    this.dialogTriggerManager.destroyAll();
    this.initializeDialogTriggers();
  }

  update(): void {
    this.player.update();

    // Check if player is still in trigger zone
    if (this.currentTrigger) {
      const trigger = this.currentTrigger;
      const dialogId = trigger.getData('dialogId') as string;
      const dialogData = DIALOGS.find(d => d.id === dialogId);

      // Show dialog immediately when in trigger zone
      if (dialogData && !this.speechBubble.isVisible()) {
        const now = Date.now();
        const lastTriggerTime = this.triggeredDialogs.get(dialogId) || 0;
        
        if (now - lastTriggerTime >= DIALOG_COOLDOWN_MS) {
          this.triggeredDialogs.set(dialogId, now);
          
          const currentLang = localization.getLanguage();
          const dialogText = dialogData.text[currentLang];
          this.speechBubble.show(this.player.x, this.player.y, dialogText);

          // Temporarily dim the indicator using manager
          this.dialogTriggerManager.dimVisuals(dialogId);
        }
      }

      // Check if player left the trigger zone
      const overlapExists = this.physics.overlap(this.player, trigger);
      if (!overlapExists) {
        this.currentTrigger = null;
        this.speechBubble.hide();
      }
    }

    // Update speech bubble position to follow player
    if (this.speechBubble.isVisible()) {
      this.speechBubble.updatePosition(this.player.x, this.player.y);
    }

    // Update parallax background
    this.bg2.tilePositionX = this.cameras.main.scrollX * 0.3;

    // Toggle language with L key
    if (Phaser.Input.Keyboard.JustDown(this.languageToggleKey)) {
      this.toggleLanguage();
    }
  }
}
