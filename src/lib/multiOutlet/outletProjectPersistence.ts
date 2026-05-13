import type { Project, ProjectFileType } from '@template/main-app/projects/types';
import GlobalLanguagesList from '@data/languages';
import { isLocalCategory, isLocalItem } from '@type/multiOutlet.types';

function toExtractedDataLanguages(languages?: string[]) {
    return (languages || []).map((code, index) => {
        const language = GlobalLanguagesList.find(candidate => candidate.code === code);
        return {
            code,
            name: language?.name || code,
            isPrimary: index === 0,
        };
    });
}

function cloneLocalFileShell(
    displayProject: Project,
    rawStoreProject?: Project | null,
): ProjectFileType {
    const rawFirstFile = rawStoreProject?.files?.[0];
    const displayFirstFile = displayProject.files?.[0];

    return {
        ...(rawFirstFile || {}),
        uid: rawFirstFile?.uid || `local-${displayProject.projectId || displayProject.masterProjectId || 'outlet-menu'}`,
        extractedData: {
            ...(rawFirstFile?.extractedData || displayFirstFile?.extractedData || {}),
            data: {
                ...(rawFirstFile?.extractedData?.data || {}),
                categories: [],
                items: [],
                languages: rawFirstFile?.extractedData?.data?.languages
                    || displayFirstFile?.extractedData?.data?.languages
                    || toExtractedDataLanguages(displayProject.languages),
            },
        },
    };
}

export function stripResolvedOutletProjectForSave(
    displayProject: Project,
    rawStoreProject?: Project | null,
): Project {
    const nextProject: Project = {
        ...(rawStoreProject || {}),
        ...displayProject,
        overrides: {
            items: {
                ...(rawStoreProject?.overrides?.items || {}),
                ...(displayProject.overrides?.items || {}),
            },
            categories: {
                ...(rawStoreProject?.overrides?.categories || {}),
                ...(displayProject.overrides?.categories || {}),
            },
            attributes: {
                ...(rawStoreProject?.overrides?.attributes || {}),
                ...(displayProject.overrides?.attributes || {}),
            },
        },
    };
    delete (nextProject as any)._resolved;

    if (!displayProject.masterProjectId) {
        return nextProject;
    }

    const localCategories: any[] = [];
    const localItems: any[] = [];
    const seenCategoryIds = new Set<string>();
    const seenItemIds = new Set<string>();

    displayProject.files?.forEach(file => {
        file.extractedData?.data?.categories?.forEach((category: any) => {
            if (!category?.id || !isLocalCategory(category.id) || seenCategoryIds.has(category.id)) return;
            seenCategoryIds.add(category.id);
            localCategories.push(category);
        });
        file.extractedData?.data?.items?.forEach((item: any) => {
            if (!item?.id || !isLocalItem(item.id) || seenItemIds.has(item.id)) return;
            seenItemIds.add(item.id);
            localItems.push(item);
        });
    });

    if (!localCategories.length && !localItems.length && !rawStoreProject?.files?.length) {
        nextProject.files = [];
        return nextProject;
    }

    const localFile = cloneLocalFileShell(displayProject, rawStoreProject);
    localFile.extractedData = localFile.extractedData || { data: { categories: [], items: [], languages: [] } };
    localFile.extractedData.data = localFile.extractedData.data || { categories: [], items: [], languages: [] };
    localFile.extractedData.data.categories = localCategories;
    localFile.extractedData.data.items = localItems;
    localFile.extractedData.data.languages = localFile.extractedData.data.languages || [];
    nextProject.files = [localFile];

    return nextProject;
}
