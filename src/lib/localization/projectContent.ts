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

const readOwnContentField = (value: unknown, key: string): unknown => {
    if (!value || typeof value !== 'object') return undefined;
    try {
        if (Array.isArray(value)) return undefined;
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    } catch {
        return undefined;
    }
};

export function getProjectManagedLanguages(projectDetails?: unknown, storeDetails?: unknown): string[] {
    const projectLanguages = readOwnContentField(projectDetails, 'languages');
    const projectDefaultLanguage = readOwnContentField(projectDetails, 'defaultLanguage');
    const projectName = readOwnContentField(projectDetails, 'name');
    const projectDescription = readOwnContentField(projectDetails, 'description');
    const storeDefaultLanguage = readOwnContentField(storeDetails, 'defaultLanguage');
    return normalizeProjectLanguages([
        ...(Array.isArray(projectLanguages) ? projectLanguages : []),
        projectDefaultLanguage,
        getPrimaryLocalizedLanguage(projectName, ''),
        getPrimaryLocalizedLanguage(projectDescription, ''),
        storeDefaultLanguage,
    ]);
}

export function getProjectPreferredLanguage(projectDetails?: unknown, storeDetails?: unknown): string {
    const managedLanguages = getProjectManagedLanguages(projectDetails, storeDetails);
    const preferredLanguage = readOwnContentField(projectDetails, 'defaultLanguage')
        || readOwnContentField(storeDetails, 'defaultLanguage');
    return getPreferredDefaultLanguage(
        typeof preferredLanguage === 'string' ? preferredLanguage : undefined,
        managedLanguages,
    );
}

export function getProjectDefaultLanguage(projectDetails?: unknown, storeDetails?: unknown): string {
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
    value: unknown,
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
    readValue: (projectDetails?: unknown) => unknown;
}> = [
    {
        key: 'name',
        readValue: (projectDetails) => readOwnContentField(projectDetails, 'name'),
    },
    {
        key: 'description',
        readValue: (projectDetails) => readOwnContentField(projectDetails, 'description'),
    },
    {
        key: 'specialMenuDisplayName',
        readValue: (projectDetails) => (
            readOwnContentField(readOwnContentField(projectDetails, '_specialMenu'), 'displayName')
            || readOwnContentField(projectDetails, 'specialMenuDisplayName')
        ),
    },
    {
        key: 'specialNote',
        readValue: (projectDetails) => (
            readOwnContentField(readOwnContentField(projectDetails, 'menuSettings'), 'specialNote')
        ),
    },
];

const getExactLocalizedProjectValue = (value: unknown, languageCode: string): string => {
    if (typeof value === 'string') {
        return languageCode === CANONICAL_SOURCE_LANGUAGE ? value.trim() : '';
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return '';
    }

    const exactValue = readOwnContentField(value, languageCode);
    if (typeof exactValue === 'string' && exactValue.trim()) {
        return exactValue.trim();
    }

    const baseLanguage = languageCode.split('-')[0];
    if (baseLanguage && baseLanguage !== languageCode) {
        const baseValue = readOwnContentField(value, baseLanguage);
        return typeof baseValue === 'string' ? baseValue.trim() : '';
    }

    return '';
};

export function getMissingProjectPublicContentGaps(
    projectDetails?: unknown,
    languages?: string[],
): ProjectPublicContentGap[] {
    const requestedLanguages = languages?.length
        ? languages
        : readOwnContentField(projectDetails, 'languages');
    const targetLanguages = normalizeProjectLanguages(
        Array.isArray(requestedLanguages)
            ? requestedLanguages.filter((value): value is string => typeof value === 'string')
            : [],
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
    const exactValue = readOwnContentField(draftsByLanguage, languageCode);
    if (typeof exactValue === 'string' && exactValue.trim().length > 0) return true;

    const baseLanguage = languageCode.split('-')[0];
    if (baseLanguage && baseLanguage !== languageCode) {
        const baseValue = readOwnContentField(draftsByLanguage, baseLanguage);
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
