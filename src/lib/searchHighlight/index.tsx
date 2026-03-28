import React from 'react';

/**
 * Highlights search terms in text
 * Returns React elements with <mark> tags around matches
 * 
 * @param text - The text to search in
 * @param searchTerm - The term to highlight
 * @param caseSensitive - Whether to match case (default: false)
 * @returns React elements with highlighted matches
 * 
 * @example
 * highlightText("How to upload content", "upload")
 * // Returns: "How to <mark>upload</mark> content"
 */
export const highlightText = (text: string, searchTerm: string, caseSensitive: boolean = false): React.ReactNode => {
    if (!searchTerm || !text) return text;

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, flags);
    const parts = text.split(regex);

    return parts.map((part, index) => 
        regex.test(part) ? (
            <mark
                key={index}
                style={{
                    backgroundColor: '#ffeb3b',
                    color: '#000',
                    padding: '0 2px',
                    borderRadius: '2px',
                    fontWeight: 500,
                }}
            >
                {part}
            </mark>
        ) : (
            <span key={index}>{part}</span>
        )
    );
};

/**
 * Escapes special regex characters in search term
 */
const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Checks if text matches search term
 */
export const matchesSearch = (text: string, searchTerm: string, caseSensitive: boolean = false): boolean => {
    if (!searchTerm) return true;
    if (!text) return false;
    
    const textToSearch = caseSensitive ? text : text.toLowerCase();
    const termToSearch = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    return textToSearch.includes(termToSearch);
};

/**
 * Gets excerpt around search term match (context)
 * 
 * @param text - Full text
 * @param searchTerm - Search term
 * @param contextLength - Characters to show before/after match
 * @returns Excerpt with "..." prefix/suffix if truncated
 */
export const getSearchExcerpt = (text: string, searchTerm: string, contextLength: number = 50): string => {
    if (!searchTerm || !text) return text.substring(0, contextLength * 2);
    
    const lowerText = text.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();
    const matchIndex = lowerText.indexOf(lowerTerm);
    
    if (matchIndex === -1) return text.substring(0, contextLength * 2);
    
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(text.length, matchIndex + searchTerm.length + contextLength);
    
    let excerpt = text.substring(start, end);
    
    if (start > 0) excerpt = '...' + excerpt;
    if (end < text.length) excerpt = excerpt + '...';
    
    return excerpt;
};
