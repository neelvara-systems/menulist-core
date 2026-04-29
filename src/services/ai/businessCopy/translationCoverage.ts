import { getStoreManagedLanguages, getStorePreferredLanguage } from '@lib/localization/storeContent';
import { BusinessCopyLocalizedFieldKey, getBusinessCopyFieldConfigs } from './fieldConfig';
import { BusinessCopyFieldValue, computeBusinessCopyCoverageCore } from './translationCoverageCore';

export type BusinessCopyCoverageFieldKey = BusinessCopyLocalizedFieldKey | 'keywords';

export type BusinessCopyCoverageField = {
    key: BusinessCopyCoverageFieldKey;
    missingLanguages: string[];
    scope: 'localized' | 'shared';
    sourceValue: string;
    status: 'empty' | 'ok' | 'warning';
};

type CoverageOptions = {
    includePwaShortName?: boolean;
};

function getKeywordsCoverageField(storeDetails?: any): BusinessCopyCoverageField {
    const keywords = Array.isArray(storeDetails?.keywords)
        ? storeDetails.keywords.map((keyword: unknown) => String(keyword || '').trim()).filter(Boolean)
        : [];

    return {
        key: 'keywords',
        missingLanguages: [],
        scope: 'shared',
        sourceValue: keywords.join(', '),
        status: keywords.length > 0 ? 'ok' : 'empty',
    };
}

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
    const localizedFields: BusinessCopyCoverageField[] = result.fields.map((field) => ({
        ...field,
        scope: 'localized',
    }));
    const keywordsField = getKeywordsCoverageField(storeDetails);
    const fields = [...localizedFields, keywordsField];

    return {
        fields,
        managedLanguages,
        missingFieldCount: fields.filter((field) => field.status !== 'ok').length,
        referenceLanguage: result.referenceLanguage,
        repairableGapCount: result.repairableGapCount,
    };
}
