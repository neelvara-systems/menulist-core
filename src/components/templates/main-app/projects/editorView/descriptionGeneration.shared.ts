import { AI_ACTIONS_TYPES } from '@constant/common';
import GlobalLanguagesList from '@data/languages';
import { assertProjectUpdateSucceeded, updateProject } from '@database/projects';
import { getCanonicalProjectSourceLanguage } from '@lib/localization/languagePolicy';
import { hasAnyNonEmptyDescription } from '@lib/menu/descriptionQuality';
import {
    addDescription,
    chunkDescriptionItems,
    prepareDescriptionPayload,
    type DescriptionAction,
    type DescriptionGovernanceOptions,
} from '@services/ai/description/descriptionUtils';
import getDescriptionsViaAPI from '@services/ai/description/generateDescriptionViaAPI';
import { removeObjRef } from '@util/utils';
import type { ExtractedDataItem, Project, ProjectFileType } from '../types';
import { getBoundedMenuEditorStringContext, getMenuEditorProjectLogContext, logMenuEditorFailure } from '../utils/editorDiagnostics';

export type DescriptionContentLength = 'Standard' | 'Detailed';
export type DescriptionTone = 'Professional' | 'Friendly' | 'Premium';

export const DEFAULT_DESCRIPTION_TONE: DescriptionTone = 'Professional';

export const DESCRIPTION_TONE_OPTIONS: {
    value: DescriptionTone;
    label: string;
    description: string;
}[] = [
    { value: 'Professional', label: 'Professional', description: 'Clear, neutral language for most menus' },
    { value: 'Friendly', label: 'Friendly', description: 'Warm, welcoming language that feels more personal' },
    { value: 'Premium', label: 'Premium', description: 'Polished language for signature or upscale items' },
];

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
    const sourceLanguageCode = getCanonicalProjectSourceLanguage(projectData.languages);

    filesToCheck?.forEach((file) => {
        const items = file.extractedData?.data?.items || [];
        items.forEach((item: ExtractedDataItem) => {
            if (governance?.itemStates && governance.itemStates[item.id] !== 'local-only') {
                return;
            }

            const sourceName = item.name?.[sourceLanguageCode]?.trim();
            if (!sourceName) return;

            itemsCount++;

            const sourceDescription = item.description?.[sourceLanguageCode]?.trim() || '';
            const hasManualDescription = item.descriptionSource === 'manual'
                && hasAnyNonEmptyDescription(item.description);
            const hasDescription = sourceDescription.length > 0
                || hasManualDescription;

            if (hasDescription) {
                itemsWithDescriptions++;
            } else {
                itemsWithoutDescriptions++;
            }

            if (hasManualDescription) {
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

export function getDescriptionGenerationRequestCount(
    projectData: Project,
    sourceFile: ProjectFileType | null | undefined,
    action: DescriptionAction,
    governance?: DescriptionGovernanceOptions,
): number {
    const sourceLanguageCode = getCanonicalProjectSourceLanguage(projectData.languages);
    const projectLanguageCodes = projectData.languages?.length
        ? projectData.languages
        : [sourceLanguageCode];
    const targetLanguageCount = projectLanguageCodes.filter((code) => (
        GlobalLanguagesList.some((language) => language.code === code)
    )).length;
    if (!GlobalLanguagesList.some((language) => language.code === sourceLanguageCode) || targetLanguageCount === 0) {
        return 0;
    }

    const filesToCheck = sourceFile
        ? projectData.files?.filter((file) => file.uid === sourceFile.uid)
        : projectData.files;

    return (filesToCheck || []).reduce((requestCount, file) => {
        const fileData = file.extractedData?.data;
        if (!fileData) return requestCount;
        const items = prepareDescriptionPayload(fileData, sourceLanguageCode, action, governance);
        return requestCount + chunkDescriptionItems(items, { targetLanguageCount }).length;
    }, 0);
}

type RunDescriptionGenerationParams = {
    action: DescriptionAction;
    contentLength: DescriptionContentLength;
    governance?: DescriptionGovernanceOptions;
    onFileProcessingIdChange?: (id: string | null) => void;
    onProgress?: (processedFiles: number, totalFiles: number, file?: ProjectFileType) => void;
    onProjectUpdate?: (project: Project) => void;
    persistProject?: (project: Project) => Promise<Project | void>;
    projectData: Project;
    skipPersist?: boolean;
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
    persistProject,
    projectData,
    skipPersist = false,
    sourceFile,
    tone = DEFAULT_DESCRIPTION_TONE,
}: RunDescriptionGenerationParams): Promise<Project> {
    let nextProject = removeObjRef(projectData);
    const filesToProcess = nextProject.files?.filter((file) =>
        file.extractedData?.data && (sourceFile ? sourceFile.uid === file.uid : true)
    ) || [];

    const sourceLanguageCode = getCanonicalProjectSourceLanguage(nextProject.languages);
    const sourceLanguage = GlobalLanguagesList.find((lang) => lang.code === sourceLanguageCode);
    const projectLanguageCodes = nextProject.languages?.length
        ? nextProject.languages
        : [sourceLanguageCode];
    const targetLanguages = projectLanguageCodes
        .map((lang) => GlobalLanguagesList.find((gl) => gl.code === lang))
        .filter((language): language is NonNullable<typeof language> => language !== undefined);
    if (!sourceLanguage || targetLanguages.length === 0) {
        throw new Error('Description generation languages are unavailable.');
    }

    const totalRequestCount = action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION
        ? getDescriptionGenerationRequestCount(nextProject, sourceFile, action, governance)
        : 0;
    // Preserve every single-request flow. Only the first eligible file sends
    // a multi-request count for server-side whole-scope capacity admission.
    let pendingOperationRequestCount = totalRequestCount > 1
        ? totalRequestCount
        : undefined;

    let processedFiles = 0;
    for (const file of filesToProcess) {
        try {
            onFileProcessingIdChange?.(file.uid);
            const descriptionResult = await addDescription(
                nextProject,
                file,
                targetLanguages,
                sourceLanguage,
                action,
                contentLength,
                tone,
                governance,
                pendingOperationRequestCount,
            );
            const { requestCount, updatedProject, messageType } = descriptionResult;
            const resultMessage = descriptionResult.message;

            if (requestCount > 0) {
                pendingOperationRequestCount = undefined;
            }

            if (messageType === 'error') {
                logMenuEditorFailure('menu_editor_description_generation_returned_error_message', new Error('description_generation_returned_error_message'), {
                    ...getMenuEditorProjectLogContext(projectData.projectId),
                    ...getBoundedMenuEditorStringContext('fileId', file.uid),
                    ...getBoundedMenuEditorStringContext('resultMessage', resultMessage),
                    ...getBoundedMenuEditorStringContext('messageType', messageType),
                });
                throw new Error('Description generation failed.');
            }

            nextProject = updatedProject;
            processedFiles++;
            onProgress?.(processedFiles, filesToProcess.length, file);
        } finally {
            onFileProcessingIdChange?.(null);
        }
    }

    if (!skipPersist) {
        if (persistProject) {
            await persistProject(removeObjRef(nextProject));
        } else {
            const savedProject = await updateProject({ ...nextProject, projectId: nextProject.projectId });
            assertProjectUpdateSucceeded(
                savedProject,
                nextProject.projectId,
                'menu_editor_description_generation_project_update_rejected',
            );
        }
    }
    onProjectUpdate?.(nextProject);
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
    reason?: 'manual_protected' | 'missing_name' | 'missing_languages' | 'missing_project' | 'no_result';
    updatedItem: ExtractedDataItem;
};

export async function runSingleItemDescriptionGeneration({
    contentLength,
    item,
    projectData,
    sourceFile,
    tone = DEFAULT_DESCRIPTION_TONE,
}: RunSingleItemDescriptionGenerationParams): Promise<SingleItemDescriptionGenerationResult> {
    const sourceLanguageCode = getCanonicalProjectSourceLanguage(projectData.languages);
    const sourceLanguage = GlobalLanguagesList.find((lang) => lang.code === sourceLanguageCode);
    const projectLanguageCodes = projectData.languages?.length
        ? projectData.languages
        : [sourceLanguageCode];
    const targetLanguages = projectLanguageCodes
        .map((lang) => GlobalLanguagesList.find((gl) => gl.code === lang))
        .filter((language): language is NonNullable<typeof language> => Boolean(language));

    if (!sourceLanguage || targetLanguages.length === 0) {
        return {
            action: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
            reason: 'missing_languages',
            updatedItem: removeObjRef(item),
        };
    }
    const projectId = projectData.projectId?.trim();
    if (!projectId) {
        return {
            action: AI_ACTIONS_TYPES.ADD_DESCRIPTION,
            reason: 'missing_project',
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

    if (
        item.descriptionSource === 'manual'
        && hasAnyNonEmptyDescription(item.description)
    ) {
        return {
            action,
            reason: 'manual_protected',
            updatedItem: removeObjRef(item),
        };
    }

    const [descriptionItem] = prepareDescriptionPayload({
        categories: sourceFile.extractedData?.data?.categories || [],
        items: [item],
    }, sourceLanguage.code, action);
    if (!descriptionItem) {
        return {
            action,
            reason: 'no_result',
            updatedItem: removeObjRef(item),
        };
    }

    const generatedDescriptions = await getDescriptionsViaAPI({
        action,
        contentLength,
        fileId: sourceFile.uid,
        itemsList: [descriptionItem],
        projectId,
        sourceLang: sourceLanguage,
        targetLang: targetLanguages,
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
