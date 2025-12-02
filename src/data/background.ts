/**
 * Background configuration and management
 * Defines available backgrounds with custom parallax scroll factors
 */

export interface BackgroundConfig {
  name: string;
  folder: string;
  scrollFactors: number[];
  /** Number of layers from the end that should be rendered in foreground (in front of player). Defaults to 0 */
  foregroundLayers?: number;
}

export const AVAILABLE_BACKGROUNDS: BackgroundConfig[] = [
  {
    name: 'FOREST GREEN',
    folder: 'forest_green',
    // forest_green has layers 1-6 (6 parallax layers, last 1 is foreground)
    scrollFactors: [0.75, 0.8, 0.85, 0.9, 1.0, 1.0],
    foregroundLayers: 1,
  },
  {
    name: 'FOREST BLUE',
    folder: 'forest_blue',
    // forest_blue has layers 1-6 (6 parallax layers)
    scrollFactors: [0.75, 0.8, 0.85, 0.9, 0.95, 1.0],
  },
  {
    name: 'FOREST BIRCH',
    folder: 'forest_birch',
    // forest_birch has layers 1-5 (5 parallax layers)
    scrollFactors: [0.75, 0.8, 0.85, 0.9, 1.0],
  },
  {
    name: 'FOREST FANTASY',
    folder: 'forest_fantasy',
    // forest_fantasy has layers 1-7 (7 parallax layers, last 2 are foreground)
    scrollFactors: [0.75, 0.8, 0.85, 0.9, 1.0, 1.0, 1.0],
    foregroundLayers: 2,
  },
  {
    name: 'FOREST GOLD',
    folder: 'forest_gold',
    // forest_gold has layers 1-6 (6 parallax layers, last 2 are foreground)
    scrollFactors: [0.75, 0.8, 0.85, 1.0, 1.0, 1.0],
    foregroundLayers: 2,
  },
  {
    name: 'FOREST JUNGLE',
    folder: 'forest_jungle',
    // forest_jungle has layers 1-4 (4 parallax layers)
    scrollFactors: [0.75, 0.8, 0.85, 1.0],
  },
  {
    name: 'FOREST SUMMER',
    folder: 'forest_summer',
    // forest_summer has layers 1-5 (5 parallax layers, last 1 is foreground)
    scrollFactors: [0.75, 0.8, 0.85, 1.0, 1.0],
    foregroundLayers: 1,
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

  /**
   * Set background by index
   */
  setBackgroundByIndex(index: number): void {
    if (index >= 0 && index < AVAILABLE_BACKGROUNDS.length) {
      this.currentIndex = index;
      localStorage.setItem('background', AVAILABLE_BACKGROUNDS[index].folder);
    }
  }

  /**
   * Get current background index
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }
}

export const backgroundManager = new BackgroundManager();
