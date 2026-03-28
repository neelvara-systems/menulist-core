/**
 * Style Utilities for Projects
 * 
 * Lightweight styling functions - NO heavy dependencies
 * This file should be imported for UI styling needs
 */

import { DEVICE_TYPES_LIST } from '@constant/builder';

export const getBackgroundStyles = (config: any) => {
    if (!config) return {};

    let styles: any = {};

    // Extract background properties from config to avoid conflicts
    // We'll use specific properties instead of the shorthand 'background'

    // Handle solid background color
    if (config.background && typeof config.background === 'string' && !config.background.includes('gradient')) {
        styles.backgroundColor = config.background;
    }

    // Handle background image
    const images: string[] = [];

    // Add background image if present
    if (config.backgroundImage && typeof config.backgroundImage === 'string') {
        images.push(`url(${config.backgroundImage})`);
    }

    // Add gradient if present
    if (config.background && typeof config.background === 'string' && config.background.includes('gradient')) {
        images.push(config.background);
    }

    // Set backgroundImage property if we have any images
    if (images.length > 0) {
        styles.backgroundImage = images.join(', ');
    }

    // Apply additional background styles if present
    if (config.backgroundStyle && typeof config.backgroundStyle === 'object') {
        // Avoid copying any 'background' property from backgroundStyle
        const { background, ...safeBackgroundStyle } = config.backgroundStyle;

        // Also avoid any other potential conflicting properties
        const { backgroundColor, backgroundImage, ...safestBackgroundStyle } = safeBackgroundStyle;

        styles = { ...styles, ...safestBackgroundStyle };
    }

    if (styles?.backgroundImage?.includes('gradient')) {
        delete styles.backgroundColor;
    }
    return styles;
};

export const getBorderStyles = (config: any, styleTemplate: any = {}) => {
    if (!config && !styleTemplate) return {};

    const styles: any = {};

    // First check if we should use individual border properties or shorthand
    const useIndividualProperties = !config?.border && (
        config?.borderWidth !== undefined ||
        config?.borderStyle !== undefined ||
        config?.borderColor !== undefined
    );

    if (useIndividualProperties) {
        // Use individual properties
        if (config?.borderWidth !== undefined) {
            styles.borderWidth = typeof config.borderWidth === 'number'
                ? `${config.borderWidth}px`
                : config.borderWidth;
        } else if (styleTemplate?.borderColor) {
            // Default width if using template color
            styles.borderWidth = '1px';
        }

        if (config?.borderStyle !== undefined) {
            styles.borderStyle = config.borderStyle;
        } else if (styleTemplate?.borderColor) {
            // Default style if using template color
            styles.borderStyle = 'solid';
        }

        if (config?.borderColor !== undefined) {
            styles.borderColor = config.borderColor;
        } else if (styleTemplate?.borderColor) {
            styles.borderColor = styleTemplate.borderColor;
        }
    } else if (config?.border) {
        // Use the shorthand border property directly
        styles.border = config.border;
    } else if (styleTemplate?.borderColor) {
        // Create shorthand from template
        styles.border = `1px solid ${styleTemplate.borderColor}`;
    }

    // Handle border radius (doesn't conflict with other border properties)
    if (config?.borderRadius !== undefined) {
        styles.borderRadius = typeof config.borderRadius === 'number'
            ? `${config.borderRadius}px`
            : config.borderRadius;
    }

    return styles;
};

export const getTextStyles = (config: any, styleTemplate: any = {}, deviceType: string = 'mobile') => {
    const fontSize = config?.text?.fontSize || styleTemplate?.fontSize;
    const fontWeight = config?.text?.fontWeight || styleTemplate?.fontWeight;

    // Ensure fontWeight is a valid number
    let validFontWeight = 400; // Default value
    if (fontWeight !== undefined && fontWeight !== null) {
        const parsedWeight = Number(fontWeight);
        if (!isNaN(parsedWeight)) {
            validFontWeight = parsedWeight;
        }
    }

    const styles = {
        ...config?.text,
        color: config?.text?.color || styleTemplate?.color,
        fontFamily: config?.text?.fontFamily || styleTemplate?.fontFamily,
        fontSize: getResponsiveFontSize(fontSize, deviceType),
        fontWeight: validFontWeight,
        ...(config?.text?.style && { ...config.text.style })
    };
    delete styles.backgroundColor;
    delete styles.background;
    delete styles.backgroundImage;
    return styles;
};

export const getResponsiveFontSize = (fontSize: number | string | undefined, deviceType: string) => {
    if (!fontSize) return undefined;

    // Convert fontSize to number if it's a string with 'px'
    const size = typeof fontSize === 'string' ?
        parseFloat(fontSize.replace('px', '')) :
        fontSize;

    if (typeof size !== 'number') return fontSize;

    // Apply responsive scaling based on device type
    // Mobile: keep as is
    // Tablet: apply 1.4x scaling (40% larger)
    // Desktop: apply 1.6x scaling (60% larger)
    switch (deviceType) {
        case DEVICE_TYPES_LIST.MOBILE:
            return `${size}px`;
        case DEVICE_TYPES_LIST.TABLET:
            return `${Math.round(size * 1.1)}px`;
        case DEVICE_TYPES_LIST.DESKTOP:
            return `${Math.round(size * 1.2)}px`;
        default:
            return `${size}px`;
    }
};

// Utility function to make a color lighter
export const makeLighterColor = (color: string | undefined): string => {
    if (!color) return '#00000099'; // Default semi-transparent black

    // For hex colors
    if (color.startsWith('#')) {
        return `${color}99`; // Add 60% opacity (99 in hex)
    }

    // For rgb colors
    if (color.startsWith('rgb(')) {
        return color.replace('rgb(', 'rgba(').replace(')', ', 0.6)');
    }

    // For rgba colors
    if (color.startsWith('rgba(')) {
        // Extract the alpha value and multiply it by 0.6
        const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([0-9.]+)\)/);
        if (rgbaMatch) {
            const [, r, g, b, a] = rgbaMatch;
            const newAlpha = Math.min(parseFloat(a) * 0.6, 1).toFixed(2);
            return `rgba(${r}, ${g}, ${b}, ${newAlpha})`;
        }
    }

    // For named colors or other formats, return with opacity
    return `${color}99`;
};
