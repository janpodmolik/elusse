export type Language = 'cs' | 'en';

export interface LocalizedText {
  cs: string;
  en: string;
}

export interface DialogData {
  id: string;
  x: number;
  width: number;
  text: LocalizedText;
}
