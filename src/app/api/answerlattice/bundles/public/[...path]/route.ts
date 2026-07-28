export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { answerlatticeStorageAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { handlePublicApiCorsPreflight, withPublicApiCors } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { getClientIp, hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_BUNDLE_PATH_PATTERN = /^pb_[A-Za-z0-9_-]{8,80}\/v\d+\/[A-Za-z0-9_./-]+\.json$/;
const PUBLIC_BUNDLE_PROXY_CACHE_TTL_MS = 10 * 60 * 1000;
const PUBLIC_BUNDLE_RESPONSE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const MAX_PUBLIC_BUNDLE_PROXY_CACHE_ENTRIES = 300;
const MAX_PUBLIC_BUNDLE_PROXY_DOWNLOAD_BYTES = 512 * 1024;
const MAX_PUBLIC_BUNDLE_PROXY_CACHE_BYTES = MAX_PUBLIC_BUNDLE_PROXY_DOWNLOAD_BYTES;

type PublicBundleProxyCacheEntry = {
    buffer: Buffer;
    expiresAt: number;
};

const publicBundleProxyCache = new Map<string, PublicBundleProxyCacheEntry>();

const getBucket = () => {
    if (!answerlatticeStorageAdmin || typeof answerlatticeStorageAdmin.bucket !== 'function') {
        throw new Error('Answerlattice Storage Admin is not configured');
    }
    return answerlatticeStorageAdmin.bucket();
};

const buildBundleResponse = (request: NextRequest, buffer: Buffer) => withPublicApiCors(new NextResponse(buffer, {
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': PUBLIC_BUNDLE_RESPONSE_CACHE_CONTROL,
        'Content-Length': String(buffer.length),
        'X-Content-Type-Options': 'nosniff',
    },
}), request);

const jsonResponse = (
    request: NextRequest,
    body: Record<string, unknown>,
    init?: ResponseInit,
): NextResponse => {
    const headers = new Headers(init?.headers);
    headers.set('Cache-Control', 'no-store');
    headers.set('X-Content-Type-Options', 'nosniff');
    return withPublicApiCors(NextResponse.json(body, {
        ...init,
        headers,
    }), request);
};

const rememberPublicBundle = (storagePath: string, buffer: Buffer): void => {
    if (buffer.length > MAX_PUBLIC_BUNDLE_PROXY_CACHE_BYTES) return;
    if (publicBundleProxyCache.size >= MAX_PUBLIC_BUNDLE_PROXY_CACHE_ENTRIES) {
        const oldestKey = publicBundleProxyCache.keys().next().value;
        if (oldestKey) publicBundleProxyCache.delete(oldestKey);
    }
    publicBundleProxyCache.set(storagePath, {
        buffer,
        expiresAt: Date.now() + PUBLIC_BUNDLE_PROXY_CACHE_TTL_MS,
    });
};

const buildBundleUnavailableResponse = (request: NextRequest): NextResponse => jsonResponse(request, { error: 'Bundle unavailable' }, {
    status: 503,
    headers: {
        'Cache-Control': 'no-store',
    },
});

const checkBundleRateLimit = async (request: NextRequest): Promise<NextResponse | null> => {
    const config = getRateLimitForFeature('ANSWERLATTICE_PUBLIC_BUNDLE');
    const ipHash = hashPublicRateLimitValue(getClientIp(request));
    try {
        const result = await checkRateLimit({
            key: `answerlattice-public-bundle:${ipHash}`,
            limit: config.limit,
            window: config.window,
            failClosedOnProviderError: true,
        });
        if (!result.allowed && result.reason === 'provider_unavailable') {
            return jsonResponse(request, { error: 'Bundle temporarily unavailable' }, {
                status: 503,
                headers: {
                    'Cache-Control': 'no-store',
                },
            });
        }
        if (result.allowed) return null;

        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        return jsonResponse(request, { error: 'Too many requests' }, {
            status: 429,
            headers: {
                'Cache-Control': 'no-store',
                'Retry-After': String(Math.max(retryAfter, 1)),
            },
        });
    } catch (error) {
        logRuntimeFailure('answerlattice_public_bundle_rate_limit_check_failed', error, {
            ...getBoundedRuntimeStringContext('path', request.nextUrl.pathname),
        });
        if (FEATURE_FLAGS.ENABLE_RATE_LIMITING) {
            return jsonResponse(request, { error: 'Bundle temporarily unavailable' }, {
                status: 503,
                headers: {
                    'Cache-Control': 'no-store',
                },
            });
        }
        return null;
    }
};

export function OPTIONS(request: NextRequest) {
    return handlePublicApiCorsPreflight(request);
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
    let requestedPath = '';
    try {
        requestedPath = ((await context.params).path || []).join('/');
        if (!PUBLIC_BUNDLE_PATH_PATTERN.test(requestedPath) || requestedPath.includes('..')) {
            return jsonResponse(request, { error: 'Not found' }, { status: 404 });
        }

        const storagePath = `answerlattice-context/public/${requestedPath}`;
        const rateLimitResponse = await checkBundleRateLimit(request);
        if (rateLimitResponse) return rateLimitResponse;

        const file = getBucket().file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            publicBundleProxyCache.delete(storagePath);
            return jsonResponse(request, { error: 'Not found' }, { status: 404 });
        }

        const cached = publicBundleProxyCache.get(storagePath);
        if (cached && cached.expiresAt > Date.now()) {
            return buildBundleResponse(request, cached.buffer);
        }
        if (cached) publicBundleProxyCache.delete(storagePath);

        const [metadata] = await file.getMetadata().catch(() => [null as any]);
        const metadataSize = Number(metadata?.size);
        if (Number.isFinite(metadataSize) && metadataSize > MAX_PUBLIC_BUNDLE_PROXY_DOWNLOAD_BYTES) {
            logRuntimeFailure('answerlattice_public_bundle_proxy_oversized', undefined, {
                ...getBoundedRuntimeStringContext('bundlePath', requestedPath),
                sizeBytes: metadataSize,
            });
            return buildBundleUnavailableResponse(request);
        }

        const [buffer] = await file.download();
        if (buffer.byteLength > MAX_PUBLIC_BUNDLE_PROXY_DOWNLOAD_BYTES) {
            logRuntimeFailure('answerlattice_public_bundle_proxy_oversized', undefined, {
                ...getBoundedRuntimeStringContext('bundlePath', requestedPath),
                sizeBytes: buffer.byteLength,
            });
            return buildBundleUnavailableResponse(request);
        }

        rememberPublicBundle(storagePath, buffer);
        return buildBundleResponse(request, buffer);
    } catch (error) {
        logRuntimeFailure('answerlattice_public_bundle_proxy_failed', error, {
            ...getBoundedRuntimeStringContext('bundlePath', requestedPath),
        });
        return buildBundleUnavailableResponse(request);
    }
}
