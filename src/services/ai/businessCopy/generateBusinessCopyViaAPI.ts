import { AI_SERVICE_ROUTE_REQUEST_OPTIONS, createAiServiceHttpError, getBoundedAiServiceStringContext, logAiServiceFailure, readAiServiceResponseJson } from "@services/ai/aiServiceDiagnostics";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";
import {
    normalizeBusinessCopyGenerationResult,
    type BusinessCopyGenerationResult,
} from "@lib/ai/businessCopyOutput";

export type { BusinessCopyGenerationResult } from "@lib/ai/businessCopyOutput";

export interface BusinessCopyGenerationPayload {
    sourceLang?: {
        code: string;
        direction?: 'ltr' | 'rtl';
        name: string;
        nativeName?: string;
    };
    menu?: {
        categories?: string[];
        items?: string[];
        projectDescription?: string;
        projectName?: string;
    };
    store: {
        addressLine?: string;
        businessAttributes?: string[];
        businessCategory?: string;
        businessType?: string;
        city?: string;
        country?: string;
        description?: string;
        name: string;
        publicPresence?: {
            accentColor?: string;
            descriptor?: string;
            establishedYear?: number;
            googleMapsUrl?: string;
            googleReviewUrl?: string;
            knownFor?: string;
            orderUrl?: string;
            reservationUrl?: string;
            specialNote?: string;
            whatsappNumber?: string;
        };
        pwaShortName?: string;
        socialMedia?: string[];
        state?: string;
        tagline?: string;
        tenantName?: string;
    };
}

const BUSINESS_COPY_GENERATION_RESPONSE_JSON_MAX_BYTES = 1024 * 1024;

type BusinessCopyGenerationApiResponse = {
    data?: BusinessCopyGenerationResult | null;
    remainingBalance?: unknown;
    transaction?: unknown;
};

export default async function generateBusinessCopyViaAPI(payload: BusinessCopyGenerationPayload): Promise<BusinessCopyGenerationResult | null> {
    try {
        const response = await fetch('/api/business-copy', {
            ...AI_SERVICE_ROUTE_REQUEST_OPTIONS,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw createAiServiceHttpError('ai_business_copy_generation_request_failed', response);
        }

        const responseJson = await readAiServiceResponseJson<BusinessCopyGenerationApiResponse>(response, {
            context: {
                ...getBoundedAiServiceStringContext('businessName', payload.store?.name),
            },
            invalidFailureCode: 'ai_business_copy_generation_response_invalid',
            maxBytes: BUSINESS_COPY_GENERATION_RESPONSE_JSON_MAX_BYTES,
            parseFailureCode: 'ai_business_copy_generation_response_parse_failed',
        });
        syncBalanceFromResponse(responseJson);
        return normalizeBusinessCopyGenerationResult(responseJson.data);
    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logAiServiceFailure('ai_business_copy_generation_api_failed', error, {
            ...getBoundedAiServiceStringContext('businessName', payload.store?.name),
        });
        return null;
    }
}
