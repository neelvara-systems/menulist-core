import { LANGUAGE_CONSTANTS } from '@constant/languages';

export const CANONICAL_SOURCE_LANGUAGE = LANGUAGE_CONSTANTS.FALLBACK_LANGUAGE;

const normalizeLanguageCode = (value?: string | null) => String(value || '').trim().toLowerCase();

export function buildCanonicalLanguageList(
    ...languageGroups: Array<string | null | undefined | Array<string | null | undefined>>
): string[] {
    const collected = languageGroups.flatMap((group) => Array.isArray(group) ? group : [group]);
    const deduped = Array.from(new Set(collected.map(normalizeLanguageCode).filter(Boolean)));

    return [
        CANONICAL_SOURCE_LANGUAGE,
        ...deduped.filter((languageCode) => languageCode !== CANONICAL_SOURCE_LANGUAGE),
    ];
}

export function normalizeStoreLanguagePolicy(storeDetails?: {
    activeLanguages?: string[];
    defaultLanguage?: string;
    language?: string;
}) {
    const activeLanguages = buildCanonicalLanguageList(
        storeDetails?.activeLanguages,
        storeDetails?.defaultLanguage,
        storeDetails?.language,
    );
    const requestedDefaultLanguage = normalizeLanguageCode(storeDetails?.defaultLanguage);
    const defaultLanguage = activeLanguages.includes(requestedDefaultLanguage)
        ? requestedDefaultLanguage
        : CANONICAL_SOURCE_LANGUAGE;

    return {
        activeLanguages,
        defaultLanguage,
        sourceLanguage: CANONICAL_SOURCE_LANGUAGE,
    };
}

export function normalizeProjectLanguages(languages?: Array<string | null | undefined>): string[] {
    return buildCanonicalLanguageList(languages || []);
}

export function getCanonicalProjectSourceLanguage(
    languages?: Array<string | null | undefined>,
): string {
    return normalizeProjectLanguages(languages)[0] || CANONICAL_SOURCE_LANGUAGE;
}

export function getPreferredDefaultLanguage(
    requestedDefaultLanguage?: string | null,
    availableLanguages?: Array<string | null | undefined>,
): string {
    const normalizedLanguages = normalizeProjectLanguages(availableLanguages || []);
    const normalizedDefault = normalizeLanguageCode(requestedDefaultLanguage);

    if (normalizedDefault && normalizedLanguages.includes(normalizedDefault)) {
        return normalizedDefault;
    }

    return normalizedLanguages.find((languageCode) => languageCode !== CANONICAL_SOURCE_LANGUAGE)
        || normalizedLanguages[0]
        || CANONICAL_SOURCE_LANGUAGE;
}

export function normalizeProjectLanguagePolicy(projectDetails?: {
    languages?: Array<string | null | undefined>;
    defaultLanguage?: string | null;
}) {
    const languages = normalizeProjectLanguages(projectDetails?.languages || []);
    const defaultLanguage = getPreferredDefaultLanguage(projectDetails?.defaultLanguage, languages);

    return {
        languages,
        defaultLanguage,
        sourceLanguage: CANONICAL_SOURCE_LANGUAGE,
    };
}
