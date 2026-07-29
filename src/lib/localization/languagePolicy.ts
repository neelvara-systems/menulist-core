import { LANGUAGE_CONSTANTS } from '@constant/languages';

export const CANONICAL_SOURCE_LANGUAGE = LANGUAGE_CONSTANTS.FALLBACK_LANGUAGE;

const readOwnValue = (value: unknown, key: PropertyKey): unknown => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    try {
        return Object.prototype.hasOwnProperty.call(value, key)
            ? Reflect.get(value, key)
            : undefined;
    } catch {
        return undefined;
    }
};

const normalizeLanguageCode = (value: unknown): string => (
    typeof value === 'string' ? value.trim().toLowerCase() : ''
);

export function buildCanonicalLanguageList(
    ...languageGroups: unknown[]
): string[] {
    const collected: unknown[] = [];
    try {
        for (const group of languageGroups) {
            if (Array.isArray(group)) {
                collected.push(...Array.from(group));
            } else {
                collected.push(group);
            }
        }
    } catch {
        return [CANONICAL_SOURCE_LANGUAGE];
    }
    const deduped = Array.from(new Set(collected.map(normalizeLanguageCode).filter(Boolean)));

    return [
        CANONICAL_SOURCE_LANGUAGE,
        ...deduped.filter((languageCode) => languageCode !== CANONICAL_SOURCE_LANGUAGE),
    ];
}

export function normalizeStoreLanguagePolicy(storeDetails?: unknown) {
    const activeLanguageValues = readOwnValue(storeDetails, 'activeLanguages');
    const defaultLanguageValue = readOwnValue(storeDetails, 'defaultLanguage');
    const languageValue = readOwnValue(storeDetails, 'language');
    const activeLanguages = buildCanonicalLanguageList(
        activeLanguageValues,
        defaultLanguageValue,
        languageValue,
    );
    const requestedDefaultLanguage = normalizeLanguageCode(defaultLanguageValue);
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
