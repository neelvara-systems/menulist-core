/**
 * Menu Filter Chips Component
 * 
 * 3-LAYER ARCHITECTURE:
 * 1. AI produces signals (raw tags) - UNCHANGED
 * 2. System normalizes tags + owner-confirmed decision facts (normalizeItemAttributes.ts)
 * 3. UI enforces rules (this component + FILTER_ALLOWLIST)
 * 
 * CONSTITUTIONAL RULES:
 * - Filters gated by BUSINESS_TYPES.category via FILTER_ALLOWLIST
 * - Only show if allowed AND items with that attribute exist
 * - Single-select toggle (one active at a time)
 * - Auto-hide when search is active
 * 
 * FORBIDDEN:
 * - Keyword matching in this component (moved to normalization layer)
 * - AI-driven filter discovery
 * - Editor-configurable filters
 */

import { FILTER_ALLOWLIST, resolveBusinessCategory, SystemFilter } from '@data/shared/businessTypes';
import { createPublicCustomerTranslator } from '@lib/localization/publicCustomerMessages';
import { useMemo } from 'react';
import { LuLeaf, LuStar } from 'react-icons/lu';
import { MenuMoodConfig } from '../designSystem';
import { normalizeItemFilterAttributes } from '../utils/normalizeItemAttributes';

export type FilterType = SystemFilter | null;

interface MenuItem {
    tags?: string[];
    dietaryTags?: string[];
    targetAudience?: string;
    decisionFacts?: Record<string, { value?: unknown }>;
    isBestSeller?: boolean;
    available?: boolean;
    active?: boolean;
}

interface FilterConfig {
    key: SystemFilter;
    icon: React.ReactNode;
    iconColor: string;
}

const FILTER_UI_CONFIG: Record<SystemFilter, FilterConfig> = {
    popular: {
        key: 'popular',
        icon: <LuStar size={14} />,
        iconColor: '#f59e0b',
    },
    veg: {
        key: 'veg',
        icon: <LuLeaf size={14} />,
        iconColor: '#22c55e',
    },
    nonveg: {
        key: 'nonveg',
        icon: (
            <span style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                border: '2px solid #ef4444',
                display: 'inline-block',
            }} />
        ),
        iconColor: '#ef4444',
    },
    forMen: {
        key: 'forMen',
        icon: <span style={{ fontSize: 14 }}>♂</span>,
        iconColor: '#3b82f6',
    },
    forWomen: {
        key: 'forWomen',
        icon: <span style={{ fontSize: 14 }}>♀</span>,
        iconColor: '#ec4899',
    },
};

interface MenuFilterChipsProps {
    items: MenuItem[];
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
    onFilterIntentChange?: (filter: FilterType, label?: string) => void;
    moodConfig: MenuMoodConfig;
    businessType?: string;
    businessCategory?: string;
    isSearchActive?: boolean;
    activeLanguage?: string;
}

function MenuFilterChips({
    activeLanguage,
    items,
    activeFilter,
    onFilterChange,
    onFilterIntentChange,
    moodConfig,
    businessType,
    businessCategory,
    isSearchActive = false,
}: MenuFilterChipsProps) {
    const t = createPublicCustomerTranslator(activeLanguage);
    const localizedFilterLabels: Record<SystemFilter, string> = {
        popular: t('menu.popular'),
        veg: t('menu.vegetarian'),
        nonveg: t('menu.nonVeg'),
        forMen: t('menu.forMen'),
        forWomen: t('menu.forWomen'),
    };
    // Layer 3: Get allowed filters for this business category
    const resolvedBusinessCategory = resolveBusinessCategory(businessType, businessCategory);
    const allowedFilters = FILTER_ALLOWLIST[resolvedBusinessCategory || ''] ?? [];

    // Layer 2: Normalize all items and count attributes
    const { visibleFilters, counts } = useMemo(() => {
        const activeItems = items.filter(item => item.active !== false && item.available !== false);

        // Normalize each item's tags and owner-confirmed facts to boolean attributes
        const normalizedItems = activeItems.map(item => ({
            ...item,
            attributes: normalizeItemFilterAttributes(item),
        }));

        // Count items for each attribute
        const attributeCounts: Record<SystemFilter, number> = {
            veg: normalizedItems.filter(item => item.attributes.veg).length,
            nonveg: normalizedItems.filter(item => item.attributes.nonveg).length,
            popular: normalizedItems.filter(item => item.attributes.popular).length,
            forMen: normalizedItems.filter(item => item.attributes.forMen).length,
            forWomen: normalizedItems.filter(item => item.attributes.forWomen).length,
        };

        // Layer 4: Determine which filters to show
        // Filter is visible if: allowed for category AND items with that attribute exist
        const visible = allowedFilters.filter(filter => {
            const count = attributeCounts[filter];
            if (count === 0) return false;

            // Special rule for veg/nonveg: only show if BOTH exist
            if (filter === 'veg' || filter === 'nonveg') {
                return attributeCounts.veg > 0 && attributeCounts.nonveg > 0;
            }

            // Special rule for forMen/forWomen: only show if BOTH exist
            if (filter === 'forMen' || filter === 'forWomen') {
                return attributeCounts.forMen > 0 && attributeCounts.forWomen > 0;
            }

            // Popular: don't show if 80%+ of items are popular
            if (filter === 'popular') {
                return count < activeItems.length * 0.8;
            }

            return true;
        });

        return {
            visibleFilters: visible,
            counts: attributeCounts,
        };
    }, [items, allowedFilters]);

    // Don't render if no filters or search is active
    if (isSearchActive || visibleFilters.length === 0) {
        return null;
    }

    const handleFilterClick = (filter: SystemFilter) => {
        const nextFilter = activeFilter === filter ? null : filter;
        onFilterChange(nextFilter);
        onFilterIntentChange?.(nextFilter, nextFilter ? localizedFilterLabels[nextFilter] : undefined);
    };

    const chipStyle = (isActive: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: Math.max(4, moodConfig.itemStyle.borderRadius),
        border: `1px solid ${isActive ? moodConfig.accentColor : moodConfig.itemStyle.borderColor}`,
        background: isActive ? `${moodConfig.accentColor}15` : 'transparent',
        color: isActive ? moodConfig.accentColor : moodConfig.bodyColor,
        fontSize: 13,
        fontFamily: moodConfig.bodyFont,
        fontWeight: isActive ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
    });

    return (
        <div
            style={{
                display: 'flex',
                gap: 8,
                marginBottom: 16,
                flexWrap: 'wrap',
            }}
            role="group"
            aria-label={t('menu.menuFilters')}
        >
            {visibleFilters.map(filter => {
                const config = FILTER_UI_CONFIG[filter];
                const isActive = activeFilter === filter;

                return (
                    <button
                        key={filter}
                        onClick={() => handleFilterClick(filter)}
                        style={chipStyle(isActive)}
                        aria-pressed={isActive}
                    >
                        <span style={{ color: config.iconColor }}>{config.icon}</span>
                        <span>{localizedFilterLabels[filter]}</span>
                        <span style={{ opacity: 0.5, fontSize: 11 }}>({counts[filter]})</span>
                    </button>
                );
            })}
        </div>
    );
}

export default MenuFilterChips;
