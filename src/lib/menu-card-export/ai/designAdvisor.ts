import { z } from 'zod';
import type { MenuCardExportSettings } from '../models/exportTypes';

type MenuCardAdvisorSettingsInput = Partial<Pick<
    MenuCardExportSettings,
    'preset' | 'styleId' | 'density' | 'includeDescriptions' | 'includeQr' | 'includeContactBlock'
>>;

export const MENU_CARD_DESIGN_ADVISOR_ALLOWED_PRESETS = [
    'home_print',
    'whatsapp',
    'print_shop_packet',
    'table_menu',
] as const;

export const MENU_CARD_DESIGN_ADVISOR_ALLOWED_STYLES = [
    'classic',
    'compact',
    'premium',
] as const;

export const MENU_CARD_DESIGN_ADVISOR_ALLOWED_DENSITIES = [
    'comfortable',
    'balanced',
    'compact',
] as const;

export type MenuCardDesignAdvisorPreset = typeof MENU_CARD_DESIGN_ADVISOR_ALLOWED_PRESETS[number];
export type MenuCardDesignAdvisorStyle = typeof MENU_CARD_DESIGN_ADVISOR_ALLOWED_STYLES[number];
export type MenuCardDesignAdvisorDensity = typeof MENU_CARD_DESIGN_ADVISOR_ALLOWED_DENSITIES[number];

export const MenuCardDesignAdvisorRecommendationSchema = z.object({
    preset: z.enum(MENU_CARD_DESIGN_ADVISOR_ALLOWED_PRESETS),
    styleId: z.enum(MENU_CARD_DESIGN_ADVISOR_ALLOWED_STYLES),
    density: z.enum(MENU_CARD_DESIGN_ADVISOR_ALLOWED_DENSITIES),
    includeDescriptions: z.boolean(),
    includeQr: z.boolean(),
    includeContactBlock: z.boolean(),
    ownerNote: z.string().min(1).max(180),
    reason: z.string().min(1).max(240),
    warnings: z.array(z.string().max(140)).max(3).default([]),
}).strict();

export type MenuCardDesignAdvisorRecommendation = z.infer<typeof MenuCardDesignAdvisorRecommendationSchema>;

function isAllowedPreset(value: unknown): value is MenuCardDesignAdvisorPreset {
    return typeof value === 'string'
        && MENU_CARD_DESIGN_ADVISOR_ALLOWED_PRESETS.includes(value as MenuCardDesignAdvisorPreset);
}

function isAllowedStyle(value: unknown): value is MenuCardDesignAdvisorStyle {
    return typeof value === 'string'
        && MENU_CARD_DESIGN_ADVISOR_ALLOWED_STYLES.includes(value as MenuCardDesignAdvisorStyle);
}

function isAllowedDensity(value: unknown): value is MenuCardDesignAdvisorDensity {
    return typeof value === 'string'
        && MENU_CARD_DESIGN_ADVISOR_ALLOWED_DENSITIES.includes(value as MenuCardDesignAdvisorDensity);
}

function boundedText(value: unknown, fallback: string, maxLength: number): string {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback).slice(0, maxLength);
}

const readOwnDataField = (value: unknown, key: string): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
};

const normalizeWarnings = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    try {
        return value
            .map((warning) => typeof warning === 'string' ? warning.trim().slice(0, 140) : '')
            .filter(Boolean)
            .slice(0, 3);
    } catch {
        return [];
    }
};

export function isMenuCardAdvisorPreset(value: string): value is MenuCardDesignAdvisorPreset {
    return isAllowedPreset(value);
}

export function isMenuCardAdvisorDensity(value: string): value is MenuCardDesignAdvisorDensity {
    return isAllowedDensity(value);
}

export function isMenuCardAdvisorStyle(value: string): value is MenuCardDesignAdvisorStyle {
    return isAllowedStyle(value);
}

export function normalizeMenuCardDesignAdvice(
    raw: unknown,
    currentSettings: MenuCardAdvisorSettingsInput,
): MenuCardDesignAdvisorRecommendation {
    const fallbackPreset = isAllowedPreset(currentSettings.preset)
        ? currentSettings.preset
        : 'home_print';
    const fallbackStyle = isAllowedStyle(currentSettings.styleId)
        ? currentSettings.styleId
        : 'classic';
    const fallbackDensity = isAllowedDensity(currentSettings.density)
        ? currentSettings.density
        : 'balanced';

    const normalized = {
        preset: isAllowedPreset(readOwnDataField(raw, 'preset')) ? readOwnDataField(raw, 'preset') : fallbackPreset,
        styleId: isAllowedStyle(readOwnDataField(raw, 'styleId')) ? readOwnDataField(raw, 'styleId') : fallbackStyle,
        density: isAllowedDensity(readOwnDataField(raw, 'density')) ? readOwnDataField(raw, 'density') : fallbackDensity,
        includeDescriptions: typeof readOwnDataField(raw, 'includeDescriptions') === 'boolean'
            ? readOwnDataField(raw, 'includeDescriptions')
            : Boolean(currentSettings.includeDescriptions),
        includeQr: typeof readOwnDataField(raw, 'includeQr') === 'boolean'
            ? readOwnDataField(raw, 'includeQr')
            : Boolean(currentSettings.includeQr),
        includeContactBlock: typeof readOwnDataField(raw, 'includeContactBlock') === 'boolean'
            ? readOwnDataField(raw, 'includeContactBlock')
            : Boolean(currentSettings.includeContactBlock),
        ownerNote: boundedText(readOwnDataField(raw, 'ownerNote'), 'Layout suggestion is ready.', 180),
        reason: boundedText(readOwnDataField(raw, 'reason'), 'Selected from the approved print menu settings.', 240),
        warnings: normalizeWarnings(readOwnDataField(raw, 'warnings')),
    };

    return MenuCardDesignAdvisorRecommendationSchema.parse(normalized);
}
