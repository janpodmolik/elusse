import Phaser from 'phaser';

interface TriggerVisuals {
  indicator: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Graphics;
  indicatorTween?: Phaser.Tweens.Tween;
  iconTween?: Phaser.Tweens.Tween;
}

export class DialogTriggerManager {
  private scene: Phaser.Scene;
  private triggerGroup: Phaser.Physics.Arcade.StaticGroup;
  private visualElements: Map<string, TriggerVisuals> = new Map();
  private platformDialogIds: Set<string>;
  private groundSurfaceY: number;  // Y coordinate of ground surface (top of ground)
  private platformSurfaceY: number;  // Y coordinate of platform surface (top of platform)

  constructor(scene: Phaser.Scene, platformDialogIds: string[], groundSurfaceY: number, platformSurfaceY: number) {
    this.scene = scene;
    this.platformDialogIds = new Set(platformDialogIds);
    this.groundSurfaceY = groundSurfaceY;
    this.platformSurfaceY = platformSurfaceY;
    this.triggerGroup = this.scene.physics.add.staticGroup();
  }

  createTrigger(
    dialogId: string,
    x: number,
    width: number
  ): Phaser.Physics.Arcade.Sprite {
    const isOnPlatform = this.platformDialogIds.has(dialogId);
    const surfaceY = isOnPlatform ? this.platformSurfaceY : this.groundSurfaceY;
    // Position trigger 40px above the surface
    const yPosition = surfaceY - 40;
    
    const trigger = this.triggerGroup.create(
      x,
      yPosition,
      ''
    ) as Phaser.Physics.Arcade.Sprite;
    
    trigger.setSize(width, 80);
    trigger.setOrigin(0.5, 0.5);
    trigger.setData('dialogId', dialogId);
    trigger.refreshBody();

    // Create and store visual elements
    const visuals = this.createVisuals(dialogId, x, width, surfaceY);
    this.visualElements.set(dialogId, visuals);

    return trigger;
  }

  private createVisuals(
    _dialogId: string,
    x: number,
    width: number,
    surfaceY: number
  ): TriggerVisuals {
    // Visual indicator positioned 80px above the surface
    const indicatorY = surfaceY - 80;
    const indicatorHeight = 80;
    
    // Create indicator graphics (hidden)
    const indicator = this.scene.add.graphics();
    indicator.lineStyle(3, 0xffff00, 0);
    indicator.strokeRect(x - width / 2, indicatorY, width, indicatorHeight);
    indicator.fillStyle(0xffff00, 0);
    indicator.fillRect(x - width / 2, indicatorY, width, indicatorHeight);

    // Create icon graphics (hidden)
    const iconY = indicatorY - 10;
    const icon = this.scene.add.graphics();
    icon.fillStyle(0xffffff, 0);
    icon.fillCircle(x, iconY, 15);
    icon.lineStyle(3, 0xffff00, 0);
    icon.strokeCircle(x, iconY, 15);
    icon.fillStyle(0xffff00, 0);
    icon.fillRect(x - 3, iconY - 10, 6, 12);
    icon.fillCircle(x, iconY + 8, 3);

    // Add animations
    const indicatorTween = this.scene.tweens.add({
      targets: indicator,
      alpha: { from: 0.3, to: 0.8 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const iconTween = this.scene.tweens.add({
      targets: icon,
      y: '+=8',
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return { indicator, icon, indicatorTween, iconTween };
  }

  dimVisuals(dialogId: string): void {
    const visuals = this.visualElements.get(dialogId);
    if (!visuals) return;

    this.scene.tweens.add({
      targets: [visuals.indicator, visuals.icon],
      alpha: 0.2,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        // Restore indicator animation
        visuals.indicatorTween = this.scene.tweens.add({
          targets: visuals.indicator,
          alpha: { from: 0.3, to: 0.8 },
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
    });
  }

  destroyAll(): void {
    // Destroy all visual elements and tweens
    this.visualElements.forEach((visuals) => {
      visuals.indicatorTween?.remove();
      visuals.iconTween?.remove();
      visuals.indicator.destroy();
      visuals.icon.destroy();
    });
    this.visualElements.clear();

    // Clear trigger group
    this.triggerGroup.clear(true, true);
  }

  getGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.triggerGroup;
  }
}
