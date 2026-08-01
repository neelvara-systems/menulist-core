export type RgbColor = [number, number, number];

export interface MenuKitBrandTokens {
    accent: string;
    accentRgb: RgbColor;
    accentText: string;
    accentTextRgb: RgbColor;
    border: string;
    borderRgb: RgbColor;
    gradientFrom: string;
    gradientFromRgb: RgbColor;
    gradientTo: string;
    gradientToRgb: RgbColor;
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
const DEFAULT_BRAND_COLOR = '#2d2d2d';

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeMenuKitBrandColor(value?: unknown, fallback: unknown = DEFAULT_BRAND_COLOR): string {
    const safeFallback = typeof fallback === 'string' && HEX_COLOR.test(fallback.trim())
        ? fallback
        : DEFAULT_BRAND_COLOR;
    if (typeof value !== 'string' || !HEX_COLOR.test(value.trim())) {
        return normalizeMenuKitBrandColor(safeFallback, DEFAULT_BRAND_COLOR);
    }
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
    const toHex = (value: number) => Math.max(0, Math.min(255, Number.isFinite(value) ? Math.round(value) : 0))
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
    const weight = Number.isFinite(foregroundWeight)
        ? Math.max(0, Math.min(1, foregroundWeight))
        : 0;
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
    const gradientFrom = mixHex(accent, '#ffffff', 0.9);
    const gradientTo = mixHex(accent, '#111827', 0.54);
    const paper = mixHex(accent, '#fbfaf7', 0.045);
    const border = mixHex(accent, '#c9c0b4', 0.28);
    const softAccent = mixHex(accent, '#ffffff', 0.12);

    return {
        accent,
        accentRgb: hexToRgb(accent),
        accentText,
        accentTextRgb: hexToRgb(accentText),
        border,
        borderRgb: hexToRgb(border),
        gradientFrom,
        gradientFromRgb: hexToRgb(gradientFrom),
        gradientTo,
        gradientToRgb: hexToRgb(gradientTo),
        muted: '#6f6f6f',
        mutedRgb: hexToRgb('#6f6f6f'),
        paper,
        paperRgb: hexToRgb(paper),
        qrDark: '#111827',
        qrLight: '#ffffff',
        softAccent,
        softAccentRgb: hexToRgb(softAccent),
        surface: '#ffffff',
        surfaceRgb: hexToRgb('#ffffff'),
        text: '#1f1f1f',
        textRgb: hexToRgb('#1f1f1f'),
    };
}

export function resolveStoreBrandColor(storeData?: unknown): string | undefined {
    if (!isRecord(storeData)) return undefined;
    const publicPresence = isRecord(storeData.publicPresence) ? storeData.publicPresence : null;
    const candidates = [
        publicPresence?.accentColor,
        storeData.primaryColor,
        storeData.brandColor,
        storeData.themeColor,
    ];
    return candidates.find((candidate): candidate is string => (
        typeof candidate === 'string' && HEX_COLOR.test(candidate.trim())
    ));
}
