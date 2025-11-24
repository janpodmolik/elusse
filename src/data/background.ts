/**
 * Background configuration and management
 * Defines available backgrounds with custom parallax scroll factors
 */

export interface BackgroundConfig {
  name: string;
  folder: string;
  scrollFactors: number[];
}

export const AVAILABLE_BACKGROUNDS: BackgroundConfig[] = [
  {
    name: 'FOREST',
    folder: 'forest',
    scrollFactors: [1.0, 0.8, 0.85, 0.9, 0.95, 1.0],
  },
  {
    name: 'FOREST BLUE',
    folder: 'forest_blue',
    scrollFactors: [1.0, 0.8, 0.85, 0.9, 0.95, 1.0],
  },
];

class BackgroundManager {
  private currentIndex: number = 0;

  constructor() {
    // Load from localStorage on initialization
    const stored = localStorage.getItem('background');
    if (stored) {
      const index = AVAILABLE_BACKGROUNDS.findIndex(bg => bg.folder === stored);
      if (index !== -1) {
        this.currentIndex = index;
      }
    }
  }

  /**
   * Get current background folder name
   */
  getBackground(): string {
    return AVAILABLE_BACKGROUNDS[this.currentIndex].folder;
  }

  /**
   * Get current background configuration
   */
  getCurrentConfig(): BackgroundConfig {
    return AVAILABLE_BACKGROUNDS[this.currentIndex];
  }

  /**
   * Set background by folder name
   */
  setBackground(folder: string): void {
    const index = AVAILABLE_BACKGROUNDS.findIndex(bg => bg.folder === folder);
    if (index !== -1) {
      this.currentIndex = index;
      localStorage.setItem('background', folder);
    }
  }

  /**
   * Toggle to next background
   */
  toggleBackground(): BackgroundConfig {
    this.currentIndex = (this.currentIndex + 1) % AVAILABLE_BACKGROUNDS.length;
    const config = AVAILABLE_BACKGROUNDS[this.currentIndex];
    localStorage.setItem('background', config.folder);
    return config;
  }

  /**
   * Get all available backgrounds
   */
  getAllBackgrounds(): readonly BackgroundConfig[] {
    return AVAILABLE_BACKGROUNDS;
  }
}

export const backgroundManager = new BackgroundManager();
