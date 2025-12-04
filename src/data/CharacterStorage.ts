import { type ModularCharacterSelection } from './modularConfig';

/**
 * JSON structure for backend storage
 * This is what gets sent to/from the server
 */
export interface CharacterSaveData {
  version: number;  // Schema version for future migrations
  gender: 'male' | 'female';
  skin: string | null;
  hair: string | null;
  clothing: string[];  // Array of clothing item IDs
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Get saved character selection from localStorage
 */
export function getSavedCharacterSelection(): ModularCharacterSelection | null {
  const saved = localStorage.getItem('characterSelection');
  if (!saved) return null;
  
  try {
    const parsed = JSON.parse(saved) as ModularCharacterSelection;
    if (parsed.gender && (parsed.gender === 'male' || parsed.gender === 'female')) {
      return {
        ...parsed,
        clothing: Array.isArray(parsed.clothing) ? parsed.clothing : [],
      };
    }
  } catch (e) {
    console.warn('Failed to load saved character selection:', e);
  }
  return null;
}

/**
 * Convert selection to save data for backend
 */
export function toSaveData(selection: ModularCharacterSelection): CharacterSaveData {
  return {
    version: 1,
    gender: selection.gender,
    skin: selection.skin,
    hair: selection.hair,
    clothing: [...selection.clothing],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Convert save data from backend to selection
 */
export function fromSaveData(data: CharacterSaveData): ModularCharacterSelection {
  return {
    gender: data.gender,
    skin: data.skin,
    hair: data.hair,
    clothing: data.clothing || [],
  };
}
