import { DISCOVERY_CRAWLERS } from '@lib/seo/discoveryPolicy';
import { ANSWERLATTICE_SITE_URL } from '../siteConfig';

export const dynamic = 'force-static';

export function GET() {
    const crawlerRules = DISCOVERY_CRAWLERS.map((crawler) => `User-agent: ${crawler}
Allow: /`).join('\n\n');

    return new Response(`# Agent context: ${ANSWERLATTICE_SITE_URL}/llms.txt
# Extended agent context: ${ANSWERLATTICE_SITE_URL}/llms-full.txt
${crawlerRules}

User-agent: *
Allow: /
Disallow: /answerlattice/
Disallow: /api/
Disallow: /signin
Disallow: /unauthorized

Sitemap: ${ANSWERLATTICE_SITE_URL}/sitemap.xml
Host: ${ANSWERLATTICE_SITE_URL}
`, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
