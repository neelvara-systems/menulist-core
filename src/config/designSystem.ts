/**
 * Shared Design System Re-exports
 * 
 * Mobile-safe re-export of pure data constants from the B2C design system.
 * Mobile components import from here instead of directly from @template/main-app/.
 * Desktop continues to import from the original designSystem/index.ts.
 */
export {
    BRAND_COLOR_PRESETS,
    DEFAULTS,
    getCompatibleLayouts,
    getMoodWithBrandColor,
    HOME_STYLES,
    HomeStyle,
    normalizeMenuLayout,
    normalizeMenuMood,
    resolveMenuDesignConfig,
    MenuLayout,
    MENU_LAYOUTS,
    MenuMood,
    MENU_MOODS,
} from '@template/main-app/projects/b2cView/designSystem';
