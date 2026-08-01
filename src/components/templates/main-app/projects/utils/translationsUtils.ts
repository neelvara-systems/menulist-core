import { AICapacityError } from "@services/ai/capacityError";
import { InheritanceState } from "@type/multiOutlet.types";
import { removeObjRef } from "@util/utils";
import { normalizeProjectLanguages } from "@lib/localization/languagePolicy";
import getTranslations from "../generateTranslations";
import { ExtractedDataCategory, ExtractedDataItem, LanguageActionType, LanguageType, Project, ProjectFileType } from '../types';
import {
    getBoundedTranslationStringContext,
    getTranslationLanguageLogContext,
    getTranslationScopeLogContext,
    logTranslationFailure,
    TranslationLogContext,
} from './translationDiagnostics';

/**
 * Multi-outlet translation governance options
 * 
 * Translation Rules:
 * - Standalone/Master stores: Can translate ALL items (whole menu)
 * - Outlet stores: Can ONLY translate local-only items (L_I_ prefix)
 *   - inherited items: translations come from master - DO NOT translate
 *   - overridden items: translations come from master - DO NOT translate
 *   - local-only items: outlet owns these - CAN translate
 */
export interface TranslationGovernanceOptions {
    /** Item inheritance states from resolved project */
    itemStates?: Record<string, InheritanceState>;
    /** Category inheritance states from resolved project */
    categoryStates?: Record<string, InheritanceState>;
}

const requireTranslationProjectId = (projectData: Project): string => {
    const projectId = projectData.projectId?.trim();
    if (!projectId) throw new Error('menu_translation_project_identity_missing');
    return projectId;
};

const getTranslationLogContext = (
    projectData: Project,
    file: ProjectFileType,
    targetLanguage: LanguageType,
    sourceLanguage: LanguageType,
    action: LanguageActionType,
    extra: TranslationLogContext = {},
): TranslationLogContext => ({
    ...getTranslationScopeLogContext(projectData.projectId, file.uid),
    ...getTranslationLanguageLogContext(targetLanguage.code, sourceLanguage.code),
    ...getBoundedTranslationStringContext('action', action),
    ...extra,
});

/**
 * Check if an item should be translated based on its inheritance state
 * 
 * For outlet stores (when itemStates is provided):
 * - ONLY local-only items can be translated
 * - inherited items: master controls translations
 * - overridden items: master controls translations (outlet only overrides price/availability)
 */
const shouldTranslateItem = (
    itemId: string,
    itemStates?: Record<string, InheritanceState>
): boolean => {
    // If no governance (standalone or master store), translate everything
    if (!itemStates) return true;

    const state = itemStates[itemId];
    // Outlet stores can ONLY translate local-only items
    // inherited/overridden items get translations from master
    return state === 'local-only';
};

/**
 * Check if a category should be translated based on its inheritance state
 * Same rules as items - outlets can only translate local-only categories
 */
const shouldTranslateCategory = (
    categoryId: string,
    categoryStates?: Record<string, InheritanceState>
): boolean => {
    // If no governance (standalone or master store), translate everything
    if (!categoryStates) return true;

    const state = categoryStates[categoryId];
    // Outlet stores can ONLY translate local-only categories
    return state === 'local-only';
};

/**
 * Clear stale translations when canonical source-language text changes.
 * 
 * Problem: If owner edits "Chicken Wings" → "Buffalo Wings" in English,
 * the Spanish translation "Alitas de Pollo" silently becomes wrong.
 * extractTranslatableStringsJSON skips it because target already exists.
 * 
 * Solution: When source text changes, clear non-source translations
 * for that field to empty string. This causes:
 * 1. extractTranslatableStringsJSON picks them up for retranslation
 * 2. Rendering falls back to the source language instead of showing wrong data
 * 3. Quality percentage drops, signaling owner needs to retranslate
 */
export const clearStaleTranslations = (
    originalItem: ExtractedDataItem,
    updatedItem: ExtractedDataItem,
    sourceLang: string,
    allLanguages: string[],
    options: { preserveGeneratedDescriptionTranslations?: boolean } = {},
): ExtractedDataItem => {
    if (allLanguages.length <= 1) return updatedItem;

    const result = { ...updatedItem };
    const nonSourceLangs = allLanguages.filter(l => l !== sourceLang);

    // Check if canonical source name changed
    if (originalItem.name?.[sourceLang]?.trim() !== updatedItem.name?.[sourceLang]?.trim()) {
        const clearedName = { ...result.name };
        for (const lang of nonSourceLangs) {
            if (clearedName[lang]) {
                clearedName[lang] = '';
            }
        }
        result.name = clearedName;
    }

    // Check if canonical source description changed
    if (
        !options.preserveGeneratedDescriptionTranslations
        && originalItem.description?.[sourceLang]?.trim() !== updatedItem.description?.[sourceLang]?.trim()
    ) {
        const clearedDesc = { ...(result.description || {}) };
        for (const lang of nonSourceLangs) {
            if (clearedDesc[lang]) {
                clearedDesc[lang] = '';
            }
        }
        result.description = clearedDesc;
    }

    // Check attributes
    if (updatedItem.attributes) {
        result.attributes = updatedItem.attributes.map(attr => {
            const origAttr = originalItem.attributes?.find(a => a.id === attr.id);
            if (origAttr && origAttr.name?.[sourceLang]?.trim() !== attr.name?.[sourceLang]?.trim()) {
                const clearedName = { ...attr.name };
                for (const lang of nonSourceLangs) {
                    if (clearedName[lang]) {
                        clearedName[lang] = '';
                    }
                }
                return { ...attr, name: clearedName };
            }
            return attr;
        });
    }

    return result;
};

/**
 * Clear stale category translations when canonical source-language name changes.
 * Same principle as clearStaleTranslations but for categories (name only).
 */
export const clearStaleCategoryTranslations = (
    originalName: Record<string, string> | undefined,
    updatedName: Record<string, string> | undefined,
    sourceLang: string,
    allLanguages: string[]
): Record<string, string> | undefined => {
    if (!updatedName || allLanguages.length <= 1) return updatedName;
    if (originalName?.[sourceLang]?.trim() === updatedName[sourceLang]?.trim()) return updatedName;

    const clearedName = { ...updatedName };
    const nonSourceLangs = allLanguages.filter(l => l !== sourceLang);
    for (const lang of nonSourceLangs) {
        if (clearedName[lang]) {
            clearedName[lang] = '';
        }
    }
    return clearedName;
};

/**
 * Get localized text with fallback to primary language.
 * Use this on customer-facing rendering to show primary language
 * instead of empty string when translation is missing or cleared.
 */
export const getLocalizedField = (
    textObj: Record<string, string> | undefined,
    lang: string,
    primaryLang: string
): string => {
    if (!textObj) return '';
    return textObj[lang]?.trim() || textObj[primaryLang]?.trim() || '';
};

// Merge translations back into the file data
export const mergeTranslations = (fileData: any, translations: Record<string, string>, targetLang: string, sourceLang: string) => {

    // Update category translations
    const updatedCategories = fileData.categories?.map((category: any) => {
        const translationKey = `${category.id}_c`;
        if (category.name?.[sourceLang] && translations[translationKey]) {
            return {
                ...category,
                name: {
                    ...category.name,
                    [targetLang]: translations[translationKey]
                }
            };
        }
        return category;
    });

    // Update item and attribute translations
    const updatedItems = fileData.items?.map((item: any) => {
        const updatedItem = { ...item };
        const itemNameKey = `${item.id}_i`;
        const itemDescKey = `${item.id}_d`;

        if (item.name?.[sourceLang] && translations[itemNameKey]) {
            updatedItem.name = {
                ...item.name,
                [targetLang]: translations[itemNameKey]
            };
        }

        if (item.description?.[sourceLang] && translations[itemDescKey]) {
            updatedItem.description = {
                ...item.description,
                [targetLang]: translations[itemDescKey]
            };
        }

        if (item.attributes) {
            updatedItem.attributes = item.attributes.map((attr: any) => {
                const attrTranslationKey = `${item.id}_${attr.id}_a`;
                if (attr.name?.[sourceLang] && translations[attrTranslationKey]) {
                    return {
                        ...attr,
                        name: {
                            ...attr.name,
                            [targetLang]: translations[attrTranslationKey]
                        }
                    };
                }
                return attr;
            });
        }

        return updatedItem;
    });

    return {
        ...fileData,
        categories: updatedCategories || fileData.categories,
        items: updatedItems || fileData.items
    };
};

/**
 * Extract all translatable strings from the file data
 * 
 * Multi-outlet governance: When itemStates/categoryStates are provided,
 * ONLY local-only items/categories are extracted for translation.
 * Inherited AND overridden items are skipped - translations come from master.
 * 
 * @param fileData - The extracted data from a file
 * @param targetLang - Target language code
 * @param sourceLang - Source language code
 * @param governance - Optional multi-outlet governance options
 */
export const extractTranslatableStringsJSON = (
    fileData: any,
    targetLang: string,
    sourceLang: string,
    governance?: TranslationGovernanceOptions
) => {
    const translationMap: Record<string, string> = {};

    // Extract category names (only local-only if governance provided)
    fileData.categories?.forEach((category: any) => {
        // Multi-outlet: Skip inherited categories
        if (!shouldTranslateCategory(category.id, governance?.categoryStates)) {
            return;
        }

        if (category.name?.[sourceLang] && !Boolean(category.name?.[targetLang])) {
            translationMap[`${category.id}_c`] = category.name[sourceLang];
        }
    });

    // Extract item names, descriptions, attributes (only local-only if governance provided)
    fileData.items?.forEach((item: any) => {
        // Multi-outlet: Skip inherited items - they should be translated at master level
        if (!shouldTranslateItem(item.id, governance?.itemStates)) {
            return;
        }

        if (item.name?.[sourceLang] && !Boolean(item.name?.[targetLang])) {
            translationMap[`${item.id}_i`] = item.name[sourceLang];
        }
        if (item.description?.[sourceLang] && !Boolean(item.description?.[targetLang])) {
            translationMap[`${item.id}_d`] = item.description[sourceLang];
        }

        item.attributes?.forEach((attr: any) => {
            if (attr.name?.[sourceLang] && !Boolean(attr.name?.[targetLang])) {
                translationMap[`${item.id}_${attr.id}_a`] = attr.name[sourceLang];
            }
        });
    });

    return translationMap;
};

/**
 * Translate a file's extractable content
 * 
 * @param projectData - The project data
 * @param file - The file to translate
 * @param targetLanguage - Target language
 * @param sourceLanguage - Source language
 * @param action - Translation action type
 * @param governance - Optional multi-outlet governance (filters out inherited items)
 */
export const translateFile = async (
    projectData: Project,
    file: ProjectFileType,
    targetLanguage: LanguageType,
    sourceLanguage: LanguageType,
    action: LanguageActionType,
    governance?: TranslationGovernanceOptions
) => {
    const prevData = removeObjRef(projectData)

    prevData.languages = normalizeProjectLanguages([
        ...(prevData.languages ?? []),
        targetLanguage.code,
    ]);

    if (file.extractedData?.data) {
        // Multi-outlet: Pass governance to filter out inherited items
        const translatableStringsJSON = extractTranslatableStringsJSON(
            file.extractedData.data,
            targetLanguage.code,
            sourceLanguage.code,
            governance
        );
        if (Object.keys(translatableStringsJSON).length === 0) {
            return {
                updatedProject: prevData,
                message: `No new translatable data found for language ${targetLanguage.name} (${targetLanguage.code})`,
                messageType: 'warning',
            };
        }

        try {
            const translations = await getTranslations({
                inputJson: translatableStringsJSON,
                targetLang: targetLanguage,
                sourceLang: sourceLanguage,
                action,
                projectId: requireTranslationProjectId(projectData),
                fileId: file.uid
            });
            if (translations) {
                const updated = {
                    ...prevData,
                    files: prevData.files?.map(f =>
                        f.uid === file.uid && f.extractedData?.data
                            ? {
                                ...f,
                                extractedData: {
                                    ...f.extractedData,
                                    data: mergeTranslations(f.extractedData.data, translations, targetLanguage.code, sourceLanguage.code)
                                }
                            }
                            : f
                    )
                }
                return { updatedProject: updated, message: `${targetLanguage.name} (${targetLanguage.code}) Translations added successfully`, messageType: "success" };
            } else {
                logTranslationFailure('menu_translation_file_empty_response', undefined, getTranslationLogContext(projectData, file, targetLanguage, sourceLanguage, action, {
                    translationKeyCount: Object.keys(translatableStringsJSON).length,
                }));
                return { updatedProject: prevData, message: "Error getting translations", messageType: "error" };
            }

        } catch (error) {
            if (error instanceof AICapacityError) throw error;
            logTranslationFailure('menu_translation_file_failed', error, getTranslationLogContext(projectData, file, targetLanguage, sourceLanguage, action, {
                translationKeyCount: Object.keys(translatableStringsJSON).length,
            }));
            return { updatedProject: prevData, message: "Error getting translations", messageType: "error" };
        }
    }
    return { updatedProject: prevData, message: "", messageType: "" };
}

export const mergeItemTranslations = (item: ExtractedDataItem, translations: Record<string, string>, targetLang: string, sourceLang: string) => {
    const updatedItem = { ...item };
    const itemNameKey = `${item.id}_i`;
    const itemDescKey = `${item.id}_d`;

    if (item.name?.[sourceLang] && translations[itemNameKey]) {
        updatedItem.name = {
            ...item.name,
            [targetLang]: translations[itemNameKey]
        };
    }

    if (item.description?.[sourceLang] && translations[itemDescKey]) {
        updatedItem.description = {
            ...item.description,
            [targetLang]: translations[itemDescKey]
        };
    }

    if (item.attributes) {
        updatedItem.attributes = item.attributes.map((attr: any) => {
            const attrTranslationKey = `${item.id}_${attr.id}_a`;
            if (attr.name?.[sourceLang] && translations[attrTranslationKey]) {
                return {
                    ...attr,
                    name: {
                        ...attr.name,
                        [targetLang]: translations[attrTranslationKey]
                    }
                };
            }
            return attr;
        });
    }

    return updatedItem;
}

export const mergeCategoryTranslations = (
    category: ExtractedDataCategory,
    translations: Record<string, string>,
    targetLang: string,
    sourceLang: string
) => {
    const translationKey = `${category.id}_c`;
    if (!category.name?.[sourceLang] || !translations[translationKey]) {
        return category;
    }

    return {
        ...category,
        name: {
            ...category.name,
            [targetLang]: translations[translationKey]
        }
    };
}

export const translateCategory = async (
    projectData: Project,
    file: ProjectFileType,
    targetLanguage: LanguageType,
    sourceLanguage: LanguageType,
    action: LanguageActionType,
    category: ExtractedDataCategory
) => {
    const sourceName = category.name?.[sourceLanguage.code]?.trim();
    if (!sourceName) {
        return {
            updatedCategory: category,
            message: `Category name in ${sourceLanguage.name} is required`,
            messageType: 'warning'
        };
    }

    if (category.name?.[targetLanguage.code]?.trim()) {
        return {
            updatedCategory: category,
            message: `No new translatable data found for language ${targetLanguage.name} (${targetLanguage.code})`,
            messageType: 'warning'
        };
    }

    try {
        const translations = await getTranslations({
            inputJson: {
                [`${category.id}_c`]: sourceName
            },
            targetLang: targetLanguage,
            sourceLang: sourceLanguage,
            action,
            projectId: requireTranslationProjectId(projectData),
            fileId: file.uid
        });

        if (translations) {
            return {
                updatedCategory: mergeCategoryTranslations(category, translations, targetLanguage.code, sourceLanguage.code),
                message: `${targetLanguage.name} (${targetLanguage.code}) translation added successfully`,
                messageType: 'success'
            };
        }

        logTranslationFailure('menu_translation_category_empty_response', undefined, getTranslationLogContext(projectData, file, targetLanguage, sourceLanguage, action, {
            ...getBoundedTranslationStringContext('categoryId', category.id),
            translationKeyCount: 1,
        }));
        return {
            updatedCategory: category,
            message: 'Error getting translations',
            messageType: 'error'
        };
    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logTranslationFailure('menu_translation_category_failed', error, getTranslationLogContext(projectData, file, targetLanguage, sourceLanguage, action, {
            ...getBoundedTranslationStringContext('categoryId', category.id),
            translationKeyCount: 1,
        }));
        return {
            updatedCategory: category,
            message: 'Error getting translations',
            messageType: 'error'
        };
    }
}

const extractItemTranslatableStringsJSON = (item: ExtractedDataItem, sourceLang: string) => {
    const translationMap: Record<string, string> = {};
    if (item.name?.[sourceLang]) {
        translationMap[`${item.id}_i`] = item.name[sourceLang];
    }
    if (item.description?.[sourceLang]) {
        translationMap[`${item.id}_d`] = item.description[sourceLang];
    }

    item.attributes?.forEach((attr) => {
        if (attr.name?.[sourceLang]) {
            translationMap[`${item.id}_${attr.id}_a`] = attr.name[sourceLang];
        }
    });
    return translationMap;
}

export const translateItem = async (projectData: Project, file: ProjectFileType, targetLanguage: LanguageType, sourceLanguage: LanguageType, action: LanguageActionType, item: ExtractedDataItem) => {
    const prevData = removeObjRef(projectData)

    if (file.extractedData?.data) {
        const translatableStringsJSON = extractItemTranslatableStringsJSON(item, sourceLanguage.code);
        if (Object.keys(translatableStringsJSON).length === 0) {
            return {
                updatedItem: item,
                message: `No new translatable data found for language ${targetLanguage.name} (${targetLanguage.code})`,
                messageType: 'warning',
            };
        }

        try {
            const translations = await getTranslations({
                inputJson: translatableStringsJSON,
                targetLang: targetLanguage,
                sourceLang: sourceLanguage,
                action,
                projectId: requireTranslationProjectId(projectData),
                fileId: file.uid
            });

            if (translations) {
                const updatedItem = mergeItemTranslations(item, translations, targetLanguage.code, sourceLanguage.code);
                return { updatedItem, message: `${targetLanguage.name} (${targetLanguage.code}) Translations updated successfully`, messageType: "success" };
            } else {
                logTranslationFailure('menu_translation_item_empty_response', undefined, getTranslationLogContext(projectData, file, targetLanguage, sourceLanguage, action, {
                    ...getBoundedTranslationStringContext('itemId', item.id),
                    translationKeyCount: Object.keys(translatableStringsJSON).length,
                }));
                return { updatedItem: item, message: "Error getting translations", messageType: "error" };
            }

        } catch (error) {
            if (error instanceof AICapacityError) throw error;
            logTranslationFailure('menu_translation_item_failed', error, getTranslationLogContext(projectData, file, targetLanguage, sourceLanguage, action, {
                ...getBoundedTranslationStringContext('itemId', item.id),
                translationKeyCount: Object.keys(translatableStringsJSON).length,
            }));
            return { updatedItem: item, message: "Error getting translations", messageType: "error" };
        }
    }
    return { updatedItem: item, message: "", messageType: "" };
}
