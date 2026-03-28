import { logger } from "@lib/monitoring/logger";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { EditImageViaApiPayloadType } from "@template/main-app/projects/types";

async function editImageViaApi(payload: EditImageViaApiPayloadType) {
    try {
        const response = await fetch('/api/image-editing', {
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
        const { data, transaction } = responseJson;
        logger.debug('Image edit response', { transactionId: transaction?.id, imageCount: data?.length });
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
        logger.error('Image editing API failed', error);
        return [];
    }
}

export default editImageViaApi;