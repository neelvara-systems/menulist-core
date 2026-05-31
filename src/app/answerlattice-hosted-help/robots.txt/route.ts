import { resolveHostedHelpSiteByDomain } from '@lib/answerlattice/hostedHelpServer';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const getRequestDomain = (request: NextRequest) => {
    const headerList = headers();
    const routedHost = headerList.get('x-answerlattice-hosted-help-domain');
    if (routedHost) return routedHost;

    const isDevRewrite = headerList.get('x-answerlattice-hosted-help-dev') === '1';
    const allowQueryDomain = isDevRewrite || process.env.NODE_ENV === 'development' || process.env.VERCEL !== '1';
    return allowQueryDomain
        ? request.nextUrl.searchParams.get('domain') || headerList.get('host')
        : headerList.get('host');
};

export async function GET(request: NextRequest) {
    const host = getRequestDomain(request);
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
