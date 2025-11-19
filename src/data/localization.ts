import { Language } from '../types/DialogData';

class LocalizationManager {
  private currentLanguage: Language = 'cs';

  setLanguage(lang: Language): void {
    this.currentLanguage = lang;
    localStorage.setItem('language', lang);
  }

  getLanguage(): Language {
    const stored = localStorage.getItem('language') as Language;
    if (stored === 'cs' || stored === 'en') {
      this.currentLanguage = stored;
    }
    return this.currentLanguage;
  }

  toggleLanguage(): Language {
    this.currentLanguage = this.currentLanguage === 'cs' ? 'en' : 'cs';
    this.setLanguage(this.currentLanguage);
    return this.currentLanguage;
  }
}

export const localization = new LocalizationManager();
