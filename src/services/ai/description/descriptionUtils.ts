import { AI_ACTIONS_TYPES } from "@constant/common";
import { logger } from "@lib/monitoring/logger";
import { AICapacityError } from "@services/ai/capacityError";
import type { DescriptionTone } from "@template/main-app/projects/editorView/descriptionGeneration.shared";
import { LanguageType, Project, ProjectFileType } from "@template/main-app/projects/types";
import { InheritanceState } from "@type/multiOutlet.types";
import { removeObjRef } from "@util/utils";
import getDescriptionsViaAPI from "./generateDescriptionViaAPI";

/**
 * Multi-outlet description governance options
 * 
 * Description Generation Rules:
 * - Standalone/Master stores: Can generate descriptions for ALL items
 * - Outlet stores: Can ONLY generate descriptions for local-only items (L_I_ prefix)
 *   - inherited items: descriptions come from master - DO NOT generate
 *   - overridden items: descriptions come from master - DO NOT generate
 *   - local-only items: outlet owns these - CAN generate
 */
export interface DescriptionGovernanceOptions {
    /** Item inheritance states from resolved project */
    itemStates?: Record<string, InheritanceState>;
}

/**
 * Check if an item should have descriptions generated based on its inheritance state
 * 
 * For outlet stores (when itemStates is provided):
 * - ONLY local-only items can have descriptions generated
 * - inherited items: master controls descriptions
 * - overridden items: master controls descriptions (outlet only overrides price/availability)
 */
const shouldGenerateDescriptionForItem = (
    itemId: string,
    itemStates?: Record<string, InheritanceState>
): boolean => {
    // If no governance (standalone or master store), generate for everything
    if (!itemStates) return true;

    const state = itemStates[itemId];
    // Outlet stores can ONLY generate descriptions for local-only items
    // inherited/overridden items get descriptions from master
    return state === 'local-only';
};

export const prepareDescriptionPayload = (
    fileData: any,
    sourceLang: string,
    action: string,
    governance?: DescriptionGovernanceOptions
) => {
    const payloadList: any = [];

    // Extract item names and attribute names (only local-only if governance provided)
    fileData.items?.forEach((item: any) => {
        // Multi-outlet: Skip inherited/overridden items - they get descriptions from master
        if (!shouldGenerateDescriptionForItem(item.id, governance?.itemStates)) {
            return;
        }

        if (item.name?.[sourceLang]) {
            const existingDescription = item.description?.[sourceLang]?.trim();
            const descriptionSource = item.descriptionSource;

            // For ADD_DESCRIPTION: only include items WITHOUT descriptions (skip items that already have)
            if (action === AI_ACTIONS_TYPES.ADD_DESCRIPTION && existingDescription) {
                return; // Skip - already has description
            }

            // For REWRITE_DESCRIPTION: protect manually written descriptions
            if (action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION && descriptionSource === 'manual') {
                return; // Skip - manually written, protected from refresh
            }

            payloadList.push({
                id: item.id,
                name: item.name[sourceLang],
                category: fileData.categories?.find((cat: any) => cat.id === item.category)?.name[sourceLang],
                attributes: (item.attributes?.map((attr: any) => attr.name[sourceLang]))?.join(', ') || "",
                description: existingDescription || ""
            });
        }
    });

    return payloadList;
};

export const mergeDescription = (fileData: any, generatedDescription: any) => {
    const updatedFileData = removeObjRef(fileData);
    updatedFileData.items?.forEach((item: any) => {
        if (generatedDescription[item.id]) {
            item.description = { ...item.description, ...generatedDescription[item.id] };
            item.descriptionSource = 'ai'; // Mark as AI-generated so it can be refreshed later
        }
    });
    return updatedFileData;
};

export const addDescription = async (
    projectData: Project,
    file: ProjectFileType,
    targetLanguages: LanguageType[],
    sourceLanguage: LanguageType,
    action: any,
    contentLength: "Standard" | "Detailed",
    tone: DescriptionTone = "Professional",
    governance?: DescriptionGovernanceOptions
) => {
    const prevData = removeObjRef(projectData)

    if (file.extractedData?.data) {
        // Multi-outlet: Pass governance to filter out inherited/overridden items
        const itemsList = prepareDescriptionPayload(file.extractedData.data, sourceLanguage.code, action, governance);

        // Skip API call if no items to process (e.g., all items already have descriptions for ADD_DESCRIPTION)
        if (itemsList.length === 0) {
            logger.debug('Skipping description generation - no items to process', {
                action,
                projectId: projectData.projectId,
                fileId: file.uid
            });
            return { updatedProject: prevData, message: "", messageType: "" };
        }

        logger.debug('Generating descriptions', {
            itemsCount: itemsList.length,
            targetLanguages: targetLanguages.map(l => l.code),
            sourceLanguage: sourceLanguage.code,
            projectId: projectData.projectId,
            fileId: file.uid,
            contentLength,
            tone
        });

        try {
            const generatedDescription = await getDescriptionsViaAPI({
                itemsList,
                targetLang: targetLanguages,
                sourceLang: sourceLanguage,
                action,
                projectId: projectData.projectId,
                fileId: file.uid,
                contentLength,
                tone
            });
            if (generatedDescription) {
                const updated = {
                    ...prevData,
                    files: prevData.files?.map(f =>
                        f.uid === file.uid
                            ? {
                                ...f,
                                extractedData: {
                                    ...f.extractedData,
                                    data: mergeDescription(f.extractedData.data, generatedDescription)
                                }
                            }
                            : f
                    )
                }
                return { updatedProject: updated, message: `${targetLanguages.map(l => l.name).join(', ')} (${targetLanguages.map(l => l.code).join(', ')}) Descriptions added successfully`, messageType: "success" };
            } else {
                logger.warn('Description generation returned no data', {
                    targetLanguages: targetLanguages.map(l => l.code),
                    sourceLanguage: sourceLanguage.code
                });
                return { updatedProject: prevData, message: "Error getting descriptions", messageType: "error" };
            }

        } catch (error) {
            if (error instanceof AICapacityError) throw error;
            logger.error('Description generation failed', error, {
                targetLanguages: targetLanguages.map(l => l.code),
                sourceLanguage: sourceLanguage.code,
                projectId: projectData.projectId
            });
            return { updatedProject: prevData, message: "Error getting descriptions", messageType: "error" };
        }
    }
    return { updatedProject: prevData, message: "", messageType: "" };
}
