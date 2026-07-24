import { resolveHostedHelpSiteByDomain } from '@lib/answerlattice/hostedHelpServer';
import { resolveHostedHelpRequestDomain } from '@lib/answerlattice/hostedHelpRequest';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getRequestDomain = async (request: NextRequest) => {
    const headerList = (await headers());
    return resolveHostedHelpRequestDomain({
        host: headerList.get('host'),
        queryDomain: request.nextUrl.searchParams.get('domain'),
        isDevelopmentRewrite: headerList.get('x-answerlattice-hosted-help-dev') === '1',
        isDevelopmentRuntime: process.env.NODE_ENV === 'development' || process.env.VERCEL !== '1',
    });
};

export async function GET(request: NextRequest) {
    const host = await getRequestDomain(request);
    const site = await resolveHostedHelpSiteByDomain(host);

    if (!site || site.config.noIndex) {
        return new NextResponse('User-agent: *\nDisallow: /\n', {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }

    const baseUrl = `https://${site.config.primaryDomain || site.domain}`;
    return new NextResponse([
        'User-agent: *',
        'Allow: /',
        `Sitemap: ${baseUrl}/sitemap.xml`,
        '',
    ].join('\n'), {
        headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
}
