/**
 * Client Menu Robots.txt
 *
 * Generates robots.txt for client menus and OBP pages accessed via subdomain
 * or custom domain. Tenant domains are rewritten here by middleware so each
 * business advertises its own sitemap instead of the platform sitemap.
 */

import { MetadataRoute } from 'next';
import {
    DISCOVERY_CRAWLERS,
    PUBLIC_DISCOVERY_DISALLOWED_PATHS,
} from '@lib/seo/discoveryPolicy';
import { PLATFORM_URL } from '@constant/urls';
import { getTenantFromHeaders } from '@lib/multiTenant/getTenantFromHeaders';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const tenant = await getTenantFromHeaders('ClientRobotsMetadata');
    const baseUrl = tenant.origin || PLATFORM_URL;

    return {
        rules: [
            ...DISCOVERY_CRAWLERS.map((userAgent) => ({
                userAgent,
                allow: '/',
                disallow: [...PUBLIC_DISCOVERY_DISALLOWED_PATHS],
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
