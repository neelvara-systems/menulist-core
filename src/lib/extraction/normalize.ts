/**
 * Name Normalization Utility
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 6.1
 * 
 * Normalizes names for consistent matching during comparison engine operations.
 */

/**
 * Normalize a name for comparison
 * 
 * Operations:
 * 1. Lowercase
 * 2. Trim whitespace
 * 3. Collapse multiple spaces
 * 4. Remove punctuation/symbols
 * 5. Remove emojis
 * 
 * @param raw - The raw name string
 * @returns Normalized name for comparison
 * 
 * @example
 * normalizeName("Chicken Biryani") → "chicken biryani"
 * normalizeName("  French Fries  ") → "french fries"
 * normalizeName("Spring Rolls 🥢") → "spring rolls"
 */
export function normalizeName(raw: string | undefined | null): string {
    if (!raw) return '';

    return raw
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')                    // Collapse multiple spaces
        .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF]/g, '') // Remove punctuation/symbols (keep letters, numbers, spaces, accented chars)
        .replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/g, '')    // Remove emoji surrogate pairs
        .trim();                                  // Final trim after removals
}

/**
 * Get normalized name from a multilingual object
 * 
 * @param nameObj - Multilingual name object { en: "Name", hi: "नाम" }
 * @param primaryLang - Primary language code to use
 * @returns Normalized name string
 */
export function getNormalizedNameFromObject(
    nameObj: Record<string, string> | string | undefined,
    primaryLang: string = 'en'
): string {
    if (!nameObj) return '';

    if (typeof nameObj === 'string') {
        return normalizeName(nameObj);
    }

    // Try primary language first, then fall back to first available
    const name = nameObj[primaryLang] || Object.values(nameObj)[0] || '';
    return normalizeName(name);
}

export default normalizeName;
