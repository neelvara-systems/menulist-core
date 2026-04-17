/**
 * Client Menu Robots.txt
 * 
 * Generates robots.txt for client menus accessed via subdomain or custom domain.
 * Allows all crawlers to index the menu.
 */

import { MetadataRoute } from 'next';
import { headers } from 'next/headers';

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
        rules: {
            userAgent: '*',
            allow: '/',
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
