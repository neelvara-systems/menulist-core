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
import { getActivePublicTempStatus, normalizePublicBusinessAttributes } from '@lib/publicApi/businessProjection';
import { buildPullApiResponseHeaders, generatePullApiETag, hasPublicApiCredentialScope, hashApiKey, isMenuListPublicApiTargetAllowed, logApiRequest, normalizeMenuListPublicApiNumericId, normalizePublicApiKey, PULL_API_KEY_RATE_LIMIT, PULL_API_PREAUTH_RATE_LIMIT, PULL_API_RATE_LIMIT_WINDOW_SECONDS, PULL_API_SCHEMA_VERSION, pullApiError, pullApiRateLimitError, validatePublicApiKey } from "@lib/publicApi/auth";
import { isMenuListPublicApiCredentialInScope } from '@lib/publicApi/menuListScope';
import { checkRateLimit } from "@lib/rateLimit";
import { getBoundedSecurityStringContext, logSecurityFailure } from "@lib/security/securityDiagnostics";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, hashPublicRateLimitValue } from "src/middleware/publicApi";

export async function GET(request: NextRequest) {
    if (!FEATURE_FLAGS.ENABLE_PUBLIC_API) {
        return pullApiError('FEATURE_DISABLED', 'API not available', 403);
    }

    const rawApiKey = request.headers.get('x-api-key');
    if (!rawApiKey) {
        return pullApiError('MISSING_API_KEY', 'Missing X-API-Key header', 401);
    }
    const apiKey = normalizePublicApiKey(rawApiKey);
    if (!apiKey || !apiKey.startsWith('ml_')) {
        return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
    }

    // Bound rotating invalid credentials before per-key lookup/limit work.
    const preAuthRateLimitResult = await checkRateLimit({
        key: `public-api-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
        limit: PULL_API_PREAUTH_RATE_LIMIT,
        window: PULL_API_RATE_LIMIT_WINDOW_SECONDS,
        failClosedOnProviderError: true,
    });
    if (!preAuthRateLimitResult.allowed) {
        return pullApiRateLimitError(preAuthRateLimitResult);
    }

    // Rate limit each admitted API-key shape independently.
    const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
    let failureContext: Record<string, boolean | number | string | null | undefined> = {
        endpoint: '/api/public/v1/business',
        ...getBoundedSecurityStringContext('apiKey', apiKey),
        ...getBoundedSecurityStringContext('apiKeyRateLimitId', apiKeyRateLimitId),
    };

    const rlResult = await checkRateLimit({
        key: `public-api:${apiKeyRateLimitId}`,
        limit: PULL_API_KEY_RATE_LIMIT,
        window: PULL_API_RATE_LIMIT_WINDOW_SECONDS,
        failClosedOnProviderError: true,
    });
    if (!rlResult.allowed) {
        return pullApiRateLimitError(rlResult);
    }

    try {
        const result = await validatePublicApiKey(apiKey);
        if (!result) {
            return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
        }

        const { credential, storeData, storeId } = result;
        if (
            !isMenuListPublicApiCredentialInScope(credential)
            || !hasPublicApiCredentialScope(credential, 'public:read')
        ) {
            return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
        }
        const storeNumericId = normalizeMenuListPublicApiNumericId(storeId);
        if (storeNumericId == null) {
            return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
        }
        const storeDocumentId = String(storeNumericId);
        if (!(await isMenuListPublicApiTargetAllowed(storeData, storeDocumentId))) {
            return pullApiError('INVALID_API_KEY', 'Invalid API key', 401);
        }
        failureContext = {
            ...failureContext,
            ...getBoundedSecurityStringContext('storeId', storeDocumentId),
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
            ? getActivePublicTempStatus(storeData.tempStatus)
            : null;

        // Abuse logging
        logApiRequest(request, storeDocumentId, 'GET /business');

        // Build business details response
        const response: Record<string, unknown> = {
            schemaVersion: PULL_API_SCHEMA_VERSION,
            generatedAt: new Date().toISOString(),
            storeId: storeNumericId,
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
        const publicBusinessAttributes = FEATURE_FLAGS.ENABLE_BUSINESS_ATTRIBUTES
            ? normalizePublicBusinessAttributes(storeData.businessAttributes)
            : null;
        if (publicBusinessAttributes) {
            response.businessAttributes = publicBusinessAttributes;
        }

        // ETag: conditional request support
        const etag = `"${generatePullApiETag(response)}"`;
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
        return pullApiError('INTERNAL_ERROR', 'Internal error', 500);
    }
}
