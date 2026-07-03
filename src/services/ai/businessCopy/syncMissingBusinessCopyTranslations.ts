import { getStoreManagedLanguages, getStorePreferredLanguage } from '@lib/localization/storeContent';
import { getLocalizedDraftStringList, getPrimaryLocalizedLanguage, getLocalizedText, toLocalizedStringList, toLocalizedText } from '@lib/localization/text';
import { LanguageType } from '../../../components/templates/main-app/projects/types/common.types';
import { getBoundedAiServiceStringContext, logAiServiceDiagnostic, logAiServiceFailure } from '../aiServiceDiagnostics';
import {
    clampValue,
    FIELD_LIMITS,
    getBatchTranslations,
    LocalizedBusinessCopyFields,
    mergeLocalizedField,
    mergeLocalizedKeywordField,
    resolveLanguage,
} from './localizeBusinessCopyResult';
import { BusinessCopyLocalizedFieldKey, getBusinessCopyFieldConfigs } from './fieldConfig';
import { computeBusinessCopyCoverage } from './translationCoverage';

const BUSINESS_COPY_TRANSLATION_REPAIR_NOOP = 'ai_business_copy_translation_repair_noop';
const BUSINESS_COPY_TRANSLATION_REPAIR_STARTED = 'ai_business_copy_translation_repair_started';
const BUSINESS_COPY_TRANSLATION_REPAIR_EMPTY_RESULT = 'ai_business_copy_translation_repair_empty_result';
const BUSINESS_COPY_TRANSLATION_REPAIR_SUCCEEDED = 'ai_business_copy_translation_repair_succeeded';

const getTranslationRepairLogContext = ({
    localizedFieldCount,
    missingFieldCount,
    projectId,
    referenceLanguage,
    repairableGapCount,
    storeDetails,
    targetLanguageCount,
}: {
    localizedFieldCount?: number;
    missingFieldCount?: number;
    projectId?: string;
    referenceLanguage?: string;
    repairableGapCount?: number;
    storeDetails?: any;
    targetLanguageCount?: number;
}) => ({
    ...getBoundedAiServiceStringContext('projectId', projectId),
    ...getBoundedAiServiceStringContext('storeId', storeDetails?.storeId),
    ...getBoundedAiServiceStringContext('referenceLanguage', referenceLanguage),
    localizedFieldCount,
    missingFieldCount,
    repairableGapCount,
    targetLanguageCount,
});

export default async function syncMissingBusinessCopyTranslations({
    includePwaShortName = true,
    projectId,
    storeDetails,
    translateBatch = getBatchTranslations,
}: {
    includePwaShortName?: boolean;
    projectId?: string;
    storeDetails?: any;
    translateBatch?: typeof getBatchTranslations;
}): Promise<LocalizedBusinessCopyFields | null> {
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const coverage = computeBusinessCopyCoverage(storeDetails, { includePwaShortName });
    const referenceLanguage = coverage.referenceLanguage || getStorePreferredLanguage(storeDetails);
    const sourceLanguageDef = resolveLanguage(referenceLanguage);

    if (!sourceLanguageDef) {
        if (coverage.repairableGapCount > 0) {
            throw new Error('Business copy translation repair failed: source language is unavailable.');
        }
        return null;
    }

    const enabledFields = getBusinessCopyFieldConfigs(includePwaShortName);
    const payload = Object.fromEntries(
        enabledFields
            .map((field) => {
                const currentValue = field.readValue(storeDetails);
                const sourceValue = getLocalizedText(
                    currentValue as any,
                    referenceLanguage,
                    getPrimaryLocalizedLanguage(currentValue as any, referenceLanguage),
                    '',
                );
                return [field.key, clampValue(sourceValue, FIELD_LIMITS[field.key])];
            })
            .filter(([, value]) => Boolean(value))
    ) as Record<BusinessCopyLocalizedFieldKey, string>;

    if (Object.keys(payload).length === 0) {
        if (coverage.repairableGapCount > 0) {
            throw new Error('Business copy translation repair failed: source copy is unavailable.');
        }
        logAiServiceDiagnostic(BUSINESS_COPY_TRANSLATION_REPAIR_NOOP, {
            ...getTranslationRepairLogContext({
                missingFieldCount: coverage.missingFieldCount,
                projectId,
                referenceLanguage,
                repairableGapCount: coverage.repairableGapCount,
                storeDetails,
                targetLanguageCount: 0,
            }),
            reason: 'no-source-payload',
        }, { developmentOnly: true });
        return null;
    }

    const targetLanguages = managedLanguages
        .filter((languageCode) => languageCode !== referenceLanguage)
        .filter((languageCode) => coverage.fields.some((field) => field.missingLanguages.includes(languageCode)))
        .map(resolveLanguage)
        .filter(Boolean) as LanguageType[];

    if (!targetLanguages.length) {
        if (coverage.repairableGapCount > 0) {
            throw new Error('Business copy translation repair failed: target languages could not be resolved.');
        }
        logAiServiceDiagnostic(BUSINESS_COPY_TRANSLATION_REPAIR_NOOP, {
            ...getTranslationRepairLogContext({
                missingFieldCount: coverage.missingFieldCount,
                projectId,
                referenceLanguage,
                repairableGapCount: coverage.repairableGapCount,
                storeDetails,
                targetLanguageCount: 0,
            }),
            reason: 'no-missing-target-languages',
        }, { developmentOnly: true });
        return null;
    }

    logAiServiceDiagnostic(BUSINESS_COPY_TRANSLATION_REPAIR_STARTED, getTranslationRepairLogContext({
        missingFieldCount: coverage.missingFieldCount,
        projectId,
        referenceLanguage,
        repairableGapCount: coverage.repairableGapCount,
        storeDetails,
        targetLanguageCount: targetLanguages.length,
    }), { developmentOnly: true });

    const translatedByLanguage = await translateBatch({
        fileId: `business-copy-coverage-${storeDetails?.storeId || 'store'}-batch`,
        inputJson: {
            ...payload,
            ...(coverage.fields.some((field) => field.key === 'keywords' && field.status !== 'empty')
                ? {
                    keywords: getLocalizedDraftStringList(storeDetails?.keywords, referenceLanguage, []).join(', '),
                }
                : {}),
        },
        projectId: projectId || String(storeDetails?.storeId || 'business-copy'),
        sourceLang: sourceLanguageDef,
        targetLang: targetLanguages,
    });

    if (!translatedByLanguage) {
        logAiServiceFailure(BUSINESS_COPY_TRANSLATION_REPAIR_EMPTY_RESULT, undefined, getTranslationRepairLogContext({
            projectId,
            referenceLanguage,
            repairableGapCount: coverage.repairableGapCount,
            storeDetails,
            targetLanguageCount: targetLanguages.length,
        }));
        throw new Error('Business copy translation repair failed.');
    }

    const localized: LocalizedBusinessCopyFields = {};

    enabledFields.forEach((field) => {
        const existingValue = field.readValue(storeDetails);
        const baseLocalized = toLocalizedText(existingValue as any, referenceLanguage) || {};
        localized[field.key] = {
            ...baseLocalized,
        };
    });
    localized.keywords = toLocalizedStringList(storeDetails?.keywords, referenceLanguage) || {};

    coverage.fields.forEach((field) => {
        field.missingLanguages.forEach((languageCode) => {
            if (field.key === 'keywords') {
                const keywordValues = String(translatedByLanguage?.[languageCode]?.keywords || '')
                    .split(/[,\u060C\uFF0C;\u061B]/)
                    .map((item) => item.trim())
                    .filter(Boolean)
                    .slice(0, 10);
                if (!keywordValues.length) return;
                localized.keywords = mergeLocalizedKeywordField(localized.keywords, {
                    [languageCode]: keywordValues,
                });
                return;
            }
            const translatedFieldValue = translatedByLanguage?.[languageCode]?.[field.key];
            const clampedValue = clampValue(translatedFieldValue, FIELD_LIMITS[field.key]);
            if (!clampedValue) return;
            localized[field.key] = mergeLocalizedField(localized[field.key], {
                [languageCode]: clampedValue,
            });
        });
    });

    logAiServiceDiagnostic(BUSINESS_COPY_TRANSLATION_REPAIR_SUCCEEDED, getTranslationRepairLogContext({
        localizedFieldCount: Object.keys(localized).length,
        projectId,
        referenceLanguage,
        repairableGapCount: coverage.repairableGapCount,
        storeDetails,
        targetLanguageCount: targetLanguages.length,
    }), { developmentOnly: true });

    return localized;
}
