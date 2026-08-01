import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { BusinessCopyLocalizedFieldKey } from './fieldConfig';

export type BusinessCopyFieldValue = unknown;

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

type LocalizedTextEntry = readonly [languageCode: string, value: string | null | undefined];

function getLocalizedTextEntries(value: unknown): LocalizedTextEntry[] | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

    try {
        const entries: LocalizedTextEntry[] = [];
        for (const [languageCode, descriptor] of Object.entries(
            Object.getOwnPropertyDescriptors(value),
        )) {
            if (!descriptor.enumerable) continue;
            if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) return null;
            if (descriptor.value != null && typeof descriptor.value !== 'string') return null;
            entries.push([languageCode, descriptor.value]);
        }
        return entries;
    } catch {
        return null;
    }
}

function getPrimaryLocalizedLanguage(
    value: BusinessCopyFieldValue,
    fallbackLanguage: string,
): string {
    const localizedEntries = getLocalizedTextEntries(value);
    if (localizedEntries) {
        const canonicalEntry = localizedEntries.find(
            ([languageCode]) => languageCode === CANONICAL_SOURCE_LANGUAGE,
        )?.[1];
        if (typeof canonicalEntry === 'string' && canonicalEntry.trim().length > 0) {
            return CANONICAL_SOURCE_LANGUAGE;
        }

        const firstNonEmpty = localizedEntries.find(
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
    const localizedEntries = getLocalizedTextEntries(value);
    if (!localizedEntries) return fallback;

    for (const candidate of getLocalizedLanguageCandidates(language, primaryLanguage)) {
        const localized = localizedEntries.find(
            ([languageCode]) => languageCode === candidate,
        )?.[1];
        if (typeof localized === 'string' && localized.trim()) {
            return localized.trim();
        }
    }

    for (const [, localized] of localizedEntries) {
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
    const localizedEntries = getLocalizedTextEntries(value);
    if (!localizedEntries) return '';
    const localized = localizedEntries.find(
        ([candidate]) => candidate === languageCode,
    )?.[1];
    return typeof localized === 'string' ? localized.trim() : '';
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
