import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, getBoundedAiServiceStringContext, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import {
    normalizeSeoGenerationResult,
    type SeoGenerationResult,
} from "@lib/ai/seoOutput";
import type { SeoGenerationRequest } from "@lib/validation/apiSchemas";

export type SeoGenerationPayload = SeoGenerationRequest;
export type { SeoGenerationResult } from "@lib/ai/seoOutput";

const SEO_GENERATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;

type SeoGenerationApiResponse = {
    data?: SeoGenerationResult | null;
    remainingBalance?: unknown;
    transaction?: unknown;
};

export default async function generateSeoViaAPI(payload: SeoGenerationPayload): Promise<SeoGenerationResult | null> {
    try {
        const response = await fetch('/api/seo', {
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw createAiServiceHttpError('ai_seo_generation_request_failed', response);
        }

        const responseJson = await readAiServiceResponseJson<SeoGenerationApiResponse>(response, {
            context: {
                ...getBoundedAiServiceStringContext('businessName', payload.store?.name),
            },
            invalidFailureCode: 'ai_seo_generation_response_invalid',
            maxBytes: SEO_GENERATION_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'ai_seo_generation_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        return normalizeSeoGenerationResult(responseJson.data);
    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logAiServiceFailure('ai_seo_generation_api_failed', error, {
            ...getBoundedAiServiceStringContext('businessName', payload.store?.name),
        });
        return null;
    }
}
