import { resolveBusinessCategory } from '@data/shared/businessTypes';
import {
    MENU_LAYOUTS,
    MenuLayout,
    MenuMood,
    getCompatibleLayouts,
} from '@template/main-app/projects/b2cView/designSystem';

export interface MenuDesignPreset {
    key: string;
    label: string;
    description: string;
    recommendedFor: string;
    mood: MenuMood;
    layout: MenuLayout;
    accentColor: string;
    showItemPrices: boolean;
    showImages: boolean;
    showCategoryIcons: boolean;
    showCategoryTabs: boolean;
    emoji: string;
}

export interface MenuDesignPresetMatchInput {
    mood: MenuMood;
    layout: MenuLayout;
    accentColor?: string;
    showItemPrices?: boolean;
    showImages?: boolean;
    showCategoryIcons?: boolean;
    showCategoryTabs?: boolean;
}

export const OWNER_SELECTABLE_MENU_LAYOUTS: MenuLayout[] = [
    MenuLayout.LIST,
    MenuLayout.GRID,
    MenuLayout.CARD,
];

const PREFERRED_LAYOUT_BY_MOOD: Record<MenuMood, MenuLayout> = {
    [MenuMood.CLEAN]: MenuLayout.LIST,
    [MenuMood.WARM]: MenuLayout.CARD,
    [MenuMood.PREMIUM]: MenuLayout.LIST,
    [MenuMood.BOLD]: MenuLayout.CARD,
    [MenuMood.FAST]: MenuLayout.LIST,
};

export const MENU_DESIGN_PRESETS: MenuDesignPreset[] = [
    {
        key: 'fast-ordering',
        label: 'Fast ordering',
        description: 'Clear prices and quick scanning.',
        recommendedFor: 'QSRs, counters, food courts',
        mood: MenuMood.FAST,
        layout: MenuLayout.LIST,
        accentColor: '#ef4444',
        showItemPrices: true,
        showImages: true,
        showCategoryIcons: true,
        showCategoryTabs: true,
        emoji: '⚡',
    },
    {
        key: 'warm-dining',
        label: 'Warm dining',
        description: 'Comfortable, friendly, easy to browse.',
        recommendedFor: 'Restaurants, family dining',
        mood: MenuMood.WARM,
        layout: MenuLayout.CARD,
        accentColor: '#f97316',
        showItemPrices: true,
        showImages: true,
        showCategoryIcons: true,
        showCategoryTabs: true,
        emoji: '🍂',
    },
    {
        key: 'fresh-cafe',
        label: 'Fresh cafe',
        description: 'Clean, modern, and relaxed.',
        recommendedFor: 'Cafes, bakeries, brunch',
        mood: MenuMood.CLEAN,
        layout: MenuLayout.GRID,
        accentColor: '#22c55e',
        showItemPrices: true,
        showImages: true,
        showCategoryIcons: true,
        showCategoryTabs: true,
        emoji: '🌿',
    },
    {
        key: 'premium-minimal',
        label: 'Premium & Minimal',
        description: 'Quiet, refined, and price-focused.',
        recommendedFor: 'Fine dining, boutiques, premium services',
        mood: MenuMood.PREMIUM,
        layout: MenuLayout.LIST,
        accentColor: '#d4af37',
        showItemPrices: true,
        showImages: false,
        showCategoryIcons: false,
        showCategoryTabs: false,
        emoji: '◇',
    },
    {
        key: 'bold-social',
        label: 'Bold social',
        description: 'High-energy presentation with strong visuals.',
        recommendedFor: 'Bars, nightlife, burgers, events',
        mood: MenuMood.BOLD,
        layout: MenuLayout.CARD,
        accentColor: '#3b82f6',
        showItemPrices: true,
        showImages: true,
        showCategoryIcons: true,
        showCategoryTabs: true,
        emoji: '◆',
    },
    {
        key: 'visual-catalog',
        label: 'Visual catalog',
        description: 'Best when photos help customers choose.',
        recommendedFor: 'Retail, desserts, flowers, portfolios',
        mood: MenuMood.CLEAN,
        layout: MenuLayout.GRID,
        accentColor: '#14b8a6',
        showItemPrices: true,
        showImages: true,
        showCategoryIcons: true,
        showCategoryTabs: true,
        emoji: '▦',
    },
    {
        key: 'clean-service',
        label: 'Clean service',
        description: 'Simple service list with low distraction.',
        recommendedFor: 'Clinics, agencies, repairs, local services',
        mood: MenuMood.CLEAN,
        layout: MenuLayout.LIST,
        accentColor: '#0051d1',
        showItemPrices: true,
        showImages: false,
        showCategoryIcons: true,
        showCategoryTabs: false,
        emoji: '✓',
    },
    {
        key: 'premium-service',
        label: 'Premium service',
        description: 'Polished service menu with selective visuals.',
        recommendedFor: 'Salons, spas, hotels, consultants',
        mood: MenuMood.PREMIUM,
        layout: MenuLayout.CARD,
        accentColor: '#8b5cf6',
        showItemPrices: true,
        showImages: true,
        showCategoryIcons: false,
        showCategoryTabs: false,
        emoji: '✦',
    },
];

const BUSINESS_TYPE_PRESET_ORDER: Array<{ match: string[]; presetKeys: string[] }> = [
    {
        match: ['pizza', 'sushi', 'burger', 'parlor', 'qsr', 'quick service', 'food court', 'takeaway'],
        presetKeys: ['fast-ordering', 'warm-dining', 'bold-social'],
    },
    {
        match: ['restaurant', 'dining', 'catering'],
        presetKeys: ['warm-dining', 'fast-ordering', 'premium-minimal'],
    },
    {
        match: ['cafe', 'coffee', 'tea', 'brunch'],
        presetKeys: ['fresh-cafe', 'warm-dining', 'premium-minimal'],
    },
    {
        match: ['bakery', 'cake', 'dessert', 'ice cream', 'sweet'],
        presetKeys: ['visual-catalog', 'fresh-cafe', 'warm-dining'],
    },
    {
        match: ['bar', 'pub', 'nightlife', 'club'],
        presetKeys: ['bold-social', 'fast-ordering', 'warm-dining'],
    },
    {
        match: ['salon', 'spa', 'barber', 'nail', 'makeup', 'tattoo'],
        presetKeys: ['premium-service', 'clean-service', 'visual-catalog'],
    },
    {
        match: ['clinic', 'dental', 'doctor', 'veterinary', 'health'],
        presetKeys: ['clean-service', 'premium-service', 'visual-catalog'],
    },
    {
        match: ['gym', 'fitness', 'yoga', 'trainer', 'academy'],
        presetKeys: ['clean-service', 'fast-ordering', 'bold-social'],
    },
    {
        match: ['fashion', 'jewelry', 'florist', 'furniture', 'bookstore', 'electronics', 'store', 'boutique', 'watch'],
        presetKeys: ['visual-catalog', 'premium-minimal', 'clean-service'],
    },
    {
        match: ['photography', 'gallery', 'designer', 'craft', 'wedding', 'event', 'music'],
        presetKeys: ['visual-catalog', 'premium-service', 'premium-minimal'],
    },
    {
        match: ['law', 'financial', 'real estate', 'agency', 'consultant', 'coach'],
        presetKeys: ['clean-service', 'premium-minimal', 'premium-service'],
    },
    {
        match: ['repair', 'cleaning', 'landscaping', 'renovation', 'car wash', 'dealership', 'rental'],
        presetKeys: ['clean-service', 'visual-catalog', 'fast-ordering'],
    },
];

const CATEGORY_PRESET_ORDER: Record<string, string[]> = {
    food: ['warm-dining', 'fast-ordering', 'fresh-cafe'],
    service: ['clean-service', 'premium-service', 'visual-catalog'],
    health: ['clean-service', 'premium-service', 'visual-catalog'],
    retail: ['visual-catalog', 'premium-minimal', 'clean-service'],
    creative: ['visual-catalog', 'premium-service', 'premium-minimal'],
    professional: ['clean-service', 'premium-minimal', 'premium-service'],
    specialty: ['visual-catalog', 'clean-service', 'premium-minimal'],
};

const DEFAULT_PRESET_ORDER = ['clean-service', 'fresh-cafe', 'visual-catalog'];

const getPresetByKey = (key: string) => MENU_DESIGN_PRESETS.find((preset) => preset.key === key);

const uniquePresetsFromKeys = (keys: string[]): MenuDesignPreset[] => {
    const seen = new Set<string>();
    return keys
        .map(getPresetByKey)
        .filter((preset): preset is MenuDesignPreset => Boolean(preset))
        .filter((preset) => {
            if (seen.has(preset.key)) return false;
            seen.add(preset.key);
            return true;
        });
};

export const getOwnerSelectableMenuLayouts = (mood?: MenuMood): MenuLayout[] => {
    const compatibleLayouts = mood ? getCompatibleLayouts(mood) : Object.keys(MENU_LAYOUTS);
    return OWNER_SELECTABLE_MENU_LAYOUTS.filter((layout) => compatibleLayouts.includes(layout));
};

export const getOwnerSelectableMenuLayoutEntries = (mood?: MenuMood) => {
    const layouts = getOwnerSelectableMenuLayouts(mood);
    return layouts.map((layout) => [layout, MENU_LAYOUTS[layout]] as const);
};

export const getPreferredMenuLayoutForMood = (mood: MenuMood): MenuLayout => (
    PREFERRED_LAYOUT_BY_MOOD[mood] || MenuLayout.LIST
);

export const getRecommendedMenuDesignPresets = ({
    businessType,
    businessCategory,
}: {
    businessType?: string;
    businessCategory?: string;
} = {}): MenuDesignPreset[] => {
    const normalizedBusinessType = businessType?.trim().toLowerCase() || '';
    const typeMatch = BUSINESS_TYPE_PRESET_ORDER.find((entry) => (
        entry.match.some((term) => normalizedBusinessType.includes(term))
    ));
    const category = resolveBusinessCategory(businessType, businessCategory);
    const keys = typeMatch?.presetKeys
        || CATEGORY_PRESET_ORDER[category || '']
        || DEFAULT_PRESET_ORDER;

    return uniquePresetsFromKeys([...keys, ...DEFAULT_PRESET_ORDER]).slice(0, 3);
};

export const findMatchingMenuDesignPreset = (
    input: MenuDesignPresetMatchInput,
    presets: MenuDesignPreset[] = MENU_DESIGN_PRESETS,
): MenuDesignPreset | null => presets.find((preset) => (
    input.mood === preset.mood
    && input.layout === preset.layout
    && input.accentColor === preset.accentColor
    && input.showItemPrices === preset.showItemPrices
    && input.showImages === preset.showImages
    && input.showCategoryIcons === preset.showCategoryIcons
    && input.showCategoryTabs === preset.showCategoryTabs
)) || null;

export const getMenuDesignPresetPatch = (preset: MenuDesignPreset) => ({
    menu: {
        mood: preset.mood,
        layout: preset.layout,
        showItemPrices: preset.showItemPrices,
        showImages: preset.showImages,
        showCategoryIcons: preset.showCategoryIcons,
        showCategoryTabs: preset.showCategoryTabs,
    },
    brand: {
        accentColor: preset.accentColor,
    },
});
