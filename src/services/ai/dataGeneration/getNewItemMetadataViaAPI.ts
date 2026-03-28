import { logger } from "@lib/monitoring/logger";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { NewItemMetadataAPIParams } from "@template/main-app/projects/types";

async function getNewItemMetadataViaAPI(payload: NewItemMetadataAPIParams): Promise<Record<string, string>> {
    try {

        const response = await fetch('/api/new-item-metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error(`New Item Metadata request failed: ${response.statusText}`);
        }

        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        const { data } = responseJson;
        logger.debug('Metadata API response', { hasData: !!data });
        return data || null;

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logger.error('Metadata API failed', error);
        return null; // Return original strings if API call fails
    }
}

export default getNewItemMetadataViaAPI;