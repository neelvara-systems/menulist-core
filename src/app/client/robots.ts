/**
 * Client Menu Robots.txt
 *
 * Generates robots.txt for client menus and OBP pages accessed via subdomain
 * or custom domain. Tenant domains are rewritten here by middleware so each
 * business advertises its own sitemap instead of the platform sitemap.
 */

import { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import {
    DISCOVERY_CRAWLERS,
    PUBLIC_DISCOVERY_DISALLOWED_PATHS,
} from '@lib/seo/discoveryPolicy';
import { PLATFORM_DOMAIN, PLATFORM_URL } from '@constant/urls';

export default function robots(): MetadataRoute.Robots {
    const headersList = headers();
    const subdomain = headersList.get('x-tenant-subdomain');
    const customDomain = headersList.get('x-tenant-custom-domain');

    // Build base URL based on domain type
    let baseUrl: string;
    if (customDomain) {
        baseUrl = `https://${customDomain}`;
    } else if (subdomain) {
        baseUrl = `https://${subdomain}.${PLATFORM_DOMAIN}`;
    } else {
        baseUrl = PLATFORM_URL;
    }

    return {
        rules: [
            ...DISCOVERY_CRAWLERS.map((userAgent) => ({
                userAgent,
                allow: '/',
            })),
            {
                userAgent: '*',
                allow: '/',
                disallow: [...PUBLIC_DISCOVERY_DISALLOWED_PATHS],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
