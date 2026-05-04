import GlobalLanguagesList from '@data/languages';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { LocalizedStringList, LocalizedText, normalizeStringList, toLocalizedStringList, toLocalizedText } from '@lib/localization/text';
import { syncBalanceFromResponse } from '@services/ai/balanceSync';
import { AICapacityError, checkCapacityResponse } from '@services/ai/capacityError';
import { LanguageType } from '../../../components/templates/main-app/projects/types/common.types';
import { BusinessCopyGenerationResult } from './generateBusinessCopyViaAPI';
import { BUSINESS_COPY_FIELD_LIMITS, BusinessCopyLocalizedFieldKey, getBusinessCopyFieldConfigs } from './fieldConfig';

export type LocalizedBusinessCopyFields = {
    descriptor?: LocalizedText;
    keywords?: LocalizedStringList;
    knownFor?: LocalizedText;
    metaDescription?: LocalizedText;
    metaTitle?: LocalizedText;
    pwaShortName?: LocalizedText;
    specialNote?: LocalizedText;
    tagline?: LocalizedText;
};

export const FIELD_LIMITS = BUSINESS_COPY_FIELD_LIMITS;

const LANGUAGE_INDEX = new Map(
    GlobalLanguagesList.map((language) => [language.code.toLowerCase(), language]),
);

export const resolveLanguageCode = (code?: string | null) => code?.trim().toLowerCase() || '';

export const resolveLanguage = (code?: string | null): LanguageType | null => {
    const normalized = resolveLanguageCode(code);
    if (!normalized) return null;
    return LANGUAGE_INDEX.get(normalized) || null;
};

export const clampValue = (value: unknown, maxLength: number) => String(value || '').trim().slice(0, maxLength);

const toFieldPayload = (generated: BusinessCopyGenerationResult): Record<BusinessCopyLocalizedFieldKey, string> => (
    Object.fromEntries(
        getBusinessCopyFieldConfigs(true).map((field) => [
            field.key,
            clampValue(generated[field.key] || '', FIELD_LIMITS[field.key]),
        ]),
    ) as Record<BusinessCopyLocalizedFieldKey, string>
);

function buildLocalizedFields(
    sourceLanguage: string,
    payload: Record<BusinessCopyLocalizedFieldKey, string>,
): LocalizedBusinessCopyFields {
    return Object.fromEntries(
        Object.entries(payload).map(([field, value]) => [
            field,
            toLocalizedText(value, sourceLanguage),
        ]),
    ) as LocalizedBusinessCopyFields;
}

export async function getBatchTranslations({
    fileId,
    inputJson,
    projectId,
    sourceLang,
    targetLang,
}: {
    fileId: string;
    inputJson: Record<string, string>;
    projectId: string;
    sourceLang: LanguageType;
    targetLang: LanguageType[];
}): Promise<Record<string, Record<string, string>> | null> {
    try {
        const response = await fetch('/api/translations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'language_addition',
                fileId,
                inputJson,
                projectId,
                sourceLang,
                targetLang,
            }),
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error(`Translation request failed: ${response.statusText}`);
        }

        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        return responseJson?.data?.translationsByLanguage || null;
    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        console.error('Error calling batch translation API:', error);
        return null;
    }
}

function getEnabledLanguageCodes(storeDetails?: any): string[] {
    const base = [
        CANONICAL_SOURCE_LANGUAGE,
        ...(Array.isArray(storeDetails?.activeLanguages) ? storeDetails.activeLanguages : []),
        storeDetails?.defaultLanguage,
        storeDetails?.language,
    ];

    return Array.from(new Set(base.map(resolveLanguageCode).filter(Boolean)));
}

export function mergeLocalizedField(
    existingValue: unknown,
    nextValue?: LocalizedText,
): LocalizedText | undefined {
    const existing = toLocalizedText(existingValue as any, 'en') || {};
    const next = nextValue || {};
    const merged = {
        ...existing,
        ...next,
    };

    const normalized = Object.fromEntries(
        Object.entries(merged).filter(
            ([key, value]) => key && typeof value === 'string' && value.trim().length > 0,
        ),
    ) as LocalizedText;

    return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export default async function localizeBusinessCopyResult({
    generated,
    projectId,
    storeDetails,
}: {
    generated: BusinessCopyGenerationResult;
    projectId?: string;
    storeDetails?: any;
}): Promise<LocalizedBusinessCopyFields> {
    const enabledLanguageCodes = getEnabledLanguageCodes(storeDetails);
    const sourceLanguage = CANONICAL_SOURCE_LANGUAGE;
    const sourceLanguageDef = resolveLanguage(sourceLanguage);
    const payload = toFieldPayload(generated);
    const localized = buildLocalizedFields(sourceLanguage, payload);
    localized.keywords = toLocalizedStringList(generated.keywords, sourceLanguage);

    if (!sourceLanguageDef) {
        return localized;
    }

    const targetLanguages = enabledLanguageCodes
        .filter((code) => code !== sourceLanguage)
        .map(resolveLanguage)
        .filter(Boolean) as LanguageType[];

    if (!targetLanguages.length) {
        return localized;
    }

    const translatedByLanguage = await getBatchTranslations({
        fileId: `business-copy-${storeDetails?.storeId || 'store'}-batch`,
        inputJson: {
            ...payload,
            keywords: generated.keywords.join(', '),
        },
        projectId: projectId || String(storeDetails?.storeId || 'business-copy'),
        sourceLang: sourceLanguageDef,
        targetLang: targetLanguages,
    });

    if (!translatedByLanguage) {
        return localized;
    }

    targetLanguages.forEach((targetLanguage) => {
        const translated = translatedByLanguage[targetLanguage.code];
        if (!translated) return;

        (Object.keys(payload) as BusinessCopyLocalizedFieldKey[]).forEach((field) => {
            const nextValue = clampValue(translated[field], FIELD_LIMITS[field]);
            if (!nextValue) return;
            const current = localized[field] || {};
            localized[field] = {
                ...current,
                [targetLanguage.code]: nextValue,
            };
        });

        const translatedKeywords = parseKeywordString(translated.keywords);
        if (translatedKeywords.length > 0) {
            localized.keywords = {
                ...(localized.keywords || {}),
                [targetLanguage.code]: translatedKeywords,
            };
        }
    });

    return localized;
}

export function mergeLocalizedKeywordField(
    existingValue: unknown,
    nextValue?: LocalizedStringList,
): LocalizedStringList | undefined {
    const existing = toLocalizedStringList(existingValue as any, 'en') || {};
    const next = nextValue || {};
    const merged = {
        ...existing,
        ...next,
    };

    const normalized = Object.fromEntries(
        Object.entries(merged).map(([key, value]) => [key, normalizeStringList(value)]).filter(
            ([key, value]) => key && Array.isArray(value) && value.length > 0,
        ),
    ) as LocalizedStringList;

    return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function parseKeywordString(value: unknown): string[] {
    return String(value || '')
        .split(/[,\u060C\uFF0C;\u061B]/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 10);
}
