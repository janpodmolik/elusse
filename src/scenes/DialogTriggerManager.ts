/**
 * DialogTriggerManager - Manages dialog trigger points in the game world
 * 
 * Responsibilities:
 * - Creates and positions trigger sprites based on dialog configuration
 * - Manages trigger zone collision detection
 * - Handles trigger animations (pulse, bob)
 * - Tracks trigger lifecycle (show/hide based on dismissal state)
 * 
 * Usage:
 * const manager = new DialogTriggerManager(scene, groundY);
 * manager.createTriggers(DIALOGS);
 * manager.setupCollisionDetection(player, onEnter, onExit);
 */

import Phaser from 'phaser';
import { DialogData, TriggerType } from '../types/DialogData';

interface TriggerElements {
  sprite: Phaser.GameObjects.Sprite;
  zone: Phaser.GameObjects.Zone;
  tween: Phaser.Tweens.Tween;
}

export class DialogTriggerManager {
  private scene: Phaser.Scene;
  private groundY: number;
  private triggers: Map<string, TriggerElements> = new Map();
  
  // Configuration: Trigger sprite positioning
  private readonly TRIGGER_Y_OFFSET = 60; // How far above ground to place trigger
  private readonly ZONE_HEIGHT = 80; // Height of collision zone

  // Configuration: Scale per trigger type
  private readonly TRIGGER_SCALES: Record<TriggerType, number> = {
    'tent': 6,  
    'lamp': 8,
    'sign_left': 7,
    'sign_right': 7,
    'stone_0': 4, 
    'stone_1': 5,
    'stone_2': 4,
  };

  constructor(scene: Phaser.Scene, groundY: number) {
    this.scene = scene;
    this.groundY = groundY;
  }

  /**
   * Load all trigger sprite assets
   * Call this in scene preload()
   */
  static preloadAssets(scene: Phaser.Scene): void {
    scene.load.image('trigger-tent', 'assets/ui/tent.png');
    scene.load.image('trigger-lamp', 'assets/ui/lamp.png');
    scene.load.image('trigger-sign-left', 'assets/ui/sign_left.png');
    scene.load.image('trigger-sign-right', 'assets/ui/sign_right.png');
    scene.load.image('trigger-stone-0', 'assets/ui/stone_0.png');
    scene.load.image('trigger-stone-1', 'assets/ui/stone_1.png');
    scene.load.image('trigger-stone-2', 'assets/ui/stone_2.png');
  }

  /**
   * Create trigger sprites and collision zones for all dialogs
   */
  createTriggers(dialogs: DialogData[]): void {
    dialogs.forEach(dialog => {
      this.createTrigger(dialog);
    });
  }

  /**
   * Create a single trigger point
   */
  private createTrigger(dialog: DialogData): void {
    const baseY = this.groundY - this.TRIGGER_Y_OFFSET;
    const additionalOffset = dialog.yOffset || 0;
    const triggerY = baseY - additionalOffset; // Apply custom offset if provided
    const triggerType = dialog.triggerType || 'tent'; // Default to 'tent'
    const spriteKey = this.getSpriteKey(triggerType);
    const scale = this.TRIGGER_SCALES[triggerType];

    // Create sprite
    const sprite = this.scene.add.sprite(dialog.x, triggerY, spriteKey);
    sprite.setOrigin(0.5, 1); // Bottom center anchor
    sprite.setDepth(-1); // Behind player
    sprite.setScale(scale); // Individual scale per trigger type

    // Create collision zone
    const zone = this.scene.add.zone(
      dialog.x,
      this.groundY - (this.ZONE_HEIGHT / 2),
      dialog.width,
      this.ZONE_HEIGHT
    );
    this.scene.physics.add.existing(zone);
    zone.setData('dialogId', dialog.id);

    // Store elements (no animation)
    this.triggers.set(dialog.id, { sprite, zone, tween: null as any });
  }

  /**
   * Setup collision detection between player and trigger zones
   */
  setupCollisionDetection(
    player: Phaser.Physics.Arcade.Sprite,
    onEnterTrigger: (dialogId: string) => void,
    onExitTrigger: () => void
  ): void {
    this.triggers.forEach((elements, dialogId) => {
      // Overlap detection
      this.scene.physics.add.overlap(
        player,
        elements.zone,
        () => {
          // Player entered trigger zone
          onEnterTrigger(dialogId);
        }
      );
    });

    // Track which zone player is in (for exit detection)
    let currentZoneId: string | null = null;

    this.scene.events.on('update', () => {
      let inAnyZone = false;
      
      this.triggers.forEach((elements, dialogId) => {
        const bounds = elements.zone.getBounds();
        const playerBounds = player.getBounds();
        
        if (Phaser.Geom.Intersects.RectangleToRectangle(bounds, playerBounds)) {
          inAnyZone = true;
          if (currentZoneId !== dialogId) {
            currentZoneId = dialogId;
            onEnterTrigger(dialogId);
          }
        }
      });

      // Player exited all zones
      if (!inAnyZone && currentZoneId !== null) {
        currentZoneId = null;
        onExitTrigger();
      }
    });
  }

  /**
   * Hide a trigger (when dialog is dismissed permanently)
   */
  hideTrigger(dialogId: string): void {
    const elements = this.triggers.get(dialogId);
    if (elements) {
      elements.sprite.setVisible(false);
      if (elements.tween) {
        elements.tween.stop();
      }
      elements.zone.destroy();
    }
  }

  /**
   * Show a trigger (restore after hiding)
   */
  showTrigger(dialogId: string): void {
    const elements = this.triggers.get(dialogId);
    if (elements) {
      elements.sprite.setVisible(true);
      if (elements.tween) {
        elements.tween.restart();
      }
    }
  }

  /**
   * Clean up all triggers and resources
   */
  destroy(): void {
    this.triggers.forEach(elements => {
      if (elements.tween) {
        elements.tween.remove();
      }
      elements.sprite.destroy();
      elements.zone.destroy();
    });
    this.triggers.clear();
  }

  /**
   * Get Phaser sprite key for trigger type
   */
  private getSpriteKey(type: TriggerType): string {
    const keyMap: Record<TriggerType, string> = {
      'tent': 'trigger-tent',
      'lamp': 'trigger-lamp',
      'sign_left': 'trigger-sign-left',
      'sign_right': 'trigger-sign-right',
      'stone_0': 'trigger-stone-0',
      'stone_1': 'trigger-stone-1',
      'stone_2': 'trigger-stone-2'
    };
    return keyMap[type];
  }

  /**
   * Get all trigger zones (for debug visualization)
   */
  getTriggerZones(): Phaser.GameObjects.Zone[] {
    return Array.from(this.triggers.values()).map(el => el.zone);
  }
}
