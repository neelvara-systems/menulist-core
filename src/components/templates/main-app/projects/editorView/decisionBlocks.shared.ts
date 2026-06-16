import { resolveBusinessCategory } from '@data/shared/businessTypes';
import { trackOwnerControlUsage } from '@database/ownerControlUsage';
import { removeObjRef } from '@util/utils';
import type { Project, ProjectFileType } from '../types/project.types';

export type DecisionBlockSettingsState = {
    enablePopular: boolean;
    enableQuickPick: boolean;
    enableBestValue: boolean;
    pinnedPopular?: string;
    pinnedQuickPick?: string;
    pinnedBestValue?: string;
};

export interface ItemOption {
    value: string;
    label: string;
    category: string;
}

function normalizePinnedItemId(value: unknown): string | undefined {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || undefined;
    }

    if (Array.isArray(value)) {
        for (const entry of value) {
            const normalized = normalizePinnedItemId(entry);
            if (normalized) return normalized;
        }
        return undefined;
    }

    if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        return normalizePinnedItemId(record.itemId ?? record.value ?? record.id);
    }

    return undefined;
}

function itemMatchesPinnedId(item: { id?: string; extractionIdAliases?: string[] }, pinnedId: string): boolean {
    return item.id === pinnedId || Boolean(item.extractionIdAliases?.includes(pinnedId));
}

function resolvePinnedItemId(files: ProjectFileType[], value: unknown): string | undefined {
    const pinnedId = normalizePinnedItemId(value);
    if (!pinnedId) return undefined;

    for (const file of files || []) {
        const items = file.extractedData?.data?.items || [];
        const matchedItem = items.find((item) => itemMatchesPinnedId(item, pinnedId));
        if (matchedItem?.id) return matchedItem.id;
    }

    return pinnedId;
}

export function getDecisionBlockSettings(projectData: Project): DecisionBlockSettingsState {
    const currentSettings = projectData.menuSettings?.decisionBlocks || {};
    const files = projectData.files || [];
    return {
        enablePopular: currentSettings.enablePopular !== false,
        enableQuickPick: currentSettings.enableQuickPick !== false,
        enableBestValue: currentSettings.enableBestValue !== false,
        pinnedPopular: resolvePinnedItemId(files, currentSettings.pinnedPopular),
        pinnedQuickPick: resolvePinnedItemId(files, currentSettings.pinnedQuickPick),
        pinnedBestValue: resolvePinnedItemId(files, currentSettings.pinnedBestValue),
    };
}

export function buildAllItemOptions(files: ProjectFileType[], activeLang: string): ItemOption[] {
    const options: ItemOption[] = [];
    files?.forEach((file) => {
        if (!file.extractedData?.data?.items) return;
        file.extractedData.data.items.forEach((item) => {
            if (item.active === false) return;
            const name = item.name?.[activeLang] || item.name?.en || 'Untitled item';
            options.push({
                value: item.id,
                label: name,
                category: item.category || '',
            });
        });
    });
    return options;
}

export function isPinnedItemUnavailable(
    files: ProjectFileType[],
    pinnedId: unknown
): { unavailable: boolean; itemName?: string; reason?: string } {
    const normalizedPinnedId = normalizePinnedItemId(pinnedId);
    if (!normalizedPinnedId) return { unavailable: false };

    let sawMenuItem = false;

    for (const file of files || []) {
        const items = file.extractedData?.data?.items || [];
        if (items.length > 0) sawMenuItem = true;
        const item = items.find((entry) => itemMatchesPinnedId(entry, normalizedPinnedId));
        if (!item) continue;

        if (item.available === false) {
            return {
                unavailable: true,
                itemName: item.name?.en || 'This item',
                reason: 'marked as unavailable',
            };
        }

        if (item.active === false) {
            return {
                unavailable: true,
                itemName: item.name?.en || 'This item',
                reason: 'disabled',
            };
        }

        return { unavailable: false };
    }

    if (!sawMenuItem) {
        return { unavailable: false };
    }

    return {
        unavailable: true,
        itemName: 'Pinned item',
        reason: 'not found (may have been deleted)',
    };
}

export function getCategoryName(files: ProjectFileType[], categoryId: string, activeLang: string): string {
    for (const file of files || []) {
        const category = file.extractedData?.data?.categories?.find((entry) => entry.id === categoryId);
        if (category) {
            return category.name?.[activeLang] || category.name?.en || 'Unknown';
        }
    }
    return '';
}

export function getFilteredDecisionBlockOptionIds(
    currentBlock: 'popular' | 'quickPick' | 'bestValue',
    settings: DecisionBlockSettingsState
) {
    const pinnedIds = new Set<string>();
    if (currentBlock !== 'popular' && settings.pinnedPopular) pinnedIds.add(settings.pinnedPopular);
    if (currentBlock !== 'quickPick' && settings.pinnedQuickPick) pinnedIds.add(settings.pinnedQuickPick);
    if (currentBlock !== 'bestValue' && settings.pinnedBestValue) pinnedIds.add(settings.pinnedBestValue);
    return pinnedIds;
}

export function hasDecisionBlockChanges(projectData: Project, nextSettings: DecisionBlockSettingsState) {
    const currentSettings = getDecisionBlockSettings(projectData);
    return (
        nextSettings.enablePopular !== currentSettings.enablePopular ||
        nextSettings.enableQuickPick !== currentSettings.enableQuickPick ||
        nextSettings.enableBestValue !== currentSettings.enableBestValue ||
        nextSettings.pinnedPopular !== currentSettings.pinnedPopular ||
        nextSettings.pinnedQuickPick !== currentSettings.pinnedQuickPick ||
        nextSettings.pinnedBestValue !== currentSettings.pinnedBestValue
    );
}

export function trackDecisionBlockChanges(projectData: Project, nextSettings: DecisionBlockSettingsState) {
    const currentSettings = getDecisionBlockSettings(projectData);

    if (nextSettings.enablePopular !== currentSettings.enablePopular) {
        trackOwnerControlUsage('enablePopular', {
            previousValue: currentSettings.enablePopular,
            newValue: nextSettings.enablePopular,
            projectId: projectData.projectId,
        });
    }
    if (nextSettings.enableQuickPick !== currentSettings.enableQuickPick) {
        trackOwnerControlUsage('enableQuickPick', {
            previousValue: currentSettings.enableQuickPick,
            newValue: nextSettings.enableQuickPick,
            projectId: projectData.projectId,
        });
    }
    if (nextSettings.enableBestValue !== currentSettings.enableBestValue) {
        trackOwnerControlUsage('enableBestValue', {
            previousValue: currentSettings.enableBestValue,
            newValue: nextSettings.enableBestValue,
            projectId: projectData.projectId,
        });
    }
    if (nextSettings.pinnedPopular !== currentSettings.pinnedPopular) {
        trackOwnerControlUsage('pinnedPopular', {
            previousValue: currentSettings.pinnedPopular,
            newValue: nextSettings.pinnedPopular,
            projectId: projectData.projectId,
        });
    }
    if (nextSettings.pinnedQuickPick !== currentSettings.pinnedQuickPick) {
        trackOwnerControlUsage('pinnedQuickPick', {
            previousValue: currentSettings.pinnedQuickPick,
            newValue: nextSettings.pinnedQuickPick,
            projectId: projectData.projectId,
        });
    }
    if (nextSettings.pinnedBestValue !== currentSettings.pinnedBestValue) {
        trackOwnerControlUsage('pinnedBestValue', {
            previousValue: currentSettings.pinnedBestValue,
            newValue: nextSettings.pinnedBestValue,
            projectId: projectData.projectId,
        });
    }
}

export function applyDecisionBlockSettings(projectData: Project, nextSettings: DecisionBlockSettingsState): Project {
    const updatedProject = removeObjRef(projectData) as Project;
    if (!updatedProject.menuSettings) {
        updatedProject.menuSettings = {};
    }

    updatedProject.menuSettings.decisionBlocks = {
        enablePopular: nextSettings.enablePopular,
        enableQuickPick: nextSettings.enableQuickPick,
        enableBestValue: nextSettings.enableBestValue,
        pinnedPopular: nextSettings.pinnedPopular,
        pinnedQuickPick: nextSettings.pinnedQuickPick,
        pinnedBestValue: nextSettings.pinnedBestValue,
    };

    return updatedProject;
}

export function getNormalizedDecisionBusinessType(businessType?: string) {
    return resolveBusinessCategory(businessType);
}
