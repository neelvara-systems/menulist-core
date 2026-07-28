import { FEATURE_FLAGS } from '@config/features';
import {
    isAnswerlatticePublicApiCredentialInScope,
    toAnswerlatticePublicIsoTimestamp,
} from '@lib/answerlattice/publicApiContracts';
import { isAnswerlatticeActiveStoreInScope, normalizeAnswerlatticeScopeDocumentId } from '@lib/answerlattice/sessionScope';
import { apiError, hashApiKey, logApiRequest, PublicApiCredentialScope, validatePublicApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';

export const ANSWERLATTICE_PUBLIC_API_SCHEMA_VERSION = 'answerlattice.public.v1';
export const ANSWERLATTICE_PUBLIC_API_VARY = 'X-API-Key';
export const ANSWERLATTICE_PUBLIC_API_NO_STORE_HEADERS = {
    'Cache-Control': 'private, no-store, max-age=0',
    'Vary': ANSWERLATTICE_PUBLIC_API_VARY,
    'X-Content-Type-Options': 'nosniff',
} as const;

export interface AnswerlatticePublicApiContext {
    apiKey: string;
    storeData: any;
    storeId: string;
    tId: number;
    sId: number;
}

type AnswerlatticePublicApiAuthResult =
    | { ok: true; context: AnswerlatticePublicApiContext }
    | { ok: false; response: NextResponse };

export function answerlatticePublicApiError(
    code: string,
    message: string,
    status: number,
    headers: Record<string, string> = {},
): NextResponse {
    return apiError(code, message, status, {
        ...ANSWERLATTICE_PUBLIC_API_NO_STORE_HEADERS,
        ...headers,
    });
}

export function buildAnswerlatticePublicApiResponseHeaders(
    cacheControl: string = ANSWERLATTICE_PUBLIC_API_NO_STORE_HEADERS['Cache-Control'],
): Record<string, string> {
    return {
        ...ANSWERLATTICE_PUBLIC_API_NO_STORE_HEADERS,
        'Cache-Control': cacheControl,
    };
}

const getRateLimitError = (result: {
    reason?: 'limit_exceeded' | 'provider_unavailable';
    resetAt: number;
}) => answerlatticePublicApiError(
    result.reason === 'provider_unavailable' ? 'RATE_LIMIT_UNAVAILABLE' : 'RATE_LIMIT_EXCEEDED',
    result.reason === 'provider_unavailable' ? 'Public API temporarily unavailable' : 'Too many requests',
    result.reason === 'provider_unavailable' ? 503 : 429,
    {
        'Retry-After': String(Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1)),
    },
);

export async function authenticateAnswerlatticePublicApi(
    request: NextRequest,
    endpoint: string,
    requiredScope: PublicApiCredentialScope = 'public:read',
): Promise<AnswerlatticePublicApiAuthResult> {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_PUBLIC_API) {
        return { ok: false, response: answerlatticePublicApiError('FEATURE_DISABLED', 'Answerlattice public API is not available', 404) };
    }

    const apiKey = request.headers.get('x-api-key')?.trim() || '';
    if (!apiKey || !apiKey.startsWith('al_')) {
        return { ok: false, response: answerlatticePublicApiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }

    const rateLimit = getRateLimitForFeature('PUBLIC_API');
    const preAuthRateLimitResult = await checkRateLimit({
        key: `answerlattice-public-api-preauth:${hashPublicRateLimitValue(getClientIp(request))}`,
        limit: rateLimit.limit * 4,
        window: rateLimit.window,
        failClosedOnProviderError: true,
    });
    if (!preAuthRateLimitResult.allowed) {
        return { ok: false, response: getRateLimitError(preAuthRateLimitResult) };
    }

    const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
    const rateLimitResult = await checkRateLimit({
        key: `answerlattice-public-api:${apiKeyRateLimitId}:${endpoint}`,
        limit: rateLimit.limit,
        window: rateLimit.window,
        failClosedOnProviderError: true,
    });

    if (!rateLimitResult.allowed) {
        return { ok: false, response: getRateLimitError(rateLimitResult) };
    }

    if (request.headers.get('origin')) {
        return {
            ok: false,
            response: answerlatticePublicApiError(
                'BROWSER_ACCESS_NOT_SUPPORTED',
                'Use the Answerlattice Public API from a trusted server',
                403,
            ),
        };
    }

    const result = await validatePublicApiKey(apiKey, {
        allowLegacyRawFallback: false,
        cacheTtlMs: 0,
    });
    if (!result) {
        return { ok: false, response: answerlatticePublicApiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }
    if (result.credentialSource !== 'publicApi') {
        return { ok: false, response: answerlatticePublicApiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }

    const { storeData, storeId } = result;
    const publicApi = result.credential || storeData.publicApi || {};
    if (!isAnswerlatticePublicApiCredentialInScope(publicApi, requiredScope)) {
        return { ok: false, response: answerlatticePublicApiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }

    const tId = normalizeAnswerlatticeScopeDocumentId(storeData.tenantId ?? storeData.tId);
    const sId = normalizeAnswerlatticeScopeDocumentId(storeData.id ?? storeData.sId ?? storeData.storeId ?? storeId);
    if (!tId || !sId || !isAnswerlatticeActiveStoreInScope(storeData, { tenantId: tId, storeId: sId }, storeId)) {
        return { ok: false, response: answerlatticePublicApiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }

    logApiRequest(request, storeId, endpoint);

    return {
        ok: true,
        context: {
            apiKey,
            storeData,
            storeId,
            tId,
            sId,
        },
    };
}

export const toIsoTimestamp = toAnswerlatticePublicIsoTimestamp;
