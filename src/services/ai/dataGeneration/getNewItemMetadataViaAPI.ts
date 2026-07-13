import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { ExtractedDataItem, NewItemMetadataAPIParams } from "@template/main-app/projects/types";
import {
    GeneratedItemMetadata,
    normalizeNewItemMetadataOutput,
} from '@lib/ai/newItemMetadataOutput';

export type { GeneratedItemMetadata } from '@lib/ai/newItemMetadataOutput';

const NEW_ITEM_METADATA_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;

type NewItemMetadataApiResponse = {
    data?: unknown;
    remainingBalance?: unknown;
    transaction?: unknown;
};

export function mergeGeneratedItemMetadata(
    currentItem: ExtractedDataItem,
    generatedData: GeneratedItemMetadata | null
): ExtractedDataItem {
    if (!generatedData) return currentItem;

    const { attributes: generatedAttributes, description, name } = generatedData;

    const mergedItem: ExtractedDataItem = {
        ...currentItem,
        description: { ...(currentItem.description || {}), ...description },
        name: { ...(currentItem.name || {}), ...name },
    };

    if (generatedData.dietaryTags) mergedItem.dietaryTags = generatedData.dietaryTags;
    if (generatedData.spiceLevel) mergedItem.spiceLevel = generatedData.spiceLevel;
    if (generatedData.duration) mergedItem.duration = generatedData.duration;

    if (Array.isArray(generatedAttributes) && Array.isArray(currentItem.attributes)) {
        const generatedById = new Map(generatedAttributes.map(attribute => [attribute.id, attribute]));
        mergedItem.attributes = currentItem.attributes.map((attribute) => {
            const generatedAttribute = generatedById.get(attribute.id);
            if (!generatedAttribute) return attribute;

            return {
                ...attribute,
                name: { ...(attribute.name || {}), ...generatedAttribute.name },
            };
        });
    }

    mergedItem.descriptionSource = 'ai';

    return mergedItem;
}

async function getNewItemMetadataViaAPI(payload: NewItemMetadataAPIParams): Promise<GeneratedItemMetadata | null> {
    try {

        const response = await fetch('/api/new-item-metadata', {
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw createAiServiceHttpError('ai_new_item_metadata_request_failed', response);
        }

        const responseJson = await readAiServiceResponseJson<NewItemMetadataApiResponse>(response, {
            invalidFailureCode: 'ai_new_item_metadata_response_invalid',
            maxBytes: NEW_ITEM_METADATA_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'ai_new_item_metadata_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        const { data } = responseJson;
        return normalizeNewItemMetadataOutput(data, {
            businessType: payload.businessType,
            item: payload.item,
            sourceLanguageCode: payload.sourceLang.code,
            targetLanguageCodes: payload.targetLang.map(language => language.code),
        });

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logAiServiceFailure('ai_new_item_metadata_api_failed', error);
        return null; // Return original strings if API call fails
    }
}

export default getNewItemMetadataViaAPI;
