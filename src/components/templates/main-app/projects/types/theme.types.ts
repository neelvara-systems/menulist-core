/**
 * Theme & Configuration Types
 * 
 * Simplified design system configuration.
 * Uses high-level presets instead of granular controls.
 */

import { MenuLayout, MenuMood } from "../b2cView/designSystem";

/**
 * Design System Config
 * 
 * Menu: 2 decisions (mood + layout)
 * Brand: Optional brand accent (used for actions, highlights, focus states only)
 */
export interface DesignConfig {
    menu: {
        mood: MenuMood;
        layout: MenuLayout;
        backgroundImage?: string;
        showItemPrices?: boolean;
        showImages?: boolean;
        showCategoryIcons?: boolean;
        showCategoryTabs?: boolean;
    };
    brand?: {
        accentColor?: string;  // Brand accent - used for actions, highlights, focus states only
    };
}

export interface ThemeConfig {
    design: DesignConfig;
}
