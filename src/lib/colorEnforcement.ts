/**
 * WCAG AA Contrast Enforcement Utility
 * 
 * Enforces minimum 4.5:1 contrast ratio per Digital Menu Output Constitution.
 * This is not a suggestion - it's automatic enforcement by design.
 * 
 * Usage:
 * const safeColor = enforceContrast(brandColor, backgroundColor, fallbackColor);
 * // Returns brandColor if it passes WCAG AA, otherwise returns fallbackColor
 */

/**
 * Calculate relative luminance of a hex color
 * Based on WCAG 2.0 specification
 * @param hex - Hex color string (e.g., '#ffffff' or '#fff')
 * @returns Relative luminance value between 0 and 1
 */
export function getLuminance(hex: string): number {
  if (typeof hex !== 'string') return Number.NaN;
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!match) return Number.NaN;
  const cleanHex = match[1];
  
  // Convert 3-digit hex to 6-digit
  const fullHex = cleanHex.length === 3
    ? cleanHex.split('').map(c => c + c).join('')
    : cleanHex;
  
  // Parse RGB values
  const rgb = parseInt(fullHex, 16);
  const r = ((rgb >> 16) & 0xff) / 255;
  const g = ((rgb >> 8) & 0xff) / 255;
  const b = (rgb & 0xff) / 255;
  
  // Apply sRGB to linear RGB conversion
  const [rs, gs, bs] = [r, g, b].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  
  // Calculate relative luminance
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First hex color
 * @param color2 - Second hex color
 * @returns Contrast ratio (1:1 to 21:1)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const l1 = getLuminance(color1);
  const l2 = getLuminance(color2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Enforce WCAG AA contrast ratio (4.5:1 minimum)
 * 
 * Constitutional Rule: No warnings, no suggestions - only enforcement.
 * If the foreground color fails contrast check against background,
 * the fallback color is returned automatically.
 * 
 * @param foreground - Intended foreground color
 * @param background - Background color to test against
 * @param fallback - Safe fallback color if contrast fails
 * @returns Either the original foreground (if passes) or fallback (if fails)
 */
export function enforceContrast(
  foreground: string,
  background: string,
  fallback: string
): string {
  const ratio = getContrastRatio(foreground, background);
  
  // WCAG AA requires 4.5:1 for normal text
  const WCAG_AA_RATIO = 4.5;
  
  if (ratio >= WCAG_AA_RATIO) {
    return foreground; // ✅ Passes - use original color
  }
  
  // ❌ Fails - return safe fallback, no warnings
  return fallback;
}

/**
 * Check if a color combination is WCAG AA compliant
 * Utility function for validation without auto-correction
 */
export function isWCAGCompliant(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const minRatio = level === 'AAA' ? 7 : 4.5;
  return ratio >= minRatio;
}

/**
 * Get contrast ratio as readable string
 * Useful for debugging and testing
 */
export function getContrastRatioString(color1: string, color2: string): string {
  const ratio = getContrastRatio(color1, color2);
  return Number.isFinite(ratio) ? `${ratio.toFixed(2)}:1` : 'invalid';
}
