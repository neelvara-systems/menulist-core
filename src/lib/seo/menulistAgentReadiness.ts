import {
    MENULIST_SITE_DESCRIPTION,
    MENULIST_SITE_URL,
    MENULIST_TAGLINE,
} from '@constant/menulist/website';
import { PLATFORM_DISCOVERY_PAGES } from '@lib/seo/discoveryPolicy';

export const MENULIST_MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';
export const MENULIST_MARKDOWN_VARY = 'Accept, Accept-Encoding';

const MENULIST_DISCOVERY_PATHS = new Set([
    ...PLATFORM_DISCOVERY_PAGES.map((page) => page.path),
    '/home',
    '/llms.txt',
    '/llms-full.txt',
    '/robots.txt',
    '/sitemap.xml',
    '/manifest.json',
    '/developers/openapi',
]);

function acceptsMediaType(acceptHeader: string | null, mediaType: string): boolean {
    if (!acceptHeader) return false;

    return acceptHeader.split(',').some((entry) => {
        const [candidate, ...parameters] = entry.trim().toLowerCase().split(';');
        if (candidate !== mediaType) return false;

        return !parameters.some((parameter) => {
            const [key, value] = parameter.trim().split('=');
            return key === 'q' && Number(value) === 0;
        });
    });
}

function buildMenuListUrl(path: string): string {
    return path === '/' ? `${MENULIST_SITE_URL}/` : `${MENULIST_SITE_URL}${path}`;
}

export function acceptsMenuListMarkdown(request: Pick<Request, 'headers' | 'method'>): boolean {
    return request.method === 'GET'
        && acceptsMediaType(request.headers.get('accept'), 'text/markdown');
}

export function isKnownMenuListDiscoveryPath(pathname: string): boolean {
    return MENULIST_DISCOVERY_PATHS.has(pathname);
}

export function renderMenuListHomepageMarkdown(): string {
    return [
        '# MenuList',
        '',
        `> ${MENULIST_TAGLINE}`,
        '',
        MENULIST_SITE_DESCRIPTION,
        '',
        '## When to use MenuList',
        '',
        '- Use MenuList to read owner-published business facts, menus or service lists, prices where shown, hours, location, contact details, and official customer action links.',
        '- Use the public business or menu page as the source for a specific business. Treat missing facts as unknown instead of guessing.',
        '- Use the developer reference only for an approved read-only integration with a store-generated API key.',
        '- Do not use MenuList to change owner-approved truth or to promise search ranking, citation, or visibility outcomes.',
        '',
        '## Public references',
        '',
        `- [Features](${buildMenuListUrl('/features')})`,
        `- [Pricing](${buildMenuListUrl('/pricing')})`,
        `- [Resources](${buildMenuListUrl('/resources')})`,
        `- [Developer reference](${buildMenuListUrl('/developers')})`,
        `- [OpenAPI contract](${buildMenuListUrl('/developers/openapi')})`,
        `- [Trust and security](${buildMenuListUrl('/trust-security')})`,
        `- [Extended agent context](${buildMenuListUrl('/llms-full.txt')})`,
        '',
        '## Integration boundary',
        '',
        'The Platform Pull API exposes two read-only endpoints for approved business and menu data. It requires a store-generated `ml_` API key in the `X-API-Key` header and the `public:read` scope. MenuList does not provide anonymous API access, OAuth, write endpoints, MCP/WebMCP actions, or an official npm SDK.',
        '',
    ].join('\n');
}

export function renderMenuListNotFoundMarkdown(): string {
    return [
        '# Page not found',
        '',
        'The requested MenuList page does not exist.',
        '',
        `- [MenuList home](${buildMenuListUrl('/')})`,
        `- [Agent context](${buildMenuListUrl('/llms.txt')})`,
        `- [Developer reference](${buildMenuListUrl('/developers')})`,
        `- [Sitemap](${buildMenuListUrl('/sitemap.xml')})`,
        '',
    ].join('\n');
}
