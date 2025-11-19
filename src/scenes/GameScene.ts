import Phaser from 'phaser';
import { Player } from './Player';
import { SpeechBubble } from '../ui/SpeechBubble';
import { DIALOGS } from '../data/dialogs';
import { localization } from '../data/localization';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private speechBubble!: SpeechBubble;
  private dialogTriggers!: Phaser.Physics.Arcade.StaticGroup;
  private triggeredDialogs: Set<string> = new Set();
  private languageToggleKey!: Phaser.Input.Keyboard.Key;
  private languageText!: Phaser.GameObjects.Text;
  private languageButtonZone!: Phaser.GameObjects.Zone;

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
    // Set world bounds (2000px wide map, taller for lower ground)
    this.physics.world.setBounds(0, 0, 2000, 800);

    // Create parallax background layers
    this.createParallaxBackground();

    // Create platforms
    this.createPlatforms();

    // Create player (lower starting position)
    this.player = new Player(this, 100, 650);
    this.physics.add.collider(this.player, this.platforms);

    // Setup camera to follow player
    this.cameras.main.setBounds(0, 0, 2000, 800);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // Create speech bubble UI
    this.speechBubble = new SpeechBubble(this);

    // Create dialog triggers
    this.createDialogTriggers();

    // Setup overlap detection for dialogs
    this.physics.add.overlap(
      this.player,
      this.dialogTriggers,
      (player, trigger) => this.handleDialogTrigger(player as Phaser.Physics.Arcade.Sprite, trigger as Phaser.Physics.Arcade.Sprite),
      undefined,
      this
    );

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

    // Create invisible zone for detecting clicks (to ignore player input)
    this.languageButtonZone = this.add.zone(this.scale.width - 110, 10, 100, 40).setOrigin(0, 0);
    this.languageButtonZone.setScrollFactor(0);
    this.languageButtonZone.setDepth(2001);

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

    // Ground platform (full width, at bottom)
    const groundGraphics = this.add.graphics();
    groundGraphics.fillStyle(0x8b4513, 1);
    groundGraphics.fillRect(0, 0, 2000, 50);
    groundGraphics.generateTexture('ground', 2000, 50);
    groundGraphics.destroy();

    const ground = this.platforms.create(1000, 775, 'ground') as Phaser.Physics.Arcade.Sprite;
    ground.setOrigin(0.5, 0.5);
    ground.refreshBody();

    // Create platform texture
    const platformGraphics = this.add.graphics();
    platformGraphics.fillStyle(0x654321, 1);
    platformGraphics.fillRect(0, 0, 150, 20);
    platformGraphics.generateTexture('platform', 150, 20);
    platformGraphics.destroy();

    // Jumping platforms (adjusted for new height)
    const platformPositions = [
      { x: 350, y: 680 },
      { x: 600, y: 660 },
      { x: 900, y: 670 },
      { x: 1250, y: 665 },
      { x: 1600, y: 660 },
    ];

    platformPositions.forEach(pos => {
      const platform = this.platforms.create(pos.x, pos.y, 'platform') as Phaser.Physics.Arcade.Sprite;
      platform.setOrigin(0.5, 0.5);
      platform.refreshBody();
    });
  }

  private createDialogTriggers(): void {
    this.dialogTriggers = this.physics.add.staticGroup();

    DIALOGS.forEach(dialog => {
      const trigger = this.dialogTriggers.create(
        dialog.x,
        750,
        ''
      ) as Phaser.Physics.Arcade.Sprite;
      
      trigger.setSize(dialog.width, 100);
      trigger.setOrigin(0.5, 0.5);
      trigger.setData('dialogId', dialog.id);
      trigger.refreshBody();

      // Create visual indicator for trigger zone (placeholder until sprite sheet is added)
      const indicator = this.add.graphics();
      indicator.lineStyle(3, 0xffff00, 0.6);
      indicator.strokeRect(
        dialog.x - dialog.width / 2,
        700,
        dialog.width,
        100
      );
      indicator.fillStyle(0xffff00, 0.15);
      indicator.fillRect(
        dialog.x - dialog.width / 2,
        700,
        dialog.width,
        100
      );

      // Add pulsing animation to indicator
      this.tweens.add({
        targets: indicator,
        alpha: { from: 0.3, to: 0.8 },
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Add icon placeholder above trigger zone
      const icon = this.add.graphics();
      icon.fillStyle(0xffffff, 0.9);
      icon.fillCircle(dialog.x, 690, 15);
      icon.lineStyle(3, 0xffff00, 1);
      icon.strokeCircle(dialog.x, 690, 15);
      
      // Draw "!" symbol
      icon.fillStyle(0xffff00, 1);
      icon.fillRect(dialog.x - 3, 680, 6, 12);
      icon.fillCircle(dialog.x, 698, 3);

      // Add subtle bounce animation to icon
      this.tweens.add({
        targets: icon,
        y: '+=8',
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Store visual elements for potential future replacement
      trigger.setData('indicator', indicator);
      trigger.setData('icon', icon);
    });
  }

  private handleDialogTrigger(
    _player: Phaser.Physics.Arcade.Sprite,
    trigger: Phaser.Physics.Arcade.Sprite
  ): void {
    const dialogId = trigger.getData('dialogId') as string;
    const dialogData = DIALOGS.find(d => d.id === dialogId);

    // Check if this dialog was already triggered
    if (dialogData && !this.triggeredDialogs.has(dialogId) && !this.speechBubble.isVisible()) {
      this.triggeredDialogs.add(dialogId);
      const currentLang = localization.getLanguage();
      const dialogText = dialogData.text[currentLang];
      this.speechBubble.show(this.player.x, this.player.y, dialogText);

      // Hide visual indicators after trigger
      const indicator = trigger.getData('indicator') as Phaser.GameObjects.Graphics;
      const icon = trigger.getData('icon') as Phaser.GameObjects.Graphics;
      
      if (indicator) {
        this.tweens.add({
          targets: indicator,
          alpha: 0,
          duration: 300,
          onComplete: () => indicator.destroy(),
        });
      }
      
      if (icon) {
        this.tweens.add({
          targets: icon,
          alpha: 0,
          scale: 0,
          duration: 300,
          onComplete: () => icon.destroy(),
        });
      }
    }
  }

  private updateLanguageText(): void {
    const lang = localization.getLanguage();
    this.languageText.setText(lang.toUpperCase());
  }

  private toggleLanguage(): void {
    localization.toggleLanguage();
    this.updateLanguageText();
    // Reset triggered dialogs so player can see them in new language
    this.triggeredDialogs.clear();
    this.speechBubble.hide();
    
    // Recreate trigger zones with fresh visual indicators
    this.dialogTriggers.clear(true, true);
    this.createDialogTriggers();
  }

  update(): void {
    this.player.update();

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
