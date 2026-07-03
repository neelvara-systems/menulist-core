import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, getBoundedAiServiceStringContext, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { GenerateImageViaApiPayloadType, ImageGenerationConfigType, ItemForDropdown } from "@template/main-app/projects/types";

const IMAGE_GENERATION_RESPONSE_JSON_MAX_BYTES = 24 * 1024 * 1024;

type GeneratedImageResponseItem = {
    base64: string;
    mimeType: string;
};

type ImageGenerationApiResponse = {
    data?: GeneratedImageResponseItem[] | null;
    remainingBalance?: unknown;
    transaction?: unknown;
};

async function generateImageViaApi({ itemDetails, generationConfig, projectId, fileId, businessType }: { itemDetails: ItemForDropdown, generationConfig: ImageGenerationConfigType, projectId: string, fileId: string, businessType: string }) {
    try {
        const { prompt, referanceImage, stylesCategory, styles, aspectRatio, environments, lighting, colors, moods, compositions, backgroundColor, transparentBg, negativePrompt, foregroundColor, selectedImageTypes, isMultiMode } = generationConfig;
        const { itemName, descriptionLine, attributesList, categoryName } = itemDetails;
        const payload: GenerateImageViaApiPayloadType = {
            projectId,
            fileId,
            businessType,
            generationConfig: {
                prompt,
                referanceImage,
                stylesCategory,
                styles,
                aspectRatio,
                environments,
                lighting,
                colors,
                moods,
                compositions,
                backgroundColor,
                transparentBg,
                negativePrompt,
                foregroundColor,
                selectedImageTypes,
                isMultiMode,
            },
            itemDetails: {
                id: itemDetails.id,
                name: itemName,
                description: descriptionLine,
                attributes: attributesList,
                category: categoryName
            },
        }
        const response = await fetch('/api/image-generation', {
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw createAiServiceHttpError('ai_image_generation_request_failed', response);
        }
        const responseJson = await readAiServiceResponseJson<ImageGenerationApiResponse>(response, {
            context: {
                ...getBoundedAiServiceStringContext('projectId', projectId),
                ...getBoundedAiServiceStringContext('fileId', fileId),
                ...getBoundedAiServiceStringContext('businessType', businessType),
            },
            invalidFailureCode: 'ai_image_generation_response_invalid',
            maxBytes: IMAGE_GENERATION_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'ai_image_generation_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        const { data } = responseJson;
        if (data !== undefined && data !== null && !Array.isArray(data)) {
            logAiServiceFailure('ai_image_generation_response_invalid', new Error('ai_image_generation_data_invalid'), {
                ...getBoundedAiServiceStringContext('projectId', projectId),
                ...getBoundedAiServiceStringContext('fileId', fileId),
                ...getBoundedAiServiceStringContext('businessType', businessType),
                maxBytes: IMAGE_GENERATION_RESPONSE_JSON_MAX_BYTES,
                responseStatus: response.status,
            });
            return [];
        }
        if (data?.length > 0) {
            data.map((item: { base64: string; mimeType: string }) => {
                if (!item.base64.startsWith('data:')) {
                    item.base64 = `data:${item.mimeType};base64,${item.base64}`;
                }
            })
            return data;
        }
        return data || [];

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logAiServiceFailure('ai_image_generation_api_failed', error, {
            ...getBoundedAiServiceStringContext('projectId', projectId),
            ...getBoundedAiServiceStringContext('fileId', fileId),
            ...getBoundedAiServiceStringContext('businessType', businessType),
        });
        return [];
    }
}

export default generateImageViaApi;
