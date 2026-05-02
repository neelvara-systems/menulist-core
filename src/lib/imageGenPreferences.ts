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

function getStorageKey(tId: string | number, sId: string | number): string {
    return `${STORAGE_KEY_PREFIX}_${tId}_${sId}`;
}

/**
 * Save image generation preferences for the current store.
 * Only persists style/visual preferences — not prompts, images, or transient state.
 */
export function saveImageGenPreferences(
    tId: string | number,
    sId: string | number,
    prefs: ImageGenPreferences
): void {
    try {
        if (typeof window === 'undefined') return;
        const key = getStorageKey(tId, sId);
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
        localStorage.setItem(key, JSON.stringify(data));
    } catch {
        // localStorage full or unavailable — silently ignore
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
    try {
        if (typeof window === 'undefined') return null;
        const key = getStorageKey(tId, sId);
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const data = JSON.parse(raw) as ImageGenPreferences;
        // Basic validation — must have at least stylesCategory
        if (!data.stylesCategory) return null;
        return data;
    } catch {
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
    try {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(getStorageKey(tId, sId));
    } catch {
        // silently ignore
    }
}
