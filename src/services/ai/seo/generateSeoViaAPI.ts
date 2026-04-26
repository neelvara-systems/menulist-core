import { logger } from "@lib/monitoring/logger";
import { syncBalanceFromResponse } from "@services/ai/balanceSync";
import { AICapacityError, checkCapacityResponse } from "@services/ai/capacityError";

export interface SeoGenerationPayload {
    menu?: {
        categories?: string[];
        items?: string[];
        projectDescription?: string;
        projectName?: string;
    };
    store: {
        addressLine?: string;
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
            knownFor?: string;
            orderUrl?: string;
            reservationUrl?: string;
            whatsappNumber?: string;
        };
        socialMedia?: string[];
        state?: string;
        tagline?: string;
    };
}

export interface SeoGenerationResult {
    keywords: string[];
    metaDescription: string;
    metaTitle: string;
    tagline: string;
}

export default async function generateSeoViaAPI(payload: SeoGenerationPayload): Promise<SeoGenerationResult | null> {
    try {
        const response = await fetch('/api/seo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        await checkCapacityResponse(response);
        if (!response.ok) {
            throw new Error(`SEO generation request failed: ${response.statusText}`);
        }

        const responseJson = await response.json();
        syncBalanceFromResponse(responseJson);
        return responseJson.data || null;
    } catch (error) {
        if (error instanceof AICapacityError) throw error;
        logger.error('SEO generation API failed', error, { businessName: payload.store?.name });
        return null;
    }
}
