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
import { getBrandStoreLabel } from "@lib/businessIdentity/names";
import { getLocalizedText, getPrimaryLocalizedLanguage } from "@lib/localization/text";
import { getPublicBusinessDescription } from "@lib/obp/getPublicBusinessDescription";
import { apiError, buildPullApiResponseHeaders, generateETag, hashApiKey, isMenuListPublicApiTargetAllowed, logApiRequest, PULL_API_SCHEMA_VERSION, validatePublicApiKey } from "@lib/publicApi/auth";
import { checkRateLimit } from "@lib/rateLimit";
import { getBoundedSecurityStringContext, logSecurityFailure } from "@lib/security/securityDiagnostics";
import { NextRequest, NextResponse } from "next/server";

function getActiveTempStatus(tempStatus: any): { type: any; message: any; expiresAt: any } | null {
    if (!tempStatus?.expiresAt) return null;

    const expiresAtMs = new Date(tempStatus.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return null;

    return {
        type: tempStatus.type,
        message: tempStatus.message,
        expiresAt: tempStatus.expiresAt,
    };
}

export async function GET(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_API) {
        return apiError('FEATURE_DISABLED', 'API not available', 403);
    }

    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
        return apiError('MISSING_API_KEY', 'Missing X-API-Key header', 401);
    }
    if (!apiKey.trim().startsWith('ml_')) {
        return apiError('INVALID_API_KEY', 'Invalid API key', 401);
    }

    // Rate limit per API key
    const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
    let failureContext: Record<string, boolean | number | string | null | undefined> = {
        endpoint: '/api/public/v1/business',
        ...getBoundedSecurityStringContext('apiKey', apiKey),
        ...getBoundedSecurityStringContext('apiKeyRateLimitId', apiKeyRateLimitId),
    };

    const rlResult = await checkRateLimit({ key: `public-api:${apiKeyRateLimitId}`, limit: 60, window: 60 });
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
        if (!(await isMenuListPublicApiTargetAllowed(storeData))) {
            return apiError('INVALID_API_KEY', 'Invalid API key', 401);
        }
        failureContext = {
            ...failureContext,
            ...getBoundedSecurityStringContext('storeId', storeId),
        };

        const contentLanguage = storeData.defaultLanguage || storeData.activeLanguages?.[0] || storeData.language || 'en';
        const publicName = getBrandStoreLabel(storeData, storeData.name || 'Business');
        const publicDescriptor = getLocalizedText(
            storeData.publicPresence?.descriptor,
            contentLanguage,
            getPrimaryLocalizedLanguage(storeData.publicPresence?.descriptor, contentLanguage),
            '',
        );
        const publicKnownFor = getLocalizedText(
            storeData.publicPresence?.knownFor,
            contentLanguage,
            getPrimaryLocalizedLanguage(storeData.publicPresence?.knownFor, contentLanguage),
            '',
        );
        const publicDescription = getPublicBusinessDescription(storeData);
        const activeTempStatus = FEATURE_FLAGS.ENABLE_TEMP_STATUS
            ? getActiveTempStatus(storeData.tempStatus)
            : null;

        // Abuse logging
        logApiRequest(request, storeId, 'GET /business');

        // Build business details response
        const response: Record<string, any> = {
            schemaVersion: PULL_API_SCHEMA_VERSION,
            generatedAt: new Date().toISOString(),
            storeId: Number(storeId),
            name: publicName || null,
            businessType: storeData.businessType || null,
            description: publicDescription || null,
            descriptor: publicDescriptor || null,
            knownFor: publicKnownFor || null,
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
            businessDayEndTime: storeData.businessDayEndTime || null,
            logo: storeData.logo || null,
            businessCover: storeData.publicPresence?.businessCover || null,
            socialMedia: storeData.socialMedia || null,
            tempStatus: activeTempStatus,
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
        const responseHeaders = buildPullApiResponseHeaders(etag);
        const ifNoneMatch = request.headers.get('if-none-match');
        if (ifNoneMatch === etag) {
            return new NextResponse(null, {
                status: 304,
                headers: responseHeaders,
            });
        }

        return NextResponse.json(response, {
            headers: responseHeaders,
        });
    } catch (error) {
        logSecurityFailure('public_api_business_route_failed', error, failureContext);
        return apiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
