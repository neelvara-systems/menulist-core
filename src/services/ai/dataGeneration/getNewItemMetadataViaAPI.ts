import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { ExtractedDataItem, NewItemMetadataAPIParams } from "@template/main-app/projects/types";

export type GeneratedItemMetadata = Partial<ExtractedDataItem> & {
    attributes?: Array<Partial<ExtractedDataItem["attributes"][number]>>;
};

const NEW_ITEM_METADATA_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;

type NewItemMetadataApiResponse = {
    data?: GeneratedItemMetadata | null;
    remainingBalance?: unknown;
    transaction?: unknown;
};

export function mergeGeneratedItemMetadata(
    currentItem: ExtractedDataItem,
    generatedData: GeneratedItemMetadata | null
): ExtractedDataItem {
    if (!generatedData) return currentItem;

    const {
        attributes: generatedAttributes,
        description: generatedDescription,
        name: generatedName,
        ...otherGeneratedFields
    } = generatedData;

    const mergedItem: ExtractedDataItem = {
        ...currentItem,
        ...otherGeneratedFields,
        description: generatedDescription && typeof generatedDescription === 'object'
            ? {
                ...(currentItem.description || {}),
                ...generatedDescription,
            }
            : currentItem.description,
        name: generatedName && typeof generatedName === 'object'
            ? {
                ...(currentItem.name || {}),
                ...generatedName,
            }
            : currentItem.name,
    };

    if (Array.isArray(generatedAttributes) && Array.isArray(currentItem.attributes)) {
        mergedItem.attributes = currentItem.attributes.map((attribute, index) => {
            const generatedAttribute = generatedAttributes[index];

            if (!generatedAttribute || typeof generatedAttribute !== 'object') {
                return attribute;
            }

            return {
                ...attribute,
                ...generatedAttribute,
                active: attribute.active,
                id: attribute.id,
                name: generatedAttribute.name && typeof generatedAttribute.name === 'object'
                    ? {
                        ...(attribute.name || {}),
                        ...generatedAttribute.name,
                    }
                    : attribute.name,
                price: generatedAttribute.price !== undefined
                    ? String(generatedAttribute.price)
                    : attribute.price,
            };
        });
    }

    if (generatedDescription && typeof generatedDescription === 'object') {
        mergedItem.descriptionSource = 'ai';
    }

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
        return data || null;

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logAiServiceFailure('ai_new_item_metadata_api_failed', error);
        return null; // Return original strings if API call fails
    }
}

export default getNewItemMetadataViaAPI;
