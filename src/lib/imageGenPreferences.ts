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
import { getTenantStoreStorageKey } from '@lib/browserStorage/tenantStoreKey';

const STORAGE_KEY_PREFIX = 'imgGenPrefs';
const MAX_PREFERENCE_ARRAY_LENGTH = 20;
const MAX_PREFERENCE_VALUE_LENGTH = 100;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '4:3', '3:4']);

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
    subjectProfileId?: string | null;
    subjectProfileVersion?: number | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
);

const isOptionalBoundedString = (
    value: unknown,
    maxLength: number,
): value is string | undefined => (
    value === undefined
    || (typeof value === 'string' && value.length <= maxLength)
);

const isOptionalBoundedNullableString = (
    value: unknown,
    maxLength: number,
): value is string | null | undefined => (
    value === undefined
    || value === null
    || (typeof value === 'string' && value.length <= maxLength)
);

const isOptionalBoolean = (value: unknown): value is boolean | undefined => (
    value === undefined || typeof value === 'boolean'
);

const isOptionalPositiveIntegerOrNull = (value: unknown): value is number | null | undefined => (
    value === undefined || value === null || (Number.isSafeInteger(value) && Number(value) > 0)
);

const isOptionalAspectRatio = (value: unknown): value is string | undefined => (
    value === undefined
    || (typeof value === 'string' && IMAGE_ASPECT_RATIOS.has(value))
);

const isOptionalStringArray = (value: unknown): value is string[] | undefined => (
    value === undefined
    || (
        Array.isArray(value)
        && value.length <= MAX_PREFERENCE_ARRAY_LENGTH
        && value.every((entry) => (
            typeof entry === 'string'
            && entry.length > 0
            && entry.length <= MAX_PREFERENCE_VALUE_LENGTH
        ))
    )
);

const isCanonicalPastIsoTimestamp = (value: unknown): value is string | undefined => {
    if (value === undefined) return true;
    if (typeof value !== 'string' || value.length > 40) return false;
    const millis = Date.parse(value);
    return Number.isFinite(millis)
        && millis <= Date.now()
        && new Date(millis).toISOString() === value;
};

export function parseImageGenPreferences(value: unknown): ImageGenPreferences | null {
    if (
        !isRecord(value)
        || typeof value.stylesCategory !== 'string'
        || value.stylesCategory.trim().length === 0
        || value.stylesCategory.length > MAX_PREFERENCE_VALUE_LENGTH
    ) {
        return null;
    }
    const subjectProfileId = typeof value.subjectProfileId === 'string' && value.subjectProfileId.length > 0
        ? value.subjectProfileId
        : null;
    const subjectProfileVersion = typeof value.subjectProfileVersion === 'number'
        ? value.subjectProfileVersion
        : null;
    if (
        Boolean(subjectProfileId) !== Boolean(subjectProfileVersion)
        || (subjectProfileId && !UUID_PATTERN.test(subjectProfileId))
    ) return null;

    if (
        !isOptionalAspectRatio(value.aspectRatio)
        || !isOptionalBoundedString(value.negativePrompt, 2_000)
        || !isCanonicalPastIsoTimestamp(value.savedAt)
        || !isOptionalBoundedNullableString(value.backgroundColor, 50)
        || !isOptionalBoundedNullableString(value.foregroundColor, 50)
        || !isOptionalBoolean(value.transparentBg)
        || !isOptionalBoolean(value.isMultiMode)
        || !isOptionalBoundedNullableString(value.subjectProfileId, 160)
        || !isOptionalPositiveIntegerOrNull(value.subjectProfileVersion)
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
        subjectProfileId,
        subjectProfileVersion,
    };
}

export function getImageGenPreferencesStorageKey(
    tId: string | number,
    sId: string | number,
): string | null {
    const scopedKey = getTenantStoreStorageKey(STORAGE_KEY_PREFIX, tId, sId);
    if (!scopedKey) return null;
    const [prefix, tenantId, storeId] = scopedKey.split(':');
    return `${prefix}_${tenantId}_${storeId}`;
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
        storageKey = getImageGenPreferencesStorageKey(tId, sId) || '';
        if (!storageKey) return;
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
            subjectProfileId: prefs.subjectProfileId ?? null,
            subjectProfileVersion: prefs.subjectProfileVersion ?? null,
        };
        const projected = parseImageGenPreferences(data);
        if (!projected) return;
        phase = 'serialize';
        serializedPreferences = JSON.stringify(projected);
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
        storageKey = getImageGenPreferencesStorageKey(tId, sId) || '';
        if (!storageKey) return null;
        rawPreferences = localStorage.getItem(storageKey);
        if (!rawPreferences) return null;
        const projected = parseImageGenPreferences(JSON.parse(rawPreferences));
        if (!projected) {
            localStorage.removeItem(storageKey);
            return null;
        }
        return projected;
    } catch (error) {
        logHookFailure('image_generation_preferences_load_failed', error, {
            ...getPreferenceScopeLogContext(tId, sId, storageKey),
            ...getBoundedHookStringContext('storedPreferences', rawPreferences),
        });
        if (storageKey) {
            try {
                localStorage.removeItem(storageKey);
            } catch {
                // Browser storage can remain unavailable; defaults still fail safely.
            }
        }
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
        storageKey = getImageGenPreferencesStorageKey(tId, sId) || '';
        if (!storageKey) return;
        localStorage.removeItem(storageKey);
    } catch (error) {
        logHookFailure('image_generation_preferences_clear_failed', error, {
            ...getPreferenceScopeLogContext(tId, sId, storageKey),
        });
    }
}
