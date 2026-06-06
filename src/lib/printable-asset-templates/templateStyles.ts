import {
    hexToRgb,
    mixHex,
    normalizeMenuKitBrandColor,
    resolveMenuKitBrandTokens,
    type MenuKitBrandTokens,
} from '@lib/menu-kit/brandTokens';
import { normalizePrintableTemplateFamilyId } from './templateFamilies';
import type { PrintableTemplateFamilyId } from './types';

function withRgb(token: Omit<MenuKitBrandTokens, `${string}Rgb`>): MenuKitBrandTokens {
    return {
        ...token,
        accentRgb: hexToRgb(token.accent),
        accentTextRgb: hexToRgb(token.accentText),
        borderRgb: hexToRgb(token.border),
        gradientFromRgb: hexToRgb(token.gradientFrom),
        gradientToRgb: hexToRgb(token.gradientTo),
        mutedRgb: hexToRgb(token.muted),
        paperRgb: hexToRgb(token.paper),
        softAccentRgb: hexToRgb(token.softAccent),
        surfaceRgb: hexToRgb(token.surface),
        textRgb: hexToRgb(token.text),
    };
}

export function resolvePrintableTemplateBrandTokens(
    brandColor?: string | null,
    templateFamilyId?: string | null,
): MenuKitBrandTokens {
    const familyId = normalizePrintableTemplateFamilyId(templateFamilyId);
    const base = resolveMenuKitBrandTokens(brandColor);
    const brandAccent = normalizeMenuKitBrandColor(brandColor, base.accent);

    if (familyId === 'executive-dark') {
        const gold = '#c79a35';
        return withRgb({
            accent: gold,
            accentText: '#111111',
            border: '#8c6d28',
            gradientFrom: '#20242a',
            gradientTo: '#080a0d',
            muted: '#c7c2b8',
            paper: '#11161c',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#2b2518',
            surface: '#151b22',
            text: '#ffffff',
        });
    }

    if (familyId === 'botanical-heritage') {
        const green = mixHex(brandAccent, '#0f3d2e', 0.38);
        const gold = '#b9903a';
        return withRgb({
            ...base,
            accent: green,
            accentText: '#ffffff',
            border: mixHex(gold, '#d5c49c', 0.45),
            gradientFrom: green,
            gradientTo: '#092219',
            muted: '#5d6b62',
            paper: '#f8f5ea',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#edf6ef',
            surface: '#fffdf5',
            text: '#17251d',
        });
    }

    if (familyId === 'classic-luxe') {
        const gold = mixHex(brandAccent, '#bd8b2f', 0.24);
        return withRgb({
            ...base,
            accent: gold,
            accentText: '#1f1b14',
            border: '#cfb779',
            gradientFrom: '#d7b94a',
            gradientTo: '#8b7424',
            muted: '#6f6450',
            paper: '#fbf7ea',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#f5ead3',
            surface: '#fffdf7',
            text: '#1f1b17',
        });
    }

    if (familyId === 'brand-banner' || familyId === 'local-bold') {
        return withRgb({
            ...base,
            accent: base.accent,
            accentText: base.accentText,
            border: mixHex(base.accent, '#111827', familyId === 'local-bold' ? 0.4 : 0.28),
            gradientFrom: mixHex(base.accent, '#ffffff', 0.9),
            gradientTo: mixHex(base.accent, '#111827', familyId === 'local-bold' ? 0.7 : 0.54),
            muted: '#59616b',
            paper: '#f5f8fb',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: mixHex(base.accent, '#ffffff', 0.16),
            surface: '#ffffff',
            text: '#111827',
        });
    }

    if (familyId === 'soft-curve') {
        return withRgb({
            ...base,
            accent: base.accent,
            accentText: base.accentText,
            border: mixHex(base.accent, '#cad7dd', 0.18),
            gradientFrom: mixHex(base.accent, '#ffffff', 0.32),
            gradientTo: '#f8fbfd',
            muted: '#667085',
            paper: '#f4fbfb',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: mixHex(base.accent, '#ffffff', 0.1),
            surface: '#ffffff',
            text: '#111827',
        });
    }

    if (familyId === 'qr-first') {
        return withRgb({
            ...base,
            accent: base.accent,
            accentText: base.accentText,
            border: mixHex(base.accent, '#94a3b8', 0.2),
            gradientFrom: mixHex(base.accent, '#ffffff', 0.78),
            gradientTo: mixHex(base.accent, '#111827', 0.62),
            muted: '#4b5563',
            paper: '#f5f7fa',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#eef6f7',
            surface: '#ffffff',
            text: '#111827',
        });
    }

    if (familyId === 'clean-utility') {
        return withRgb({
            ...base,
            accent: '#111827',
            accentText: '#ffffff',
            border: '#d7dde3',
            gradientFrom: '#ffffff',
            gradientTo: '#f3f4f6',
            muted: '#6b7280',
            paper: '#ffffff',
            qrDark: '#111827',
            qrLight: '#ffffff',
            softAccent: '#f3f4f6',
            surface: '#ffffff',
            text: '#111827',
        });
    }

    return base;
}

export function getPrintableTemplateTone(templateFamilyId?: string | null): PrintableTemplateFamilyId {
    return normalizePrintableTemplateFamilyId(templateFamilyId);
}
