import Phaser from 'phaser';
import type { PlacedNPC } from '../data/mapConfig';
import { getNPCDefinition } from '../data/npcs/npcRegistry';

export class NPC extends Phaser.Physics.Arcade.Sprite {
  public id: string;
  public npcId: string;
  private dialogData?: PlacedNPC['dialog'];
  private _triggerRadius: number;
  private selectionIndicator?: Phaser.GameObjects.Rectangle;
  private radiusIndicator?: Phaser.GameObjects.Arc;
  private _isSelected: boolean = false;
  private isBuilderMode: boolean;
  
  private static readonly DEFAULT_TRIGGER_RADIUS = 200;

  constructor(scene: Phaser.Scene, config: PlacedNPC, builderMode: boolean = false) {
    const definition = getNPCDefinition(config.npcId);
    if (!definition) {
      throw new Error(`NPC definition not found for id: ${config.npcId}`);
    }

    super(scene, config.x, config.y, config.npcId);

    this.id = config.id;
    this.npcId = config.npcId;
    this.dialogData = config.dialog;
    this._triggerRadius = config.triggerRadius ?? NPC.DEFAULT_TRIGGER_RADIUS;
    this.isBuilderMode = builderMode;

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

    // Setup animations - only in game mode
    if (!this.isBuilderMode) {
      this.setupAnimations(definition);
      this.play(`${this.npcId}_idle`);
    }
    // In builder mode, just show the first frame (static image)

    // NPC dialogs are now triggered by proximity, not click
    // Interactive is still set for builder mode selection
    this.setInteractive({ cursor: 'pointer' });
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

  public updateDialog(newDialog: PlacedNPC['dialog']) {
    this.dialogData = newDialog;
  }
  
  public getDialogData(): PlacedNPC['dialog'] {
    return this.dialogData;
  }
  
  public get triggerRadius(): number {
    return this._triggerRadius;
  }
  
  public setTriggerRadius(radius: number) {
    this._triggerRadius = radius;
    // Update radius indicator if it exists
    if (this.radiusIndicator) {
      this.radiusIndicator.setRadius(radius);
    }
  }
  
  public setFlipped(flip: boolean) {
    this.setFlipX(flip);
  }
  
  public get isSelected(): boolean {
    return this._isSelected;
  }
  
  public setSelected(selected: boolean) {
    // Guard against invalid scene (e.g., after scene shutdown)
    if (!this.scene?.add) return;
    
    this._isSelected = selected;
    
    if (selected) {
      if (!this.selectionIndicator) {
        // Create selection indicator (orange outline rectangle)
        this.selectionIndicator = this.scene.add.rectangle(
          this.x,
          this.y,
          this.displayWidth + 8,
          this.displayHeight + 8,
          0xe67e22,
          0
        );
        this.selectionIndicator.setStrokeStyle(3, 0xe67e22, 1);
        this.selectionIndicator.setDepth(this.depth - 1);
      }
      // Create radius indicator circle
      if (!this.radiusIndicator) {
        this.radiusIndicator = this.scene.add.circle(
          this.x,
          this.y,
          this._triggerRadius,
          0xe67e22,
          0.15
        );
        this.radiusIndicator.setStrokeStyle(2, 0xe67e22, 0.5);
        this.radiusIndicator.setDepth(this.depth - 2);
      }
    } else {
      if (this.selectionIndicator) {
        this.selectionIndicator.destroy();
        this.selectionIndicator = undefined;
      }
      if (this.radiusIndicator) {
        this.radiusIndicator.destroy();
        this.radiusIndicator = undefined;
      }
    }
  }
  
  public updateSelectionIndicator() {
    if (this.selectionIndicator && this._isSelected) {
      this.selectionIndicator.setPosition(this.x, this.y);
      this.selectionIndicator.setSize(this.displayWidth + 8, this.displayHeight + 8);
    }
    if (this.radiusIndicator && this._isSelected) {
      this.radiusIndicator.setPosition(this.x, this.y);
      this.radiusIndicator.setRadius(this._triggerRadius);
    }
  }
  
  public destroy(fromScene?: boolean) {
    if (this.selectionIndicator) {
      this.selectionIndicator.destroy();
      this.selectionIndicator = undefined;
    }
    if (this.radiusIndicator) {
      this.radiusIndicator.destroy();
      this.radiusIndicator = undefined;
    }
    super.destroy(fromScene);
  }
}
