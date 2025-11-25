export type Language = 'cs' | 'en';

export type TriggerType = 'tent' | 'lamp' | 'sign_left' | 'sign_right' | 'stone_0' | 'stone_1' | 'stone_2';

export interface LocalizedText {
  cs: string;
  en: string;
}

export interface DialogData {
  id: string;
  x: number;
  width: number;
  text: LocalizedText;
  triggerType?: TriggerType; // Optional: defaults to 'sign_right' if not specified
  yOffset?: number; // Optional: additional Y offset from ground (positive = higher, negative = lower)
}
