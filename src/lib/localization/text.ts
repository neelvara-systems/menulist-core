import { CANONICAL_SOURCE_LANGUAGE } from './languagePolicy';

export type LocalizedText = Record<string, string>;
export type LocalizedTextValue = LocalizedText | string | null | undefined;
export type LocalizedStringList = Record<string, string[]>;
export type LocalizedStringListValue = LocalizedStringList | string[] | null | undefined;

const pushCandidate = (candidates: string[], value?: string | null) => {
    const normalized = value?.trim();
    if (!normalized || candidates.includes(normalized)) return;
    candidates.push(normalized);
};

const getSafeObjectEntries = (value: unknown): Array<[string, unknown]> | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    try {
        return Object.keys(value).map((key) => [key, Reflect.get(value, key)]);
    } catch {
        return null;
    }
};

const getLocalizedTextEntries = (value: unknown): Array<[string, string]> | null => {
    const entries = getSafeObjectEntries(value);
    if (
        !entries
        || entries.some(([, entry]) => entry != null && typeof entry !== 'string')
    ) {
        return null;
    }

    return entries.filter((entry): entry is [string, string] => typeof entry[1] === 'string');
};

const getLocalizedStringListEntries = (value: unknown): Array<[string, string[]]> | null => {
    const entries = getSafeObjectEntries(value);
    if (
        !entries
        || entries.some(([, entry]) => (
            entry != null
            && (
                !Array.isArray(entry)
                || entry.some((item) => typeof item !== 'string')
            )
        ))
    ) {
        return null;
    }
    return entries.filter((entry): entry is [string, string[]] => Array.isArray(entry[1]));
};

export const isLocalizedText = (value: unknown): value is LocalizedText => {
    const entries = getSafeObjectEntries(value);
    return Boolean(entries && entries.every(([, entry]) => typeof entry === 'string'));
};

export const normalizeStringList = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .filter((entry): entry is string => typeof entry === 'string')
        .map((entry) => entry.trim())
        .filter(Boolean);
};

export const isLocalizedStringList = (value: unknown): value is LocalizedStringList => {
    const entries = getSafeObjectEntries(value);
    return Boolean(entries && entries.every(([, entry]) => (
        Array.isArray(entry) && entry.every((item) => typeof item === 'string')
    )));
};

export const getLocalizedLanguageCandidates = (
    language?: string | null,
    primaryLanguage?: string | null,
): string[] => {
    const candidates: string[] = [];

    pushCandidate(candidates, language);
    pushCandidate(candidates, language?.split('-')[0]);
    pushCandidate(candidates, CANONICAL_SOURCE_LANGUAGE);
    pushCandidate(candidates, primaryLanguage);
    pushCandidate(candidates, primaryLanguage?.split('-')[0]);

    return candidates;
};

export const getPrimaryLocalizedLanguage = (
    value: unknown,
    fallbackLanguage: string = CANONICAL_SOURCE_LANGUAGE,
): string => {
    const textEntries = getLocalizedTextEntries(value);
    if (textEntries) {
        const canonicalEntry = textEntries.find(([key]) => key === CANONICAL_SOURCE_LANGUAGE)?.[1];
        if (typeof canonicalEntry === 'string' && canonicalEntry.trim().length > 0) {
            return CANONICAL_SOURCE_LANGUAGE;
        }

        const firstNonEmpty = textEntries.find(
            ([, entry]) => typeof entry === 'string' && entry.trim().length > 0,
        )?.[0];
        if (firstNonEmpty) return firstNonEmpty;
    }

    const stringListEntries = getLocalizedStringListEntries(value);
    if (stringListEntries) {
        const canonicalEntry = normalizeStringList(
            stringListEntries.find(([key]) => key === CANONICAL_SOURCE_LANGUAGE)?.[1],
        );
        if (canonicalEntry.length > 0) {
            return CANONICAL_SOURCE_LANGUAGE;
        }

        const firstNonEmpty = stringListEntries.find(
            ([, entry]) => normalizeStringList(entry).length > 0,
        )?.[0];
        if (firstNonEmpty) return firstNonEmpty;
    }

    return fallbackLanguage;
};

export const getLocalizedText = (
    value: unknown,
    language?: string | null,
    primaryLanguage?: string | null,
    fallback: string = '',
): string => {
    if (typeof value === 'string') return value.trim() || fallback;
    const entries = getLocalizedTextEntries(value);
    if (!entries) return fallback;
    const valuesByLanguage = new Map(entries);

    for (const candidate of getLocalizedLanguageCandidates(language, primaryLanguage)) {
        const localized = valuesByLanguage.get(candidate);
        if (typeof localized === 'string' && localized.trim()) {
            return localized.trim();
        }
    }

    for (const [, localized] of entries) {
        if (typeof localized === 'string' && localized.trim()) {
            return localized.trim();
        }
    }

    return fallback;
};

export const getLocalizedStringList = (
    value: unknown,
    language?: string | null,
    primaryLanguage?: string | null,
    fallback: string[] = [],
): string[] => {
    if (Array.isArray(value)) return normalizeStringList(value);
    const entries = getLocalizedStringListEntries(value);
    if (!entries) return fallback;
    const valuesByLanguage = new Map(entries);

    for (const candidate of getLocalizedLanguageCandidates(language, primaryLanguage)) {
        const localized = normalizeStringList(valuesByLanguage.get(candidate));
        if (localized.length > 0) {
            return localized;
        }
    }

    for (const [, localized] of entries) {
        const normalized = normalizeStringList(localized);
        if (normalized.length > 0) {
            return normalized;
        }
    }

    return fallback;
};

export const getLocalizedDraftText = (
    value: unknown,
    language?: string | null,
    fallback: string = '',
): string => {
    const normalizedLanguage = language?.trim();
    const baseLanguage = normalizedLanguage?.split('-')[0];

    if (typeof value === 'string') {
        if (!normalizedLanguage || normalizedLanguage === CANONICAL_SOURCE_LANGUAGE || baseLanguage === CANONICAL_SOURCE_LANGUAGE) {
            return value.trim() || fallback;
        }

        return fallback;
    }

    const entries = getLocalizedTextEntries(value);
    if (!entries || !normalizedLanguage) return fallback;
    const valuesByLanguage = new Map(entries);

    const exactMatch = valuesByLanguage.get(normalizedLanguage);
    if (typeof exactMatch === 'string' && exactMatch.trim()) {
        return exactMatch.trim();
    }

    if (baseLanguage && baseLanguage !== normalizedLanguage) {
        const baseMatch = valuesByLanguage.get(baseLanguage);
        if (typeof baseMatch === 'string' && baseMatch.trim()) {
            return baseMatch.trim();
        }
    }

    return fallback;
};

export const getLocalizedDraftStringList = (
    value: unknown,
    language?: string | null,
    fallback: string[] = [],
): string[] => {
    const normalizedLanguage = language?.trim();
    const baseLanguage = normalizedLanguage?.split('-')[0];

    if (Array.isArray(value)) {
        if (!normalizedLanguage || normalizedLanguage === CANONICAL_SOURCE_LANGUAGE || baseLanguage === CANONICAL_SOURCE_LANGUAGE) {
            return normalizeStringList(value);
        }

        return fallback;
    }

    const entries = getLocalizedStringListEntries(value);
    if (!entries || !normalizedLanguage) return fallback;
    const valuesByLanguage = new Map(entries);

    const exactMatch = normalizeStringList(valuesByLanguage.get(normalizedLanguage));
    if (exactMatch.length > 0) {
        return exactMatch;
    }

    if (baseLanguage && baseLanguage !== normalizedLanguage) {
        const baseMatch = normalizeStringList(valuesByLanguage.get(baseLanguage));
        if (baseMatch.length > 0) {
            return baseMatch;
        }
    }

    return fallback;
};

export const toLocalizedText = (
    value: unknown,
    language: string,
): LocalizedText | undefined => {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return undefined;

        return language === CANONICAL_SOURCE_LANGUAGE
            ? { [CANONICAL_SOURCE_LANGUAGE]: trimmed }
            : {
                [language]: trimmed,
                [CANONICAL_SOURCE_LANGUAGE]: trimmed,
            };
    }

    const entries = getLocalizedTextEntries(value);
    if (!entries) return undefined;

    const normalized = Object.fromEntries(
        entries.filter(
            ([key, entry]) => key && typeof entry === 'string' && entry.trim().length > 0,
        ),
    ) as LocalizedText;

    if (!normalized[CANONICAL_SOURCE_LANGUAGE]) {
        const sourceCandidate = normalized[language] || Object.values(normalized)[0];
        if (sourceCandidate?.trim()) {
            normalized[CANONICAL_SOURCE_LANGUAGE] = sourceCandidate.trim();
        }
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const toLocalizedStringList = (
    value: unknown,
    language: string,
): LocalizedStringList | undefined => {
    if (Array.isArray(value)) {
        const normalized = normalizeStringList(value);
        if (!normalized.length) return undefined;

        return language === CANONICAL_SOURCE_LANGUAGE
            ? { [CANONICAL_SOURCE_LANGUAGE]: normalized }
            : {
                [language]: normalized,
                [CANONICAL_SOURCE_LANGUAGE]: normalized,
            };
    }

    const entries = getLocalizedStringListEntries(value);
    if (!entries) return undefined;

    const normalized = Object.fromEntries(
        entries.map(([key, entry]) => [key, normalizeStringList(entry)]).filter(
            ([key, entry]) => key && Array.isArray(entry) && entry.length > 0,
        ),
    ) as LocalizedStringList;

    if (!normalized[CANONICAL_SOURCE_LANGUAGE]) {
        const sourceCandidate = normalized[language] || Object.values(normalized)[0];
        if (sourceCandidate?.length) {
            normalized[CANONICAL_SOURCE_LANGUAGE] = sourceCandidate;
        }
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export const updateLocalizedText = (
    existingValue: unknown,
    nextValue: string | undefined | null,
    language?: string | null,
    fallbackLanguage: string = CANONICAL_SOURCE_LANGUAGE,
): LocalizedText | undefined => {
    const resolvedLanguage =
        language?.trim() || getPrimaryLocalizedLanguage(existingValue, fallbackLanguage);
    const normalized = toLocalizedText(existingValue, resolvedLanguage) || {};
    const trimmed = nextValue?.trim() || '';

    if (!trimmed) {
        delete normalized[resolvedLanguage];
        return Object.keys(normalized).length > 0 ? normalized : undefined;
    }

    normalized[resolvedLanguage] = trimmed;
    return normalized;
};

export const updateLocalizedStringList = (
    existingValue: unknown,
    nextValue: string[] | undefined | null,
    language?: string | null,
    fallbackLanguage: string = CANONICAL_SOURCE_LANGUAGE,
): LocalizedStringList | undefined => {
    const resolvedLanguage =
        language?.trim() || getPrimaryLocalizedLanguage(existingValue, fallbackLanguage);
    const normalized = toLocalizedStringList(existingValue, resolvedLanguage) || {};
    const trimmed = normalizeStringList(nextValue);

    if (!trimmed.length) {
        delete normalized[resolvedLanguage];
        return Object.keys(normalized).length > 0 ? normalized : undefined;
    }

    normalized[resolvedLanguage] = trimmed;
    return normalized;
};
