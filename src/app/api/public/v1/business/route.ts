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
import {
    getActivePublicTempStatus,
    normalizePublicBusinessAttributes,
    normalizePublicBusinessGeo,
    normalizePublicBusinessLastModified,
    normalizePublicBusinessStringRecord,
    normalizePublicBusinessText,
    normalizePublicBusinessWorkingHours,
} from '@lib/publicApi/businessProjection';
import { normalizeSpecialHours } from '@lib/hours/specialHours';
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
            name: normalizePublicBusinessText(publicName, 256),
            businessType: normalizePublicBusinessText(storeData.businessType, 160),
            description: normalizePublicBusinessText(publicDescription),
            descriptor: normalizePublicBusinessText(publicDescriptor, 512),
            knownFor: normalizePublicBusinessText(publicKnownFor, 512),
            phone: normalizePublicBusinessText(storeData.phoneNumber, 80),
            email: normalizePublicBusinessText(storeData.email, 320),
            currency: normalizePublicBusinessText(storeData.currencyCode || storeData.currency, 16),
            priceRange: ['$','$$','$$$','$$$$'].includes(storeData.priceRange) ? storeData.priceRange : null,
            address: {
                line: normalizePublicBusinessText(storeData.addressLine, 512),
                city: normalizePublicBusinessText(storeData.city, 160),
                state: normalizePublicBusinessText(storeData.state, 160),
                postalCode: normalizePublicBusinessText(storeData.postalCode, 40),
                country: normalizePublicBusinessText(storeData.country, 160),
            },
            geo: normalizePublicBusinessGeo(storeData.geo),
            workingHours: normalizePublicBusinessWorkingHours(storeData.workingHours),
            specialHours: normalizeSpecialHours(storeData.specialHours) || null,
            timeZone: normalizePublicBusinessText(storeData.timeZone, 100),
            businessDayEndTime: normalizePublicBusinessText(storeData.businessDayEndTime, 5),
            logo: normalizePublicBusinessText(storeData.logo, 2_048),
            businessCover: normalizePublicBusinessText(storeData.publicPresence?.businessCover, 2_048),
            socialMedia: normalizePublicBusinessStringRecord(storeData.socialMedia),
            tempStatus: activeTempStatus,
            reservationUrl: normalizePublicBusinessText(storeData.publicPresence?.reservationUrl, 2_048),
            orderUrl: normalizePublicBusinessText(storeData.publicPresence?.orderUrl, 2_048),
            subdomain: normalizePublicBusinessText(storeData.subdomain, 253),
            customDomain: normalizePublicBusinessText(storeData.customDomain, 253),
            lastModified: normalizePublicBusinessLastModified(storeData.modifiedOn),
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
