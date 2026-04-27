import { getStoreManagedLanguages, getStorePreferredLanguage } from '@lib/localization/storeContent';
import { BusinessCopyLocalizedFieldKey, getBusinessCopyFieldConfigs } from './fieldConfig';
import { BusinessCopyFieldValue, computeBusinessCopyCoverageCore } from './translationCoverageCore';

export type BusinessCopyCoverageField = {
    key: BusinessCopyLocalizedFieldKey;
    missingLanguages: string[];
    sourceValue: string;
    status: 'empty' | 'ok' | 'warning';
};

type CoverageOptions = {
    includePwaShortName?: boolean;
};

export function computeBusinessCopyCoverage(
    storeDetails?: any,
    options?: CoverageOptions,
): {
    fields: BusinessCopyCoverageField[];
    managedLanguages: string[];
    missingFieldCount: number;
    referenceLanguage: string;
    repairableGapCount: number;
} {
    const managedLanguages = getStoreManagedLanguages(storeDetails);
    const enabledFields = getBusinessCopyFieldConfigs(options?.includePwaShortName !== false);
    const result = computeBusinessCopyCoverageCore({
        fields: enabledFields.map((field) => ({
            key: field.key,
            value: field.readValue(storeDetails) as BusinessCopyFieldValue,
        })),
        managedLanguages,
        preferredLanguage: getStorePreferredLanguage(storeDetails),
    });

    return {
        fields: result.fields,
        managedLanguages,
        missingFieldCount: result.missingFieldCount,
        referenceLanguage: result.referenceLanguage,
        repairableGapCount: result.repairableGapCount,
    };
}
