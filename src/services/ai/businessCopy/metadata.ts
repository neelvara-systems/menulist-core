import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { getStoreManagedLanguages } from '@lib/localization/storeContent';
import { BusinessCopyCoverageField } from './translationCoverage';
import { getBusinessCopyFieldConfigs } from './fieldConfig';

export type BusinessCopyMeta = {
    lastGeneratedAt?: string;
    lastGeneratedFieldKeys?: string[];
    lastGeneratedProjectId?: string;
    lastGeneratedSourceLanguage?: string;
    lastGeneratedTargetLanguages?: string[];
    lastManualOverrideAt?: string;
    lastManualOverrideFieldKeys?: string[];
    lastRepairedAt?: string;
    lastRepairedFieldKeys?: string[];
    lastRepairedGapCount?: number;
    lastRepairedSourceLanguage?: string;
    lastRepairedTargetLanguages?: string[];
};

export function getBusinessCopyFieldKeys(includePwaShortName: boolean = true): string[] {
    return getBusinessCopyFieldConfigs(includePwaShortName).map((field) => field.key);
}

export function buildBusinessCopyGeneratedMeta({
    existingMeta,
    includePwaShortName = true,
    projectId,
    sourceLanguage,
    storeDetails,
}: {
    existingMeta?: BusinessCopyMeta;
    includePwaShortName?: boolean;
    projectId?: string;
    sourceLanguage?: string;
    storeDetails?: any;
}): BusinessCopyMeta {
    const resolvedSourceLanguage = sourceLanguage || CANONICAL_SOURCE_LANGUAGE;
    const targetLanguages = getStoreManagedLanguages(storeDetails).filter((code) => code !== resolvedSourceLanguage);

    return {
        ...(existingMeta || {}),
        lastGeneratedAt: new Date().toISOString(),
        lastGeneratedFieldKeys: [...getBusinessCopyFieldKeys(includePwaShortName), 'keywords'],
        lastGeneratedProjectId: projectId,
        lastGeneratedSourceLanguage: resolvedSourceLanguage,
        lastGeneratedTargetLanguages: targetLanguages,
    };
}

export function buildBusinessCopyRepairMeta({
    coverageFields,
    existingMeta,
    referenceLanguage,
}: {
    coverageFields: BusinessCopyCoverageField[];
    existingMeta?: BusinessCopyMeta;
    referenceLanguage: string;
}): BusinessCopyMeta {
    const repairedFieldKeys = coverageFields
        .filter((field) => field.missingLanguages.length > 0)
        .map((field) => field.key);
    const targetLanguages = Array.from(new Set(
        coverageFields.flatMap((field) => field.missingLanguages),
    ));

    return {
        ...(existingMeta || {}),
        lastRepairedAt: new Date().toISOString(),
        lastRepairedFieldKeys: repairedFieldKeys,
        lastRepairedGapCount: coverageFields.reduce((count, field) => count + field.missingLanguages.length, 0),
        lastRepairedSourceLanguage: referenceLanguage,
        lastRepairedTargetLanguages: targetLanguages,
    };
}

export function buildBusinessCopyManualOverrideMeta({
    existingMeta,
    fieldKeys,
}: {
    existingMeta?: BusinessCopyMeta;
    fieldKeys: string[];
}): BusinessCopyMeta {
    if (!fieldKeys.length) {
        return existingMeta || {};
    }

    return {
        ...(existingMeta || {}),
        lastManualOverrideAt: new Date().toISOString(),
        lastManualOverrideFieldKeys: fieldKeys,
    };
}

export function getBusinessCopyFieldKeysFromUpdate(update: any): string[] {
    const fieldKeys = new Set<string>();

    if (update?.publicPresence) {
        if ('displayName' in update.publicPresence) fieldKeys.add('displayName');
        if ('descriptor' in update.publicPresence) fieldKeys.add('descriptor');
        if ('knownFor' in update.publicPresence) fieldKeys.add('knownFor');
        if ('specialNote' in update.publicPresence) fieldKeys.add('specialNote');
    }
    if ('tagline' in (update || {})) fieldKeys.add('tagline');
    if ('metaTitle' in (update || {})) fieldKeys.add('metaTitle');
    if ('metaDescription' in (update || {})) fieldKeys.add('metaDescription');
    if ('keywords' in (update || {})) fieldKeys.add('keywords');
    if (update?.pwaSettings && 'pwaShortName' in update.pwaSettings) fieldKeys.add('pwaShortName');

    return Array.from(fieldKeys);
}
