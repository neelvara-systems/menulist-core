import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { updateProject } from '@database/projects';
import { logger } from '@lib/monitoring/logger';
import { addDescription, type DescriptionGovernanceOptions } from '@services/ai/description/descriptionUtils';
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

    filesToCheck?.forEach((file) => {
        const items = file.extractedData?.data?.items || [];
        items.forEach((item: ExtractedDataItem) => {
            if (governance?.itemStates && governance.itemStates[item.id] !== 'local-only') {
                return;
            }

            itemsCount++;

            const hasDescription = item.description &&
                Object.values(item.description).some((desc) => desc && String(desc).trim().length > 0);

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

    const sourceLanguage = GlobalLanguagesList.find((lang) => lang.code === (nextProject.languages?.[0] || 'en'));
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
