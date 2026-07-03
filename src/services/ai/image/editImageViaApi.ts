import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, getBoundedAiServiceStringContext, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { EditImageViaApiPayloadType } from "@template/main-app/projects/types";

const IMAGE_EDIT_RESPONSE_JSON_MAX_BYTES = 24 * 1024 * 1024;

type EditedImageResponseItem = {
    base64: string;
    mimeType: string;
};

type ImageEditApiResponse = {
    data?: EditedImageResponseItem[] | null;
    remainingBalance?: unknown;
    transaction?: unknown;
};

async function editImageViaApi(payload: EditImageViaApiPayloadType) {
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
        const responseJson = await readAiServiceResponseJson<ImageEditApiResponse>(response, {
            context: {
                ...getBoundedAiServiceStringContext('projectId', payload.projectId),
                ...getBoundedAiServiceStringContext('fileId', payload.fileId),
            },
            invalidFailureCode: 'ai_image_edit_response_invalid',
            maxBytes: IMAGE_EDIT_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'ai_image_edit_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        const { data } = responseJson;
        if (data !== undefined && data !== null && !Array.isArray(data)) {
            logAiServiceFailure('ai_image_edit_response_invalid', new Error('ai_image_edit_data_invalid'), {
                ...getBoundedAiServiceStringContext('projectId', payload.projectId),
                ...getBoundedAiServiceStringContext('fileId', payload.fileId),
                maxBytes: IMAGE_EDIT_RESPONSE_JSON_MAX_BYTES,
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
        logAiServiceFailure('ai_image_edit_api_failed', error, {
            ...getBoundedAiServiceStringContext('projectId', payload.projectId),
            ...getBoundedAiServiceStringContext('fileId', payload.fileId),
        });
        return [];
    }
}

export default editImageViaApi;
