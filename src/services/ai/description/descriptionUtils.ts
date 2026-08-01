import { AI_ACTIONS_TYPES } from "@constant/common";
import { getBoundedAiServiceStringContext, logAiServiceFailure } from "@services/ai/aiServiceDiagnostics";
import { AICapacityError } from "@services/ai/capacityError";
import { hasAnyNonEmptyDescription } from "@lib/menu/descriptionQuality";
import type { DescriptionTone } from "@template/main-app/projects/editorView/descriptionGeneration.shared";
import {
    type LanguageType,
    type Project,
    type ProjectFileType,
    type DescriptionAPIItem,
} from "@template/main-app/projects/types";
import { InheritanceState } from "@type/multiOutlet.types";
import { removeObjRef } from "@util/utils";
import getDescriptionsViaAPI from "./generateDescriptionViaAPI";

const AI_DESCRIPTION_EMPTY_RESPONSE = 'ai_description_empty_response';
const AI_DESCRIPTION_FILE_GENERATION_FAILED = 'ai_description_file_generation_failed';
export const DESCRIPTION_ITEMS_PER_REQUEST = 100;
export const DESCRIPTION_ITEM_PAYLOAD_BYTES_PER_REQUEST = 180 * 1024;
// Keep common one-to-three-language menus at the 100-item ceiling while
// bounding structured output for unusually multilingual projects.
export const DESCRIPTION_OUTPUT_CELLS_PER_REQUEST = 300;

export type DescriptionAction =
    | typeof AI_ACTIONS_TYPES.ADD_DESCRIPTION
    | typeof AI_ACTIONS_TYPES.REWRITE_DESCRIPTION;

export interface DescriptionSourceAttribute {
    name?: Record<string, string | undefined>;
}

export interface DescriptionSourceCategory {
    id: string;
    name?: Record<string, string | undefined>;
}

export interface DescriptionSourceItem {
    attributes?: DescriptionSourceAttribute[];
    category?: string;
    description?: Record<string, string | undefined>;
    descriptionSource?: string;
    id: string;
    name?: Record<string, string | undefined>;
}

export interface DescriptionFileData {
    categories?: DescriptionSourceCategory[];
    items?: DescriptionSourceItem[];
}

export interface DescriptionMergeItem {
    description?: Record<string, string | undefined>;
    descriptionSource?: string;
    id: string;
}

export interface DescriptionMergeData {
    items: DescriptionMergeItem[];
}

export interface DescriptionPayloadItem extends DescriptionAPIItem {
    attributes: string;
    category: string;
    description: string;
}

export type GeneratedDescriptionMap = Record<string, Record<string, string>>;

export function chunkDescriptionItems<T>(
    items: readonly T[],
    options: { targetLanguageCount?: number } = {},
): T[][] {
    const chunks: T[][] = [];
    const encoder = new TextEncoder();
    const targetLanguageCount = Number.isSafeInteger(options.targetLanguageCount)
        && Number(options.targetLanguageCount) > 0
        ? Number(options.targetLanguageCount)
        : 1;
    const itemsPerOutputScope = Math.max(
        1,
        Math.floor(DESCRIPTION_OUTPUT_CELLS_PER_REQUEST / targetLanguageCount),
    );
    const itemCountLimit = Math.min(DESCRIPTION_ITEMS_PER_REQUEST, itemsPerOutputScope);
    let currentChunk: T[] = [];
    let currentBytes = 2; // JSON array brackets

    for (const item of items) {
        const itemBytes = encoder.encode(JSON.stringify(item)).byteLength + (currentChunk.length > 0 ? 1 : 0);
        const exceedsCount = currentChunk.length >= itemCountLimit;
        const exceedsBytes = currentChunk.length > 0
            && currentBytes + itemBytes > DESCRIPTION_ITEM_PAYLOAD_BYTES_PER_REQUEST;

        if (exceedsCount || exceedsBytes) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentBytes = 2;
        }

        currentChunk.push(item);
        currentBytes += itemBytes;
    }

    if (currentChunk.length > 0) chunks.push(currentChunk);
    return chunks;
}

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
    fileData: DescriptionFileData,
    sourceLang: string,
    action: DescriptionAction,
    governance?: DescriptionGovernanceOptions
): DescriptionPayloadItem[] => {
    const payloadList: DescriptionPayloadItem[] = [];

    // Extract item names and attribute names (only local-only if governance provided)
    (fileData.items || []).forEach((item) => {
        // Multi-outlet: Skip inherited/overridden items - they get descriptions from master
        if (!shouldGenerateDescriptionForItem(item.id, governance?.itemStates)) {
            return;
        }

        const sourceName = typeof item.name?.[sourceLang] === 'string'
            ? item.name[sourceLang].trim().slice(0, 500)
            : '';
        if (sourceName) {
            const existingDescription = typeof item.description?.[sourceLang] === 'string'
                ? item.description[sourceLang].trim().slice(0, 2000)
                : '';
            const descriptionSource = item.descriptionSource;
            const hasManualDescription = descriptionSource === 'manual'
                && hasAnyNonEmptyDescription(item.description);

            // First-pass generation only owns an empty source description.
            // Any non-empty owner-written description remains protected even
            // when it exists only in another configured language.
            if (
                action === AI_ACTIONS_TYPES.ADD_DESCRIPTION
                && (
                    existingDescription.length > 0
                    || hasManualDescription
                )
            ) {
                return;
            }

            // A paid refresh owns existing generated/legacy source copy. Empty
            // source copy stays in the free first-pass path, and manual copy
            // remains protected.
            if (
                action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION
                && (
                    descriptionSource === 'manual'
                    || existingDescription.length === 0
                )
            ) {
                return;
            }

            payloadList.push({
                id: item.id,
                name: sourceName,
                category: String(
                    fileData.categories?.find((category) => category.id === item.category)?.name?.[sourceLang] || '',
                ).trim().slice(0, 200),
                attributes: (item.attributes || [])
                    .map((attribute) => typeof attribute.name?.[sourceLang] === 'string' ? attribute.name[sourceLang].trim() : '')
                    .filter(Boolean)
                    .join(', ')
                    .slice(0, 500),
                // ADD_DESCRIPTION must remain a free first-pass operation. The
                // server also derives billing from this field, so only rewrite
                // requests may carry existing copy.
                description: action === AI_ACTIONS_TYPES.REWRITE_DESCRIPTION
                    ? existingDescription
                    : ""
            });
        }
    });

    return payloadList;
};

export const mergeDescription = <T extends DescriptionMergeData>(
    fileData: T,
    generatedDescription: GeneratedDescriptionMap,
): T => {
    const updatedFileData = removeObjRef(fileData) as T;
    updatedFileData.items.forEach((item) => {
        const hasGeneratedDescription = Object.prototype.hasOwnProperty.call(
            generatedDescription,
            item.id,
        );
        if (hasGeneratedDescription) {
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
    action: DescriptionAction,
    contentLength: "Standard" | "Detailed",
    tone: DescriptionTone = "Professional",
    governance?: DescriptionGovernanceOptions,
    operationRequestCount?: number,
) => {
    const prevData = removeObjRef(projectData)

    if (file.extractedData?.data) {
        const projectId = projectData.projectId?.trim();
        if (!projectId) {
            logAiServiceFailure(AI_DESCRIPTION_FILE_GENERATION_FAILED, new Error('Project ID is unavailable'), {
                action,
                contentLength,
                tone,
            });
            return { updatedProject: prevData, message: "Error getting descriptions", messageType: "error", requestCount: 0 };
        }
        // Multi-outlet: Pass governance to filter out inherited/overridden items
        const itemsList = prepareDescriptionPayload(file.extractedData.data, sourceLanguage.code, action, governance);

        // Skip API call if no items to process (e.g., all items already have descriptions for ADD_DESCRIPTION)
        if (itemsList.length === 0) {
            return { updatedProject: prevData, message: "", messageType: "", requestCount: 0 };
        }

        try {
            const itemBatches = chunkDescriptionItems(itemsList, {
                targetLanguageCount: targetLanguages.length,
            });
            const generatedDescription = Object.create(null) as Record<string, Record<string, string>>;

            for (let batchIndex = 0; batchIndex < itemBatches.length; batchIndex += 1) {
                const itemBatch = itemBatches[batchIndex];
                const batchResult = await getDescriptionsViaAPI({
                    itemsList: itemBatch,
                    targetLang: targetLanguages,
                    sourceLang: sourceLanguage,
                    action,
                    projectId,
                    fileId: file.uid,
                    contentLength,
                    tone,
                    ...(batchIndex === 0 && operationRequestCount !== undefined
                        ? { operationRequestCount }
                        : {}),
                });
                if (!batchResult) {
                    logAiServiceFailure(AI_DESCRIPTION_EMPTY_RESPONSE, undefined, {
                        action,
                        batchItemCount: itemBatch.length,
                        contentLength,
                        itemCount: itemsList.length,
                        targetLanguageCount: targetLanguages.length,
                        tone,
                        ...getBoundedAiServiceStringContext('fileId', file.uid),
                        ...getBoundedAiServiceStringContext('projectId', projectData.projectId),
                        ...getBoundedAiServiceStringContext('sourceLanguage', sourceLanguage.code)
                    });
                    return { updatedProject: prevData, message: "Error getting descriptions", messageType: "error", requestCount: itemBatches.length };
                }
                Object.assign(generatedDescription, batchResult);
            }

            if (Object.keys(generatedDescription).length > 0) {
                const updated = {
                    ...prevData,
                    files: prevData.files?.map(f =>
                        f.uid === file.uid && f.extractedData?.data
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
                return { updatedProject: updated, message: `${targetLanguages.map(l => l.name).join(', ')} (${targetLanguages.map(l => l.code).join(', ')}) Descriptions added successfully`, messageType: "success", requestCount: itemBatches.length };
            } else {
                logAiServiceFailure(AI_DESCRIPTION_EMPTY_RESPONSE, undefined, {
                    action,
                    contentLength,
                    itemCount: itemsList.length,
                    targetLanguageCount: targetLanguages.length,
                    tone,
                    ...getBoundedAiServiceStringContext('fileId', file.uid),
                    ...getBoundedAiServiceStringContext('projectId', projectData.projectId),
                    ...getBoundedAiServiceStringContext('sourceLanguage', sourceLanguage.code)
                });
                return { updatedProject: prevData, message: "Error getting descriptions", messageType: "error", requestCount: itemBatches.length };
            }

        } catch (error) {
            if (error instanceof AICapacityError) throw error;
            logAiServiceFailure(AI_DESCRIPTION_FILE_GENERATION_FAILED, error, {
                action,
                contentLength,
                itemCount: itemsList.length,
                targetLanguageCount: targetLanguages.length,
                tone,
                ...getBoundedAiServiceStringContext('fileId', file.uid),
                ...getBoundedAiServiceStringContext('projectId', projectData.projectId),
                ...getBoundedAiServiceStringContext('sourceLanguage', sourceLanguage.code)
            });
            return { updatedProject: prevData, message: "Error getting descriptions", messageType: "error", requestCount: 0 };
        }
    }
    return { updatedProject: prevData, message: "", messageType: "", requestCount: 0 };
}
