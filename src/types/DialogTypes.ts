/**
 * Dialog System Types
 * Types for dialog trigger zones and localized text content
 */

/**
 * Localized text for a single language
 */
export interface LocalizedText {
  language: string;  // 'cs', 'en', or custom
  title: string;     // Bold heading
  content: string;   // Main text content
}

/**
 * Dialog trigger zone
 * Invisible area that triggers dialog display when player enters
 */
export interface DialogZone {
  id: string;
  x: number;           // Left edge of zone
  width: number;       // Zone width (resizable in editor)
  color: string;       // Hex color for editor visualization
  texts: LocalizedText[];
}

/**
 * Generate unique zone ID
 */
export function generateZoneId(): string {
  return `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Available colors for zone visualization (pixel art friendly palette)
 */
export const ZONE_COLORS = [
  '#e74c3c', // Red
  '#e67e22', // Orange
  '#f1c40f', // Yellow
  '#2ecc71', // Green
  '#1abc9c', // Teal
  '#3498db', // Blue
  '#9b59b6', // Purple
  '#e91e8f', // Pink
] as const;

/**
 * Generate random color for zone visualization
 */
export function generateZoneColor(): string {
  return ZONE_COLORS[Math.floor(Math.random() * ZONE_COLORS.length)];
}

/**
 * Create a new empty dialog zone
 */
export function createDialogZone(x: number, width: number = 200): DialogZone {
  return {
    id: generateZoneId(),
    x,
    width,
    color: generateZoneColor(),
    texts: [
      {
        language: 'cs',
        title: '',
        content: '',
      }
    ],
  };
}

/**
 * Get text for specific language with fallback
 */
export function getZoneText(zone: DialogZone, language: string): LocalizedText | null {
  // Try exact match
  const exact = zone.texts.find(t => t.language === language);
  if (exact) return exact;
  
  // Fallback to first available
  return zone.texts[0] || null;
}
