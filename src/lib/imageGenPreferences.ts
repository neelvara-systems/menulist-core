/**
 * Image Generation Preferences — localStorage persistence
 * 
 * Saves the user's preferred image generation settings (style, lighting,
 * environment, etc.) per store so they don't have to re-select every time.
 * 
 * Storage key: `imgGenPrefs_{tId}_{sId}`
 * 
 * Zero Firestore cost. Per-device. Graceful fallback to defaults.
 */

import { getBoundedHookStringContext, logHookFailure } from '@hook/hookDiagnostics';

const STORAGE_KEY_PREFIX = 'imgGenPrefs';

export interface ImageGenPreferences {
    stylesCategory?: string;
    styles?: string[];
    aspectRatio?: string;
    environments?: string[];
    lighting?: string[];
    colors?: string[];
    moods?: string[];
    compositions?: string[];
    backgroundColor?: string | null;
    negativePrompt?: string;
    transparentBg?: boolean;
    foregroundColor?: string | null;
    isMultiMode?: boolean;
    savedAt?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
);

const isOptionalString = (value: unknown): value is string | undefined => (
    value === undefined || typeof value === 'string'
);

const isOptionalNullableString = (value: unknown): value is string | null | undefined => (
    value === undefined || value === null || typeof value === 'string'
);

const isOptionalBoolean = (value: unknown): value is boolean | undefined => (
    value === undefined || typeof value === 'boolean'
);

const isOptionalStringArray = (value: unknown): value is string[] | undefined => (
    value === undefined
    || (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))
);

export function parseImageGenPreferences(value: unknown): ImageGenPreferences | null {
    if (!isRecord(value) || typeof value.stylesCategory !== 'string' || value.stylesCategory.trim().length === 0) {
        return null;
    }

    if (
        !isOptionalString(value.aspectRatio)
        || !isOptionalString(value.negativePrompt)
        || !isOptionalString(value.savedAt)
        || !isOptionalNullableString(value.backgroundColor)
        || !isOptionalNullableString(value.foregroundColor)
        || !isOptionalBoolean(value.transparentBg)
        || !isOptionalBoolean(value.isMultiMode)
        || !isOptionalStringArray(value.styles)
        || !isOptionalStringArray(value.environments)
        || !isOptionalStringArray(value.lighting)
        || !isOptionalStringArray(value.colors)
        || !isOptionalStringArray(value.moods)
        || !isOptionalStringArray(value.compositions)
    ) {
        return null;
    }

    return {
        stylesCategory: value.stylesCategory,
        styles: value.styles,
        aspectRatio: value.aspectRatio,
        environments: value.environments,
        lighting: value.lighting,
        colors: value.colors,
        moods: value.moods,
        compositions: value.compositions,
        backgroundColor: value.backgroundColor,
        negativePrompt: value.negativePrompt,
        transparentBg: value.transparentBg,
        foregroundColor: value.foregroundColor,
        isMultiMode: value.isMultiMode,
        savedAt: value.savedAt,
    };
}

function getStorageKey(tId: string | number, sId: string | number): string {
    return `${STORAGE_KEY_PREFIX}_${tId}_${sId}`;
}

const getPreferenceScopeLogContext = (
    tId: string | number,
    sId: string | number,
    storageKey: string,
) => ({
    ...getBoundedHookStringContext('tenantId', tId),
    ...getBoundedHookStringContext('storeId', sId),
    ...getBoundedHookStringContext('storageKey', storageKey),
});

const getPreferenceShapeLogContext = (prefs?: ImageGenPreferences | null) => ({
    styleCount: Array.isArray(prefs?.styles) ? prefs.styles.length : 0,
    environmentCount: Array.isArray(prefs?.environments) ? prefs.environments.length : 0,
    lightingCount: Array.isArray(prefs?.lighting) ? prefs.lighting.length : 0,
    colorCount: Array.isArray(prefs?.colors) ? prefs.colors.length : 0,
    moodCount: Array.isArray(prefs?.moods) ? prefs.moods.length : 0,
    compositionCount: Array.isArray(prefs?.compositions) ? prefs.compositions.length : 0,
    hasNegativePrompt: Boolean(prefs?.negativePrompt),
    negativePromptLength: typeof prefs?.negativePrompt === 'string' ? prefs.negativePrompt.length : 0,
});

/**
 * Save image generation preferences for the current store.
 * Only persists style/visual preferences — not prompts, images, or transient state.
 */
export function saveImageGenPreferences(
    tId: string | number,
    sId: string | number,
    prefs: ImageGenPreferences
): void {
    let storageKey = '';
    let serializedPreferences = '';
    let phase: 'build' | 'serialize' | 'write' = 'build';

    try {
        if (typeof window === 'undefined') return;
        storageKey = getStorageKey(tId, sId);
        const data: ImageGenPreferences = {
            stylesCategory: prefs.stylesCategory,
            styles: prefs.styles,
            aspectRatio: prefs.aspectRatio,
            environments: prefs.environments,
            lighting: prefs.lighting,
            colors: prefs.colors,
            moods: prefs.moods,
            compositions: prefs.compositions,
            backgroundColor: prefs.backgroundColor ?? null,
            negativePrompt: prefs.negativePrompt || '',
            transparentBg: prefs.transparentBg || false,
            foregroundColor: prefs.foregroundColor ?? null,
            isMultiMode: prefs.isMultiMode,
            savedAt: new Date().toISOString(),
        };
        phase = 'serialize';
        serializedPreferences = JSON.stringify(data);
        phase = 'write';
        localStorage.setItem(storageKey, serializedPreferences);
    } catch (error) {
        logHookFailure('image_generation_preferences_save_failed', error, {
            phase,
            ...getPreferenceScopeLogContext(tId, sId, storageKey),
            ...getPreferenceShapeLogContext(prefs),
            ...getBoundedHookStringContext('serializedPreferences', serializedPreferences),
        });
    }
}

/**
 * Load saved image generation preferences for the current store.
 * Returns null if no preferences saved or localStorage unavailable.
 */
export function loadImageGenPreferences(
    tId: string | number,
    sId: string | number
): ImageGenPreferences | null {
    let storageKey = '';
    let rawPreferences: string | null = null;

    try {
        if (typeof window === 'undefined') return null;
        storageKey = getStorageKey(tId, sId);
        rawPreferences = localStorage.getItem(storageKey);
        if (!rawPreferences) return null;
        return parseImageGenPreferences(JSON.parse(rawPreferences));
    } catch (error) {
        logHookFailure('image_generation_preferences_load_failed', error, {
            ...getPreferenceScopeLogContext(tId, sId, storageKey),
            ...getBoundedHookStringContext('storedPreferences', rawPreferences),
        });
        return null;
    }
}

/**
 * Clear saved preferences for a store (e.g., on style reset).
 */
export function clearImageGenPreferences(
    tId: string | number,
    sId: string | number
): void {
    let storageKey = '';

    try {
        if (typeof window === 'undefined') return;
        storageKey = getStorageKey(tId, sId);
        localStorage.removeItem(storageKey);
    } catch (error) {
        logHookFailure('image_generation_preferences_clear_failed', error, {
            ...getPreferenceScopeLogContext(tId, sId, storageKey),
        });
    }
}
