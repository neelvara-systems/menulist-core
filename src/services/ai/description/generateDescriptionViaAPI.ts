import { logger } from "@lib/monitoring/logger";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { DescriptionAPIParams } from "@template/main-app/projects/types";

async function getDescriptionsViaAPI({ itemsList, targetLang, sourceLang, action, projectId, fileId, contentLength, tone = 'Professional' }: DescriptionAPIParams): Promise<Record<string, string>> {
    try {
        const payload = {
            itemsList,
            targetLang,
            sourceLang,
            action,
            projectId,
            fileId,
            contentLength,
            tone
        }
        const response = await fetch('/api/descriptions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error(`Description request failed: ${response.statusText}`);
        }

        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        const { data } = responseJson;
        logger.debug('Description API response', { itemsCount: Object.keys(data || {}).length });
        return data || null;

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logger.error('Description API failed', error, { itemsCount: itemsList?.length });
        return null; // Return original strings if API call fails
    }
}

export default getDescriptionsViaAPI;