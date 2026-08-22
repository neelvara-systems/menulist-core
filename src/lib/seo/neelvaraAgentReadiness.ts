import {
    NEELVARA_ANSWERLATTICE_URL,
    NEELVARA_CONTACT_EMAIL,
    NEELVARA_LEGAL_EMAIL,
    NEELVARA_MENULIST_URL,
    NEELVARA_PRIVACY_EMAIL,
    NEELVARA_PUBLIC_PAGES,
    NEELVARA_RELATIONSHIP_LINE,
    NEELVARA_SITE_DESCRIPTION,
    NEELVARA_SITE_URL,
    NEELVARA_TAGLINE,
    buildNeelvaraUrl,
} from '@constant/neelvara/website';

export const NEELVARA_MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';
export const NEELVARA_MARKDOWN_VARY = 'Accept, Accept-Encoding';

const NEELVARA_DISCOVERY_PATHS = new Set([
    ...NEELVARA_PUBLIC_PAGES.map((page) => page.path),
    '/home',
    '/llms.txt',
    '/robots.txt',
    '/sitemap.xml',
    '/.well-known/security.txt',
    '/neelvara.webmanifest',
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

export function acceptsNeelvaraMarkdown(request: Pick<Request, 'headers' | 'method'>): boolean {
    return request.method === 'GET'
        && acceptsMediaType(request.headers.get('accept'), 'text/markdown');
}

export function isKnownNeelvaraDiscoveryPath(pathname: string): boolean {
    return NEELVARA_DISCOVERY_PATHS.has(pathname);
}

export function renderNeelvaraHomepageMarkdown(): string {
    return [
        '# Neelvara Systems',
        '',
        `> ${NEELVARA_TAGLINE}`,
        '',
        NEELVARA_SITE_DESCRIPTION,
        '',
        '## When to use this site',
        '',
        '- Use Neelvara as the official company reference for the operating trade name behind MenuList and Answerlattice.',
        '- Use it to verify the operated-product relationship and find the correct business, legal, privacy, or product-specific route.',
        '- Do not use the company site for product support, pricing, onboarding, billing, account access, or product capability claims; use the relevant product website.',
        '',
        '## Operated products',
        '',
        `- [MenuList](${NEELVARA_MENULIST_URL}) keeps public business information official.`,
        `- [Answerlattice](${NEELVARA_ANSWERLATTICE_URL}) keeps customer answers grounded in approved knowledge.`,
        '',
        NEELVARA_RELATIONSHIP_LINE,
        '',
        '## Official company references',
        '',
        `- [Products](${buildNeelvaraUrl('/products')})`,
        `- [About](${buildNeelvaraUrl('/about')})`,
        `- [Contact](${buildNeelvaraUrl('/contact')})`,
        `- [Trust and verification](${buildNeelvaraUrl('/trust')})`,
        `- [Legal](${buildNeelvaraUrl('/legal')})`,
        `- [Privacy](${buildNeelvaraUrl('/privacy')})`,
        `- [Terms](${buildNeelvaraUrl('/terms')})`,
        '',
        '## Contact routes',
        '',
        `- Business: ${NEELVARA_CONTACT_EMAIL}`,
        `- Legal: ${NEELVARA_LEGAL_EMAIL}`,
        `- Privacy: ${NEELVARA_PRIVACY_EMAIL}`,
        '',
        'Neelvara.com is an informational company website. It does not expose an API, MCP server, authenticated workflow, contact form, or autonomous action surface.',
        '',
    ].join('\n');
}

export function renderNeelvaraLlmsTxt(): string {
    return [
        '# Neelvara Systems',
        '',
        `Canonical site: [${NEELVARA_SITE_URL}](${NEELVARA_SITE_URL})`,
        '',
        NEELVARA_SITE_DESCRIPTION,
        '',
        '## When to use this site',
        '',
        '- Use this site to identify Neelvara Systems, verify which products it operates, and locate official company contact and policy routes.',
        '- Use MenuList or Answerlattice directly for product capabilities, support, pricing, onboarding, billing, accounts, and product-specific policies.',
        '- Treat the Trust and Verification page as a source map, not as a certification, audit report, uptime promise, or product-security guarantee.',
        '',
        '## Product boundary',
        '',
        NEELVARA_RELATIONSHIP_LINE,
        '',
        `- [MenuList](${NEELVARA_MENULIST_URL})`,
        `- [Answerlattice](${NEELVARA_ANSWERLATTICE_URL})`,
        '',
        '## Official pages',
        '',
        ...NEELVARA_PUBLIC_PAGES.map((page) => `- [${page.title}](${buildNeelvaraUrl(page.path)})`),
        '',
        '## Agent action boundary',
        '',
        'Neelvara.com is a public informational company site. It provides no API, MCP server, authentication flow, form submission, purchasing action, or autonomous tool call. Follow the relevant product link for product-specific information.',
        '',
        'The homepage supports an optional text/markdown representation through HTTP content negotiation.',
        '',
    ].join('\n');
}

export function renderNeelvaraNotFoundMarkdown(): string {
    return [
        '# Page not found',
        '',
        'The requested Neelvara page does not exist.',
        '',
        `- [Neelvara home](${buildNeelvaraUrl('/')})`,
        `- [Agent context](${buildNeelvaraUrl('/llms.txt')})`,
        `- [Sitemap](${buildNeelvaraUrl('/sitemap.xml')})`,
        '',
    ].join('\n');
}
