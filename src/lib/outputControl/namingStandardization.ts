/**
 * Output Control — Naming Standardization
 *
 * Silent normalization of item and category names.
 * Capitalizes, trims, and formats without altering brand identity.
 *
 * Part of Silent Correction Systems (Tolerated Imperfection Zone).
 * Feature flag: ENABLE_NAMING_STANDARDIZATION
 *
 * Rules:
 * - Normalize format, never alter brand identity
 * - Skip normalization for brand-safe patterns (McChicken, iPod)
 * - Never BLOCK or SUPPRESS — only NORMALIZE
 *
 * @see __docs__/silent-correction-systems/silent-correction-systems_spec.md
 * @see __docs__/constitution/18-silent-correction-doctrine.md
 */

import type { NamingResult } from "./types";

// ─────────────────────────────────────────────────────────────
// BRAND-SAFE DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * Known brand-safe patterns where mixed casing is intentional.
 * These should NOT be normalized.
 *
 * Detects:
 * - camelCase within words (iPhone, iPad, eBay)
 * - McPrefix patterns (McDonald's, McChicken, McAloo)
 * - ALL CAPS intentional brands (KFC, BBQ)
 * - Mixed case mid-word (DiGiorno, LaVazza)
 */
export function isBrandSafe(name: string): boolean {
    if (!name || name.trim().length === 0) return false;

    const trimmed = name.trim();
    const words = trimmed.split(/\s+/);

    for (const word of words) {
        if (word.length <= 1) continue;

        // McPrefix pattern: McChicken, McDonald's, McAloo
        if (/^Mc[A-Z]/.test(word)) return true;

        // camelCase mid-word: iPhone, iPad, eBay
        if (/^[a-z]+[A-Z]/.test(word)) return true;

        // Mid-word uppercase after lowercase: DiGiorno, LaVazza
        if (/[a-z][A-Z]/.test(word) && !/^[A-Z]/.test(word)) return true;

        // ALL CAPS words (3+ chars, likely intentional brand): KFC, BBQ, XL
        if (/^[A-Z]{2,}$/.test(word)) return true;
    }

    return false;
}

// ─────────────────────────────────────────────────────────────
// TITLE CASE HELPER
// ─────────────────────────────────────────────────────────────

/** Words that should stay lowercase in title case (unless first word) */
const LOWERCASE_WORDS = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to",
    "for", "of", "with", "by", "from", "as", "is", "was", "are",
]);

/**
 * Convert a string to title case.
 * First word always capitalized. Small words stay lowercase.
 */
function toTitleCase(str: string): string {
    return str
        .split(/\s+/)
        .map((word, index) => {
            if (word.length === 0) return word;

            const lower = word.toLowerCase();

            // First word is always capitalized
            if (index === 0) {
                return lower.charAt(0).toUpperCase() + lower.slice(1);
            }

            // Small words stay lowercase
            if (LOWERCASE_WORDS.has(lower)) {
                return lower;
            }

            return lower.charAt(0).toUpperCase() + lower.slice(1);
        })
        .join(" ");
}

// ─────────────────────────────────────────────────────────────
// MAIN FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * Standardize a single name string.
 *
 * Operations (in order):
 * 1. Trim whitespace
 * 2. Collapse multiple spaces
 * 3. Remove trailing punctuation (except parentheses)
 * 4. Title case (if not brand-safe)
 *
 * @param name - Raw name string
 * @returns NamingResult with standardized value
 */
export function standardizeName(name: string): NamingResult {
    if (!name || typeof name !== "string") {
        return { value: name || "", wasModified: false, normalizationType: "none" };
    }

    const original = name;
    let value = name;

    // Step 1: Trim
    value = value.trim();

    // Step 2: Collapse multiple spaces
    value = value.replace(/\s{2,}/g, " ");

    // Step 3: Remove trailing punctuation (keep parentheses, keep apostrophes)
    value = value.replace(/[.,;:!?]+$/, "");

    // If trimming/spacing was the only change
    if (value === original) {
        // Step 4: Check if title case normalization is needed
        if (isBrandSafe(value)) {
            return { value, wasModified: false, normalizationType: "none" };
        }

        // Check if already title-cased
        const titleCased = toTitleCase(value);
        if (titleCased === value) {
            return { value, wasModified: false, normalizationType: "none" };
        }

        return { value: titleCased, wasModified: true, normalizationType: "capitalize" };
    }

    // Some formatting was applied
    if (isBrandSafe(value)) {
        return {
            value,
            wasModified: value !== original,
            normalizationType: value !== original ? "trim" : "none",
        };
    }

    const titleCased = toTitleCase(value);
    return {
        value: titleCased,
        wasModified: titleCased !== original,
        normalizationType: titleCased !== original ? "capitalize" : "none",
    };
}

/**
 * Standardize all names in a name record (multi-language).
 *
 * @param names - Record of language code → name string
 * @returns Record with standardized names
 */
export function standardizeNames(
    names: Record<string, string>,
): Record<string, string> {
    if (!names || typeof names !== "object") return names;

    const result: Record<string, string> = {};
    for (const [lang, name] of Object.entries(names)) {
        const standardized = standardizeName(name);
        result[lang] = standardized.value;
    }
    return result;
}
