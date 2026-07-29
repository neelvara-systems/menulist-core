import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import {
    ExtractedDataCategory,
    ExtractedDataItem,
    NewItemMetadataAPIParams,
    NewItemMetadataItem,
} from "@template/main-app/projects/types";
import { hasAnyNonEmptyDescription } from '@lib/menu/descriptionQuality';
import {
    GeneratedItemMetadata,
    normalizeNewItemMetadataOutput,
} from '@lib/ai/newItemMetadataOutput';

export type { GeneratedItemMetadata } from '@lib/ai/newItemMetadataOutput';

const NEW_ITEM_METADATA_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;

export function prepareNewItemMetadataRequestItem(
    currentItem: ExtractedDataItem,
    categories: readonly ExtractedDataCategory[],
    sourceLanguageCode: string,
): NewItemMetadataItem {
    const categoryName = categories.find((category) => category.id === currentItem.category)
        ?.name?.[sourceLanguageCode];

    return {
        attributes: (currentItem.attributes || []).map((attribute) => ({
            id: attribute.id,
            name: String(attribute.name?.[sourceLanguageCode] || '').trim().slice(0, 500),
            price: String(attribute.price ?? '').trim().slice(0, 120),
        })),
        category: String(categoryName || '').trim().slice(0, 100),
        description: String(currentItem.description?.[sourceLanguageCode] || '').trim().slice(0, 2000),
        id: currentItem.id,
        name: String(currentItem.name?.[sourceLanguageCode] || '').trim().slice(0, 500),
    };
}

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

    const hasOwnerDescription = currentItem.descriptionSource === 'manual'
        && hasAnyNonEmptyDescription(currentItem.description);
    mergedItem.descriptionSource = hasOwnerDescription ? 'manual' : 'ai';

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

        const responseJson = await readAiServiceResponseJson(response, {
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
