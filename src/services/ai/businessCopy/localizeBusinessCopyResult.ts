import GlobalLanguagesList from '@data/languages';
import { LANGUAGE_CONSTANTS } from '@constant/languages';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { LocalizedStringList, LocalizedText, normalizeStringList, toLocalizedStringList, toLocalizedText } from '@lib/localization/text';
import { normalizeBatchTranslationMaps, normalizeTranslationCoverageSummary } from '@lib/ai/translationOutput';
import { syncBalanceFromResponse } from '@services/ai/balanceSync';
import { AICapacityError, checkCapacityResponse } from '@services/ai/capacityError';
import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, readAiServiceResponseJson } from '@services/ai/aiServiceDiagnostics';
import { getBoundedTranslationStringContext, getTranslationScopeLogContext, logTranslationFailure } from '@template/main-app/projects/utils/translationDiagnostics';
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
    translationIncomplete?: boolean;
};

export const FIELD_LIMITS = BUSINESS_COPY_FIELD_LIMITS;
const BUSINESS_COPY_TRANSLATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;

type BusinessCopyTranslationApiResponse = {
    data?: {
        translationsByLanguage?: unknown;
    } | null;
    remainingBalance?: unknown;
    translationCoverage?: unknown;
    transaction?: unknown;
};

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

export function getBoundedBatchTranslationTargets(
    targetLanguages: LanguageType[],
    sourceLanguageCode: string,
): LanguageType[] {
    const seen = new Set<string>();

    return targetLanguages
        .filter((language) => {
            const code = resolveLanguageCode(language?.code);
            if (!code || code === resolveLanguageCode(sourceLanguageCode) || seen.has(code)) return false;
            seen.add(code);
            return true;
        })
        .slice(0, LANGUAGE_CONSTANTS.MAX_LANGUAGES_PER_PROJECT - 1);
}

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
    projectId?: string;
    sourceLang: LanguageType;
    targetLang: LanguageType[];
}): Promise<Record<string, Record<string, string>> | null> {
    const boundedTargetLanguages = getBoundedBatchTranslationTargets(targetLang, sourceLang.code);
    if (!boundedTargetLanguages.length) return null;

    try {
        const response = await fetch('/api/translations', {
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'language_addition',
                fileId,
                inputJson,
                ...(projectId ? { projectId } : {}),
                sourceLang,
                targetLang: boundedTargetLanguages,
            }),
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            const requestError = new Error('business_copy_translation_request_failed') as Error & { status?: number };
            requestError.status = response.status;
            throw requestError;
        }

        const responseJson = await readAiServiceResponseJson<BusinessCopyTranslationApiResponse>(response, {
            context: {
                ...getTranslationScopeLogContext(projectId, fileId),
                ...getBoundedTranslationStringContext('sourceLanguageCode', sourceLang?.code),
                targetLanguageCount: boundedTargetLanguages.length,
                inputFieldCount: Object.keys(inputJson).length,
            },
            invalidFailureCode: 'business_copy_batch_translation_response_invalid',
            maxBytes: BUSINESS_COPY_TRANSLATION_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'business_copy_batch_translation_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        const requestedKeys = Object.keys(inputJson);
        const targetLanguageCodes = boundedTargetLanguages.map((language) => language.code);
        const coverage = normalizeTranslationCoverageSummary(responseJson.translationCoverage, {
            inputKeyCount: requestedKeys.length,
            targetLanguageCount: targetLanguageCodes.length,
        });
        if (responseJson.translationCoverage !== undefined && !coverage) {
            logTranslationFailure('business_copy_batch_translation_coverage_summary_invalid', undefined, {
                ...getTranslationScopeLogContext(projectId, fileId),
                ...getBoundedTranslationStringContext('sourceLanguageCode', sourceLang?.code),
                inputFieldCount: Object.keys(inputJson).length,
                targetLanguageCount: boundedTargetLanguages.length,
            });
            return null;
        }
        if (coverage?.hasPartialCoverage) {
            logTranslationFailure('business_copy_batch_translation_partial_response_rejected', undefined, {
                ...getTranslationScopeLogContext(projectId, fileId),
                ...getBoundedTranslationStringContext('sourceLanguageCode', sourceLang?.code),
                fallbackKeyCount: coverage.fallbackKeyCount,
                inputFieldCount: Object.keys(inputJson).length,
                targetLanguageCount: boundedTargetLanguages.length,
                translatedKeyCount: coverage.translatedKeyCount,
            });
            return null;
        }
        const translationsByLanguage = normalizeBatchTranslationMaps(
            responseJson.data?.translationsByLanguage,
            targetLanguageCodes,
            requestedKeys,
        );
        if (!translationsByLanguage) {
            logTranslationFailure('business_copy_batch_translation_map_invalid', undefined, {
                ...getTranslationScopeLogContext(projectId, fileId),
                ...getBoundedTranslationStringContext('sourceLanguageCode', sourceLang?.code),
                inputFieldCount: requestedKeys.length,
                targetLanguageCount: targetLanguageCodes.length,
            });
        }
        return translationsByLanguage;
    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logTranslationFailure('business_copy_batch_translation_failed', error, {
            ...getTranslationScopeLogContext(projectId, fileId),
            ...getBoundedTranslationStringContext('sourceLanguageCode', sourceLang?.code),
            targetLanguageCount: boundedTargetLanguages.length,
            inputFieldCount: Object.keys(inputJson).length,
        });
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
        projectId,
        sourceLang: sourceLanguageDef,
        targetLang: targetLanguages,
    });

    if (!translatedByLanguage) {
        return {
            ...localized,
            translationIncomplete: true,
        };
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
