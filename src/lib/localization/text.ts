import { CANONICAL_SOURCE_LANGUAGE } from './languagePolicy';

export type LocalizedText = Record<string, string>;
export type LocalizedTextValue = LocalizedText | string | null | undefined;

const pushCandidate = (candidates: string[], value?: string | null) => {
    const normalized = value?.trim();
    if (!normalized || candidates.includes(normalized)) return;
    candidates.push(normalized);
};

export const isLocalizedText = (value: unknown): value is LocalizedText => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value as Record<string, unknown>).every(
        (entry) => entry == null || typeof entry === 'string',
    );
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
    value: LocalizedTextValue,
    fallbackLanguage: string = CANONICAL_SOURCE_LANGUAGE,
): string => {
    if (isLocalizedText(value)) {
        const canonicalEntry = value[CANONICAL_SOURCE_LANGUAGE];
        if (typeof canonicalEntry === 'string' && canonicalEntry.trim().length > 0) {
            return CANONICAL_SOURCE_LANGUAGE;
        }

        const firstNonEmpty = Object.entries(value).find(
            ([, entry]) => typeof entry === 'string' && entry.trim().length > 0,
        )?.[0];
        if (firstNonEmpty) return firstNonEmpty;
    }

    return fallbackLanguage;
};

export const getLocalizedText = (
    value: LocalizedTextValue,
    language?: string | null,
    primaryLanguage?: string | null,
    fallback: string = '',
): string => {
    if (typeof value === 'string') return value.trim() || fallback;
    if (!isLocalizedText(value)) return fallback;

    for (const candidate of getLocalizedLanguageCandidates(language, primaryLanguage)) {
        const localized = value[candidate];
        if (typeof localized === 'string' && localized.trim()) {
            return localized.trim();
        }
    }

    for (const localized of Object.values(value)) {
        if (typeof localized === 'string' && localized.trim()) {
            return localized.trim();
        }
    }

    return fallback;
};

export const getLocalizedDraftText = (
    value: LocalizedTextValue,
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

    if (!isLocalizedText(value) || !normalizedLanguage) return fallback;

    const exactMatch = value[normalizedLanguage];
    if (typeof exactMatch === 'string' && exactMatch.trim()) {
        return exactMatch.trim();
    }

    if (baseLanguage && baseLanguage !== normalizedLanguage) {
        const baseMatch = value[baseLanguage];
        if (typeof baseMatch === 'string' && baseMatch.trim()) {
            return baseMatch.trim();
        }
    }

    return fallback;
};

export const toLocalizedText = (
    value: LocalizedTextValue,
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

    if (!isLocalizedText(value)) return undefined;

    const normalized = Object.fromEntries(
        Object.entries(value).filter(
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

export const updateLocalizedText = (
    existingValue: LocalizedTextValue,
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
