/**
 * Digital Menu Design System
 * 
 * This is the single source of truth for all visual styling in the B2C view.
 * 
 * Philosophy:
 * - SMBs don't want to design, they want to choose a vibe
 * - Fewer options, stronger defaults, opinionated combinations
 * - All internal styling is locked - users only choose high-level presets
 */

import { enforceContrast } from '@lib/colorEnforcement';

export function normalizeHexColor(color?: string): string | null {
    if (typeof color !== 'string') {
        return null;
    }

    const trimmed = color.trim();
    if (!trimmed) {
        return null;
    }

    const value = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
    const lower = value.toLowerCase();

    if (!/^#[0-9a-f]{3}$/.test(lower) && !/^#[0-9a-f]{6}$/.test(lower)) {
        return null;
    }

    if (lower.length === 4) {
        const r = lower[1];
        const g = lower[2];
        const b = lower[3];
        return `#${r}${r}${g}${g}${b}${b}`;
    }

    return lower;
}

// ============================================
// MENU PAGE STYLES
// ============================================

export enum MenuMood {
    CLEAN = 'clean',       // M1: Light, professional (clinics/salons/cafes)
    WARM = 'warm',         // M2: Warm & inviting (family restaurants)
    PREMIUM = 'premium',   // M3: Premium & minimal (fine dining) - formerly ELEGANT
    BOLD = 'bold',         // M4: Bold & social (bars/clubs) - formerly VIBRANT
    FAST = 'fast',         // M5: Fast & direct (QSRs/high-volume)
}

export enum MenuLayout {
    LIST = 'list',
    CARD = 'card',
    GRID = 'grid',
    TABS = 'tabs',
}

const LEGACY_MENU_MOOD_MAP: Record<string, MenuMood> = {
    elegant: MenuMood.PREMIUM,
    vibrant: MenuMood.BOLD,
};

export interface MenuMoodConfig {
    label: string;
    description: string;
    // Container
    background: string;
    backgroundOverlay?: string;
    // Typography
    headingFont: string;
    bodyFont: string;
    headingColor: string;
    bodyColor: string;
    priceColor: string;
    descriptionColor?: string;
    // Spacing
    spacing: 'tight' | 'medium' | 'relaxed';
    // Visual
    contrast: 'high' | 'medium' | 'soft';
    accentColor: string;
    // Animation
    animationSpeed: 'fast' | 'medium' | 'slow';
    // Category styling
    categoryStyle: {
        background: string;
        borderColor: string;
        borderRadius: number;
        borderWidth?: number;
        titleTransform?: 'none' | 'uppercase' | 'capitalize';
        titleLetterSpacing?: string;
        dividerStyle?: 'none' | 'line' | 'gradient' | 'dots';
        dividerColor?: string;
    };
    // Item styling
    itemStyle: {
        background: string;
        borderColor: string;
        borderRadius: number;
        borderWidth?: number;
        hoverEffect?: 'none' | 'lift' | 'glow' | 'scale';
        hoverGlow?: string;
        imageRadius?: number;
        imageBorder?: string;
        priceStyle?: 'plain' | 'badge' | 'accent';
        priceBadgeColor?: string;
    };
    // Special Effects (Differentiators)
    glassmorphism?: boolean;
    glowAccents?: boolean;
    floatingElements?: boolean;
}

export const MENU_MOODS: Record<MenuMood, MenuMoodConfig> = {
    [MenuMood.CLEAN]: {
        label: 'Clean & Calm',
        description: 'Modern cafes, premium casual dining',
        // Container - light but contained (Constitutional M1)
        background: '#f7f8fa',
        backgroundOverlay: 'linear-gradient(rgba(247, 248, 250, 0.88), rgba(247, 248, 250, 0.88))',
        // Typography - Modern, readable
        headingFont: '"Inter", -apple-system, sans-serif',
        bodyFont: '"Inter", sans-serif',
        headingColor: '#1a1a1a',
        bodyColor: '#4a4a4a',
        priceColor: '#047857',
        descriptionColor: '#5f6b7a',
        // Spacing - Generous whitespace
        spacing: 'relaxed',
        // Visual - High contrast on light
        contrast: 'high',
        accentColor: '#059669',
        // Animation - Fast
        animationSpeed: 'fast',
        // Category - Minimal
        categoryStyle: {
            background: 'transparent',
            borderColor: 'rgba(17, 24, 39, 0.12)',
            borderRadius: 0,
            borderWidth: 0,
            titleTransform: 'none',
            titleLetterSpacing: '0',
            dividerStyle: 'line',
            dividerColor: 'rgba(17, 24, 39, 0.12)',
        },
        // Item - Clean cards
        itemStyle: {
            background: '#ffffff',
            borderColor: 'rgba(17, 24, 39, 0.12)',
            borderRadius: 8,
            borderWidth: 1,
            hoverEffect: 'none',
            hoverGlow: undefined,
            imageRadius: 6,
            imageBorder: undefined,
            priceStyle: 'plain',
            priceBadgeColor: undefined,
        },
        // Effects - None
        glassmorphism: false,
        glowAccents: false,
        floatingElements: false,
    },
    [MenuMood.WARM]: {
        label: 'Warm & Inviting',
        description: 'Family restaurants, comfort food',
        // Container - Warm light (Constitutional M2)
        background: '#FEF7ED',
        backgroundOverlay: 'linear-gradient(rgba(254, 247, 237, 0.88), rgba(254, 247, 237, 0.88))',
        // Typography - Friendly
        headingFont: '"Inter", -apple-system, sans-serif',
        bodyFont: '"Inter", sans-serif',
        headingColor: '#292524',
        bodyColor: '#57534e',
        priceColor: '#c2410c',
        descriptionColor: '#78716c',
        // Spacing - Comfortable
        spacing: 'medium',
        // Visual - Medium contrast
        contrast: 'medium',
        accentColor: '#ea580c',
        // Animation - Medium
        animationSpeed: 'medium',
        // Category - Warm
        categoryStyle: {
            background: 'transparent',
            borderColor: 'rgba(234, 88, 12, 0.15)',
            borderRadius: 4,
            borderWidth: 0,
            titleTransform: 'capitalize',
            titleLetterSpacing: '0',
            dividerStyle: 'line',
            dividerColor: 'rgba(234, 88, 12, 0.2)',
        },
        // Item - Cozy cards
        itemStyle: {
            background: '#FFFBF5',
            borderColor: 'rgba(234, 88, 12, 0.12)',
            borderRadius: 10,
            borderWidth: 1,
            hoverEffect: 'none',
            hoverGlow: undefined,
            imageRadius: 8,
            imageBorder: undefined,
            priceStyle: 'accent',
            priceBadgeColor: undefined,
        },
        // Effects - None
        glassmorphism: false,
        glowAccents: false,
        floatingElements: false,
    },
    [MenuMood.PREMIUM]: {
        label: 'Premium & Minimal',
        description: 'Fine dining, boutique concepts',
        // Container - Deep navy
        background: '#0f172a',
        backgroundOverlay: 'linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.9))',
        // Typography - restrained public information hierarchy
        headingFont: '"Inter", -apple-system, sans-serif',
        bodyFont: '"Inter", sans-serif',
        headingColor: '#d4af37',
        bodyColor: 'rgba(255, 255, 255, 0.65)',
        priceColor: '#d4af37',
        descriptionColor: 'rgba(255, 255, 255, 0.5)',
        // Spacing - Breathable
        spacing: 'relaxed',
        // Visual - Soft contrast
        contrast: 'soft',
        accentColor: '#d4af37',
        // Animation - Smooth
        animationSpeed: 'medium',
        // Category - Understated
        categoryStyle: {
            background: 'transparent',
            borderColor: 'rgba(212, 175, 55, 0.15)',
            borderRadius: 0,
            borderWidth: 0,
            titleTransform: 'none',
            titleLetterSpacing: '0',
            dividerStyle: 'line',
            dividerColor: 'rgba(212, 175, 55, 0.2)',
        },
        // Item - Subtle cards
        itemStyle: {
            background: 'rgba(212, 175, 55, 0.02)',
            borderColor: 'rgba(212, 175, 55, 0.1)',
            borderRadius: 4,
            borderWidth: 1,
            hoverEffect: 'none',
            hoverGlow: undefined,
            imageRadius: 4,
            imageBorder: undefined,
            priceStyle: 'accent',
            priceBadgeColor: undefined,
        },
        // Effects - None
        glassmorphism: false,
        glowAccents: false,
        floatingElements: false,
    },
    [MenuMood.BOLD]: {
        label: 'Bold & Social',
        description: 'Bars, burgers, nightlife',
        // Container - Pure black
        background: '#000000',
        backgroundOverlay: 'linear-gradient(rgba(0, 0, 0, 0.88), rgba(0, 0, 0, 0.88))',
        // Typography - Bold
        headingFont: '"Poppins", sans-serif',
        bodyFont: '"Inter", sans-serif',
        headingColor: '#ffffff',
        bodyColor: 'rgba(255, 255, 255, 0.75)',
        priceColor: '#3b82f6',
        descriptionColor: 'rgba(255, 255, 255, 0.55)',
        // Spacing - Balanced
        spacing: 'medium',
        // Visual - High contrast
        contrast: 'high',
        accentColor: '#3b82f6',
        // Animation - Fast
        animationSpeed: 'fast',
        // Category - Bold headers
        categoryStyle: {
            background: 'rgba(59, 130, 246, 0.05)',
            borderColor: 'rgba(59, 130, 246, 0.15)',
            borderRadius: 8,
            borderWidth: 1,
            titleTransform: 'none',
            titleLetterSpacing: '0',
            dividerStyle: 'line',
            dividerColor: 'rgba(59, 130, 246, 0.2)',
        },
        // Item - Bold cards
        itemStyle: {
            background: 'rgba(59, 130, 246, 0.03)',
            borderColor: 'rgba(59, 130, 246, 0.12)',
            borderRadius: 12,
            borderWidth: 1,
            hoverEffect: 'none',
            hoverGlow: undefined,
            imageRadius: 8,
            imageBorder: undefined,
            priceStyle: 'badge',
            priceBadgeColor: 'rgba(59, 130, 246, 0.12)',
        },
        // Effects - None
        glassmorphism: false,
        glowAccents: false,
        floatingElements: false,
    },
    [MenuMood.FAST]: {
        label: 'Fast & Direct',
        description: 'Counters, QSRs, high-volume menus',
        // Container - Minimal (Constitutional M5)
        background: '#f5f5f5',
        backgroundOverlay: 'linear-gradient(rgba(245, 245, 245, 0.9), rgba(245, 245, 245, 0.9))',
        // Typography - Utilitarian (STRUCTURAL: Smaller, tighter)
        headingFont: '"Inter", -apple-system, sans-serif',
        bodyFont: '"Inter", sans-serif',
        headingColor: '#1f2937',
        bodyColor: '#4b5563',
        priceColor: '#ef4444',
        descriptionColor: '#6b7280',
        // Spacing - DENSE for speed (Constitutional enforcement)
        spacing: 'tight',
        // Visual - High contrast
        contrast: 'high',
        accentColor: '#ef4444',
        // Animation - Fast
        animationSpeed: 'fast',
        // Category - Compact (STRUCTURAL: Minimal padding)
        categoryStyle: {
            background: '#e5e7eb',
            borderColor: '#d1d5db',
            borderRadius: 4, // Smaller than others
            borderWidth: 1,
            titleTransform: 'none',
            titleLetterSpacing: '0',
            dividerStyle: 'line',
            dividerColor: '#d1d5db',
        },
        // Item - Dense cards (STRUCTURAL: Tight spacing, prominent price)
        itemStyle: {
            background: '#ffffff',
            borderColor: '#e5e7eb',
            borderRadius: 4, // Smaller than CLEAN (8px)
            borderWidth: 1,
            hoverEffect: 'none',
            hoverGlow: undefined,
            imageRadius: 3, // Smaller than CLEAN (6px)
            imageBorder: undefined,
            priceStyle: 'badge', // STRUCTURAL: Always badge for prominence
            priceBadgeColor: 'rgba(239, 68, 68, 0.15)', // More prominent than others
        },
        // Effects - None
        glassmorphism: false,
        glowAccents: false,
        floatingElements: false,
    },
};

export interface MenuLayoutConfig {
    label: string;
    description: string;
    type: 'vertical' | 'horizontal';
    itemsPerRow: number;
    showImages: boolean;
    imagePosition: 'left' | 'top' | 'none';
    // G10 - Image quota guards (constitutional requirement)
    // Prevents Pinterest-style endless galleries
    maxImagesPerCategory: number;
}

export const MENU_LAYOUTS: Record<MenuLayout, MenuLayoutConfig> = {
    [MenuLayout.LIST]: {
        label: 'List',
        description: 'Fast scanning, clear prices',
        type: 'vertical',
        itemsPerRow: 1,
        showImages: true,
        imagePosition: 'left',
        maxImagesPerCategory: 8, // G10: List layout - more text, fewer images
    },
    [MenuLayout.CARD]: {
        label: 'Card',
        description: 'Visual, balanced',
        type: 'vertical',
        itemsPerRow: 1,
        showImages: true,
        imagePosition: 'top',
        maxImagesPerCategory: 6, // G10: Card layout - balanced
    },
    [MenuLayout.GRID]: {
        label: 'Grid',
        description: 'Image-forward catalog',
        type: 'vertical',
        itemsPerRow: 2,
        showImages: true,
        imagePosition: 'top',
        maxImagesPerCategory: 8, // G10: Grid layout - image-forward but capped
    },
    [MenuLayout.TABS]: {
        label: 'Tabs',
        description: 'Legacy tabbed sections',
        type: 'vertical',
        itemsPerRow: 1,
        showImages: true,
        imagePosition: 'left',
        maxImagesPerCategory: 8,
    },
};

// ============================================
// MOOD × LAYOUT COMPATIBILITY
// ============================================

// Constitutional Mood × Layout Compatibility Matrix
// Per Digital Menu Output Constitution Part III
export const MOOD_LAYOUT_COMPATIBILITY: Record<MenuMood, MenuLayout[]> = {
    [MenuMood.CLEAN]: [MenuLayout.LIST, MenuLayout.CARD, MenuLayout.GRID],
    [MenuMood.WARM]: [MenuLayout.LIST, MenuLayout.CARD, MenuLayout.GRID],
    [MenuMood.PREMIUM]: [MenuLayout.LIST, MenuLayout.CARD, MenuLayout.GRID],
    [MenuMood.BOLD]: [MenuLayout.LIST, MenuLayout.CARD, MenuLayout.GRID],
    [MenuMood.FAST]: [MenuLayout.LIST, MenuLayout.CARD, MenuLayout.GRID],
};

export function isLayoutCompatible(mood: MenuMood, layout: MenuLayout): boolean {
    return MOOD_LAYOUT_COMPATIBILITY[mood].includes(layout);
}

export function getCompatibleLayouts(mood: MenuMood): MenuLayout[] {
    return MOOD_LAYOUT_COMPATIBILITY[mood];
}

export function getDefaultLayout(mood: MenuMood): MenuLayout {
    return MOOD_LAYOUT_COMPATIBILITY[mood][0];
}

export function normalizeMenuMood(value: unknown): MenuMood {
    if (typeof value !== 'string') return DEFAULTS.menu.mood;

    const normalizedValue = value.toLowerCase();
    if (normalizedValue in MENU_MOODS) {
        return normalizedValue as MenuMood;
    }

    return LEGACY_MENU_MOOD_MAP[normalizedValue] || DEFAULTS.menu.mood;
}

export function normalizeMenuLayout(value: unknown, mood: MenuMood): MenuLayout {
    const compatibleLayouts = getCompatibleLayouts(mood);

    if (typeof value === 'string') {
        const normalizedValue = value.toLowerCase() as MenuLayout;
        if (normalizedValue in MENU_LAYOUTS && compatibleLayouts.includes(normalizedValue)) {
            return normalizedValue;
        }
    }

    return getDefaultLayout(mood);
}

export interface ResolvedMenuDesignConfig extends Record<string, any> {
    mood: MenuMood;
    layout: MenuLayout;
    backgroundImage?: string;
    showItemPrices?: boolean;
    showImages?: boolean;
    showCategoryIcons?: boolean;
    showCategoryTabs?: boolean;
}

export function resolveMenuDesignConfig(menuConfig: Record<string, any> | null | undefined): ResolvedMenuDesignConfig {
    const rawConfig = menuConfig || {};
    const mood = normalizeMenuMood(menuConfig?.mood);
    const hasLegacyTabsLayout = typeof menuConfig?.layout === 'string'
        && menuConfig.layout.toLowerCase() === MenuLayout.TABS;
    const layout = normalizeMenuLayout(menuConfig?.layout, mood);

    return {
        ...rawConfig,
        mood,
        layout,
        showItemPrices: rawConfig.showItemPrices ?? true,
        showImages: rawConfig.showImages ?? true,
        showCategoryIcons: rawConfig.showCategoryIcons ?? true,
        showCategoryTabs: rawConfig.showCategoryTabs ?? hasLegacyTabsLayout,
    };
}

// ============================================
// SPACING VALUES
// ============================================

export const SPACING = {
    tight: {
        container: 12,
        category: 16,
        item: 8,
        itemGap: 8,
    },
    medium: {
        container: 16,
        category: 20,
        item: 12,
        itemGap: 12,
    },
    relaxed: {
        container: 24,
        category: 28,
        item: 16,
        itemGap: 16,
    },
};

// ============================================
// ANIMATION DURATIONS
// ============================================

export const ANIMATION_DURATION = {
    fast: 0.2,
    medium: 0.3,
    slow: 0.5,
};

// ============================================
// DEFAULTS
// ============================================

export const DEFAULTS = {
    menu: {
        mood: MenuMood.CLEAN,
        layout: MenuLayout.LIST,
        showItemPrices: true,
        showImages: true,
        showCategoryIcons: true,
        showCategoryTabs: false,
    },
};

// ============================================
// BRAND COLOR HELPERS
// ============================================

/**
 * Get mood config with optional brand color override
 * 
 * Constitutional Enforcement (G2): Brand colors are auto-corrected if they
 * fail WCAG AA contrast ratio (4.5:1). No warnings shown - enforcement by design.
 */
export function getMoodWithBrandColor(mood: MenuMood, brandAccentColor?: string): MenuMoodConfig {
    const moodConfig = MENU_MOODS[mood];
    const sanitizedBrandAccentColor = normalizeHexColor(brandAccentColor);

    if (!sanitizedBrandAccentColor) {
        return moodConfig;
    }

    // Constitutional enforcement - auto-correct colors that fail contrast
    const safeAccent = enforceContrast(
        sanitizedBrandAccentColor,
        moodConfig.background,
        moodConfig.accentColor // Fallback to mood's original accent
    );

    const normalizedSafeAccent = normalizeHexColor(safeAccent) || moodConfig.accentColor;

    const safePriceColor = enforceContrast(
        sanitizedBrandAccentColor,
        moodConfig.background,
        moodConfig.priceColor // Fallback to mood's original price color
    );

    const normalizedSafePriceColor = normalizeHexColor(safePriceColor) || moodConfig.priceColor;

    // Create a new config with the ENFORCED brand colors
    return {
        ...moodConfig,
        accentColor: normalizedSafeAccent,
        priceColor: normalizedSafePriceColor,
        categoryStyle: {
            ...moodConfig.categoryStyle,
            borderColor: `${normalizedSafeAccent}20`, // 20% opacity
            dividerColor: `${normalizedSafeAccent}30`, // 30% opacity
        },
        itemStyle: {
            ...moodConfig.itemStyle,
            borderColor: `${normalizedSafeAccent}15`, // 15% opacity
            priceBadgeColor: moodConfig.itemStyle.priceStyle === 'badge'
                ? `${normalizedSafeAccent}15`
                : undefined,
        },
    };
}

// Pre-defined restaurant brand color suggestions
export const BRAND_COLOR_PRESETS = [
    { color: '#22c55e', name: 'Fresh Green' },
    { color: '#ef4444', name: 'Classic Red' },
    { color: '#f97316', name: 'Warm Orange' },
    { color: '#d4af37', name: 'Gold' },
    { color: '#3b82f6', name: 'Ocean Blue' },
    { color: '#8b5cf6', name: 'Purple' },
    { color: '#ec4899', name: 'Pink' },
    { color: '#14b8a6', name: 'Teal' },
];

// ============================================
// PROJECT CONFIG INTERFACE
// ============================================

export interface DesignConfig {
    menu: {
        mood: MenuMood;
        layout: MenuLayout;
        showItemPrices: boolean;
        showImages: boolean;
        showCategoryIcons?: boolean;
        showCategoryTabs?: boolean;
        // Optional overrides (hidden in Advanced)
        accentColorOverride?: string;
        backgroundImage?: string;
    };
}

export function getDefaultDesignConfig(): DesignConfig {
    return {
        menu: {
            mood: MenuMood.CLEAN,
            layout: MenuLayout.LIST,
            showItemPrices: true,
            showImages: true,
            showCategoryIcons: true,
            showCategoryTabs: false,
        },
    };
}
