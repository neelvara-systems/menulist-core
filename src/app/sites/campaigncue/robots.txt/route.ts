import { NextResponse } from 'next/server';
import { CAMPAIGNCUE_ROBOTS_DISALLOW_PATHS, CAMPAIGNCUE_SITE_URL } from '@constant/campaigncue/website';

export const dynamic = 'force-static';

export function GET() {
    const body = [
        'User-agent: *',
        'Allow: /',
        ...CAMPAIGNCUE_ROBOTS_DISALLOW_PATHS.map((path) => `Disallow: ${path}`),
        `Sitemap: ${CAMPAIGNCUE_SITE_URL}/sitemap.xml`,
        '',
    ].join('\n');

    return new NextResponse(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600',
        },
    });
}
