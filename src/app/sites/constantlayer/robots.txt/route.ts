import { NextResponse } from 'next/server';
import { CONSTANTLAYER_SITE_URL } from '@constant/constantlayer/website';

export const dynamic = 'force-static';

export function GET() {
    const body = [
        'User-agent: *',
        'Allow: /',
        `Sitemap: ${CONSTANTLAYER_SITE_URL}/sitemap.xml`,
        '',
    ].join('\n');

    return new NextResponse(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
