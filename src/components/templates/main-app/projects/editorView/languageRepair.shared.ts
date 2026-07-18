import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { removeObjRef } from '@util/utils';
import type { Project } from '../types';
import { translateFile, type TranslationGovernanceOptions } from '../utils/translationsUtils';

export type LanguageIssueSummary = {
    code: string;
    missing: number;
    mismatched: number;
    total: number;
};

export class LanguageRepairError extends Error {
    readonly completedFileCount: number;
    readonly failureCause: unknown;
    readonly partialProject: Project;

    constructor(
        message: string,
        partialProject: Project,
        completedFileCount: number,
        failureCause: unknown,
    ) {
        super(message);
        this.name = 'LanguageRepairError';
        this.completedFileCount = completedFileCount;
        this.failureCause = failureCause;
        this.partialProject = partialProject;
        Object.setPrototypeOf(this, LanguageRepairError.prototype);
    }
}

export const getLanguageRepairFailureCause = (error: unknown): unknown => (
    error instanceof LanguageRepairError ? error.failureCause : error
);

export const getLanguageRepairPartialProject = (error: unknown): Project | null => (
    error instanceof LanguageRepairError ? removeObjRef(error.partialProject) : null
);

const SCRIPT_MATCHERS: Partial<Record<string, RegExp>> = {
    ar: /[\u0600-\u06FF]/,
    bn: /[\u0980-\u09FF]/,
    hi: /[\u0900-\u097F]/,
    mr: /[\u0900-\u097F]/,
    ta: /[\u0B80-\u0BFF]/,
    te: /[\u0C00-\u0C7F]/,
    zh: /[\u3400-\u9FFF]/,
};

export function hasLocalizedValue(value: unknown, languageCode: string): boolean {
    if (!value || typeof value !== 'object') return false;
    const localizedValue = (value as Record<string, unknown>)[languageCode];
    return typeof localizedValue === 'string' && localizedValue.trim().length > 0;
}

function getLocalizedValue(value: unknown, languageCode: string): string {
    if (!value || typeof value !== 'object') return '';
    const localizedValue = (value as Record<string, unknown>)[languageCode];
    return typeof localizedValue === 'string' ? localizedValue.trim() : '';
}

function normalizeComparableText(value: string): string {
    return value
        .normalize('NFKC')
        .replace(/\s+/g, ' ')
        .trim()
        .toLocaleLowerCase();
}

function isLikelyWrongLanguageValue(sourceValue: string, targetValue: string, targetLanguageCode: string): boolean {
    if (!sourceValue.trim() || !targetValue.trim()) return false;

    const scriptMatcher = SCRIPT_MATCHERS[targetLanguageCode];
    if (!scriptMatcher) return false;

    if (normalizeComparableText(sourceValue) === normalizeComparableText(targetValue)) {
        return !scriptMatcher.test(targetValue) && /[A-Za-z]/.test(targetValue);
    }

    const hasExpectedScript = scriptMatcher.test(targetValue);
    const hasLatinLetters = /[A-Za-z]/.test(targetValue);

    return !hasExpectedScript && hasLatinLetters;
}

const shouldRepairItem = (itemId: string, governance?: TranslationGovernanceOptions) => (
    !governance?.itemStates || governance.itemStates[itemId] === 'local-only'
);

const shouldRepairCategory = (categoryId: string, governance?: TranslationGovernanceOptions) => (
    !governance?.categoryStates || governance.categoryStates[categoryId] === 'local-only'
);

function clearLanguageForRetranslation(
    fileData: any,
    targetLang: string,
    sourceLang: string,
    governance?: TranslationGovernanceOptions,
) {
    const updatedData = removeObjRef(fileData);

    updatedData.categories = (updatedData.categories || []).map((category: any) => {
        if (!shouldRepairCategory(category?.id, governance)) return category;
        if (!hasLocalizedValue(category?.name, sourceLang)) return category;
        return {
            ...category,
            name: {
                ...(category.name || {}),
                [targetLang]: '',
            },
        };
    });

    updatedData.items = (updatedData.items || []).map((item: any) => {
        if (!shouldRepairItem(item?.id, governance)) return item;
        const nextItem = { ...item };

        if (hasLocalizedValue(item?.name, sourceLang)) {
            nextItem.name = {
                ...(item.name || {}),
                [targetLang]: '',
            };
        }

        if (hasLocalizedValue(item?.description, sourceLang)) {
            nextItem.description = {
                ...(item.description || {}),
                [targetLang]: '',
            };
        }

        if (item?.attributes?.length) {
            nextItem.attributes = item.attributes.map((attribute: any) => {
                if (!hasLocalizedValue(attribute?.name, sourceLang)) return attribute;
                return {
                    ...attribute,
                    name: {
                        ...(attribute.name || {}),
                        [targetLang]: '',
                    },
                };
            });
        }

        return nextItem;
    });

    return updatedData;
}

export function getProjectLanguageIssues(
    projectData: Project,
    sourceLangCode: string,
    governance?: TranslationGovernanceOptions,
): LanguageIssueSummary[] {
    const projectLanguages = projectData.languages || ['en'];
    const secondaryLanguages = projectLanguages.filter((code) => code !== sourceLangCode);

    return secondaryLanguages.map((languageCode) => {
        let missing = 0;
        let mismatched = 0;

        projectData.files?.forEach((file) => {
            const data = file.extractedData?.data;
            if (!data) return;

            data.categories?.forEach((category) => {
                if (!shouldRepairCategory(category?.id, governance)) return;
                const sourceValue = getLocalizedValue(category?.name, sourceLangCode);
                const targetValue = getLocalizedValue(category?.name, languageCode);
                if (!sourceValue) return;
                if (!targetValue) {
                    missing += 1;
                    return;
                }
                if (isLikelyWrongLanguageValue(sourceValue, targetValue, languageCode)) {
                    mismatched += 1;
                }
            });

            data.items?.forEach((item) => {
                if (!shouldRepairItem(item?.id, governance)) return;
                const itemNameSource = getLocalizedValue(item?.name, sourceLangCode);
                const itemNameTarget = getLocalizedValue(item?.name, languageCode);
                if (itemNameSource) {
                    if (!itemNameTarget) {
                        missing += 1;
                    } else if (isLikelyWrongLanguageValue(itemNameSource, itemNameTarget, languageCode)) {
                        mismatched += 1;
                    }
                }

                const itemDescriptionSource = getLocalizedValue(item?.description, sourceLangCode);
                const itemDescriptionTarget = getLocalizedValue(item?.description, languageCode);
                if (itemDescriptionSource) {
                    if (!itemDescriptionTarget) {
                        missing += 1;
                    } else if (isLikelyWrongLanguageValue(itemDescriptionSource, itemDescriptionTarget, languageCode)) {
                        mismatched += 1;
                    }
                }

                item.attributes?.forEach((attribute) => {
                    const attributeSource = getLocalizedValue(attribute?.name, sourceLangCode);
                    const attributeTarget = getLocalizedValue(attribute?.name, languageCode);
                    if (!attributeSource) return;
                    if (!attributeTarget) {
                        missing += 1;
                    } else if (isLikelyWrongLanguageValue(attributeSource, attributeTarget, languageCode)) {
                        mismatched += 1;
                    }
                });
            });
        });

        return {
            code: languageCode,
            missing,
            mismatched,
            total: missing + mismatched,
        };
    });
}

export async function repairLanguageProject(
    baseProject: Project,
    targetLanguageCode: string,
    sourceLanguageCode: string,
    governance?: TranslationGovernanceOptions,
): Promise<Project> {
    const targetLang = GlobalLanguagesList.find((lang) => lang.code === targetLanguageCode);
    const sourceLang = GlobalLanguagesList.find((lang) => lang.code === sourceLanguageCode);
    if (!targetLang || !sourceLang) {
        return baseProject;
    }

    let updated = removeObjRef(baseProject);
    const filesToTranslate = updated.files?.filter((file) => file.extractedData?.data) || [];
    let translatedFilesCount = 0;

    for (const fileReference of filesToTranslate) {
        const candidateProject = removeObjRef(updated);
        const file = candidateProject.files?.find((entry) => entry.uid === fileReference.uid);
        if (!file?.extractedData?.data) continue;

        const fileLanguages = file.extractedData?.data?.languages || [];
        const hasLanguageOnFile = fileLanguages.some((language) => language.code === targetLang.code);

        if (!hasLanguageOnFile && file.extractedData?.data) {
            file.extractedData.data.languages = [
                ...fileLanguages,
                {
                    code: targetLang.code,
                    isPrimary: false,
                    name: targetLang.name,
                },
            ];
        }

        if (file.extractedData?.data) {
            file.extractedData.data = clearLanguageForRetranslation(
                file.extractedData.data,
                targetLang.code,
                sourceLang.code,
                governance,
            );
        }

        let result: Awaited<ReturnType<typeof translateFile>>;
        try {
            result = await translateFile(
                candidateProject,
                file,
                targetLang,
                sourceLang,
                AI_ACTIONS_TYPES.LANGUAGE_ADDITION,
                governance,
            );
        } catch (error) {
            if (translatedFilesCount > 0) {
                throw new LanguageRepairError(
                    'Translation repair stopped after completing earlier files.',
                    updated,
                    translatedFilesCount,
                    error,
                );
            }
            throw error;
        }

        if (result.messageType === 'error') {
            const error = new Error(result.message || 'Translation repair failed.');
            if (translatedFilesCount > 0) {
                throw new LanguageRepairError(
                    'Translation repair stopped after completing earlier files.',
                    updated,
                    translatedFilesCount,
                    error,
                );
            }
            throw error;
        }

        if (result.messageType === 'success') {
            translatedFilesCount += 1;
        }

        updated = result.updatedProject;
    }

    if (filesToTranslate.length > 0 && translatedFilesCount === 0) {
        throw new Error('No translations were rebuilt for the selected language.');
    }

    return updated;
}
