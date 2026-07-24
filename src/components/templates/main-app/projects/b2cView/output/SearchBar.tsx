/**
 * Customer-Facing Search Bar (B2C Output)
 * 
 * Mobile-first, performance-optimized
 * NO Ant Design - Minimal styling
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { MenuMoodConfig } from '../designSystem';

interface SearchBarOutputProps {
    moodConfig: MenuMoodConfig;
    placeholder?: string;
    onSearch?: (query: string) => void;
    debounceMs?: number;
}

export default function SearchBarOutput({
    moodConfig,
    placeholder = 'Search menu...',
    onSearch,
    debounceMs = 300,
}: SearchBarOutputProps) {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            onSearch?.(value);
        }, debounceMs);
    }, [onSearch, debounceMs]);

    const handleClear = useCallback(() => {
        setQuery('');
        onSearch?.('');
    }, [onSearch]);

    return (
        <div className="relative w-full mb-4">
            {/* Search Icon */}
            <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-150"
                style={{ color: isFocused ? moodConfig.accentColor : moodConfig.bodyColor }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
            </svg>

            <input
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className="w-full py-3 pl-10 pr-10 text-sm outline-none transition-colors duration-150"
                style={{
                    fontFamily: moodConfig.bodyFont,
                    color: moodConfig.bodyColor,
                    background: moodConfig.itemStyle.background,
                    border: `1px solid ${isFocused ? moodConfig.accentColor : moodConfig.itemStyle.borderColor}`,
                    borderRadius: moodConfig.itemStyle.borderRadius,
                }}
            />

            {/* Clear Button */}
            {query && (
                <button
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 opacity-60 hover:opacity-100 transition-opacity duration-150"
                    style={{ color: moodConfig.bodyColor }}
                    aria-label="Clear search"
                >
                    <svg
                        className="w-4 h-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}
