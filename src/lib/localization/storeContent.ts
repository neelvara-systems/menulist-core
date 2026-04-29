import { CANONICAL_SOURCE_LANGUAGE, normalizeStoreLanguagePolicy } from './languagePolicy';
import {
    getLocalizedDraftStringList,
    getLocalizedDraftText,
    getLocalizedStringList,
    getLocalizedText,
    getPrimaryLocalizedLanguage,
    updateLocalizedStringList,
    updateLocalizedText,
} from './text';
import GlobalLanguagesList from '@data/languages';

export function getStoreManagedLanguages(storeDetails?: any): string[] {
    return normalizeStoreLanguagePolicy(storeDetails).activeLanguages;
}

export function getStorePreferredLanguage(storeDetails?: any): string {
    return getStoreRenderLanguage(storeDetails);
}

export function getStoreSourceLanguage(): string {
    return CANONICAL_SOURCE_LANGUAGE;
}

export function getStoreRenderLanguage(storeDetails?: any): string {
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const defaultLanguage = String(storeDetails?.defaultLanguage || '').trim().toLowerCase();

    return managedLanguages.includes(defaultLanguage)
        ? defaultLanguage
        : getStorePreferredLanguage(storeDetails);
}

export function getStoreLanguageLabel(languageCode: string): string {
    const language = GlobalLanguagesList.find((entry) => entry.code === languageCode);
    if (!language) return languageCode.toUpperCase();
    return language.nativeName !== language.name
        ? `${language.nativeName} (${language.name})`
        : language.name;
}

export function getLocalizedStoreValue(
    value: any,
    languageCode: string,
    fallback = '',
): string {
    return getLocalizedDraftText(value, languageCode, fallback);
}

export function getLocalizedStoreKeywords(
    value: any,
    languageCode: string,
    fallback: string[] = [],
): string[] {
    return getLocalizedDraftStringList(value, languageCode, fallback);
}

export function getResolvedStoreKeywords(
    value: any,
    languageCode: string,
    fallback: string[] = [],
): string[] {
    return getLocalizedStringList(value, languageCode, getPrimaryLocalizedLanguage(value, CANONICAL_SOURCE_LANGUAGE), fallback);
}

export function applyLocalizedDraftMap(
    existingValue: any,
    draftsByLanguage: Record<string, string>,
): any {
    return Object.entries(draftsByLanguage).reduce(
        (nextValue, [languageCode, draftValue]) => (
            updateLocalizedText(nextValue, draftValue, languageCode, CANONICAL_SOURCE_LANGUAGE)
        ),
        existingValue,
    );
}

export function applyLocalizedKeywordDraftMap(
    existingValue: any,
    draftsByLanguage: Record<string, string[]>,
): any {
    return Object.entries(draftsByLanguage).reduce(
        (nextValue, [languageCode, draftValue]) => (
            updateLocalizedStringList(nextValue, draftValue, languageCode, CANONICAL_SOURCE_LANGUAGE)
        ),
        existingValue,
    );
}
