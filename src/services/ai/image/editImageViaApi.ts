import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, getBoundedAiServiceStringContext, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { EditImageViaApiPayloadType } from "@template/main-app/projects/types";
import { normalizeAiImageResponseItems, type AiImageResponseItem } from './imageResponse';

const IMAGE_EDIT_RESPONSE_JSON_MAX_BYTES = 24 * 1024 * 1024;

async function editImageViaApi(payload: EditImageViaApiPayloadType): Promise<AiImageResponseItem[]> {
    try {
        const response = await fetch('/api/image-editing', {
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw createAiServiceHttpError('ai_image_edit_request_failed', response);
        }
        const responseJson = await readAiServiceResponseJson(response, {
            context: {
                ...getBoundedAiServiceStringContext('projectId', payload.projectId),
                ...getBoundedAiServiceStringContext('fileId', payload.fileId),
            },
            invalidFailureCode: 'ai_image_edit_response_invalid',
            maxBytes: IMAGE_EDIT_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'ai_image_edit_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        const data = normalizeAiImageResponseItems(responseJson.data);
        if (!data) {
            logAiServiceFailure('ai_image_edit_response_invalid', new Error('ai_image_edit_data_invalid'), {
                ...getBoundedAiServiceStringContext('projectId', payload.projectId),
                ...getBoundedAiServiceStringContext('fileId', payload.fileId),
                maxBytes: IMAGE_EDIT_RESPONSE_JSON_MAX_BYTES,
                responseStatus: response.status,
            });
            return [];
        }
        return data;

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logAiServiceFailure('ai_image_edit_api_failed', error, {
            ...getBoundedAiServiceStringContext('projectId', payload.projectId),
            ...getBoundedAiServiceStringContext('fileId', payload.fileId),
        });
        return [];
    }
}

export default editImageViaApi;
