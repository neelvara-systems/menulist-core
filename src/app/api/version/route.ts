import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    const buildId = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_BUILD_ID || 'unknown';
    const env = process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV || 'unknown';
    const deploymentUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_DEPLOYMENT_URL || '';

    return NextResponse.json(
        {
            buildId,
            shortBuildId: buildId === 'unknown' ? buildId : buildId.slice(0, 7),
            env,
            deploymentUrl,
            timestamp: new Date().toISOString(),
        },
        {
            status: 200,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                Pragma: 'no-cache',
                Expires: '0',
                'Surrogate-Control': 'no-store',
            },
        },
    );
}
