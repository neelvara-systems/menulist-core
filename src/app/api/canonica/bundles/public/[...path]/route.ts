export const dynamic = 'force-dynamic';

import { canonicaStorageAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { secureError } from '@lib/security/secureLogger';
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
    if (!canonicaStorageAdmin || typeof canonicaStorageAdmin.bucket !== 'function') {
        throw new Error('Canonica Storage Admin is not configured');
    }
    return canonicaStorageAdmin.bucket();
};

const buildBundleResponse = (buffer: Buffer, cacheControl: string) => new NextResponse(buffer, {
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': cacheControl || 'public, max-age=300',
        'Content-Length': String(buffer.length),
        'X-Content-Type-Options': 'nosniff',
    },
});

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

export async function GET(_request: NextRequest, context: { params: { path?: string[] } }) {
    try {
        const requestedPath = (context.params.path || []).join('/');
        if (!PUBLIC_BUNDLE_PATH_PATTERN.test(requestedPath) || requestedPath.includes('..')) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const storagePath = `canonica-context/public/${requestedPath}`;
        const cached = publicBundleProxyCache.get(storagePath);
        if (cached && cached.expiresAt > Date.now()) {
            return buildBundleResponse(cached.buffer, cached.cacheControl);
        }
        if (cached) publicBundleProxyCache.delete(storagePath);

        const file = getBucket().file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const [buffer] = await file.download();
        const [metadata] = await file.getMetadata().catch(() => [{ cacheControl: 'public, max-age=300' } as any]);
        const cacheControl = metadata.cacheControl || 'public, max-age=300';
        rememberPublicBundle(storagePath, buffer, cacheControl);
        return buildBundleResponse(buffer, cacheControl);
    } catch (error) {
        secureError('[Canonica Bundles] Public bundle proxy failed', error as Error);
        return NextResponse.json({ error: 'Bundle unavailable' }, { status: 500 });
    }
}
