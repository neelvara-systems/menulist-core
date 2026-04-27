import { getLocalizedText, getPrimaryLocalizedLanguage, updateLocalizedText } from './text';
import GlobalLanguagesList from '@data/languages';

export function getStoreManagedLanguages(storeDetails?: any): string[] {
    const candidates = [
        storeDetails?.defaultLanguage,
        ...(Array.isArray(storeDetails?.activeLanguages) ? storeDetails.activeLanguages : []),
        storeDetails?.language,
        'en',
    ]
        .map((language) => String(language || '').trim())
        .filter(Boolean);

    return Array.from(new Set(candidates));
}

export function getStorePreferredLanguage(storeDetails?: any): string {
    return getStoreManagedLanguages(storeDetails)[0] || 'en';
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
    return getLocalizedText(
        value,
        languageCode,
        getPrimaryLocalizedLanguage(value, languageCode),
        fallback,
    );
}

export function applyLocalizedDraftMap(
    existingValue: any,
    draftsByLanguage: Record<string, string>,
): any {
    return Object.entries(draftsByLanguage).reduce(
        (nextValue, [languageCode, draftValue]) => (
            updateLocalizedText(nextValue, draftValue, languageCode, 'en')
        ),
        existingValue,
    );
}
