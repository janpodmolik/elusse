// Player skin configuration
// Supports multiple character types (cat, dog) with different color variants
// Supports both PNG spritesheets and GIF animations

export type SkinFormat = 'spritesheet' | 'gif';

export interface SkinConfig {
  id: string;           // Unique identifier, matches folder name
  name: string;         // Display name for UI
  folder: string;       // Asset folder name (same as id)
  character: 'cat' | 'dog' | 'human';  // Character type for animation grouping
  format: SkinFormat;   // Asset format: 'spritesheet' (PNG) or 'gif'
  // Optional frame rate overrides for GIF skins (if GIF delays are wrong)
  frameRates?: {
    idle?: number;
    run?: number;
  };
}

export const AVAILABLE_SKINS: SkinConfig[] = [
  { id: 'cat_blue', name: 'BLUE CAT', folder: 'cat_blue', character: 'cat', format: 'spritesheet' },
  { id: 'cat_orange', name: 'ORANGE CAT', folder: 'cat_orange', character: 'cat', format: 'spritesheet' },
  { id: 'cat_white', name: 'WHITE CAT', folder: 'cat_white', character: 'cat', format: 'spritesheet' },
  { id: 'dog_blue', name: 'BLUE DOG', folder: 'dog_blue', character: 'dog', format: 'spritesheet' },
  { id: 'dog_yellow', name: 'YELLOW DOG', folder: 'dog_yellow', character: 'dog', format: 'spritesheet' },
  { id: 'cowboy_girl', name: 'COWBOY GIRL', folder: 'cowboy_girl', character: 'human', format: 'gif', frameRates: { idle: 8, run: 12 } },
  { id: 'student_med', name: 'MED STUDENT', folder: 'student_med', character: 'human', format: 'gif', frameRates: { idle: 8, run: 12 } },
  { id: 'knight', name: 'KNIGHT', folder: 'knight', character: 'human', format: 'gif', frameRates: { idle: 8, run: 12 } },
];

// Default skin ID
export const DEFAULT_SKIN_ID = 'cat_orange';

class SkinManager {
  private currentSkinId: string = DEFAULT_SKIN_ID;

  constructor() {
    // Load from localStorage if available
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('playerSkin');
    if (stored && this.isValidSkinId(stored)) {
      this.currentSkinId = stored;
    }
  }

  private isValidSkinId(id: string): boolean {
    return AVAILABLE_SKINS.some(skin => skin.id === id);
  }

  setSkin(skinId: string): void {
    if (this.isValidSkinId(skinId)) {
      this.currentSkinId = skinId;
      localStorage.setItem('playerSkin', skinId);
    }
  }

  getSkinId(): string {
    return this.currentSkinId;
  }

  getSkinConfig(): SkinConfig {
    return AVAILABLE_SKINS.find(skin => skin.id === this.currentSkinId) || AVAILABLE_SKINS[0];
  }

  getSkinById(id: string): SkinConfig | undefined {
    return AVAILABLE_SKINS.find(skin => skin.id === id);
  }

  getAllSkins(): SkinConfig[] {
    return AVAILABLE_SKINS;
  }

  /** Get animation key prefix for current skin */
  getAnimationPrefix(): string {
    const config = this.getSkinConfig();
    return `${config.character}-${config.id}`;
  }
}

export const skinManager = new SkinManager();
