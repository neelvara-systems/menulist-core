import { getStoreManagedLanguages, getStorePreferredLanguage } from '@lib/localization/storeContent';
import { getLocalizedDraftStringList, getLocalizedStringList, getPrimaryLocalizedLanguage } from '@lib/localization/text';
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

function getKeywordsCoverageField(
    storeDetails: any,
    managedLanguages: string[],
    referenceLanguage: string,
): BusinessCopyCoverageField {
    const keywords = getLocalizedStringList(
        storeDetails?.keywords,
        referenceLanguage,
        getPrimaryLocalizedLanguage(storeDetails?.keywords, referenceLanguage),
        [],
    );
    const missingLanguages = keywords.length > 0
        ? managedLanguages.filter((languageCode) => (
            languageCode !== referenceLanguage
            && getLocalizedDraftStringList(storeDetails?.keywords, languageCode, []).length === 0
        ))
        : [];

    return {
        key: 'keywords',
        missingLanguages,
        scope: 'localized',
        sourceValue: keywords.join(', '),
        status: !keywords.length ? 'empty' : missingLanguages.length > 0 ? 'warning' : 'ok',
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
    const keywordsField = getKeywordsCoverageField(storeDetails, managedLanguages, result.referenceLanguage);
    const fields = [...localizedFields, keywordsField];

    return {
        fields,
        managedLanguages,
        missingFieldCount: fields.filter((field) => field.status !== 'ok').length,
        referenceLanguage: result.referenceLanguage,
        repairableGapCount: result.repairableGapCount,
    };
}
