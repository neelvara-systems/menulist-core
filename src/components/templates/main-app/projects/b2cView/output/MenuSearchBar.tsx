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
            style={{ marginTop: 8 }}
        >
            <LuSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                size={18}
                style={{ color: moodConfig.bodyColor, opacity: 0.5 }}
            />
            <input
                ref={inputRef}
                type="text"
                placeholder={getSearchPlaceholder(businessType, businessCategory)}
                value={searchTerm}
                onChange={handleChange}
                className="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none transition-all"
                style={{
                    background: moodConfig.itemStyle.background,
                    border: `1px solid ${moodConfig.itemStyle.borderColor}`,
                    color: moodConfig.bodyColor,
                    fontFamily: moodConfig.bodyFont,
                    fontSize: isMobile ? 14 : 15,
                }}
                aria-label={getSearchAriaLabel(businessType, businessCategory)}
            />
            {searchTerm && (
                <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:opacity-70 transition-opacity"
                    aria-label="Clear search"
                >
                    <LuX size={16} style={{ color: moodConfig.bodyColor }} />
                </button>
            )}
        </div>
    );
}

export default MenuSearchBar;
