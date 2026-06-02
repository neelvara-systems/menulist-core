import { PLATFORM_URL } from '@constant/urls';
import {
    DISCOVERY_CRAWLERS,
    PUBLIC_DISCOVERY_DISALLOWED_PATHS,
} from '@lib/seo/discoveryPolicy';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

function getTenantBaseUrl() {
    const headersList = headers();
    const subdomain = headersList.get('x-tenant-subdomain');
    const customDomain = headersList.get('x-tenant-custom-domain');

    if (customDomain) return `https://${customDomain}`;
    if (subdomain) return `https://${subdomain}.menulist.ai`;
    return PLATFORM_URL;
}

export function GET() {
    const baseUrl = getTenantBaseUrl();
    const crawlerRules = DISCOVERY_CRAWLERS
        .map((crawler) => `User-agent: ${crawler}\nAllow: /`)
        .join('\n\n');
    const disallowRules = PUBLIC_DISCOVERY_DISALLOWED_PATHS
        .map((path) => `Disallow: ${path}`)
        .join('\n');

    return new Response(`${crawlerRules}\n\nUser-agent: *\nAllow: /\n${disallowRules}\n\nSitemap: ${baseUrl}/sitemap.xml\n`, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
    });
}
