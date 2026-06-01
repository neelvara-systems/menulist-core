import { NextRequest, NextResponse } from 'next/server';
import { MYCODEX_ROBOTS_TAG } from '@lib/mycodex/auth';
import {
    getMyCodexRelativeSourcePath,
    getMyCodexSlugFromRoutePath,
    resolveMyCodexDocument,
} from '@lib/mycodex/docs';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const slug = getMyCodexSlugFromRoutePath(request.nextUrl.searchParams.get('path'));

    if (!slug) {
        return NextResponse.json(
            { error: 'Invalid document path' },
            {
                status: 400,
                headers: {
                    'Cache-Control': 'private, no-store',
                    'X-Robots-Tag': MYCODEX_ROBOTS_TAG,
                },
            },
        );
    }

    const { markdown, resolvedFilePath } = await resolveMyCodexDocument(slug);
    const response = NextResponse.json({
        markdown,
        sourcePath: getMyCodexRelativeSourcePath(resolvedFilePath),
    });

    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', MYCODEX_ROBOTS_TAG);
    response.headers.set('Vary', 'Cookie');

    return response;
}
