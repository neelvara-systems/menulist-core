import type { MenuCardBrandTokens } from '../models/printModel';

const HEX_COLOR = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeHexColor(value?: string | null, fallback = '#2d2d2d'): string {
    if (!value || !HEX_COLOR.test(value.trim())) return fallback;
    const clean = value.trim().replace('#', '');
    const expanded = clean.length === 3
        ? clean.split('').map((char) => `${char}${char}`).join('')
        : clean;
    return `#${expanded.toLowerCase()}`;
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
