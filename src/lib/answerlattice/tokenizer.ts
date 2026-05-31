/**
 * Answerlattice — Deterministic Tokenizer (Shared Utility)
 * 
 * FROZEN: This normalization contract must not change without re-indexing.
 * Used by both retrieval (query-time) and extraction (index-time).
 * 
 * Normalization rules:
 * 1. Lowercase everything
 * 2. Replace all non-alphanumeric/space/hyphen chars with space
 * 3. Split on whitespace
 * 4. Filter tokens shorter than minLength
 * 
 * Changing this logic will silently break canonical retrieval
 * because existing index tokens won't match new query tokens.
 * 
 * @see canonicalRetrieval.ts — query-time tokenization
 * @see entityExtraction.ts — index-time tokenization
 */

/**
 * Normalize and tokenize text for deterministic entity matching.
 * Same logic MUST be used at both index-time and query-time.
 * 
 * @param text - Raw text to tokenize
 * @param minLength - Minimum token length (default: 2)
 * @returns Array of normalized tokens
 */
export function answerlatticeTokenize(text: string, minLength: number = 2): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(token => token.length >= minLength);
}
