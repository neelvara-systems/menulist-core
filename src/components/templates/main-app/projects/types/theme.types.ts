/**
 * Theme & Configuration Types
 * 
 * Simplified design system configuration.
 * Uses high-level presets instead of granular controls.
 */

import { HomeStyle, MenuLayout, MenuMood } from "../b2cView/designSystem";

/**
 * Design System Config
 * 
 * Home: 1 decision (style)
 * Menu: 2 decisions (mood + layout)
 * Brand: Optional brand accent (used for actions, highlights, focus states only)
 */
export interface DesignConfig {
    home: {
        style: HomeStyle;
        backgroundImage?: string;
    };
    menu: {
        mood: MenuMood;
        layout: MenuLayout;
        backgroundImage?: string;
        showImages?: boolean;
        showCategoryTabs?: boolean;
    };
    brand?: {
        accentColor?: string;  // Brand accent - used for actions, highlights, focus states only
    };
}

export interface ThemeConfig {
    design: DesignConfig;
}
