import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { removeObjRef } from '@util/utils';
import type { Project } from '../types';
import { translateFile } from '../utils/translationsUtils';

export type LanguageIssueSummary = {
    code: string;
    missing: number;
    mismatched: number;
    total: number;
};

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

    if (normalizeComparableText(sourceValue) === normalizeComparableText(targetValue)) {
        return true;
    }

    const scriptMatcher = SCRIPT_MATCHERS[targetLanguageCode];
    if (!scriptMatcher) return false;

    const hasExpectedScript = scriptMatcher.test(targetValue);
    const hasLatinLetters = /[A-Za-z]/.test(targetValue);

    return !hasExpectedScript && hasLatinLetters;
}

function clearLanguageForRetranslation(fileData: any, targetLang: string, sourceLang: string) {
    const updatedData = removeObjRef(fileData);

    updatedData.categories = (updatedData.categories || []).map((category: any) => {
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

export function getProjectLanguageIssues(projectData: Project, sourceLangCode: string): LanguageIssueSummary[] {
    const projectLanguages = projectData.languages || ['en'];
    const secondaryLanguages = projectLanguages.filter((code) => code !== sourceLangCode);

    return secondaryLanguages.map((languageCode) => {
        let missing = 0;
        let mismatched = 0;

        projectData.files?.forEach((file) => {
            const data = file.extractedData?.data;
            if (!data) return;

            data.categories?.forEach((category) => {
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
    sourceLanguageCode: string
): Promise<Project> {
    const targetLang = GlobalLanguagesList.find((lang) => lang.code === targetLanguageCode);
    const sourceLang = GlobalLanguagesList.find((lang) => lang.code === sourceLanguageCode);
    if (!targetLang || !sourceLang) {
        return baseProject;
    }

    let updated = removeObjRef(baseProject);
    const filesToTranslate = updated.files?.filter((file) => file.extractedData?.data) || [];
    let translatedFilesCount = 0;

    for (const file of filesToTranslate) {
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
                sourceLang.code
            );
        }

        const result = await translateFile(
            updated,
            file,
            targetLang,
            sourceLang,
            AI_ACTIONS_TYPES.LANGUAGE_ADDITION
        );

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
