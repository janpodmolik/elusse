import Phaser from 'phaser';

export class SpeechBubble {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private pointer: Phaser.GameObjects.Triangle;
  private visible: boolean = false;
  private autoCloseTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create graphics for bubble background
    this.background = scene.add.graphics();

    // Create pointer (triangle pointing down to player)
    this.pointer = scene.add.triangle(0, 0, 0, 0, 10, 15, 20, 0, 0xffffff);
    this.pointer.setOrigin(0.5, 0);

    // Create text with pixel font
    this.text = scene.add.text(0, 0, '', {
      fontFamily: '"Press Start 2P"',
      fontSize: '10px',
      color: '#000000',
      align: 'center',
      wordWrap: { width: 280 },
      lineSpacing: 5,
    });
    this.text.setOrigin(0.5, 0.5);

    // Create container to hold all elements
    this.container = scene.add.container(0, 0, [
      this.background,
      this.text,
      this.pointer,
    ]);
    this.container.setDepth(1000);
    this.container.setVisible(false);
  }

  show(x: number, y: number, message: string, duration: number = 4000): void {
    this.text.setText(message);

    // Calculate bubble dimensions based on text
    const padding = 15;
    const textWidth = this.text.width;
    const textHeight = this.text.height;
    const bubbleWidth = textWidth + padding * 2;
    const bubbleHeight = textHeight + padding * 2;

    // Draw rounded rectangle bubble
    this.background.clear();
    this.background.fillStyle(0xffffff, 1);
    this.background.lineStyle(3, 0x000000, 1);
    this.background.fillRoundedRect(
      -bubbleWidth / 2,
      -bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      8
    );
    this.background.strokeRoundedRect(
      -bubbleWidth / 2,
      -bubbleHeight / 2,
      bubbleWidth,
      bubbleHeight,
      8
    );

    // Position pointer at bottom center of bubble
    this.pointer.setPosition(0, bubbleHeight / 2);

    // Position container above player
    this.container.setPosition(x, y - 60);
    this.container.setVisible(true);
    this.visible = true;

    // Auto-close timer
    if (this.autoCloseTimer) {
      this.autoCloseTimer.remove();
    }
    this.autoCloseTimer = this.scene.time.delayedCall(duration, () => {
      this.hide();
    });
  }

  hide(): void {
    this.container.setVisible(false);
    this.visible = false;
    if (this.autoCloseTimer) {
      this.autoCloseTimer.remove();
      this.autoCloseTimer = undefined;
    }
  }

  isVisible(): boolean {
    return this.visible;
  }

  updatePosition(x: number, y: number): void {
    if (this.visible) {
      this.container.setPosition(x, y - 60);
    }
  }

  destroy(): void {
    if (this.autoCloseTimer) {
      this.autoCloseTimer.remove();
    }
    this.container.destroy();
  }
}
