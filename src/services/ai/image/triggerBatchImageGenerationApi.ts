import { logger } from "@lib/monitoring/logger";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { GenerateImageViaApiPayloadBatchType } from "@template/main-app/projects/types";

async function triggerBatchImageGenerationApi(payload: GenerateImageViaApiPayloadBatchType) {
    try {

        const response = await fetch('/api/image-generation/batch-trigger', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error(`Image generation request failed: ${response.statusText}`);
        }
        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        return responseJson.data || [];

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logger.error('Batch image trigger API failed', error);
        throw error;
    }
}

export default triggerBatchImageGenerationApi;
