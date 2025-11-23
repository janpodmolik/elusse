/**
 * UIManager - Manages HTML-based UI overlay for the game
 * Handles buttons, dialogs, and other UI elements separate from Phaser
 */

export class UIManager {
  private langButton: HTMLButtonElement;
  private skinButton: HTMLButtonElement;
  private controlsDialog: HTMLDialogElement;
  private hasPlayerMoved: boolean = false;

  constructor() {
    // Get UI elements
    this.langButton = document.getElementById('lang-btn') as HTMLButtonElement;
    this.skinButton = document.getElementById('skin-btn') as HTMLButtonElement;
    this.controlsDialog = document.getElementById('controls-dialog') as HTMLDialogElement;

    if (!this.langButton || !this.skinButton || !this.controlsDialog) {
      throw new Error('UI elements not found in DOM');
    }

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Language button click
    this.langButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onLanguageToggle?.();
    });

    // Skin button click
    this.skinButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onSkinToggle?.();
    });

    // Close dialog on any click/tap (first interaction)
    document.addEventListener('pointerdown', (e) => {
      if (!this.controlsDialog.open) return;
      
      // Don't close if clicking UI buttons
      const target = e.target as Node;
      if (this.langButton.contains(target) || this.skinButton.contains(target)) {
        return;
      }
      
      this.closeControlsDialog();
    });
  }

  // Callbacks for game logic
  public onLanguageToggle?: () => void;
  public onSkinToggle?: () => void;

  /**
   * Update language button text
   */
  public updateLanguageText(lang: string): void {
    const langText = this.langButton.querySelector('#lang-text');
    if (langText) {
      langText.textContent = lang.toUpperCase();
    }
  }

  /**
   * Update skin button text
   */
  public updateSkinText(skin: string): void {
    const skinText = this.skinButton.querySelector('#skin-text');
    if (skinText) {
      skinText.textContent = skin.toUpperCase();
    }
  }

  /**
   * Show controls dialog if needed (first visit or refresh)
   */
  public showControlsDialogIfNeeded(isTouchDevice: boolean): void {
    // Check if this is a page refresh
    const isPageRefresh = performance.getEntriesByType('navigation')[0] 
      && (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming).type === 'reload';
    
    const hasSeenHintThisSession = sessionStorage.getItem('hasSeenControlsHint');
    
    if (!hasSeenHintThisSession || isPageRefresh) {
      sessionStorage.setItem('hasSeenControlsHint', 'true');
      this.showControlsDialog(isTouchDevice);
    }
  }

  /**
   * Show controls dialog
   */
  public showControlsDialog(isTouchDevice: boolean): void {
    // Show appropriate controls based on device
    const desktopControls = document.getElementById('desktop-controls');
    const touchControls = document.getElementById('touch-controls');
    
    if (desktopControls && touchControls) {
      if (isTouchDevice) {
        desktopControls.style.display = 'none';
        touchControls.style.display = 'block';
      } else {
        desktopControls.style.display = 'block';
        touchControls.style.display = 'none';
      }
    }

    this.controlsDialog.showModal();
    this.hasPlayerMoved = false;
  }

  /**
   * Close controls dialog
   */
  public closeControlsDialog(): void {
    this.controlsDialog.close();
  }

  /**
   * Notify that player has moved via keyboard - close dialog after first movement
   */
  public notifyPlayerMoved(): void {
    if (this.hasPlayerMoved || !this.controlsDialog.open) return;
    
    this.hasPlayerMoved = true;
    this.closeControlsDialog();
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.controlsDialog.close();
  }
}
