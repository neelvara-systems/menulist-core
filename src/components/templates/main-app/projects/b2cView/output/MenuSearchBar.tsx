/**
 * Menu Search Bar Component
 * 
 * Search bar placed below menu identity/status controls.
 * Constitutional requirement: Search is for known-intent acceleration.
 * 
 * HARD RULES:
 * - Sticky behavior is controlled by the parent menu layout
 * - Placeholder adapts to business type
 * - Single-line input only
 */

import { useRef, useState } from 'react';
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
    compact?: boolean;
    containerStyle?: React.CSSProperties;
}

const getSearchAriaLabel = (businessType?: string, businessCategory?: string): string => {
    switch (resolveBusinessCategory(businessType, businessCategory)) {
        case 'food':
            return 'Search menu items';
        case 'service':
        case 'health':
        case 'professional':
        case 'specialty':
            return 'Search services';
        case 'retail':
            return 'Search products';
        case 'creative':
            return 'Search offerings';
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
        case 'professional':
        case 'specialty':
            return 'Search services...';
        case 'retail':
            return 'Search products...';
        case 'creative':
            return 'Search offerings...';
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
    compact = false,
    containerStyle,
}: MenuSearchBarProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(false);

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
                marginTop: compact ? 0 : 8,
                marginBottom: compact ? 0 : 16,
                ...containerStyle,
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
                    color: isFocused ? moodConfig.accentColor : moodConfig.bodyColor,
                    opacity: isFocused ? 0.85 : 0.55,
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
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full pl-10 pr-10 py-3 rounded-lg text-sm outline-none transition-all"
                style={{
                    boxSizing: 'border-box',
                    width: '100%',
                    minHeight: 44,
                    padding: '12px 40px',
                    borderRadius: 10,
                    background: moodConfig.itemStyle.background,
                    border: `1px solid ${isFocused ? moodConfig.accentColor : moodConfig.itemStyle.borderColor}`,
                    boxShadow: isFocused ? `0 0 0 3px ${moodConfig.accentColor}20` : 'none',
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
