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

function isAllowedPreset(value: string): value is MenuCardDesignAdvisorPreset {
    return MENU_CARD_DESIGN_ADVISOR_ALLOWED_PRESETS.includes(value as MenuCardDesignAdvisorPreset);
}

function isAllowedStyle(value: string): value is MenuCardDesignAdvisorStyle {
    return MENU_CARD_DESIGN_ADVISOR_ALLOWED_STYLES.includes(value as MenuCardDesignAdvisorStyle);
}

function isAllowedDensity(value: string): value is MenuCardDesignAdvisorDensity {
    return MENU_CARD_DESIGN_ADVISOR_ALLOWED_DENSITIES.includes(value as MenuCardDesignAdvisorDensity);
}

function boundedText(value: unknown, fallback: string, maxLength: number): string {
    const text = String(value || '').trim();
    return (text || fallback).slice(0, maxLength);
}

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
    const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : {};

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
        preset: isAllowedPreset(String(candidate.preset || '')) ? candidate.preset : fallbackPreset,
        styleId: isAllowedStyle(String(candidate.styleId || '')) ? candidate.styleId : fallbackStyle,
        density: isAllowedDensity(String(candidate.density || '')) ? candidate.density : fallbackDensity,
        includeDescriptions: typeof candidate.includeDescriptions === 'boolean'
            ? candidate.includeDescriptions
            : Boolean(currentSettings.includeDescriptions),
        includeQr: typeof candidate.includeQr === 'boolean'
            ? candidate.includeQr
            : Boolean(currentSettings.includeQr),
        includeContactBlock: typeof candidate.includeContactBlock === 'boolean'
            ? candidate.includeContactBlock
            : Boolean(currentSettings.includeContactBlock),
        ownerNote: boundedText(candidate.ownerNote, 'Layout suggestion is ready.', 180),
        reason: boundedText(candidate.reason, 'Selected from the approved print menu settings.', 240),
        warnings: Array.isArray(candidate.warnings)
            ? candidate.warnings.map((warning) => String(warning || '').trim()).filter(Boolean).slice(0, 3)
            : [],
    };

    return MenuCardDesignAdvisorRecommendationSchema.parse(normalized);
}
