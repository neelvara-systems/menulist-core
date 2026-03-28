/**
 * Normalizes a query string for caching purposes.
 * - Converts to lowercase
 * - Removes punctuation
 * - Trims whitespace
 * - Sorts words alphabetically
 * @param query The input string to normalize.
 * @returns The normalized string.
 */
export const normalizeQuery = (query: string): string => {
    if (!query) return '';

    const cleanedQuery = query
        .toLowerCase()
        .replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')
        .trim();

    const words = cleanedQuery.split(' ');
    words.sort();

    return words.join(' ');
};
