import GlobalLanguagesList from '@data/languages';
import {
    CANONICAL_SOURCE_LANGUAGE,
    getPreferredDefaultLanguage,
    normalizeProjectLanguages,
} from './languagePolicy';
import { getLocalizedDraftText, getPrimaryLocalizedLanguage, toLocalizedText, updateLocalizedText } from './text';

export type ProjectPublicContentFieldKey = 'name' | 'description' | 'specialMenuDisplayName' | 'specialNote';

export type ProjectPublicContentGap = {
    fieldKey: ProjectPublicContentFieldKey;
    languageCode: string;
};

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

const PROJECT_PUBLIC_CONTENT_READERS: Array<{
    key: ProjectPublicContentFieldKey;
    readValue: (projectDetails?: any) => unknown;
}> = [
    {
        key: 'name',
        readValue: (projectDetails) => projectDetails?.name,
    },
    {
        key: 'description',
        readValue: (projectDetails) => projectDetails?.description,
    },
    {
        key: 'specialMenuDisplayName',
        readValue: (projectDetails) => projectDetails?._specialMenu?.displayName || projectDetails?.specialMenuDisplayName,
    },
    {
        key: 'specialNote',
        readValue: (projectDetails) => projectDetails?.menuSettings?.specialNote,
    },
];

const getExactLocalizedProjectValue = (value: unknown, languageCode: string): string => {
    if (typeof value === 'string') {
        return languageCode === CANONICAL_SOURCE_LANGUAGE ? value.trim() : '';
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return '';
    }

    const exactValue = (value as Record<string, unknown>)[languageCode];
    if (typeof exactValue === 'string' && exactValue.trim()) {
        return exactValue.trim();
    }

    const baseLanguage = languageCode.split('-')[0];
    if (baseLanguage && baseLanguage !== languageCode) {
        const baseValue = (value as Record<string, unknown>)[baseLanguage];
        return typeof baseValue === 'string' ? baseValue.trim() : '';
    }

    return '';
};

export function getMissingProjectPublicContentGaps(
    projectDetails?: any,
    languages?: string[],
): ProjectPublicContentGap[] {
    const targetLanguages = normalizeProjectLanguages(
        languages?.length ? languages : projectDetails?.languages,
    ).filter((languageCode) => languageCode !== CANONICAL_SOURCE_LANGUAGE);

    if (!targetLanguages.length) return [];

    return PROJECT_PUBLIC_CONTENT_READERS.flatMap((field) => {
        const currentValue = field.readValue(projectDetails);
        const sourceValue = getExactLocalizedProjectValue(currentValue, CANONICAL_SOURCE_LANGUAGE);

        if (!sourceValue) return [];

        return targetLanguages
            .filter((languageCode) => !getExactLocalizedProjectValue(currentValue, languageCode))
            .map((languageCode) => ({
                fieldKey: field.key,
                languageCode,
            }));
    });
}

const hasExactDraftValue = (
    draftsByLanguage: Record<string, string>,
    languageCode: string,
): boolean => {
    const exactValue = draftsByLanguage[languageCode];
    if (typeof exactValue === 'string' && exactValue.trim().length > 0) return true;

    const baseLanguage = languageCode.split('-')[0];
    if (baseLanguage && baseLanguage !== languageCode) {
        const baseValue = draftsByLanguage[baseLanguage];
        return typeof baseValue === 'string' && baseValue.trim().length > 0;
    }

    return false;
};

const draftFieldHasMissingTargets = (
    draftsByLanguage: Record<string, string>,
    targetLanguages: string[],
): boolean => {
    const sourceValue = getExactLocalizedProjectValue(draftsByLanguage, CANONICAL_SOURCE_LANGUAGE);

    if (!sourceValue) return false;

    return targetLanguages.some((languageCode) => (
        !hasExactDraftValue(draftsByLanguage, languageCode)
    ));
};

export function hasMissingProjectPublicDraftContent({
    descriptionDrafts,
    languages,
    nameDrafts,
}: {
    descriptionDrafts: Record<string, string>;
    languages: string[];
    nameDrafts: Record<string, string>;
}): boolean {
    const targetLanguages = normalizeProjectLanguages(languages)
        .filter((languageCode) => languageCode !== CANONICAL_SOURCE_LANGUAGE);

    if (!targetLanguages.length) return false;

    return draftFieldHasMissingTargets(nameDrafts, targetLanguages)
        || draftFieldHasMissingTargets(descriptionDrafts, targetLanguages);
}
