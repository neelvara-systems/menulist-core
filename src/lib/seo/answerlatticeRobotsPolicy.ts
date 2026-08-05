import { DISCOVERY_CRAWLERS } from '@lib/seo/discoveryPolicy';

export const ANSWERLATTICE_DISCOVERY_DISALLOWED_PATHS = [
    '/answerlattice/',
    '/api/',
    '/signin',
    '/unauthorized',
] as const;

export function renderAnswerlatticeRobotsTxt(siteUrl: string): string {
    const disallowRules = ANSWERLATTICE_DISCOVERY_DISALLOWED_PATHS
        .map((path) => `Disallow: ${path}`)
        .join('\n');
    const crawlerRules = DISCOVERY_CRAWLERS
        .map((crawler) => `User-agent: ${crawler}\nAllow: /\n${disallowRules}`)
        .join('\n\n');

    return `# Agent context: ${siteUrl}/llms.txt
# Extended agent context: ${siteUrl}/llms-full.txt
${crawlerRules}

User-agent: *
Allow: /
${disallowRules}

Sitemap: ${siteUrl}/sitemap.xml
Host: ${siteUrl}
`;
}
