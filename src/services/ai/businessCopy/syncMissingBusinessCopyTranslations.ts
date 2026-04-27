import { getStoreManagedLanguages, getStorePreferredLanguage } from '@lib/localization/storeContent';
import { getPrimaryLocalizedLanguage, getLocalizedText, toLocalizedText } from '@lib/localization/text';
import { logger } from '@lib/monitoring/logger';
import { LanguageType } from '../../../components/templates/main-app/projects/types/common.types';
import {
    clampValue,
    FIELD_LIMITS,
    getBatchTranslations,
    LocalizedBusinessCopyFields,
    mergeLocalizedField,
    resolveLanguage,
} from './localizeBusinessCopyResult';
import { BusinessCopyLocalizedFieldKey, getBusinessCopyFieldConfigs } from './fieldConfig';
import { computeBusinessCopyCoverage } from './translationCoverage';

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
        logger.info('Business copy translation repair no-op', {
            projectId,
            reason: 'no-source-payload',
            storeId: storeDetails?.storeId,
        });
        return null;
    }

    const targetLanguages = managedLanguages
        .filter((languageCode) => languageCode !== referenceLanguage)
        .filter((languageCode) => coverage.fields.some((field) => field.missingLanguages.includes(languageCode)))
        .map(resolveLanguage)
        .filter(Boolean) as LanguageType[];

    if (!targetLanguages.length) {
        logger.info('Business copy translation repair no-op', {
            missingFieldCount: coverage.missingFieldCount,
            projectId,
            reason: 'no-missing-target-languages',
            repairableGapCount: coverage.repairableGapCount,
            storeId: storeDetails?.storeId,
        });
        return null;
    }

    logger.info('Business copy translation repair started', {
        missingFieldCount: coverage.missingFieldCount,
        projectId,
        referenceLanguage,
        repairableGapCount: coverage.repairableGapCount,
        storeId: storeDetails?.storeId,
        targetLanguages: targetLanguages.map((language) => language.code),
    });

    const translatedByLanguage = await translateBatch({
        fileId: `business-copy-coverage-${storeDetails?.storeId || 'store'}-batch`,
        inputJson: payload,
        projectId: projectId || String(storeDetails?.storeId || 'business-copy'),
        sourceLang: sourceLanguageDef,
        targetLang: targetLanguages,
    });

    if (!translatedByLanguage) {
        logger.warn('Business copy translation repair returned empty translation result', {
            projectId,
            referenceLanguage,
            repairableGapCount: coverage.repairableGapCount,
            storeId: storeDetails?.storeId,
            targetLanguages: targetLanguages.map((language) => language.code),
        });
        return null;
    }

    const localized: LocalizedBusinessCopyFields = {};

    enabledFields.forEach((field) => {
        const existingValue = field.readValue(storeDetails);
        const baseLocalized = toLocalizedText(existingValue as any, referenceLanguage) || {};
        localized[field.key] = {
            ...baseLocalized,
        };
    });

    coverage.fields.forEach((field) => {
        field.missingLanguages.forEach((languageCode) => {
            const translatedFieldValue = translatedByLanguage?.[languageCode]?.[field.key];
            const clampedValue = clampValue(translatedFieldValue, FIELD_LIMITS[field.key]);
            if (!clampedValue) return;
            localized[field.key] = mergeLocalizedField(localized[field.key], {
                [languageCode]: clampedValue,
            });
        });
    });

    logger.info('Business copy translation repair succeeded', {
        localizedFieldCount: Object.keys(localized).length,
        projectId,
        referenceLanguage,
        repairableGapCount: coverage.repairableGapCount,
        storeId: storeDetails?.storeId,
        targetLanguages: targetLanguages.map((language) => language.code),
    });

    return localized;
}
