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

// ============================================
// HOME PAGE STYLES
// ============================================

export enum HomeStyle {
    SIMPLE = 'simple',
    PREMIUM = 'premium',
    BOLD = 'bold'
}

export interface HomeStyleConfig {
    label: string;
    description: string;
    // Container/Background
    background: string;
    backgroundOverlay?: string; // Gradient overlay for depth
    // Typography
    fontFamily: string;
    fontSize: number;
    fontWeight: number;
    letterSpacing: string;
    color: string;
    taglineColor?: string;
    // Border/Frame
    borderColor: string;
    borderWidth: number;
    borderStyle: 'solid' | 'dashed' | 'none';
    frameType: 'none' | 'simple' | 'subtle' | 'glow';
    // Button
    buttonStyle: 'filled' | 'outline' | 'gradient' | 'glow';
    buttonRadius: number;
    buttonGlow?: string;
    // Special Effects (Differentiators)
    glowEffect?: string; // CSS box-shadow for glow
    glassmorphism?: boolean;
    patternOverlay?: string; // Subtle pattern for texture
    animationType?: 'fade' | 'slide' | 'scale' | 'blur';
}

export const HOME_STYLES: Record<HomeStyle, HomeStyleConfig> = {
    [HomeStyle.SIMPLE]: {
        label: 'Simple',
        description: 'Clean & professional',
        // Container - Clean dark
        background: '#18181b',
        backgroundOverlay: undefined,
        // Typography - Modern, clean
        fontFamily: '"Inter", -apple-system, sans-serif',
        fontSize: 32,
        fontWeight: 600,
        letterSpacing: '0.5px',
        color: '#ffffff',
        taglineColor: 'rgba(255, 255, 255, 0.6)',
        // Border - None
        borderColor: 'transparent',
        borderWidth: 0,
        borderStyle: 'none',
        frameType: 'none',
        // Button - Clean filled
        buttonStyle: 'filled',
        buttonRadius: 8,
        buttonGlow: undefined,
        // Effects - Minimal
        glassmorphism: false,
        animationType: 'fade',
    },
    [HomeStyle.PREMIUM]: {
        label: 'Premium',
        description: 'Elegant & refined',
        // Container - Deep navy
        background: '#0f172a',
        backgroundOverlay: undefined,
        // Typography - Elegant serif
        fontFamily: '"Playfair Display", Georgia, serif',
        fontSize: 36,
        fontWeight: 500,
        letterSpacing: '2px',
        color: '#d4af37',
        taglineColor: 'rgba(212, 175, 55, 0.7)',
        // Border - Subtle gold line
        borderColor: 'rgba(212, 175, 55, 0.3)',
        borderWidth: 1,
        borderStyle: 'solid',
        frameType: 'subtle',
        // Button - Elegant outline
        buttonStyle: 'outline',
        buttonRadius: 4,
        buttonGlow: undefined,
        // Effects - Calm
        glowEffect: undefined,
        glassmorphism: false,
        animationType: 'fade',
    },
    [HomeStyle.BOLD]: {
        label: 'Bold',
        description: 'Confident & eye-catching',
        // Container - Pure black
        background: '#000000',
        backgroundOverlay: undefined,
        // Typography - Strong
        fontFamily: '"Poppins", sans-serif',
        fontSize: 38,
        fontWeight: 700,
        letterSpacing: '1px',
        color: '#ffffff',
        taglineColor: 'rgba(255, 255, 255, 0.7)',
        // Border - Accent color
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderStyle: 'solid',
        frameType: 'simple',
        // Button - Bold filled
        buttonStyle: 'filled',
        buttonRadius: 0,
        buttonGlow: undefined,
        // Effects - None
        glowEffect: undefined,
        glassmorphism: false,
        animationType: 'fade',
    },
};

// ============================================
// MENU PAGE STYLES
// ============================================

export enum MenuMood {
    CLEAN = 'clean',       // M1: Light, professional (clinics/salons/cafes)
    WARM = 'warm',         // M2: Warm & inviting (family restaurants)
    PREMIUM = 'premium',   // M3: Premium & minimal (fine dining) - formerly ELEGANT
    BOLD = 'bold',         // M4: Bold & energetic (bars/clubs) - formerly VIBRANT
    FAST = 'fast',         // M5: Utility & fast (QSRs/high-volume)
}

export enum MenuLayout {
    LIST = 'list',
    CARD = 'card',
    GRID = 'grid',
    TABS = 'tabs',
}

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
        description: 'Professional, clinic-safe',
        // Container - LIGHT BACKGROUND (Constitutional M1)
        background: '#FFFFFF',
        backgroundOverlay: undefined,
        // Typography - Modern, readable
        headingFont: '"Inter", -apple-system, sans-serif',
        bodyFont: '"Inter", sans-serif',
        headingColor: '#1a1a1a',
        bodyColor: '#4a4a4a',
        priceColor: '#059669',
        descriptionColor: '#6b7280',
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
            borderColor: 'rgba(0, 0, 0, 0.08)',
            borderRadius: 0,
            borderWidth: 0,
            titleTransform: 'uppercase',
            titleLetterSpacing: '1px',
            dividerStyle: 'line',
            dividerColor: 'rgba(0, 0, 0, 0.1)',
        },
        // Item - Clean cards
        itemStyle: {
            background: '#f9fafb',
            borderColor: 'rgba(0, 0, 0, 0.08)',
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
        description: 'Family restaurants, casual dining',
        // Container - Warm light (Constitutional M2)
        background: '#FEF7ED',
        backgroundOverlay: undefined,
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
            titleLetterSpacing: '0.5px',
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
        description: 'Fine dining, boutique cafes',
        // Container - Deep navy
        background: '#0f172a',
        backgroundOverlay: undefined,
        // Typography - Serif elegance
        headingFont: '"Playfair Display", Georgia, serif',
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
            titleTransform: 'uppercase',
            titleLetterSpacing: '3px',
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
        label: 'Bold & Energetic',
        description: 'Bars, clubs, night venues',
        // Container - Pure black
        background: '#000000',
        backgroundOverlay: undefined,
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
            titleTransform: 'uppercase',
            titleLetterSpacing: '2px',
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
        label: 'Utility & Fast',
        description: 'QSRs, food courts, high volume',
        // Container - Minimal (Constitutional M5)
        background: '#f5f5f5',
        backgroundOverlay: undefined,
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
            titleTransform: 'uppercase',
            titleLetterSpacing: '0.5px',
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
        description: 'Category tabs navigation',
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
    [MenuMood.CLEAN]: [MenuLayout.LIST, MenuLayout.GRID, MenuLayout.TABS],      // M1: Clean first, light grid allowed
    [MenuMood.WARM]: [MenuLayout.LIST, MenuLayout.CARD, MenuLayout.GRID, MenuLayout.TABS], // M2: All layouts work
    [MenuMood.PREMIUM]: [MenuLayout.LIST, MenuLayout.CARD, MenuLayout.TABS],     // M3: List or card only (no grid)
    [MenuMood.BOLD]: [MenuLayout.CARD, MenuLayout.GRID, MenuLayout.TABS],        // M4: Card or grid
    [MenuMood.FAST]: [MenuLayout.LIST, MenuLayout.TABS],                         // M5: List only (speed priority)
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
    home: {
        style: HomeStyle.SIMPLE,
    },
    menu: {
        mood: MenuMood.CLEAN,
        layout: MenuLayout.LIST,
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

    if (!brandAccentColor) {
        return moodConfig;
    }

    // Constitutional enforcement - auto-correct colors that fail contrast
    const safeAccent = enforceContrast(
        brandAccentColor,
        moodConfig.background,
        moodConfig.accentColor // Fallback to mood's original accent
    );

    const safePriceColor = enforceContrast(
        brandAccentColor,
        moodConfig.background,
        moodConfig.priceColor // Fallback to mood's original price color
    );

    // Create a new config with the ENFORCED brand colors
    return {
        ...moodConfig,
        accentColor: safeAccent,
        priceColor: safePriceColor,
        categoryStyle: {
            ...moodConfig.categoryStyle,
            borderColor: `${safeAccent}20`, // 20% opacity
            dividerColor: `${safeAccent}30`, // 30% opacity
        },
        itemStyle: {
            ...moodConfig.itemStyle,
            borderColor: `${safeAccent}15`, // 15% opacity
            priceBadgeColor: moodConfig.itemStyle.priceStyle === 'badge' ? `${safeAccent}15` : undefined,
        },
    };
}

/**
 * Get home style config with optional brand color override
 */
export function getHomeStyleWithBrandColor(style: HomeStyle, brandAccentColor?: string): HomeStyleConfig {
    const styleConfig = HOME_STYLES[style];

    if (!brandAccentColor) {
        return styleConfig;
    }

    // Apply brand color to accent elements
    return {
        ...styleConfig,
        color: style === HomeStyle.PREMIUM ? brandAccentColor : styleConfig.color,
        borderColor: style !== HomeStyle.SIMPLE ? `${brandAccentColor}50` : styleConfig.borderColor,
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
    home: {
        style: HomeStyle;
        // Optional overrides (hidden in Advanced)
        backgroundImage?: string;
        logoUrl?: string;
    };
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
        home: {
            style: HomeStyle.SIMPLE,
        },
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
