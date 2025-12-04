// Player skin configuration
// Supports multiple character types with different color variants
// All skins use PNG spritesheets (horizontal strip format)

// Target rendered height for all player sprites (before any additional scaling)
export const TARGET_PLAYER_HEIGHT = 240;

export interface SkinConfig {
  id: string;           // Unique identifier, matches folder name
  name: string;         // Display name for UI
  folder: string;       // Asset folder name (same as id)
  character: 'cat' | 'dog' | 'human';  // Character type for animation grouping
  variant?: string;     // Subfolder for sprite variant (e.g., 'basic')
  frameWidth?: number;  // Sprite frame width (default: 48)
  frameHeight?: number; // Sprite frame height (default: 48)
  scale?: number;       // Custom scale multiplier (overrides automatic calculation based on TARGET_PLAYER_HEIGHT)
  facingLeft?: boolean; // True if sprite faces left by default (inverts flipX logic)
  frameRates?: {        // Optional frame rate overrides
    idle?: number;
    run?: number;
  };
}

// Default frame dimensions (for cat/dog sprites)
const DEFAULT_FRAME_WIDTH = 48;
const DEFAULT_FRAME_HEIGHT = 48;

/**
 * Get the asset path for a skin
 */
export function getSkinAssetPath(skin: SkinConfig): string {
  // Base path includes static/ for static skins
  const basePath = `assets/skins/static/${skin.folder}`;
  if (skin.variant) {
    return `${basePath}/${skin.variant}`;
  }
  return basePath;
}

/**
 * Get the scale factor for a skin to achieve TARGET_PLAYER_HEIGHT
 */
export function getSkinScale(skin: SkinConfig): number {
  if (skin.scale !== undefined) {
    return skin.scale;
  }
  const frameHeight = skin.frameHeight ?? DEFAULT_FRAME_HEIGHT;
  return TARGET_PLAYER_HEIGHT / frameHeight;
}

/**
 * Get frame dimensions for a skin
 */
export function getSkinFrameDimensions(skin: SkinConfig): { width: number; height: number } {
  return {
    width: skin.frameWidth ?? DEFAULT_FRAME_WIDTH,
    height: skin.frameHeight ?? DEFAULT_FRAME_HEIGHT,
  };
}

export const AVAILABLE_SKINS: SkinConfig[] = [
  // { id: 'cat_blue', name: 'BLUE CAT', folder: 'cat_blue', character: 'cat' },
  // { id: 'cat_orange', name: 'ORANGE CAT', folder: 'cat_orange', character: 'cat' },
  // { id: 'cat_white', name: 'WHITE CAT', folder: 'cat_white', character: 'cat' },
  // { id: 'dog_blue', name: 'BLUE DOG', folder: 'dog_blue', character: 'dog' },
  // { id: 'dog_yellow', name: 'YELLOW DOG', folder: 'dog_yellow', character: 'dog' },
  { id: 'succubus', name: 'SUCCUBUS', folder: 'succubus', variant: 'basic', character: 'human', frameWidth: 156, frameHeight: 72, facingLeft: true, frameRates: { idle: 8, run: 12 } },
];

// Default skin ID
export const DEFAULT_SKIN_ID = 'succubus';

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
