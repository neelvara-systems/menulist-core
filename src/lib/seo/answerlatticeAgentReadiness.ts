import {
    ANSWERLATTICE_SITE_DESCRIPTION,
    ANSWERLATTICE_SUPPORTING_LINE,
    ANSWERLATTICE_TAGLINE,
} from '@constant/answerlattice/website';
import { getProductDeploymentTarget } from '@constant/deploymentTargets';

export const ANSWERLATTICE_MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8';
export const ANSWERLATTICE_MARKDOWN_VARY = 'Accept, Accept-Encoding';
const ANSWERLATTICE_CANONICAL_SITE_URL = getProductDeploymentTarget('answerlattice', 'production').url.replace(/\/$/, '');

const ANSWERLATTICE_DISCOVERY_PATHS = new Set([
    '/',
    '/home',
    '/about',
    '/contact',
    '/demo',
    '/early-access',
    '/faq',
    '/get-started',
    '/hosted-help-center-for-saas',
    '/integrations',
    '/llms.txt',
    '/llms-full.txt',
    '/page-aware-support-widget',
    '/pricing',
    '/proof',
    '/quickstarts',
    '/roi-calculator',
    '/robots.txt',
    '/security',
    '/security-one-pager',
    '/sitemap.xml',
    '/support-widget-for-solo-founders',
    '/terms-of-service',
    '/privacy-policy',
    '/trust',
    '/updates',
    '/openapi.json',
    '/install.md',
    '/pre-onboarding.md',
    '/manifest.json',
    '/favicon.ico',
    '/answerlattice-logo.svg',
    '/answerlattice-og-image.png',
]);

const ANSWERLATTICE_DISCOVERY_PREFIXES = [
    '/agents/answerlattice/',
    '/comparisons/',
    '/developers/',
    '/install/',
    '/pre-onboarding/',
    '/product/',
    '/resources/',
    '/use-cases/',
] as const;

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

export function acceptsAnswerlatticeMarkdown(request: Pick<Request, 'headers' | 'method'>): boolean {
    return request.method === 'GET'
        && acceptsMediaType(request.headers.get('accept'), 'text/markdown');
}

export function isKnownAnswerlatticeDiscoveryPath(pathname: string): boolean {
    return ANSWERLATTICE_DISCOVERY_PATHS.has(pathname)
        || pathname.startsWith('/_next/')
        || ANSWERLATTICE_DISCOVERY_PREFIXES.some((prefix) => pathname.startsWith(prefix))
        || pathname === '/agents/answerlattice'
        || pathname === '/comparisons'
        || pathname === '/developers'
        || pathname === '/install'
        || pathname === '/pre-onboarding'
        || pathname === '/product'
        || pathname === '/resources'
        || pathname === '/use-cases'
        || pathname === '/api'
        || pathname.startsWith('/api/')
        || pathname === '/widget'
        || pathname.startsWith('/widget/');
}

function buildCanonicalAnswerlatticeUrl(pathname: string): string {
    return pathname === '/'
        ? `${ANSWERLATTICE_CANONICAL_SITE_URL}/`
        : `${ANSWERLATTICE_CANONICAL_SITE_URL}${pathname}`;
}

export function renderAnswerlatticeHomepageMarkdown(): string {
    return [
        '# AnswerLattice',
        '',
        `> ${ANSWERLATTICE_TAGLINE}`,
        '',
        ANSWERLATTICE_SUPPORTING_LINE,
        '',
        ANSWERLATTICE_SITE_DESCRIPTION,
        '',
        '## When to use AnswerLattice',
        '',
        '- Use AnswerLattice when a SaaS team needs reviewed support knowledge reused across its in-app widget, hosted help, FAQs, fallback, and future agent surfaces.',
        '- Use the install and developer guides to add the public v1 widget, pass safe page context, and verify the integration.',
        '- Use the Public API contract only for a named, approved server-side integration after the workspace owner enables the rollout-gated API and issues the required scopes.',
        '- Do not use AnswerLattice as a helpdesk replacement, chatbot autopilot, documentation CMS, compliance platform, autonomous publisher, or source of unapproved answers.',
        '',
        '## Start here',
        '',
        `- [Product](${buildCanonicalAnswerlatticeUrl('/product')})`,
        `- [Demo](${buildCanonicalAnswerlatticeUrl('/demo')})`,
        `- [Request early access](${buildCanonicalAnswerlatticeUrl('/early-access')})`,
        `- [Pre-Onboarding Kit](${buildCanonicalAnswerlatticeUrl('/pre-onboarding')})`,
        `- [Widget install](${buildCanonicalAnswerlatticeUrl('/install')})`,
        `- [Developer docs](${buildCanonicalAnswerlatticeUrl('/developers')})`,
        `- [OpenAPI contract](${buildCanonicalAnswerlatticeUrl('/openapi.json')})`,
        `- [Resources](${buildCanonicalAnswerlatticeUrl('/resources')})`,
        `- [Trust and data handling](${buildCanonicalAnswerlatticeUrl('/trust')})`,
        '',
        '## Action boundary',
        '',
        'Public agents may read these pages and install the widget from the stable public contract. They must not mutate workspaces, approved answers, tickets, billing, private knowledge, widget settings, or account data. Public API and MCP access remain disabled by default and require explicit server-side credentials, scopes, workspace readiness, and owner approval.',
        '',
    ].join('\n');
}

export function renderAnswerlatticeNotFoundMarkdown(): string {
    return [
        '# Page not found',
        '',
        'The requested AnswerLattice page does not exist.',
        '',
        `- [AnswerLattice home](${buildCanonicalAnswerlatticeUrl('/')})`,
        `- [Agent context](${buildCanonicalAnswerlatticeUrl('/llms.txt')})`,
        `- [Developer docs](${buildCanonicalAnswerlatticeUrl('/developers')})`,
        `- [Sitemap](${buildCanonicalAnswerlatticeUrl('/sitemap.xml')})`,
        '',
    ].join('\n');
}
