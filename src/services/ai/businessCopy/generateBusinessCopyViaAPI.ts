import { logger } from "@lib/monitoring/logger";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";

export interface BusinessCopyGenerationPayload {
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
            displayName?: string;
            establishedYear?: number;
            googleMapsUrl?: string;
            googleReviewUrl?: string;
            knownFor?: string;
            orderUrl?: string;
            reservationUrl?: string;
            whatsappNumber?: string;
        };
        pwaShortName?: string;
        socialMedia?: string[];
        state?: string;
        tagline?: string;
    };
}

export interface BusinessCopyGenerationResult {
    descriptor: string;
    displayName: string;
    keywords: string[];
    knownFor: string;
    metaDescription: string;
    metaTitle: string;
    pwaShortName: string;
    tagline: string;
}

export default async function generateBusinessCopyViaAPI(payload: BusinessCopyGenerationPayload): Promise<BusinessCopyGenerationResult | null> {
    try {
        const response = await fetch('/api/business-copy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error(`Business copy generation request failed: ${response.statusText}`);
        }

        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        return responseJson.data || null;
    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logger.error('Business copy generation API failed', error, { businessName: payload.store?.name });
        return null;
    }
}
