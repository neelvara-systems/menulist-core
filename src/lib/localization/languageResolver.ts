/**
 * Language Resolver for Multi-Chain Language Governance
 * 
 * Resolves which language to use for menu rendering based on:
 * 1. URL ?lang=xx parameter (highest priority)
 * 2. store.defaultLanguage
 * 3. Fallback: 'en'
 *
 * Note:
 * - This helper is for render-language resolution only.
 * - English remains the canonical source language for AI and translation flows.
 * 
 * @see __docs__/projects/multi-language-translation/multi-language-translation_spec.md
 * @see __docs__/projects/multi-language-translation/multi-language-translation_impl.md
 */

import { LANGUAGE_CONSTANTS } from '@constant/languages';

/**
 * Resolves which language to use for menu rendering
 * 
 * Priority:
 * 1. URL ?lang=xx parameter (if valid and available)
 * 2. store.defaultLanguage (if valid and available)
 * 3. Fallback: 'en' (LANGUAGE_CONSTANTS.FALLBACK_LANGUAGE)
 * 
 * @param urlLang - Language code from URL ?lang= parameter (can be null)
 * @param storeDefaultLanguage - Default language configured for the store (can be undefined)
 * @param availableLanguages - Array of language codes available in the project
 * @returns The resolved language code to use for rendering
 * 
 * @example
 * // URL override
 * resolveRenderLanguage('fr', 'en', ['en', 'fr', 'ar']) // returns 'fr'
 * 
 * // Store default
 * resolveRenderLanguage(null, 'ar', ['en', 'fr', 'ar']) // returns 'ar'
 * 
 * // Fallback to English
 * resolveRenderLanguage(null, undefined, ['en', 'fr']) // returns 'en'
 * 
 * // Invalid URL lang falls back to store default
 * resolveRenderLanguage('de', 'fr', ['en', 'fr']) // returns 'fr' (de not available)
 */
export const resolveRenderLanguage = (
    urlLang: string | null,
    storeDefaultLanguage: string | undefined,
    availableLanguages: string[]
): string => {
    // Priority 1: URL parameter (if valid and available in project)
    if (urlLang && availableLanguages.includes(urlLang)) {
        return urlLang;
    }

    // Priority 2: Store default (if valid and available in project)
    if (storeDefaultLanguage && availableLanguages.includes(storeDefaultLanguage)) {
        return storeDefaultLanguage;
    }

    // Priority 3: Fallback to English (always safe)
    // If English not available, use first available language
    if (availableLanguages.includes(LANGUAGE_CONSTANTS.FALLBACK_LANGUAGE)) {
        return LANGUAGE_CONSTANTS.FALLBACK_LANGUAGE;
    }

    // Edge case: If even English is not available, use first available
    return availableLanguages[0] || LANGUAGE_CONSTANTS.FALLBACK_LANGUAGE;
};

/**
 * Checks if adding a new language would exceed the maximum allowed
 * 
 * @param currentLanguages - Array of currently active language codes
 * @returns true if a new language can be added, false otherwise
 */
export const canAddLanguage = (currentLanguages: string[]): boolean => {
    return (currentLanguages?.length || 0) < LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT;
};

/**
 * Gets the number of languages that can still be added
 * 
 * @param currentLanguages - Array of currently active language codes
 * @returns Number of remaining language slots
 */
export const getRemainingLanguageSlots = (currentLanguages: string[]): number => {
    return Math.max(0, LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT - (currentLanguages?.length || 0));
};

/**
 * Filters available languages for outlet stores
 * 
 * Outlets can only add languages that exist in master's activeLanguages.
 * This function filters the global language list to show only what's allowed.
 * 
 * @param globalLanguages - Full list of all supported languages
 * @param masterActiveLanguages - Languages available at master store level
 * @param currentProjectLanguages - Languages already in the current project
 * @returns Filtered list of languages the outlet can add
 */
export const getAvailableLanguagesForOutlet = <T extends { code: string }>(
    globalLanguages: T[],
    masterActiveLanguages: string[],
    currentProjectLanguages: string[]
): T[] => {
    return globalLanguages.filter(
        lang => masterActiveLanguages.includes(lang.code) &&
            !currentProjectLanguages.includes(lang.code)
    );
};

/**
 * Filters available languages for master stores
 * 
 * Master stores can add any language from global list (up to MAX_LANGUAGES).
 * This function filters out languages already in the project.
 * 
 * @param globalLanguages - Full list of all supported languages
 * @param currentProjectLanguages - Languages already in the current project
 * @returns Filtered list of languages the master can add
 */
export const getAvailableLanguagesForMaster = <T extends { code: string }>(
    globalLanguages: T[],
    currentProjectLanguages: string[]
): T[] => {
    return globalLanguages.filter(
        lang => !currentProjectLanguages.includes(lang.code)
    );
};
