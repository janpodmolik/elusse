import Phaser from 'phaser';
import type { PlacedNPC } from '../data/mapConfig';
import { getNPCDefinition } from '../data/npcs/npcRegistry';
import { EventBus, EVENTS } from '../events/EventBus';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public npcId: string;
  private dialogData?: PlacedNPC['dialog'];
  private interactionZone?: Phaser.GameObjects.Zone;

  constructor(scene: Phaser.Scene, config: PlacedNPC) {
    const definition = getNPCDefinition(config.npcId);
    if (!definition) {
      throw new Error(`NPC definition not found for id: ${config.npcId}`);
    }

    super(scene, config.x, config.y, config.npcId);

    this.id = config.id;
    this.npcId = config.npcId;
    this.dialogData = config.dialog;

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Setup visual properties
    this.setScale(config.scale ?? definition.scale);
    this.setFlipX(config.flipX ?? false);
    
    // Setup physics body
    // NPCs are static obstacles usually, but we might want them to push back or be immovable
    this.setImmovable(true);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    // Adjust hitbox if needed (can be refined based on asset)
    const width = definition.frameWidth * 0.6;
    const height = definition.frameHeight * 0.8;
    this.body?.setSize(width, height);
    this.body?.setOffset(
      (definition.frameWidth - width) / 2,
      definition.frameHeight - height
    );

    // Setup animations
    this.setupAnimations(definition);
    this.play(`${this.npcId}_idle`);

    // Setup interaction
    this.setInteractive({ cursor: 'pointer' });
    this.on('pointerdown', this.interact, this);
  }

  private setupAnimations(definition: any) {
    if (!definition.animations) return;

    const animKey = `${this.npcId}_idle`;
    if (!this.scene.anims.exists(animKey)) {
      this.scene.anims.create({
        key: animKey,
        frames: this.scene.anims.generateFrameNumbers(this.npcId, {
          start: definition.animations.idle.startFrame,
          end: definition.animations.idle.endFrame
        }),
        frameRate: definition.animations.idle.frameRate,
        repeat: -1
      });
    }
  }

  public interact() {
    if (this.dialogData && this.dialogData.length > 0) {
      // Emit event to show dialog
      // We'll need to handle this event in GameScene or a UI manager
      EventBus.emit(EVENTS.SHOW_DIALOG, {
        texts: this.dialogData,
        npcId: this.id
      });
    }
  }

  public updateDialog(newDialog: PlacedNPC['dialog']) {
    this.dialogData = newDialog;
  }
  
  public setFlip(flip: boolean) {
    this.setFlipX(flip);
  }
}
