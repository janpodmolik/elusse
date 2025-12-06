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
  /** Top offset in scaled pixels (empty space at top of sprite) */
  private _topOffset: number = 0;
  
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
    const scale = config.scale ?? definition.scale;
    this.setScale(scale);
    this.setFlipX(config.flipX ?? false);
    
    // Store topOffset (scaled) for hitbox and dialog positioning
    this._topOffset = (definition.topOffset ?? 0) * scale;
    
    // Setup physics body
    // NPCs are static obstacles usually, but we might want them to push back or be immovable
    this.setImmovable(true);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    
    // Adjust hitbox based on topOffset - excludes empty space at top
    const topOffset = definition.topOffset ?? 0;
    const contentHeight = definition.frameHeight - topOffset;
    const width = definition.frameWidth * 0.5;
    const height = contentHeight * 0.9;
    this.body?.setSize(width, height);
    this.body?.setOffset(
      (definition.frameWidth - width) / 2,
      topOffset + (contentHeight - height)
    );
    
    // Set interactive hitArea - smaller width for easier clicking between NPCs
    const hitWidth = definition.frameWidth * 0.5;
    const hitHeight = contentHeight * 0.9;
    const hitX = (definition.frameWidth - hitWidth) / 2;
    const hitY = topOffset + (contentHeight - hitHeight);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(hitX, hitY, hitWidth, hitHeight),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      cursor: 'pointer'
    });
    
    // Setup animations - only in game mode
    if (!this.isBuilderMode) {
      this.setupAnimations(definition);
      this.play(`${this.npcId}_idle`);
    }
    // In builder mode, just show the first frame (static image)
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
  
  /**
   * Get the "content height" of the NPC (excluding empty top space)
   * Used for dialog bubble positioning
   */
  public getContentHeight(): number {
    return this.displayHeight - this._topOffset;
  }
  
  /**
   * Get the top offset (empty space at top of sprite)
   */
  public get topOffset(): number {
    return this._topOffset;
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
  
  /**
   * Get the hitbox dimensions (for selection indicator)
   */
  private getHitboxDimensions(): { width: number; height: number; offsetY: number } {
    const definition = getNPCDefinition(this.npcId);
    if (!definition) return { width: this.displayWidth, height: this.displayHeight, offsetY: 0 };
    
    const scale = this.scaleX;
    const topOffset = definition.topOffset ?? 0;
    const contentHeight = definition.frameHeight - topOffset;
    
    const hitWidth = definition.frameWidth * 0.5 * scale;
    const hitHeight = contentHeight * 0.9 * scale;
    // Offset from center: move down by half of topOffset (scaled)
    const offsetY = (topOffset * scale) / 2;
    
    return { width: hitWidth, height: hitHeight, offsetY };
  }
  
  public get isSelected(): boolean {
    return this._isSelected;
  }
  
  public setSelected(selected: boolean) {
    // Guard against invalid scene (e.g., after scene shutdown)
    if (!this.scene?.add) return;
    
    this._isSelected = selected;
    
    if (selected) {
      const hitbox = this.getHitboxDimensions();
      
      if (!this.selectionIndicator) {
        // Create selection indicator (orange outline rectangle) matching hitbox size
        this.selectionIndicator = this.scene.add.rectangle(
          this.x,
          this.y + hitbox.offsetY,
          hitbox.width + 8,
          hitbox.height + 8,
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
      const hitbox = this.getHitboxDimensions();
      this.selectionIndicator.setPosition(this.x, this.y + hitbox.offsetY);
      this.selectionIndicator.setSize(hitbox.width + 8, hitbox.height + 8);
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
