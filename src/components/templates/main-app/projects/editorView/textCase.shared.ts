import { removeObjRef } from '@util/utils';
import type { Project } from '../types';

export type TextCaseMode = 'lower' | 'upper' | 'sentence' | 'title';

export interface TextCaseConfig {
    applyToAttributes: boolean;
    applyToCategories: boolean;
    applyToDescriptions: boolean;
    applyToItems: boolean;
    mode: TextCaseMode;
}

export interface TextCasePreview {
    attributes: number;
    categories: number;
    descriptions: number;
    items: number;
    totalFields: number;
}

export function convertTextCase(value: string, mode: TextCaseMode): string {
    if (!value.trim()) return value;

    if (mode === 'lower') return value.toLowerCase();
    if (mode === 'upper') return value.toUpperCase();
    if (mode === 'sentence') {
        const normalized = value.toLowerCase();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    return value
        .toLowerCase()
        .replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

export function updateLocalizedTextCase(value: unknown, mode: TextCaseMode): unknown {
    if (typeof value === 'string') {
        return convertTextCase(value, mode);
    }

    if (!value || typeof value !== 'object') {
        return value;
    }

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([language, textValue]) => ([
            language,
            typeof textValue === 'string' ? convertTextCase(textValue, mode) : textValue,
        ]))
    );
}

function countLocalizedTextValues(value: unknown): number {
    if (typeof value === 'string') {
        return value.trim() ? 1 : 0;
    }

    if (!value || typeof value !== 'object') {
        return 0;
    }

    return Object.values(value as Record<string, unknown>).filter(
        (entry) => typeof entry === 'string' && entry.trim().length > 0
    ).length;
}

export function getTextCasePreview(projectData: Project, config: TextCaseConfig): TextCasePreview {
    const preview: TextCasePreview = {
        attributes: 0,
        categories: 0,
        descriptions: 0,
        items: 0,
        totalFields: 0,
    };

    projectData.files?.forEach((file: any) => {
        file.extractedData?.data?.categories?.forEach((category: any) => {
            if (config.applyToCategories) {
                preview.categories += countLocalizedTextValues(category.name);
            }
        });

        file.extractedData?.data?.items?.forEach((item: any) => {
            if (config.applyToItems) {
                preview.items += countLocalizedTextValues(item.name);
            }
            if (config.applyToDescriptions) {
                preview.descriptions += countLocalizedTextValues(item.description);
            }
            if (config.applyToAttributes) {
                item.attributes?.forEach((attribute: any) => {
                    preview.attributes += countLocalizedTextValues(attribute.name);
                });
            }
        });
    });

    preview.totalFields = preview.categories + preview.items + preview.descriptions + preview.attributes;
    return preview;
}

export function applyTextCaseToProject(projectData: Project, config: TextCaseConfig): Project {
    const updated = removeObjRef(projectData);

    updated.files?.forEach((file: any) => {
        file.extractedData?.data?.categories?.forEach((category: any) => {
            if (config.applyToCategories) {
                category.name = updateLocalizedTextCase(category.name, config.mode);
            }
        });

        file.extractedData?.data?.items?.forEach((item: any) => {
            if (config.applyToItems) {
                item.name = updateLocalizedTextCase(item.name, config.mode);
            }
            if (config.applyToDescriptions) {
                item.description = updateLocalizedTextCase(item.description, config.mode);
            }
            if (config.applyToAttributes) {
                item.attributes?.forEach((attribute: any) => {
                    attribute.name = updateLocalizedTextCase(attribute.name, config.mode);
                });
            }
        });
    });

    return updated;
}
