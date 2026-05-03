import GlobalLanguagesList from '@data/languages';
import {
    CANONICAL_SOURCE_LANGUAGE,
    getPreferredDefaultLanguage,
    normalizeProjectLanguages,
} from './languagePolicy';
import { getLocalizedDraftText, getLocalizedText, getPrimaryLocalizedLanguage, toLocalizedText, updateLocalizedText } from './text';

export function getProjectManagedLanguages(projectDetails?: any, storeDetails?: any): string[] {
    return normalizeProjectLanguages([
        ...(Array.isArray(projectDetails?.languages) ? projectDetails.languages : []),
        projectDetails?.defaultLanguage,
        getPrimaryLocalizedLanguage(projectDetails?.name, ''),
        getPrimaryLocalizedLanguage(projectDetails?.description, ''),
        storeDetails?.defaultLanguage,
    ]);
}

export function getProjectPreferredLanguage(projectDetails?: any, storeDetails?: any): string {
    const managedLanguages = getProjectManagedLanguages(projectDetails, storeDetails);
    return getPreferredDefaultLanguage(
        projectDetails?.defaultLanguage || storeDetails?.defaultLanguage,
        managedLanguages,
    );
}

export function getProjectDefaultLanguage(projectDetails?: any, storeDetails?: any): string {
    return getProjectPreferredLanguage(projectDetails, storeDetails);
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
    return getLocalizedDraftText(value, languageCode, fallback);
}

export function applyLocalizedProjectDraftMap(
    existingValue: any,
    draftsByLanguage: Record<string, string>,
): any {
    const nextValue = Object.entries(draftsByLanguage).reduce(
        (nextValue, [languageCode, draftValue]) => (
            updateLocalizedText(nextValue, draftValue, languageCode, CANONICAL_SOURCE_LANGUAGE)
        ),
        existingValue,
    );

    return toLocalizedText(nextValue, CANONICAL_SOURCE_LANGUAGE);
}
