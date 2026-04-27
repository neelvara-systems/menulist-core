import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { BusinessCopyLocalizedFieldKey } from './fieldConfig';

export type BusinessCopyFieldValue = Record<string, string> | string | null | undefined;

export type BusinessCopyCoverageCoreField = {
    key: BusinessCopyLocalizedFieldKey;
    missingLanguages: string[];
    sourceValue: string;
    status: 'empty' | 'ok' | 'warning';
};

export type BusinessCopyCoverageCoreInputField = {
    key: BusinessCopyLocalizedFieldKey;
    value: BusinessCopyFieldValue;
};

function isLocalizedText(value: unknown): value is Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return Object.values(value as Record<string, unknown>).every(
        (entry) => entry == null || typeof entry === 'string',
    );
}

function getPrimaryLocalizedLanguage(
    value: BusinessCopyFieldValue,
    fallbackLanguage: string,
): string {
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
}

function pushCandidate(candidates: string[], value?: string | null) {
    const normalized = value?.trim();
    if (!normalized || candidates.includes(normalized)) return;
    candidates.push(normalized);
}

function getLocalizedLanguageCandidates(language?: string | null, primaryLanguage?: string | null): string[] {
    const candidates: string[] = [];

    pushCandidate(candidates, language);
    pushCandidate(candidates, language?.split('-')[0]);
    pushCandidate(candidates, CANONICAL_SOURCE_LANGUAGE);
    pushCandidate(candidates, primaryLanguage);
    pushCandidate(candidates, primaryLanguage?.split('-')[0]);

    return candidates;
}

function getLocalizedText(
    value: BusinessCopyFieldValue,
    language?: string | null,
    primaryLanguage?: string | null,
    fallback: string = '',
): string {
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
}

function getExactLocalizedValue(
    value: BusinessCopyFieldValue,
    languageCode: string,
    referenceLanguage: string,
): string {
    if (typeof value === 'string') {
        return languageCode === referenceLanguage ? value.trim() : '';
    }
    if (!isLocalizedText(value)) return '';
    return typeof value[languageCode] === 'string' ? value[languageCode].trim() : '';
}

export function computeBusinessCopyCoverageCore({
    fields,
    managedLanguages,
    preferredLanguage,
}: {
    fields: BusinessCopyCoverageCoreInputField[];
    managedLanguages: string[];
    preferredLanguage: string;
}): {
    fields: BusinessCopyCoverageCoreField[];
    missingFieldCount: number;
    referenceLanguage: string;
    repairableGapCount: number;
} {
    const referenceLanguage = fields
        .map((field) => getPrimaryLocalizedLanguage(field.value, ''))
        .find(Boolean)
        || preferredLanguage
        || CANONICAL_SOURCE_LANGUAGE;

    const nextFields = fields.map((field) => {
        const sourceValue = getLocalizedText(
            field.value,
            referenceLanguage,
            getPrimaryLocalizedLanguage(field.value, referenceLanguage),
            '',
        );
        const missingLanguages = sourceValue
            ? managedLanguages.filter((languageCode) => (
                languageCode !== referenceLanguage
                && !getExactLocalizedValue(field.value, languageCode, referenceLanguage)
            ))
            : [];

        return {
            key: field.key,
            missingLanguages,
            sourceValue,
            status: !sourceValue ? 'empty' : missingLanguages.length > 0 ? 'warning' : 'ok',
        } satisfies BusinessCopyCoverageCoreField;
    });

    return {
        fields: nextFields,
        missingFieldCount: nextFields.filter((field) => field.status !== 'ok').length,
        referenceLanguage,
        repairableGapCount: nextFields.reduce((count, field) => count + field.missingLanguages.length, 0),
    };
}
