export const dynamic = 'force-dynamic';
/**
 * GET /api/public/v1/business — Public Business Details API
 *
 * Returns store business information for external systems.
 * Authenticated via X-API-Key header.
 *
 * @see __docs__/platform-pull-api/platform-pull-api_impl.md
 */

import { FEATURE_FLAGS } from "@config/features";
import { apiError, generateETag, logApiRequest, PULL_API_SCHEMA_VERSION, validatePublicApiKey } from "@lib/publicApi/auth";
import { checkRateLimit } from "@lib/rateLimit";
import { secureError } from "@lib/security/secureLogger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_API) {
        return apiError('FEATURE_DISABLED', 'API not available', 403);
    }

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
        return apiError('MISSING_API_KEY', 'Missing X-API-Key header', 401);
    }

    // Rate limit per API key
    const rlResult = await checkRateLimit({ key: `public-api:${apiKey}`, limit: 60, window: 60 });
    if (!rlResult.allowed) {
        const retryAfter = Math.ceil((rlResult.resetAt - Date.now()) / 1000);
        return apiError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, {
            'Retry-After': String(Math.max(retryAfter, 1)),
        });
    }

    try {
        const result = await validatePublicApiKey(apiKey);
        if (!result) {
            return apiError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const { storeData, storeId } = result;

        // Abuse logging
        logApiRequest(request, storeId, 'GET /business');

        // Build business details response
        const response: Record<string, any> = {
            schemaVersion: PULL_API_SCHEMA_VERSION,
            generatedAt: new Date().toISOString(),
            storeId: Number(storeId),
            name: storeData.name || null,
            businessType: storeData.businessType || null,
            description: storeData.description || null,
            phone: storeData.phoneNumber || null,
            email: storeData.email || null,
            currency: storeData.currencyCode || storeData.currency || null,
            priceRange: storeData.priceRange || null,
            address: {
                line: storeData.addressLine || null,
                city: storeData.city || null,
                state: storeData.state || null,
                postalCode: storeData.postalCode || null,
                country: storeData.country || null,
            },
            geo: storeData.geo ? {
                latitude: storeData.geo.latitude,
                longitude: storeData.geo.longitude,
            } : null,
            workingHours: storeData.workingHours || null,
            timeZone: storeData.timeZone || null,
            logo: storeData.logo || null,
            socialMedia: storeData.socialMedia || null,
            tempStatus: storeData.tempStatus ? {
                type: storeData.tempStatus.type,
                message: storeData.tempStatus.message,
                expiresAt: storeData.tempStatus.expiresAt,
            } : null,
            reservationUrl: storeData.publicPresence?.reservationUrl || null,
            orderUrl: storeData.publicPresence?.orderUrl || null,
            subdomain: storeData.subdomain || null,
            customDomain: storeData.customDomain || null,
            lastModified: storeData.modifiedOn
                ? (typeof storeData.modifiedOn === 'string'
                    ? storeData.modifiedOn
                    : storeData.modifiedOn?.toDate?.()?.toISOString?.() || null)
                : null,
        };

        // Conditionally add feature-flagged fields
        if (FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES && storeData.businessAttributes) {
            response.businessAttributes = storeData.businessAttributes;
        }

        // ETag: conditional request support
        const etag = `"${generateETag(response)}"`;
        const ifNoneMatch = request.headers.get('if-none-match');
        if (ifNoneMatch === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: { 'ETag': etag, 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
            });
        }

        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
                'ETag': etag,
            },
        });
    } catch (error) {
        secureError('[Public API] Business endpoint error', error as Error);
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
