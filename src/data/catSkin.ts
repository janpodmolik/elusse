// Available cat skins - add new skins here
export const AVAILABLE_SKINS = ['orange', 'white'] as const;
export type CatSkin = typeof AVAILABLE_SKINS[number];

class CatSkinManager {
  private currentSkin: CatSkin = AVAILABLE_SKINS[0];
  private currentIndex: number = 0;

  setSkin(skin: CatSkin): void {
    if (AVAILABLE_SKINS.includes(skin)) {
      this.currentSkin = skin;
      this.currentIndex = AVAILABLE_SKINS.indexOf(skin);
      localStorage.setItem('catSkin', skin);
    }
  }

  getSkin(): CatSkin {
    const stored = localStorage.getItem('catSkin') as CatSkin;
    if (stored && AVAILABLE_SKINS.includes(stored)) {
      this.currentSkin = stored;
      this.currentIndex = AVAILABLE_SKINS.indexOf(stored);
    }
    return this.currentSkin;
  }

  toggleSkin(): CatSkin {
    // Cycle through all available skins
    this.currentIndex = (this.currentIndex + 1) % AVAILABLE_SKINS.length;
    this.currentSkin = AVAILABLE_SKINS[this.currentIndex];
    this.setSkin(this.currentSkin);
    return this.currentSkin;
  }

  getAllSkins(): readonly CatSkin[] {
    return AVAILABLE_SKINS;
  }
}

export const catSkinManager = new CatSkinManager();
