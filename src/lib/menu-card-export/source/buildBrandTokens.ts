import type { MenuCardBrandTokens } from '../models/printModel';

const HEX_COLOR = /^#?[0-9a-fA-F]{6}$/;

export function normalizeHexColor(value?: string | null, fallback = '#2d2d2d'): string {
    if (!value || !HEX_COLOR.test(value)) return fallback;
    return value.startsWith('#') ? value : `#${value}`;
}

export function buildBrandTokens(brandColor?: string | null): MenuCardBrandTokens {
    const accentColor = normalizeHexColor(brandColor);
    return {
        accentColor,
        textColor: '#1f1f1f',
        mutedColor: '#6f6f6f',
        borderColor: '#d9d9d9',
    };
}
