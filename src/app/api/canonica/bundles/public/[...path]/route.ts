export const dynamic = 'force-dynamic';

import { canonicaStorageAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_BUNDLE_PATH_PATTERN = /^pb_[A-Za-z0-9_-]{8,80}\/v\d+\/[A-Za-z0-9_./-]+\.json$/;

const getBucket = () => {
    if (!canonicaStorageAdmin || typeof canonicaStorageAdmin.bucket !== 'function') {
        throw new Error('Canonica Storage Admin is not configured');
    }
    return canonicaStorageAdmin.bucket();
};

export async function GET(_request: NextRequest, context: { params: { path?: string[] } }) {
    try {
        const requestedPath = (context.params.path || []).join('/');
        if (!PUBLIC_BUNDLE_PATH_PATTERN.test(requestedPath) || requestedPath.includes('..')) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const storagePath = `canonica-context/public/${requestedPath}`;
        const file = getBucket().file(storagePath);
        const [exists] = await file.exists();
        if (!exists) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const [buffer] = await file.download();
        const [metadata] = await file.getMetadata().catch(() => [{ cacheControl: 'public, max-age=300' } as any]);
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': metadata.cacheControl || 'public, max-age=300',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        secureError('[Canonica Bundles] Public bundle proxy failed', error as Error);
        return NextResponse.json({ error: 'Bundle unavailable' }, { status: 500 });
    }
}
