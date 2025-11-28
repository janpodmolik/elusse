/**
 * Language type for localization
 */
export type Language = 'cs' | 'en';

/**
 * Language definition with code and display label
 */
export interface LanguageDefinition {
  code: Language;
  label: string;
}

/**
 * Available languages in the application
 * Single source of truth for all language-related UI
 */
export const LANGUAGES: LanguageDefinition[] = [
  { code: 'cs', label: 'CZ' },
  { code: 'en', label: 'EN' },
];

/**
 * Default language code
 */
export const DEFAULT_LANGUAGE: Language = 'cs';
