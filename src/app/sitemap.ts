import { MetadataRoute } from 'next';
import {
    PLATFORM_DISCOVERY_PAGES,
    buildPlatformDiscoveryUrl,
    getPlatformDiscoveryBaseUrl,
} from '@lib/seo/discoveryPolicy';

/**
 * Platform Sitemap - Only includes menulist.ai platform pages
 * 
 * ARCHITECTURE:
 * Client digital menus are served via subdomains/custom domains:
 * - joespizza.menulist.ai → Client menu (subdomain)
 * - joespizza.com → Client menu (custom domain)
 * 
 * Each client has their own sitemap at their domain (see /app/client/sitemap.ts)
 * 
 * See: __docs__/SEO-IMPLEMENTATION-GUIDE.md for full architecture
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Platform pages only - NOT client menus
    const baseUrl = getPlatformDiscoveryBaseUrl();
    const platformPages: MetadataRoute.Sitemap = PLATFORM_DISCOVERY_PAGES.map((page) => ({
        url: buildPlatformDiscoveryUrl(page.path, baseUrl),
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
    }));

    // IMPORTANT: Client menus are NOT included in platform sitemap
    // Each client will have their own sitemap at their subdomain/custom domain
    // e.g., joespizza.menulist.ai/sitemap.xml

    return platformPages;
}
