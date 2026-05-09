/**
 * Client Menu Robots.txt
 *
 * Generates robots.txt for client menus and OBP pages accessed via subdomain
 * or custom domain. Tenant domains are rewritten here by middleware so each
 * business advertises its own sitemap instead of the platform sitemap.
 */

import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

const AI_AND_SEARCH_CRAWLERS = [
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
    'ClaudeBot',
    'PerplexityBot',
    'Google-Extended',
    'Googlebot',
    'Bingbot',
];

const DISALLOWED_INTERNAL_PATHS = [
    '/admin/',
    '/login/',
    '/register/',
    '/dashboard/',
    '/api/',
    '/editor/',
    '/preview/',
];

export default function robots(): MetadataRoute.Robots {
    const headersList = headers();
    const subdomain = headersList.get('x-tenant-subdomain');
    const customDomain = headersList.get('x-tenant-custom-domain');

    // Build base URL based on domain type
    let baseUrl: string;
    if (customDomain) {
        baseUrl = `https://${customDomain}`;
    } else if (subdomain) {
        baseUrl = `https://${subdomain}.menulist.ai`;
    } else {
        baseUrl = 'https://menulist.ai';
    }

    return {
        rules: [
            ...AI_AND_SEARCH_CRAWLERS.map((userAgent) => ({
                userAgent,
                allow: '/',
            })),
            {
                userAgent: '*',
                allow: '/',
                disallow: DISALLOWED_INTERNAL_PATHS,
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
