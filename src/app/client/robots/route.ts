import { PLATFORM_URL } from '@constant/urls';
import {
    DISCOVERY_CRAWLERS,
    PUBLIC_DISCOVERY_DISALLOWED_PATHS,
} from '@lib/seo/discoveryPolicy';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';

export const dynamic = 'force-dynamic';

export async function GET() {
    const tenant = await getTenantFromHeaders('ClientRobotsRoute');
    const baseUrl = tenant.origin || PLATFORM_URL;
    const disallowRules = PUBLIC_DISCOVERY_DISALLOWED_PATHS
        .map((path) => `Disallow: ${path}`)
        .join('\n');
    const crawlerRules = DISCOVERY_CRAWLERS
        .map((crawler) => `User-agent: ${crawler}\nAllow: /\n${disallowRules}`)
        .join('\n\n');

    return new Response(`${crawlerRules}\n\nUser-agent: *\nAllow: /\n${disallowRules}\n\nSitemap: ${baseUrl}/sitemap.xml\n`, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
    });
}
