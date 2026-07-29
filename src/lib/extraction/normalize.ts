/**
 * Name Normalization Utility
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 6.1
 * 
 * Normalizes names for consistent matching during comparison engine operations.
 */

const NON_UNICODE_WORD_SPACE_PATTERN = new RegExp('[^\\p{L}\\p{M}\\p{N}\\s]', 'gu');

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
export function normalizeName(raw: unknown): string {
    if (typeof raw !== 'string' || !raw) return '';

    return raw
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')                    // Collapse multiple spaces
        .replace(NON_UNICODE_WORD_SPACE_PATTERN, '')  // Keep every supported script and its marks
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
    nameObj: unknown,
    primaryLang: string = 'en'
): string {
    if (!nameObj) return '';

    if (typeof nameObj === 'string') {
        return normalizeName(nameObj);
    }

    if (typeof nameObj !== 'object' || Array.isArray(nameObj)) return '';

    try {
        const primary = Reflect.get(nameObj, primaryLang);
        if (typeof primary === 'string' && primary) return normalizeName(primary);
        for (const key of Object.keys(nameObj).slice(0, 64)) {
            try {
                const candidate = Reflect.get(nameObj, key);
                if (typeof candidate === 'string' && candidate) return normalizeName(candidate);
            } catch {
                continue;
            }
        }
    } catch {
        return '';
    }
    return '';
}

export default normalizeName;
