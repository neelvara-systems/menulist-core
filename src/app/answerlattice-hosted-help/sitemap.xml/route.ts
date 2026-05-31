import { getCachedKnowledgeBaseCategories } from '@lib/answerlattice/publicContentCache';
import { resolveHostedHelpSiteByDomain } from '@lib/answerlattice/hostedHelpServer';
import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const escapeXml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

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
        return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" />', {
            headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
    }

    const baseUrl = `https://${site.config.primaryDomain || site.domain}`;
    const categories = await getCachedKnowledgeBaseCategories({ tId: site.tId, sId: site.sId });
    const articleUrls = categories?.categories
        ? Object.values(categories.categories).flatMap(category => [
            ...(category.articles || []),
            ...(category.sections || []).flatMap(section => section.articles || []),
        ]).slice(0, 500).map(article => `${baseUrl}/articles/${article.url || article.id}`)
        : [];

    const urls = [
        baseUrl,
        `${baseUrl}/docs`,
        ...(site.config.showFaqs ? [`${baseUrl}/faq`] : []),
        ...(site.config.showChangelog ? [`${baseUrl}/changelog`] : []),
        ...articleUrls,
    ];

    const body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls.map(url => `  <url><loc>${escapeXml(url)}</loc></url>`),
        '</urlset>',
    ].join('\n');

    return new NextResponse(body, {
        headers: {
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
            'Content-Type': 'application/xml; charset=utf-8',
        },
    });
}
