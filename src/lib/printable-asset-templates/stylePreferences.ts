import { MENU_KIT_ASSET_KEYS, type MenuKitAssetKey } from '@lib/menu-kit/types';
import { PRINTABLE_ASSET_TYPES, isPrintableAssetTypeId } from './assetTypes';
import {
    DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID,
    isPrintableTemplateFamilyId,
    isPrintableTemplateFamilyVisibleForBusiness,
    isPrintableThemeFamilyId,
    normalizePrintableTemplateFamilyId,
} from './templateFamilies';
import { resolvePrintableBusinessThemeRecommendation } from './businessThemeRecommendations';
import type { PrintableAssetTypeId, PrintableTemplateFamilyId } from './types';

/** @deprecated Read-only compatibility shape for preferences saved before parent themes. */
export type PrintableAssetStylePreferenceMap = Partial<Record<PrintableAssetTypeId, PrintableTemplateFamilyId>>;

export type PrintableAssetStylePreferences = {
    businessThemeId?: PrintableTemplateFamilyId;
    projectThemeOverrides?: Record<string, PrintableTemplateFamilyId>;
    /** @deprecated Normalized into businessThemeId and never returned to callers. */
    businessDefaults?: PrintableAssetStylePreferenceMap;
    /** @deprecated Normalized into projectThemeOverrides and never returned to callers. */
    projectOverrides?: Record<string, PrintableAssetStylePreferenceMap>;
};

export type ResolvedPrintableAssetStyle = {
    source: 'business-theme' | 'project-theme' | 'recommended';
    templateFamilyId: PrintableTemplateFamilyId;
};

const MAX_PROJECT_PREFERENCE_GROUPS = 100;
const PROJECT_PREFERENCE_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function ownDataEntries(value: Record<string, unknown>): Array<[string, unknown]> {
    return Object.entries(Object.getOwnPropertyDescriptors(value)).flatMap(([key, descriptor]) => (
        Object.prototype.hasOwnProperty.call(descriptor, 'value') ? [[key, descriptor.value]] : []
    ));
}

function readOwnDataField(value: Record<string, unknown>, key: string): unknown {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return descriptor && Object.prototype.hasOwnProperty.call(descriptor, 'value')
        ? descriptor.value
        : undefined;
}

function normalizeProjectPreferenceId(value: string): string | null {
    const normalized = value.trim();
    if (
        !normalized
        || normalized !== value
        || !PROJECT_PREFERENCE_ID_PATTERN.test(normalized)
        || normalized === '__proto__'
        || normalized === 'constructor'
        || normalized === 'prototype'
    ) return null;
    return normalized;
}

function normalizeKnownTheme(value: unknown): PrintableTemplateFamilyId | undefined {
    return typeof value === 'string' && isPrintableTemplateFamilyId(value)
        ? normalizePrintableTemplateFamilyId(value)
        : undefined;
}

function isPreferenceTarget(assetTypeId: string): assetTypeId is PrintableAssetTypeId {
    return assetTypeId !== 'complete_menu_kit' && isPrintableAssetTypeId(assetTypeId);
}

function isThemeAvailableForBusiness(params: {
    businessCategory?: string | null;
    businessType?: string | null;
    templateFamilyId?: PrintableTemplateFamilyId;
}): boolean {
    return Boolean(
        params.templateFamilyId
        && isPrintableThemeFamilyId(params.templateFamilyId)
        && isPrintableTemplateFamilyVisibleForBusiness({
            businessCategory: params.businessCategory,
            businessType: params.businessType,
            templateFamilyId: params.templateFamilyId,
        }),
    );
}

export function normalizePrintableAssetStylePreferenceMap(value: unknown): PrintableAssetStylePreferenceMap {
    if (!isPlainRecord(value)) return {};
    return Object.fromEntries(ownDataEntries(value).flatMap(([assetTypeId, templateFamilyId]) => {
        const normalizedTheme = normalizeKnownTheme(templateFamilyId);
        return isPreferenceTarget(assetTypeId) && normalizedTheme
            ? [[assetTypeId, normalizedTheme]]
            : [];
    })) as PrintableAssetStylePreferenceMap;
}

function readMigratedThemeFromAssetMap(value: unknown): PrintableTemplateFamilyId | undefined {
    const map = normalizePrintableAssetStylePreferenceMap(value);
    for (const asset of PRINTABLE_ASSET_TYPES) {
        if (asset.id === 'complete_menu_kit') continue;
        const themeId = map[asset.id];
        if (themeId) return themeId;
    }
    return undefined;
}

/**
 * Folds old per-asset defaults into one deterministic parent theme. Legacy
 * maps are never returned, so every later resolution is uniform.
 */
export function normalizePrintableAssetStylePreferences(value: unknown): PrintableAssetStylePreferences {
    if (!isPlainRecord(value)) return {};

    const businessThemeId = normalizeKnownTheme(readOwnDataField(value, 'businessThemeId'))
        || readMigratedThemeFromAssetMap(readOwnDataField(value, 'businessDefaults'));
    const projectThemes = new Map<string, PrintableTemplateFamilyId>();
    const explicitProjectThemes = readOwnDataField(value, 'projectThemeOverrides');
    const rawProjectThemes = isPlainRecord(explicitProjectThemes) ? explicitProjectThemes : {};

    for (const [projectId, templateFamilyId] of ownDataEntries(rawProjectThemes)) {
        const normalizedProjectId = normalizeProjectPreferenceId(projectId);
        const normalizedTheme = normalizeKnownTheme(templateFamilyId);
        if (normalizedProjectId && normalizedTheme && projectThemes.size < MAX_PROJECT_PREFERENCE_GROUPS) {
            projectThemes.set(normalizedProjectId, normalizedTheme);
        }
    }

    const legacyProjectOverrides = readOwnDataField(value, 'projectOverrides');
    const rawProjectOverrides = isPlainRecord(legacyProjectOverrides) ? legacyProjectOverrides : {};
    for (const [projectId, preferenceMap] of ownDataEntries(rawProjectOverrides)) {
        const normalizedProjectId = normalizeProjectPreferenceId(projectId);
        if (!normalizedProjectId || projectThemes.has(normalizedProjectId)) continue;
        const normalizedTheme = readMigratedThemeFromAssetMap(preferenceMap);
        if (normalizedTheme && projectThemes.size < MAX_PROJECT_PREFERENCE_GROUPS) {
            projectThemes.set(normalizedProjectId, normalizedTheme);
        }
    }

    const projectThemeOverrides = Object.fromEntries(projectThemes);
    return {
        ...(businessThemeId ? { businessThemeId } : {}),
        ...(Object.keys(projectThemeOverrides).length ? { projectThemeOverrides } : {}),
    };
}

export function resolvePrintableAssetStyle(params: {
    assetTypeId: PrintableAssetTypeId;
    businessCategory?: string | null;
    businessType?: string | null;
    preferences?: unknown;
    projectId?: string | null;
}): ResolvedPrintableAssetStyle {
    void params.assetTypeId;
    const preferences = normalizePrintableAssetStylePreferences(params.preferences);
    const normalizedProjectId = typeof params.projectId === 'string'
        ? normalizeProjectPreferenceId(params.projectId)
        : null;
    const projectTheme = normalizedProjectId
        ? preferences.projectThemeOverrides?.[normalizedProjectId]
        : undefined;
    if (projectTheme && isThemeAvailableForBusiness({
        businessCategory: params.businessCategory,
        businessType: params.businessType,
        templateFamilyId: projectTheme,
    })) {
        return { source: 'project-theme', templateFamilyId: projectTheme };
    }
    const businessTheme = preferences.businessThemeId;
    if (businessTheme && isThemeAvailableForBusiness({
        businessCategory: params.businessCategory,
        businessType: params.businessType,
        templateFamilyId: businessTheme,
    })) {
        return { source: 'business-theme', templateFamilyId: businessTheme };
    }
    const recommendation = resolvePrintableBusinessThemeRecommendation({
        businessCategory: params.businessCategory,
        businessType: params.businessType,
    });
    return {
        source: 'recommended',
        templateFamilyId: recommendation.primaryThemeId || DEFAULT_PRINTABLE_TEMPLATE_FAMILY_ID,
    };
}

export function buildMenuKitAssetStyleMap(params: {
    businessCategory?: string | null;
    businessType?: string | null;
    preferences?: unknown;
    projectId?: string | null;
}): Partial<Record<MenuKitAssetKey, PrintableTemplateFamilyId>> {
    const themeId = resolvePrintableAssetStyle({
        assetTypeId: 'table_tent',
        businessCategory: params.businessCategory,
        businessType: params.businessType,
        preferences: params.preferences,
        projectId: params.projectId,
    }).templateFamilyId;
    return Object.fromEntries(MENU_KIT_ASSET_KEYS.map((assetKey) => [assetKey, themeId]));
}

export function normalizeMenuKitAssetStyleMap(value: unknown): Partial<Record<MenuKitAssetKey, PrintableTemplateFamilyId>> {
    if (!isPlainRecord(value)) return {};
    let migratedThemeId: PrintableTemplateFamilyId | undefined;
    for (const assetKey of MENU_KIT_ASSET_KEYS) {
        migratedThemeId = normalizeKnownTheme(readOwnDataField(value, assetKey));
        if (migratedThemeId) break;
    }
    return migratedThemeId
        ? Object.fromEntries(MENU_KIT_ASSET_KEYS.map((assetKey) => [assetKey, migratedThemeId]))
        : {};
}

export function buildPrintableThemePreferencePatch(params: {
    businessCategory?: string | null;
    businessType?: string | null;
    projectId?: string | null;
    scope: 'business' | 'project';
    templateFamilyId: PrintableTemplateFamilyId;
}): PrintableAssetStylePreferences {
    const normalizedThemeId = normalizeKnownTheme(params.templateFamilyId);
    if (!normalizedThemeId || !isPrintableThemeFamilyId(normalizedThemeId)) {
        throw new Error('printable_asset_theme_preference_invalid');
    }
    if (!isPrintableTemplateFamilyVisibleForBusiness({
        businessCategory: params.businessCategory,
        businessType: params.businessType,
        templateFamilyId: normalizedThemeId,
    })) {
        throw new Error('printable_asset_theme_not_available_for_business');
    }
    if (params.scope === 'business') return { businessThemeId: normalizedThemeId };
    const normalizedProjectId = typeof params.projectId === 'string'
        ? normalizeProjectPreferenceId(params.projectId)
        : null;
    if (!normalizedProjectId) throw new Error('printable_asset_style_project_invalid');
    return { projectThemeOverrides: { [normalizedProjectId]: normalizedThemeId } };
}

export function applyPrintableThemePreference(params: {
    businessCategory?: string | null;
    businessType?: string | null;
    current?: unknown;
    projectId?: string | null;
    scope: 'business' | 'project';
    templateFamilyId: PrintableTemplateFamilyId;
}): PrintableAssetStylePreferences {
    const current = normalizePrintableAssetStylePreferences(params.current);
    const normalizedProjectId = params.scope === 'project' && typeof params.projectId === 'string'
        ? normalizeProjectPreferenceId(params.projectId)
        : null;
    if (
        params.scope === 'project'
        && normalizedProjectId
        && !current.projectThemeOverrides?.[normalizedProjectId]
        && Object.keys(current.projectThemeOverrides || {}).length >= MAX_PROJECT_PREFERENCE_GROUPS
    ) throw new Error('printable_asset_style_project_limit_reached');

    const patch = buildPrintableThemePreferencePatch(params);
    return normalizePrintableAssetStylePreferences({
        ...current,
        ...patch,
        projectThemeOverrides: {
            ...(current.projectThemeOverrides || {}),
            ...(patch.projectThemeOverrides || {}),
        },
    });
}

export function removePrintableProjectThemeOverride(params: {
    current?: unknown;
    projectId: string;
}): PrintableAssetStylePreferences {
    const current = normalizePrintableAssetStylePreferences(params.current);
    const normalizedProjectId = normalizeProjectPreferenceId(params.projectId);
    if (!normalizedProjectId) throw new Error('printable_asset_style_project_invalid');
    const projectThemeOverrides = { ...(current.projectThemeOverrides || {}) };
    delete projectThemeOverrides[normalizedProjectId];
    return normalizePrintableAssetStylePreferences({ ...current, projectThemeOverrides });
}

/** @deprecated Per-asset saves now set the parent theme for compatibility. */
export function buildPrintableAssetStylePreferencePatch(params: {
    assetTypeId: PrintableAssetTypeId;
    businessCategory?: string | null;
    businessType?: string | null;
    projectId?: string | null;
    scope: 'business' | 'project';
    templateFamilyId: PrintableTemplateFamilyId;
}): PrintableAssetStylePreferences {
    if (!isPreferenceTarget(params.assetTypeId)) throw new Error('printable_asset_style_preference_invalid');
    return buildPrintableThemePreferencePatch(params);
}

/** @deprecated Per-asset saves now set the parent theme for compatibility. */
export function applyPrintableAssetStylePreference(params: {
    assetTypeId: PrintableAssetTypeId;
    businessCategory?: string | null;
    businessType?: string | null;
    current?: unknown;
    projectId?: string | null;
    scope: 'business' | 'project';
    templateFamilyId: PrintableTemplateFamilyId;
}): PrintableAssetStylePreferences {
    if (!isPreferenceTarget(params.assetTypeId)) throw new Error('printable_asset_style_preference_invalid');
    return applyPrintableThemePreference(params);
}

/** @deprecated Clearing an old asset exception restores the parent project theme. */
export function removePrintableAssetProjectStyleOverride(params: {
    assetTypeId: PrintableAssetTypeId;
    current?: unknown;
    projectId: string;
}): PrintableAssetStylePreferences {
    if (!isPreferenceTarget(params.assetTypeId)) throw new Error('printable_asset_style_project_invalid');
    return removePrintableProjectThemeOverride(params);
}
