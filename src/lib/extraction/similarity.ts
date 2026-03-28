/**
 * Similarity Matching Utility
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 6.2
 * 
 * Levenshtein distance-based similarity scoring for name matching.
 */

import { normalizeName } from './normalize';

/**
 * Calculate Levenshtein distance between two strings
 * 
 * @param a - First string
 * @param b - Second string
 * @returns Number of edits required to transform a to b
 */
function levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    // Initialize first column
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Initialize first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1,     // insertion
                    matrix[i - 1][j] + 1      // deletion
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculate similarity score between two strings
 * 
 * Uses Levenshtein distance normalized to 0-1 range.
 * 
 * @param a - First string (will be normalized)
 * @param b - Second string (will be normalized)
 * @returns Similarity score from 0 (completely different) to 1 (identical)
 * 
 * @example
 * similarity("Chicken Biryani", "Chicken Biriyani") → 0.94 (< 0.95, no match)
 * similarity("Chicken Biryani", "Chicken Biryani ") → 1.0 (exact after normalize)
 * similarity("Sandwich", "Sandwiches") → 0.89 (< 0.95, no match)
 */
export function similarity(a: string, b: string): number {
    const normA = normalizeName(a);
    const normB = normalizeName(b);

    // Exact match after normalization
    if (normA === normB) return 1.0;

    // Empty string edge cases
    if (normA.length === 0 && normB.length === 0) return 1.0;
    if (normA.length === 0 || normB.length === 0) return 0.0;

    const distance = levenshteinDistance(normA, normB);
    const maxLen = Math.max(normA.length, normB.length);

    return 1 - distance / maxLen;
}

/**
 * Check if two strings match exactly (after normalization)
 * 
 * @param a - First string
 * @param b - Second string
 * @returns true if strings match exactly after normalization
 */
export function isExactMatch(a: string, b: string): boolean {
    return normalizeName(a) === normalizeName(b);
}

/**
 * Matching thresholds as per specification
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 6.3
 * 
 * Updated: Lowered threshold from 0.95 to 0.90 based on ChatGPT analysis.
 * - 0.90-0.95: "Low confidence" warning band - show in UI but allow match
 * - 0.95-1.0: "Strong" match - confident
 * - 1.0: Exact match after normalization
 */
export const MATCH_THRESHOLDS = {
    /** Primary matching - exact normalized strings */
    EXACT_MATCH: 1.0,
    /** Match allowed if similarity >= 0.90 (lowered from 0.95) */
    SIMILARITY_THRESHOLD: 0.90,
    /** Strong match threshold - above this is confident */
    STRONG_MATCH_THRESHOLD: 0.95,
    /** Show warning if score is between 0.90 and 0.95 (low confidence band) */
    WEAK_MATCH_THRESHOLD: 0.95,
} as const;

/**
 * Determine match type based on similarity score
 * 
 * @param score - Similarity score (0-1)
 * @returns Match type classification
 */
export function getMatchType(score: number): 'exact' | 'strong' | 'weak' | 'no_match' {
    if (score >= MATCH_THRESHOLDS.EXACT_MATCH) return 'exact';
    if (score >= MATCH_THRESHOLDS.STRONG_MATCH_THRESHOLD) return 'strong';
    if (score >= MATCH_THRESHOLDS.SIMILARITY_THRESHOLD) return 'weak'; // 0.90-0.95 = low confidence
    return 'no_match';
}

/**
 * Find best match from candidates
 * 
 * Spec Reference: ai-extraction-workflow-explained.md Section 4.3
 * 
 * @param target - Target name to match
 * @param candidates - Array of candidate items with id and name
 * @param threshold - Minimum similarity threshold (default: 0.95)
 * @returns Best matching candidate with score, or null if no match
 */
export function findBestMatch<T extends { id: string; name: string }>(
    target: string,
    candidates: T[],
    threshold: number = MATCH_THRESHOLDS.SIMILARITY_THRESHOLD
): { candidate: T; score: number; matchType: 'exact' | 'strong' | 'weak' | 'no_match' } | null {
    let bestMatch: { candidate: T; score: number } | null = null;

    for (const candidate of candidates) {
        const score = similarity(target, candidate.name);

        if (score >= threshold) {
            if (!bestMatch || score > bestMatch.score) {
                bestMatch = { candidate, score };
            } else if (score === bestMatch.score) {
                // Deterministic tie-break: lexicographically smaller ID wins
                if (candidate.id.localeCompare(bestMatch.candidate.id) < 0) {
                    bestMatch = { candidate, score };
                }
            }
        }
    }

    if (!bestMatch) return null;

    return {
        candidate: bestMatch.candidate,
        score: bestMatch.score,
        matchType: getMatchType(bestMatch.score),
    };
}

export default similarity;
