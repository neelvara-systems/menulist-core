import type { Project } from '@template/main-app/projects/types';
import type { AiMenuManagerExecutionDirective, AiMenuManagerProjectPatch } from '@type/aiMenuManager';
import { removeObjRef } from '@util/utils';
import { stableStringify } from '../idempotency';

function applyItemUpdates(project: Project, patch: AiMenuManagerProjectPatch) {
    const itemIds = new Set(patch.itemIds || []);
    if (!itemIds.size || (!patch.updates && !patch.itemUpdates)) return project;

    project.files?.forEach((file) => {
        const data = file.extractedData?.data;
        if (!data?.items?.length) return;

        data.items = data.items.map((item) => {
            if (!itemIds.has(item.id)) return item;
            const updates = {
                ...(patch.updates || {}),
                ...(patch.itemUpdates?.[item.id] || {}),
            };
            const localizedUpdates = Object.fromEntries(
                Object.entries(updates).map(([key, value]) => {
                    if ((key === 'name' || key === 'description') && value && typeof value === 'object' && !Array.isArray(value)) {
                        return [key, {
                            ...((item as any)[key] || {}),
                            ...(value as Record<string, unknown>),
                        }];
                    }
                    return [key, value];
                }),
            );
            return {
                ...item,
                ...localizedUpdates,
            };
        });
    });

    return project;
}

function applyCategoryUpdates(project: Project, patch: AiMenuManagerProjectPatch) {
    const categoryIds = new Set(patch.categoryIds || []);
    if (!categoryIds.size || !patch.updates) return project;

    project.files?.forEach((file) => {
        const data = file.extractedData?.data;
        if (!data?.categories?.length) return;

        data.categories = data.categories.map((category) => {
            if (!categoryIds.has(category.id)) return category;
            const updates = Object.fromEntries(
                Object.entries(patch.updates || {}).map(([key, value]) => {
                    if (key === 'name' && value && typeof value === 'object' && !Array.isArray(value)) {
                        return [key, {
                            ...(category.name || {}),
                            ...(value as Record<string, unknown>),
                        }];
                    }
                    return [key, value];
                }),
            );
            return {
                ...category,
                ...updates,
            };
        });
    });

    return project;
}

function applyAttributeUpdates(project: Project, patch: AiMenuManagerProjectPatch) {
    const itemIds = new Set(patch.itemIds || []);
    const attributeIds = new Set(patch.attributeIds || (patch.attributeId ? [patch.attributeId] : []));
    if (!attributeIds.size || !patch.updates) return project;

    project.files?.forEach((file) => {
        const data = file.extractedData?.data;
        if (!data?.items?.length) return;

        data.items = data.items.map((item) => {
            if (itemIds.size && !itemIds.has(item.id)) return item;
            if (!item.attributes?.length) return item;

            return {
                ...item,
                attributes: item.attributes.map((attribute) => {
                    if (!attributeIds.has(attribute.id)) return attribute;
                    return {
                        ...attribute,
                        ...patch.updates,
                    };
                }),
            };
        });
    });

    return project;
}

function applyMenuSettingsUpdate(project: Project, patch: AiMenuManagerProjectPatch) {
    project.menuSettings = {
        ...(project.menuSettings || {}),
        ...(patch.menuSettings || {}),
    };
    return project;
}

function applyDecisionBlocksUpdate(project: Project, patch: AiMenuManagerProjectPatch) {
    project.menuSettings = {
        ...(project.menuSettings || {}),
        decisionBlocks: {
            ...((project.menuSettings as any)?.decisionBlocks || {}),
            ...(patch.decisionBlocks || {}),
        },
    };
    return project;
}

function applyDesignPreset(project: Project, patch: AiMenuManagerProjectPatch) {
    const currentConfig = (project.config || {}) as any;
    project.config = {
        ...currentConfig,
        design: {
            ...(currentConfig.design || {}),
            menu: {
                ...(currentConfig.design?.menu || {}),
                ...(patch.designPatch?.menu || {}),
            },
            brand: {
                ...(currentConfig.design?.brand || {}),
                ...(patch.designPatch?.brand || {}),
            },
        },
    } as any;
    return project;
}

export function applyAiMenuManagerProjectPatch(
    project: Project,
    directive: AiMenuManagerExecutionDirective,
): Project {
    const nextProject = removeObjRef(project) as Project;
    const patch = directive.patch;

    if (patch.kind === 'item_update' || patch.kind === 'bulk_item_update') {
        return applyItemUpdates(nextProject, patch);
    }

    if (patch.kind === 'category_update') {
        return applyCategoryUpdates(nextProject, patch);
    }

    if (patch.kind === 'attribute_update') {
        return applyAttributeUpdates(nextProject, patch);
    }

    if (patch.kind === 'menu_settings_update') {
        return applyMenuSettingsUpdate(nextProject, patch);
    }

    if (patch.kind === 'decision_blocks_update') {
        return applyDecisionBlocksUpdate(nextProject, patch);
    }

    if (patch.kind === 'menu_design_preset_apply') {
        return applyDesignPreset(nextProject, patch);
    }

    return nextProject;
}

export function projectContainsAiMenuManagerPatch(project: Project, patch: AiMenuManagerProjectPatch) {
    if (patch.kind === 'item_update' || patch.kind === 'bulk_item_update') {
        const itemIds = new Set(patch.itemIds || []);
        const updates = patch.updates || {};
        if (!itemIds.size) return false;

        const matchedItems: Record<string, boolean> = {};
        project.files?.forEach((file) => {
            file.extractedData?.data?.items?.forEach((item) => {
                if (!itemIds.has(item.id)) return;
                const expectedUpdates = {
                    ...updates,
                    ...(patch.itemUpdates?.[item.id] || {}),
                };
                matchedItems[item.id] = Object.entries(expectedUpdates).every(([key, value]) => {
                    if ((key === 'name' || key === 'description') && value && typeof value === 'object' && !Array.isArray(value)) {
                        return Object.entries(value as Record<string, unknown>).every(([lang, localizedValue]) => (
                            stableStringify((item as any)[key]?.[lang]) === stableStringify(localizedValue)
                        ));
                    }
                    return stableStringify((item as any)[key]) === stableStringify(value);
                });
            });
        });

        return Array.from(itemIds).every((id) => matchedItems[id] === true);
    }

    if (patch.kind === 'category_update') {
        const categoryIds = new Set(patch.categoryIds || []);
        const updates = patch.updates || {};
        if (!categoryIds.size) return false;

        const matchedCategories: Record<string, boolean> = {};
        project.files?.forEach((file) => {
            file.extractedData?.data?.categories?.forEach((category) => {
                if (!categoryIds.has(category.id)) return;
                matchedCategories[category.id] = Object.entries(updates).every(([key, value]) => {
                    if (key === 'name' && value && typeof value === 'object' && !Array.isArray(value)) {
                        return Object.entries(value as Record<string, unknown>).every(([lang, localizedValue]) => (
                            stableStringify((category as any)[key]?.[lang]) === stableStringify(localizedValue)
                        ));
                    }
                    return stableStringify((category as any)[key]) === stableStringify(value);
                });
            });
        });

        return Array.from(categoryIds).every((id) => matchedCategories[id] === true);
    }

    if (patch.kind === 'attribute_update') {
        const itemIds = new Set(patch.itemIds || []);
        const attributeIds = new Set(patch.attributeIds || (patch.attributeId ? [patch.attributeId] : []));
        const updates = patch.updates || {};
        if (!attributeIds.size) return false;

        const matchedAttributes: Record<string, boolean> = {};
        project.files?.forEach((file) => {
            file.extractedData?.data?.items?.forEach((item) => {
                if (itemIds.size && !itemIds.has(item.id)) return;
                item.attributes?.forEach((attribute) => {
                    if (!attributeIds.has(attribute.id)) return;
                    matchedAttributes[attribute.id] = Object.entries(updates).every(([key, value]) => (
                        stableStringify((attribute as any)[key]) === stableStringify(value)
                    ));
                });
            });
        });

        return Array.from(attributeIds).every((id) => matchedAttributes[id] === true);
    }

    if (patch.kind === 'menu_settings_update') {
        return Object.entries(patch.menuSettings || {}).every(([key, value]) => {
            const stored = (project.menuSettings as any)?.[key];
            if (key === 'specialNote' && typeof value === 'string' && stored && typeof stored === 'object') {
                return Object.values(stored).some((entry) => entry === value);
            }
            return stableStringify(stored) === stableStringify(value);
        });
    }

    if (patch.kind === 'decision_blocks_update') {
        const stored = (project.menuSettings as any)?.decisionBlocks || {};
        return Object.entries(patch.decisionBlocks || {}).every(([key, value]) => (
            stableStringify(stored[key]) === stableStringify(value)
        ));
    }

    if (patch.kind === 'menu_design_preset_apply') {
        const menuMatches = Object.entries(patch.designPatch?.menu || {}).every(([key, value]) => (
            (project.config?.design?.menu as any)?.[key] === value
        ));
        const brandMatches = Object.entries(patch.designPatch?.brand || {}).every(([key, value]) => (
            (project.config?.design?.brand as any)?.[key] === value
        ));
        return menuMatches && brandMatches;
    }

    return false;
}
