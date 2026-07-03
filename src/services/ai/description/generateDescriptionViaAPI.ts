import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, getBoundedAiServiceStringContext, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import { DescriptionAPIParams } from "@template/main-app/projects/types";

const DESCRIPTION_GENERATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;

type DescriptionGenerationApiResponse = {
    data?: Record<string, string> | null;
    remainingBalance?: unknown;
    transaction?: unknown;
};

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
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw createAiServiceHttpError('ai_description_request_failed', response);
        }

        const responseJson = await readAiServiceResponseJson<DescriptionGenerationApiResponse>(response, {
            context: {
                ...getBoundedAiServiceStringContext('projectId', projectId),
                ...getBoundedAiServiceStringContext('fileId', fileId),
                itemCount: itemsList?.length || 0,
                contentLength,
            },
            invalidFailureCode: 'ai_description_response_invalid',
            maxBytes: DESCRIPTION_GENERATION_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'ai_description_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        const { data } = responseJson;
        return data || null;

    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logAiServiceFailure('ai_description_api_failed', error, {
            ...getBoundedAiServiceStringContext('projectId', projectId),
            ...getBoundedAiServiceStringContext('fileId', fileId),
            itemCount: itemsList?.length || 0,
            contentLength,
        });
        return null; // Return original strings if API call fails
    }
}

export default getDescriptionsViaAPI;
