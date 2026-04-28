import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { updateProject } from '@database/projects';
import { getCanonicalProjectSourceLanguage } from '@lib/localization/languagePolicy';
import { logger } from '@lib/monitoring/logger';
import { addDescription, type DescriptionGovernanceOptions } from '@services/ai/description/descriptionUtils';
import getDescriptionsViaAPI from '@services/ai/description/generateDescriptionViaAPI';
import { removeObjRef } from '@util/utils';
import type { ExtractedDataItem, Project, ProjectFileType } from '../types';

export type DescriptionContentLength = 'Standard' | 'Detailed';
export type DescriptionTone = 'Professional';

export const DEFAULT_DESCRIPTION_TONE: DescriptionTone = 'Professional';

export const DESCRIPTION_LENGTH_OPTIONS: {
    value: DescriptionContentLength;
    label: string;
    description: string;
}[] = [
    { value: 'Standard', label: 'Standard', description: 'One clear sentence suitable for most menus' },
    { value: 'Detailed', label: 'Detailed', description: 'Rich, expressive descriptions for premium items' },
];

export function getDescriptionGenerationStats(
    projectData: Project,
    sourceFile: ProjectFileType | null | undefined,
    governance?: DescriptionGovernanceOptions
) {
    let itemsCount = 0;
    let itemsWithDescriptions = 0;
    let itemsWithoutDescriptions = 0;
    let manualDescriptionCount = 0;
    let aiDescriptionCount = 0;

    const filesToCheck = sourceFile
        ? projectData.files?.filter((file) => file.uid === sourceFile.uid)
        : projectData.files;
    const activeLanguages = projectData.languages?.filter(Boolean) || [];

    filesToCheck?.forEach((file) => {
        const items = file.extractedData?.data?.items || [];
        items.forEach((item: ExtractedDataItem) => {
            if (governance?.itemStates && governance.itemStates[item.id] !== 'local-only') {
                return;
            }

            itemsCount++;

            const hasDescription = item.description && (
                activeLanguages.length > 0
                    ? activeLanguages.every((languageCode) => {
                        const localizedDescription = item.description?.[languageCode];
                        return Boolean(localizedDescription && String(localizedDescription).trim().length > 0);
                    })
                    : Object.values(item.description).some((desc) => desc && String(desc).trim().length > 0)
            );

            if (hasDescription) {
                itemsWithDescriptions++;
            } else {
                itemsWithoutDescriptions++;
            }

            if (item.descriptionSource === 'manual') {
                manualDescriptionCount++;
            } else if (hasDescription) {
                aiDescriptionCount++;
            }
        });
    });

    return {
        aiDescriptionCount,
        itemsCount,
        itemsWithDescriptions,
        itemsWithoutDescriptions,
        manualDescriptionCount,
    };
}

type RunDescriptionGenerationParams = {
    action: string;
    contentLength: DescriptionContentLength;
    governance?: DescriptionGovernanceOptions;
    onFileProcessingIdChange?: (id: string | null) => void;
    onProgress?: (processedFiles: number, totalFiles: number, file?: ProjectFileType) => void;
    onProjectUpdate?: (project: Project) => void;
    projectData: Project;
    sourceFile?: ProjectFileType | null;
    tone?: DescriptionTone;
};

export async function runDescriptionGeneration({
    action,
    contentLength,
    governance,
    onFileProcessingIdChange,
    onProgress,
    onProjectUpdate,
    projectData,
    sourceFile,
    tone = DEFAULT_DESCRIPTION_TONE,
}: RunDescriptionGenerationParams): Promise<Project> {
    let nextProject = removeObjRef(projectData);
    const filesToProcess = nextProject.files?.filter((file) =>
        file.extractedData?.data && (sourceFile ? sourceFile.uid === file.uid : true)
    ) || [];

    const sourceLanguage = GlobalLanguagesList.find(
        (lang) => lang.code === getCanonicalProjectSourceLanguage(nextProject.languages),
    );
    const targetLanguages = nextProject.languages.map((lang) => GlobalLanguagesList.find((gl) => gl.code === lang)).filter(Boolean);

    let processedFiles = 0;
    for (const file of filesToProcess) {
        onFileProcessingIdChange?.(file.uid);
        const { updatedProject, message: resultMessage, messageType } = await addDescription(
            nextProject,
            file,
            targetLanguages as any,
            sourceLanguage as any,
            action,
            contentLength,
            tone,
            governance
        );

        if (messageType === 'error' && resultMessage) {
            logger.warn('Description generation returned error message', {
                fileId: file.uid,
                message: resultMessage,
                projectId: projectData.projectId,
            });
        }

        nextProject = updatedProject;
        processedFiles++;
        onProjectUpdate?.(updatedProject);
        onProgress?.(processedFiles, filesToProcess.length, file);
        onFileProcessingIdChange?.(null);
    }

    await updateProject({ ...nextProject, projectId: nextProject.projectId });
    return removeObjRef(nextProject);
}

type RunSingleItemDescriptionGenerationParams = {
    contentLength: DescriptionContentLength;
    item: ExtractedDataItem;
    projectData: Project;
    sourceFile: ProjectFileType;
    tone?: DescriptionTone;
};

type SingleItemDescriptionGenerationResult = {
    action: string;
    reason?: 'manual_protected' | 'missing_name' | 'missing_languages' | 'no_result';
    updatedItem: ExtractedDataItem;
};

export async function runSingleItemDescriptionGeneration({
    contentLength,
    item,
    projectData,
    sourceFile,
    tone = DEFAULT_DESCRIPTION_TONE,
}: RunSingleItemDescriptionGenerationParams): Promise<SingleItemDescriptionGenerationResult> {
    const sourceLanguage = GlobalLanguagesList.find(
        (lang) => lang.code === getCanonicalProjectSourceLanguage(projectData.languages),
    );
    const targetLanguages = projectData.languages
        .map((lang) => GlobalLanguagesList.find((gl) => gl.code === lang))
        .filter(Boolean);

    if (!sourceLanguage || targetLanguages.length === 0) {
        return {
            action: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
            reason: 'missing_languages',
            updatedItem: removeObjRef(item),
        };
    }

    const sourceName = item.name?.[sourceLanguage.code]?.trim();
    if (!sourceName) {
        return {
            action: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
            reason: 'missing_name',
            updatedItem: removeObjRef(item),
        };
    }

    const existingDescription = item.description?.[sourceLanguage.code]?.trim() || '';
    const action = existingDescription
        ? AI_ACTIONS_TYPES.REWRITE_DESCRIPTION
        : AI_ACTIONS_TYPES.ADD_DESCRIPTION;

    if (action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION && item.descriptionSource === 'manual') {
        return {
            action,
            reason: 'manual_protected',
            updatedItem: removeObjRef(item),
        };
    }

    const categoryName = sourceFile.extractedData?.data?.categories
        ?.find((category) => category.id === item.category)
        ?.name?.[sourceLanguage.code] || '';

    const generatedDescriptions = await getDescriptionsViaAPI({
        action,
        contentLength,
        fileId: sourceFile.uid,
        itemsList: [{
            attributes: (item.attributes || [])
                .map((attribute) => attribute.name?.[sourceLanguage.code]?.trim() || '')
                .filter(Boolean)
                .join(', '),
            category: categoryName,
            description: existingDescription,
            id: item.id,
            name: sourceName,
        }] as any,
        projectId: projectData.projectId,
        sourceLang: sourceLanguage,
        targetLang: targetLanguages as any,
        tone,
    });

    const nextDescription = generatedDescriptions?.[item.id] as unknown as Record<string, string> | undefined;

    if (!nextDescription) {
        return {
            action,
            reason: 'no_result',
            updatedItem: removeObjRef(item),
        };
    }

    return {
        action,
        updatedItem: {
            ...removeObjRef(item),
            description: {
                ...(item.description || {}),
                ...nextDescription,
            },
            descriptionSource: 'ai',
        },
    };
}
