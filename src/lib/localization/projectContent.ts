import GlobalLanguagesList from '@data/languages';
import { getLocalizedText, getPrimaryLocalizedLanguage, updateLocalizedText } from './text';

export function getProjectManagedLanguages(projectDetails?: any, storeDetails?: any): string[] {
    const candidates = [
        ...(Array.isArray(projectDetails?.languages) ? projectDetails.languages : []),
        getPrimaryLocalizedLanguage(projectDetails?.name, ''),
        getPrimaryLocalizedLanguage(projectDetails?.description, ''),
        storeDetails?.defaultLanguage,
        'en',
    ]
        .map((language) => String(language || '').trim())
        .filter(Boolean);

    return Array.from(new Set(candidates));
}

export function getProjectPreferredLanguage(projectDetails?: any, storeDetails?: any): string {
    return getProjectManagedLanguages(projectDetails, storeDetails)[0] || 'en';
}

export function getProjectLanguageLabel(languageCode: string): string {
    const language = GlobalLanguagesList.find((entry) => entry.code === languageCode);
    if (!language) return languageCode.toUpperCase();
    return language.nativeName && language.nativeName !== language.name
        ? `${language.nativeName} (${language.name})`
        : language.name;
}

export function getLocalizedProjectValue(
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

export function applyLocalizedProjectDraftMap(
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
