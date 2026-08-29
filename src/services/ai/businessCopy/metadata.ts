import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { getStoreManagedLanguages } from '@lib/localization/storeContent';
import { BusinessCopyCoverageField } from './translationCoverage';
import {
    getBusinessCopyFieldConfigs,
    hasBusinessCopyOwnDataField,
    readBusinessCopyOwnValueAtPath,
} from './fieldConfig';

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

export function getBusinessCopyFieldKeysFromUpdate(update: unknown): string[] {
    const fieldKeys = new Set<string>();
    const publicPresence = readBusinessCopyOwnValueAtPath(update, ['publicPresence']);
    const pwaSettings = readBusinessCopyOwnValueAtPath(update, ['pwaSettings']);

    if (hasBusinessCopyOwnDataField(publicPresence, 'descriptor')) fieldKeys.add('descriptor');
    if (hasBusinessCopyOwnDataField(publicPresence, 'knownFor')) fieldKeys.add('knownFor');
    if (hasBusinessCopyOwnDataField(publicPresence, 'specialNote')) fieldKeys.add('specialNote');
    if (hasBusinessCopyOwnDataField(update, 'tagline')) fieldKeys.add('tagline');
    if (hasBusinessCopyOwnDataField(update, 'metaTitle')) fieldKeys.add('metaTitle');
    if (hasBusinessCopyOwnDataField(update, 'metaDescription')) fieldKeys.add('metaDescription');
    if (hasBusinessCopyOwnDataField(update, 'keywords')) fieldKeys.add('keywords');
    if (hasBusinessCopyOwnDataField(pwaSettings, 'pwaShortName')) fieldKeys.add('pwaShortName');

    return Array.from(fieldKeys);
}

export function applyBusinessCopyManualOverrideMetaToUpdate({
    existingMeta,
    update,
}: {
    existingMeta?: BusinessCopyMeta;
    update: Record<string, unknown>;
}): Record<string, unknown> {
    const fieldKeys = getBusinessCopyFieldKeysFromUpdate(update);
    if (fieldKeys.length === 0) return update;

    return {
        ...update,
        businessCopyMeta: buildBusinessCopyManualOverrideMeta({
            existingMeta,
            fieldKeys,
        }),
    };
}
