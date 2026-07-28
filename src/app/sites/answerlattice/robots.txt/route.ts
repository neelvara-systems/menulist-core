import { DISCOVERY_CRAWLERS } from '@lib/seo/discoveryPolicy';
import { ANSWERLATTICE_SITE_URL } from '../siteConfig';

export const dynamic = 'force-static';

export const ANSWERLATTICE_DISCOVERY_DISALLOWED_PATHS = [
    '/answerlattice/',
    '/api/',
    '/signin',
    '/unauthorized',
] as const;

export function renderAnswerlatticeRobotsTxt(): string {
    const disallowRules = ANSWERLATTICE_DISCOVERY_DISALLOWED_PATHS
        .map((path) => `Disallow: ${path}`)
        .join('\n');
    const crawlerRules = DISCOVERY_CRAWLERS
        .map((crawler) => `User-agent: ${crawler}\nAllow: /\n${disallowRules}`)
        .join('\n\n');

    return `# Agent context: ${ANSWERLATTICE_SITE_URL}/llms.txt
# Extended agent context: ${ANSWERLATTICE_SITE_URL}/llms-full.txt
${crawlerRules}

User-agent: *
Allow: /
${disallowRules}

Sitemap: ${ANSWERLATTICE_SITE_URL}/sitemap.xml
Host: ${ANSWERLATTICE_SITE_URL}
`;
}

export function GET() {
    return new Response(renderAnswerlatticeRobotsTxt(), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    });
}
