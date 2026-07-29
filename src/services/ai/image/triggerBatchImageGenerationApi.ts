import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, getBoundedAiServiceStringContext, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { normalizeImageBatchJobId } from '@lib/ai/imageBatchIdBoundary';
import { GenerateImageViaApiPayloadBatchType } from "@template/main-app/projects/types";

const BATCH_IMAGE_TRIGGER_RESPONSE_JSON_MAX_BYTES = 64 * 1024;

export type BatchImageTriggerResult = {
    failedItemIds: string[];
    jobId: string;
    partial: boolean;
};

function normalizeBatchImageTriggerResult(
    value: unknown,
    expectedJobId: unknown,
): BatchImageTriggerResult | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const data = value as Record<string, unknown>;
    const jobId = normalizeImageBatchJobId(data.jobId);
    const expected = normalizeImageBatchJobId(expectedJobId);
    if (!jobId || !expected || jobId !== expected || typeof data.partial !== 'boolean') return null;
    if (!Array.isArray(data.failedItemIds) || data.failedItemIds.some((itemId) => typeof itemId !== 'string')) return null;
    const failedItemIds = data.failedItemIds as string[];
    if (new Set(failedItemIds).size !== failedItemIds.length || failedItemIds.length > 50) return null;
    return { failedItemIds, jobId, partial: data.partial };
}

async function triggerBatchImageGenerationApi(payload: GenerateImageViaApiPayloadBatchType) {
    try {

        const response = await fetch('/api/image-generation/batch-trigger', {
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw createAiServiceHttpError('ai_batch_image_trigger_request_failed', response);
        }
        const responseJson = await readAiServiceResponseJson(response, {
            context: {
                ...getBoundedAiServiceStringContext('projectId', payload.projectId),
                ...getBoundedAiServiceStringContext('jobId', payload.jobId),
                itemCount: payload.itemsList?.length || 0,
            },
            invalidFailureCode: 'ai_batch_image_trigger_response_invalid',
            maxBytes: BATCH_IMAGE_TRIGGER_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'ai_batch_image_trigger_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        const result = normalizeBatchImageTriggerResult(responseJson.data, payload.jobId);
        if (!result) throw new Error('ai_batch_image_trigger_response_invalid');
        return result;

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logAiServiceFailure('ai_batch_image_trigger_api_failed', error, {
            ...getBoundedAiServiceStringContext('projectId', payload.projectId),
            ...getBoundedAiServiceStringContext('jobId', payload.jobId),
            itemCount: payload.itemsList?.length || 0,
        });
        throw new Error('Image generation could not start.');
    }
}

export default triggerBatchImageGenerationApi;
