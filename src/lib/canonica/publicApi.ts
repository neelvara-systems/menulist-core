import { FEATURE_FLAGS } from '@config/features';
import { apiError, hashApiKey, hasPublicApiCredentialScope, isRequestOriginAllowed, logApiRequest, validatePublicApiKey } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { NextRequest, NextResponse } from 'next/server';

export const CANONICA_PUBLIC_API_SCHEMA_VERSION = 'canonica.public.v1';

export interface CanonicaPublicApiContext {
    apiKey: string;
    storeData: any;
    storeId: string;
    tId: number;
    sId: number;
}

type CanonicaPublicApiAuthResult =
    | { ok: true; context: CanonicaPublicApiContext }
    | { ok: false; response: NextResponse };

export async function authenticateCanonicaPublicApi(
    request: NextRequest,
    endpoint: string,
): Promise<CanonicaPublicApiAuthResult> {
    if (!FEATURE_FLAGS.ENABLE_CANONICA_PUBLIC_API) {
        return { ok: false, response: apiError('FEATURE_DISABLED', 'Canonica public API is not available', 404) };
    }

    const apiKey = request.headers.get('x-api-key')?.trim() || '';
    if (!apiKey || !apiKey.startsWith('cn_')) {
        return { ok: false, response: apiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }

    const rateLimit = getRateLimitForFeature('PUBLIC_API');
    const apiKeyRateLimitId = hashApiKey(apiKey).slice(0, 16);
    const rateLimitResult = await checkRateLimit({
        key: `canonica-public-api:${apiKeyRateLimitId}:${endpoint}`,
        limit: rateLimit.limit,
        window: rateLimit.window,
    });

    if (!rateLimitResult.allowed) {
        const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
        return {
            ok: false,
            response: apiError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429, {
                'Retry-After': String(Math.max(retryAfter, 1)),
            }),
        };
    }

    const result = await validatePublicApiKey(apiKey, {
        allowLegacyRawFallback: false,
    });
    if (!result) {
        return { ok: false, response: apiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }
    if (result.credentialSource !== 'publicApi') {
        return { ok: false, response: apiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }

    const { storeData, storeId } = result;
    const publicApi = result.credential || storeData.publicApi || {};
    if (publicApi.productId && publicApi.productId !== 'CN') {
        return { ok: false, response: apiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }
    if (publicApi.purpose && !String(publicApi.purpose).startsWith('canonica')) {
        return { ok: false, response: apiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }
    if (!hasPublicApiCredentialScope(publicApi, 'public:read')) {
        return { ok: false, response: apiError('INVALID_API_KEY', 'Invalid API key', 401) };
    }

    const requestOrigin = request.headers.get('origin');
    if (requestOrigin && !isRequestOriginAllowed(requestOrigin, storeData.widgetAllowedOrigins)) {
        return { ok: false, response: apiError('ORIGIN_NOT_ALLOWED', 'Origin not allowed', 403) };
    }

    const tId = Number(storeData.tenantId || storeData.tId);
    const sId = Number(storeData.id || storeId);
    if (!Number.isFinite(tId) || !Number.isFinite(sId) || tId <= 0 || sId <= 0) {
        return { ok: false, response: apiError('INVALID_API_KEY', 'Invalid API key', 401) };
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

export function toIsoTimestamp(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value.toDate === 'function') return value.toDate().toISOString();
    if (typeof value.toMillis === 'function') return new Date(value.toMillis()).toISOString();
    return null;
}
