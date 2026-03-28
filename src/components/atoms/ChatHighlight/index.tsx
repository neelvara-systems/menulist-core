'use client';

import { theme } from 'antd';

interface ChatHighlightProps {
    text: string;
    query: string;
    variant?: 'primary' | 'warning';
}

/**
 * ChatHighlight - Reusable text highlighting component for search results
 * 
 * @param text - The text to highlight matches in
 * @param query - The search query (space-separated words)
 * @param variant - Highlight style: 'primary' (bold text) or 'warning' (background highlight)
 * 
 * Used in:
 * - End-user chat messages
 * - Admin conversation view
 * - Local search results
 * - AI search modal
 */
export default function ChatHighlight({ text, query, variant = 'warning' }: ChatHighlightProps) {
    const { token } = theme.useToken();

    // Handle undefined/null text
    if (!text) {
        return <span></span>;
    }

    // No query = no highlighting
    if (!query || !query.trim()) {
        return <span>{text}</span>;
    }

    // Helper: Escape special regex characters
    const escapeRegExp = (string: string): string => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // Split query into words and escape for regex
    const queryWords = query.toLowerCase().split(' ').filter(Boolean);
    const escapedWords = queryWords.map(word => escapeRegExp(word));
    
    // Create regex pattern: matches any of the query words (case-insensitive)
    const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, i) => {
                // Handle undefined/null parts
                if (!part) {
                    return <span key={i}></span>;
                }

                // Check if this part matches any query word
                const isMatch = queryWords.includes(part.toLowerCase());

                if (isMatch) {
                    // Variant: 'warning' = background highlight (admin view)
                    if (variant === 'warning') {
                        return (
                            <mark
                                key={i}
                                style={{
                                    backgroundColor: token.colorWarningBg,
                                    color: token.colorWarningText,
                                    padding: '2px 4px',
                                    borderRadius: 4,
                                    fontWeight: 500
                                }}
                            >
                                {part}
                            </mark>
                        );
                    }
                    
                    // Variant: 'primary' = bold text (end-user view)
                    return (
                        <span 
                            key={i} 
                            style={{ 
                                color: token.colorPrimary, 
                                fontWeight: 'bold' 
                            }}
                        >
                            {part}
                        </span>
                    );
                }

                // Non-matching text
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}
