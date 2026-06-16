export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { answerlatticeStorageAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { handlePublicApiCorsPreflight, withPublicApiCors } from '@lib/publicApi/auth';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { secureError } from '@lib/security/secureLogger';
import { getClientIp } from 'src/middleware/publicApi';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_BUNDLE_PATH_PATTERN = /^pb_[A-Za-z0-9_-]{8,80}\/v\d+\/[A-Za-z0-9_./-]+\.json$/;
const PUBLIC_BUNDLE_PROXY_CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_PUBLIC_BUNDLE_PROXY_CACHE_ENTRIES = 300;
const MAX_PUBLIC_BUNDLE_PROXY_CACHE_BYTES = 512 * 1024;

type PublicBundleProxyCacheEntry = {
    buffer: Buffer;
    cacheControl: string;
    expiresAt: number;
};

const publicBundleProxyCache = new Map<string, PublicBundleProxyCacheEntry>();

const getBucket = () => {
    if (!answerlatticeStorageAdmin || typeof answerlatticeStorageAdmin.bucket !== 'function') {
        throw new Error('Answerlattice Storage Admin is not configured');
    }
    return answerlatticeStorageAdmin.bucket();
};

const buildBundleResponse = (request: NextRequest, buffer: Buffer, cacheControl: string) => withPublicApiCors(new NextResponse(buffer, {
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': cacheControl || 'public, max-age=300',
        'Content-Length': String(buffer.length),
        'X-Content-Type-Options': 'nosniff',
    },
}), request);

const jsonResponse = (
    request: NextRequest,
    body: Record<string, any>,
    init?: ResponseInit,
): NextResponse => withPublicApiCors(NextResponse.json(body, init), request);

const rememberPublicBundle = (storagePath: string, buffer: Buffer, cacheControl: string): void => {
    if (buffer.length > MAX_PUBLIC_BUNDLE_PROXY_CACHE_BYTES) return;
    if (publicBundleProxyCache.size >= MAX_PUBLIC_BUNDLE_PROXY_CACHE_ENTRIES) {
        const oldestKey = publicBundleProxyCache.keys().next().value;
        if (oldestKey) publicBundleProxyCache.delete(oldestKey);
    }
    publicBundleProxyCache.set(storagePath, {
        buffer,
        cacheControl,
        expiresAt: Date.now() + PUBLIC_BUNDLE_PROXY_CACHE_TTL_MS,
    });
};

const checkBundleCacheMissRateLimit = async (request: NextRequest): Promise<NextResponse | null> => {
    const config = getRateLimitForFeature('ANSWERLATTICE_PUBLIC_BUNDLE');
    try {
        const result = await checkRateLimit({
            key: `answerlattice-public-bundle:${getClientIp(request)}`,
            limit: config.limit,
            window: config.window,
        });
        if (
            result.allowed
            && FEATURE_FLAGS.ENABLE_RATE_LIMITING
            && result.current === 0
            && result.remaining === config.limit
        ) {
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
        secureError('[Answerlattice Bundles] Bundle proxy rate limit check failed', error as Error);
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

export async function GET(request: NextRequest, context: { params: { path?: string[] } }) {
    try {
        const requestedPath = (context.params.path || []).join('/');
        if (!PUBLIC_BUNDLE_PATH_PATTERN.test(requestedPath) || requestedPath.includes('..')) {
            return jsonResponse(request, { error: 'Not found' }, { status: 404 });
        }

        const storagePath = `answerlattice-context/public/${requestedPath}`;
        const cached = publicBundleProxyCache.get(storagePath);
        if (cached && cached.expiresAt > Date.now()) {
            return buildBundleResponse(request, cached.buffer, cached.cacheControl);
        }
        if (cached) publicBundleProxyCache.delete(storagePath);

        const rateLimitResponse = await checkBundleCacheMissRateLimit(request);
        if (rateLimitResponse) return rateLimitResponse;

        const file = getBucket().file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            return jsonResponse(request, { error: 'Not found' }, { status: 404 });
        }

        const [buffer] = await file.download();
        const [metadata] = await file.getMetadata().catch(() => [{ cacheControl: 'public, max-age=300' } as any]);
        const cacheControl = metadata.cacheControl || 'public, max-age=300';
        rememberPublicBundle(storagePath, buffer, cacheControl);
        return buildBundleResponse(request, buffer, cacheControl);
    } catch (error) {
        secureError('[Answerlattice Bundles] Public bundle proxy failed', error as Error);
        return jsonResponse(request, { error: 'Bundle unavailable' }, {
            status: 503,
            headers: {
                'Cache-Control': 'no-store',
            },
        });
    }
}
