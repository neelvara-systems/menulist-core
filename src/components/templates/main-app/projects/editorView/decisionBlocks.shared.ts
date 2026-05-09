import { resolveBusinessCategory } from '@constant/common';
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

export function getDecisionBlockSettings(projectData: Project): DecisionBlockSettingsState {
    const currentSettings = projectData.menuSettings?.decisionBlocks || {};
    return {
        enablePopular: currentSettings.enablePopular !== false,
        enableQuickPick: currentSettings.enableQuickPick !== false,
        enableBestValue: currentSettings.enableBestValue !== false,
        pinnedPopular: currentSettings.pinnedPopular,
        pinnedQuickPick: currentSettings.pinnedQuickPick,
        pinnedBestValue: currentSettings.pinnedBestValue,
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
    pinnedId: string | undefined
): { unavailable: boolean; itemName?: string; reason?: string } {
    if (!pinnedId) return { unavailable: false };

    for (const file of files || []) {
        const items = file.extractedData?.data?.items || [];
        const item = items.find((entry) => entry.id === pinnedId);
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
