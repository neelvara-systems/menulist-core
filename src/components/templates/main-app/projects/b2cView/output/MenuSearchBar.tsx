/**
 * Menu Search Bar Component
 * 
 * Search bar placed below header, scrolls away naturally (NEVER sticky).
 * Constitutional requirement: Search is for known-intent acceleration.
 * 
 * HARD RULES:
 * - NEVER sticky (per constitution feedback)
 * - Scrolls away with content
 * - Placeholder adapts to business type
 * - Single-line input only
 */

import { useRef } from 'react';
import { LuSearch, LuX } from 'react-icons/lu';
import { resolveBusinessCategory } from '@data/shared/businessTypes';
import { MenuMoodConfig } from '../designSystem';

interface MenuSearchBarProps {
    searchTerm: string;
    onSearchChange: (term: string) => void;
    moodConfig: MenuMoodConfig;
    businessType?: string;
    businessCategory?: string;
    isMobile?: boolean;
}

const getSearchAriaLabel = (businessType?: string, businessCategory?: string): string => {
    switch (resolveBusinessCategory(businessType, businessCategory)) {
        case 'food':
            return 'Search menu items';
        case 'service':
        case 'health':
            return 'Search services';
        case 'retail':
            return 'Search products';
        default:
            return 'Search menu';
    }
};

const getSearchPlaceholder = (businessType?: string, businessCategory?: string): string => {
    switch (resolveBusinessCategory(businessType, businessCategory)) {
        case 'food':
            return 'Search menu...';
        case 'service':
        case 'health':
            return 'Search services...';
        case 'retail':
            return 'Search products...';
        default:
            return 'Search menu...';
    }
};

function MenuSearchBar({
    searchTerm,
    onSearchChange,
    moodConfig,
    businessType,
    businessCategory,
    isMobile = false,
}: MenuSearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSearchChange(e.target.value);
    };

    const clearSearch = () => {
        onSearchChange('');
        inputRef.current?.focus();
    };

    return (
        <div
            className="relative mb-4"
            style={{
                position: 'relative',
                width: '100%',
                marginTop: 8,
                marginBottom: 16,
            }}
        >
            <LuSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                size={18}
                style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: moodConfig.bodyColor,
                    opacity: 0.5,
                    pointerEvents: 'none',
                    zIndex: 1,
                }}
            />
            <input
                ref={inputRef}
                type="text"
                placeholder={getSearchPlaceholder(businessType, businessCategory)}
                value={searchTerm}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none transition-all"
                style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    minHeight: 44,
                    padding: '12px 40px',
                    borderRadius: 10,
                    background: moodConfig.itemStyle.background,
                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                    color: moodConfig.bodyColor,
                    fontFamily: moodConfig.bodyFont,
                    fontSize: isMobile ? 14 : 15,
                    lineHeight: '20px',
                    outline: 'none',
                }}
                aria-label={getSearchAriaLabel(businessType, businessCategory)}
            />
            {searchTerm && (
                <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:opacity-70 transition-opacity"
                    aria-label="Clear search"
                    style={{
                        position: 'absolute',
                        right: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 36,
                        height: 36,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 0,
                        borderRadius: 999,
                        background: 'transparent',
                        cursor: 'pointer',
                    }}
                >
                    <LuX size={16} style={{ color: moodConfig.bodyColor }} />
                </button>
            )}
        </div>
    );
}

export default MenuSearchBar;
