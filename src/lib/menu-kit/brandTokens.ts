export type RgbColor = [number, number, number];

export interface MenuKitBrandTokens {
    accent: string;
    accentRgb: RgbColor;
    accentText: string;
    accentTextRgb: RgbColor;
    border: string;
    borderRgb: RgbColor;
    muted: string;
    mutedRgb: RgbColor;
    paper: string;
    paperRgb: RgbColor;
    qrDark: string;
    qrLight: string;
    softAccent: string;
    softAccentRgb: RgbColor;
    surface: string;
    surfaceRgb: RgbColor;
    text: string;
    textRgb: RgbColor;
}

const HEX_COLOR = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export function normalizeMenuKitBrandColor(value?: string | null, fallback = '#2d2d2d'): string {
    if (!value || !HEX_COLOR.test(value.trim())) return fallback;
    const clean = value.trim().replace('#', '');
    const expanded = clean.length === 3
        ? clean.split('').map((char) => `${char}${char}`).join('')
        : clean;
    return `#${expanded.toLowerCase()}`;
}

export function hexToRgb(hex: string): RgbColor {
    const normalized = normalizeMenuKitBrandColor(hex);
    const value = normalized.slice(1);
    return [
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16),
    ];
}

export function rgbToHex([r, g, b]: RgbColor): string {
    const toHex = (value: number) => Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getColorBrightness(hex: string): number {
    const [r, g, b] = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000;
}

export function mixHex(foreground: string, background: string, foregroundWeight: number): string {
    const fg = hexToRgb(foreground);
    const bg = hexToRgb(background);
    const weight = Math.max(0, Math.min(1, foregroundWeight));
    return rgbToHex([
        fg[0] * weight + bg[0] * (1 - weight),
        fg[1] * weight + bg[1] * (1 - weight),
        fg[2] * weight + bg[2] * (1 - weight),
    ]);
}

function resolveReadableAccent(brandColor?: string | null): string {
    const accent = normalizeMenuKitBrandColor(brandColor);
    if (getColorBrightness(accent) <= 190) return accent;
    return mixHex(accent, '#000000', 0.56);
}

export function resolveMenuKitBrandTokens(brandColor?: string | null): MenuKitBrandTokens {
    const accent = resolveReadableAccent(brandColor);
    const accentText = getColorBrightness(accent) > 150 ? '#1f1f1f' : '#ffffff';
    const paper = mixHex(accent, '#ffffff', 0.06);
    const border = mixHex(accent, '#d7d2ca', 0.34);
    const softAccent = mixHex(accent, '#ffffff', 0.16);

    return {
        accent,
        accentRgb: hexToRgb(accent),
        accentText,
        accentTextRgb: hexToRgb(accentText),
        border,
        borderRgb: hexToRgb(border),
        muted: '#6f6f6f',
        mutedRgb: hexToRgb('#6f6f6f'),
        paper,
        paperRgb: hexToRgb(paper),
        qrDark: accent,
        qrLight: '#ffffff',
        softAccent,
        softAccentRgb: hexToRgb(softAccent),
        surface: '#ffffff',
        surfaceRgb: hexToRgb('#ffffff'),
        text: '#1f1f1f',
        textRgb: hexToRgb('#1f1f1f'),
    };
}

export function resolveStoreBrandColor(storeData?: Record<string, any> | null): string | undefined {
    return storeData?.publicPresence?.accentColor
        || storeData?.primaryColor
        || storeData?.brandColor
        || storeData?.themeColor
        || undefined;
}
