import { getProjectManagedLanguages } from '@lib/localization/projectContent';
import { CANONICAL_SOURCE_LANGUAGE } from '@lib/localization/languagePolicy';
import { type LocalizedText } from '@lib/localization/text';
import { clampValue, getBatchTranslations, mergeLocalizedField, resolveLanguage } from '@services/ai/businessCopy/localizeBusinessCopyResult';
import type { LanguageType } from '../../../components/templates/main-app/projects/types/common.types';

type ProjectPublicFieldKey = 'name' | 'description' | 'specialMenuDisplayName' | 'specialNote';

type ProjectPublicFieldConfig = {
    key: ProjectPublicFieldKey;
    maxLength: number;
    readValue: (projectDetails?: any) => unknown;
};

const FIELD_CONFIGS: ProjectPublicFieldConfig[] = [
    {
        key: 'name',
        maxLength: 100,
        readValue: (projectDetails) => projectDetails?.name,
    },
    {
        key: 'description',
        maxLength: 200,
        readValue: (projectDetails) => projectDetails?.description,
    },
    {
        key: 'specialMenuDisplayName',
        maxLength: 100,
        readValue: (projectDetails) => projectDetails?._specialMenu?.displayName || projectDetails?.specialMenuDisplayName,
    },
    {
        key: 'specialNote',
        maxLength: 140,
        readValue: (projectDetails) => projectDetails?.menuSettings?.specialNote,
    },
];

export const getExactLocalizedValue = (value: unknown, languageCode: string): string => {
    if (typeof value === 'string') {
        return languageCode === CANONICAL_SOURCE_LANGUAGE ? value.trim() : '';
    }

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return '';
    }

    const entry = (value as Record<string, unknown>)[languageCode];
    return typeof entry === 'string' ? entry.trim() : '';
};

export type ProjectPublicTranslationResult = {
    description?: LocalizedText;
    name?: LocalizedText;
    specialMenuDisplayName?: LocalizedText;
    specialNote?: LocalizedText;
    translatedFieldCount: number;
    translatedLanguages: string[];
};

export default async function translateProjectPublicContent({
    projectDetails,
    projectId,
    storeDetails,
    targetLanguageCodes,
    translateBatch = getBatchTranslations,
}: {
    projectDetails?: any;
    projectId: string;
    storeDetails?: any;
    targetLanguageCodes?: string[];
    translateBatch?: typeof getBatchTranslations;
}): Promise<ProjectPublicTranslationResult | null> {
    const managedLanguages = getProjectManagedLanguages(projectDetails, storeDetails);
    const allowedTargetCodes = targetLanguageCodes?.length
        ? new Set(targetLanguageCodes.filter(Boolean))
        : null;
    const sourceLanguage = CANONICAL_SOURCE_LANGUAGE;
    const sourceLanguageDef = resolveLanguage(sourceLanguage);

    if (!sourceLanguageDef) {
        throw new Error('Project translation source language is unavailable.');
    }

    const payload = Object.fromEntries(
        FIELD_CONFIGS
            .map((field) => {
                const currentValue = field.readValue(projectDetails);
                const sourceValue = getExactLocalizedValue(currentValue, sourceLanguage);
                return [field.key, clampValue(sourceValue, field.maxLength)];
            })
            .filter(([, value]) => Boolean(value)),
    ) as Record<ProjectPublicFieldKey, string>;

    if (Object.keys(payload).length === 0) {
        return null;
    }

    const missingFieldKeysByLanguage = new Map<string, ProjectPublicFieldKey[]>();

    managedLanguages
        .filter((languageCode) => languageCode !== sourceLanguage)
        .filter((languageCode) => !allowedTargetCodes || allowedTargetCodes.has(languageCode))
        .forEach((languageCode) => {
            const missingFields = (Object.keys(payload) as ProjectPublicFieldKey[]).filter((fieldKey) => {
                const currentValue = FIELD_CONFIGS.find((field) => field.key === fieldKey)?.readValue(projectDetails);
                return !getExactLocalizedValue(currentValue, languageCode);
            });

            if (missingFields.length > 0) {
                missingFieldKeysByLanguage.set(languageCode, missingFields);
            }
        });

    const targetLanguages = Array.from(missingFieldKeysByLanguage.keys())
        .map(resolveLanguage)
        .filter(Boolean) as LanguageType[];

    if (!targetLanguages.length) {
        return null;
    }

    const translatedByLanguage = await translateBatch({
        fileId: `project-public-${projectId}-batch`,
        inputJson: payload,
        projectId,
        sourceLang: sourceLanguageDef,
        targetLang: targetLanguages,
    });

    if (!translatedByLanguage) {
        throw new Error('Project public content translation failed.');
    }

    const result: ProjectPublicTranslationResult = {
        translatedFieldCount: 0,
        translatedLanguages: [],
    };

    targetLanguages.forEach((targetLanguage) => {
        const translated = translatedByLanguage[targetLanguage.code];
        if (!translated) return;

        let translatedAnyField = false;
        const missingFields = missingFieldKeysByLanguage.get(targetLanguage.code) || [];

        missingFields.forEach((fieldKey) => {
            const fieldConfig = FIELD_CONFIGS.find((field) => field.key === fieldKey);
            if (!fieldConfig) return;

            const translatedValue = clampValue(translated[fieldKey], fieldConfig.maxLength);
            if (!translatedValue) return;

            const existingValue = fieldConfig.readValue(projectDetails);
            result[fieldKey] = mergeLocalizedField(result[fieldKey] || existingValue, {
                [targetLanguage.code]: translatedValue,
            });
            result.translatedFieldCount += 1;
            translatedAnyField = true;
        });

        if (translatedAnyField) {
            result.translatedLanguages.push(targetLanguage.code);
        }
    });

    return result.translatedFieldCount > 0 ? result : null;
}
