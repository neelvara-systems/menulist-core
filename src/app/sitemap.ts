import { MetadataRoute } from 'next';
import {
    buildWebsiteResourceLanguageAlternates,
} from '@/content/websiteResources';
import {
    PLATFORM_DISCOVERY_PAGES,
    buildPlatformDiscoveryUrl,
    getPlatformDiscoveryBaseUrl,
} from '@lib/seo/discoveryPolicy';

function buildSitemapAlternates(path: string, baseUrl: string): MetadataRoute.Sitemap[number]['alternates'] | undefined {
    const resourceMatch = path.match(/^\/(?:([^/]+)\/)?resources(?:\/([^/]+))?$/);
    if (!resourceMatch) return undefined;

    const slug = resourceMatch[2] || null;
    const languages = Object.fromEntries(
        Object.entries(buildWebsiteResourceLanguageAlternates(slug)).map(([locale, alternatePath]) => [
            locale,
            buildPlatformDiscoveryUrl(alternatePath, baseUrl),
        ]),
    );

    return { languages };
}

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
 * See: __docs__/seo-implementation-guide.md for full architecture
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    // Platform pages only - NOT client menus
    const baseUrl = getPlatformDiscoveryBaseUrl();
    const platformPages: MetadataRoute.Sitemap = PLATFORM_DISCOVERY_PAGES.map((page) => ({
        url: buildPlatformDiscoveryUrl(page.path, baseUrl),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: buildSitemapAlternates(page.path, baseUrl),
    }));

    // IMPORTANT: Client menus are NOT included in platform sitemap
    // Each client will have their own sitemap at their subdomain/custom domain
    // e.g., joespizza.menulist.ai/sitemap.xml

    return platformPages;
}
