import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://menulist.ai';

/**
 * Platform Sitemap - Only includes menulist.ai platform pages
 * 
 * ARCHITECTURE:
 * Client digital menus are served via subdomains/custom domains:
 * - joespizza.menulist.ai → Client menu (subdomain)
 * - joespizza.com → Client menu (custom domain)
 * 
 * Each client has their own sitemap at their domain (see /app/_client/sitemap.ts)
 * 
 * See: __docs__/SEO-IMPLEMENTATION-GUIDE.md for full architecture
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Platform pages only - NOT client menus
    const platformPages: MetadataRoute.Sitemap = [
        {
            url: BASE_URL,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 1.0,
        },
        {
            url: `${BASE_URL}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${BASE_URL}/contact`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.6,
        },
        {
            url: `${BASE_URL}/privacy`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/refund-policy`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.5,
        },
        {
            url: `${BASE_URL}/blog`,
            lastModified: new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        },
    ];

    // IMPORTANT: Client menus are NOT included in platform sitemap
    // Each client will have their own sitemap at their subdomain/custom domain
    // e.g., joespizza.menulist.ai/sitemap.xml

    return platformPages;
}
