import { PLATFORM_URL, normalizeBaseUrl } from '@constant/urls';

export type SitemapChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface PlatformDiscoveryPage {
    changeFrequency: SitemapChangeFrequency;
    description: string;
    label: string;
    path: string;
    priority: number;
}

export const DISCOVERY_CRAWLERS = [
    'OAI-SearchBot',
    'ChatGPT-User',
    'GPTBot',
    'ClaudeBot',
    'PerplexityBot',
    'Google-Extended',
    'Googlebot',
    'Bingbot',
] as const;

export const PUBLIC_DISCOVERY_DISALLOWED_PATHS = [
    '/admin/',
    '/login/',
    '/register/',
    '/dashboard/',
    '/api/',
    '/editor/',
    '/preview/',
] as const;

export const PLATFORM_DISCOVERY_PAGES: PlatformDiscoveryPage[] = [
    {
        label: 'Homepage',
        path: '/',
        description: 'Platform overview for business owners',
        changeFrequency: 'weekly',
        priority: 1,
    },
    {
        label: 'Features',
        path: '/features',
        description: 'Core MenuList capabilities',
        changeFrequency: 'monthly',
        priority: 0.9,
    },
    {
        label: 'How It Works',
        path: '/how-it-works',
        description: 'Setup and publishing flow',
        changeFrequency: 'monthly',
        priority: 0.9,
    },
    {
        label: 'Pricing',
        path: '/pricing',
        description: 'Plan and pricing information',
        changeFrequency: 'monthly',
        priority: 0.9,
    },
    {
        label: 'Multi Location',
        path: '/multi-location',
        description: 'Multi-location business support',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Get Started',
        path: '/get-started',
        description: 'Owner onboarding entry point',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Create Menu',
        path: '/create-menu',
        description: 'Public menu creation entry point',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'About',
        path: '/about',
        description: 'Company and mission information',
        changeFrequency: 'monthly',
        priority: 0.7,
    },
    {
        label: 'Contact',
        path: '/contact',
        description: 'Support and inquiry details',
        changeFrequency: 'yearly',
        priority: 0.6,
    },
    {
        label: 'Trust & Security',
        path: '/trust-security',
        description: 'Trust and security information',
        changeFrequency: 'yearly',
        priority: 0.6,
    },
    {
        label: 'Privacy Policy',
        path: '/privacy-policy',
        description: 'Data collection, use, and protection policy',
        changeFrequency: 'yearly',
        priority: 0.4,
    },
    {
        label: 'Terms of Service',
        path: '/terms-of-service',
        description: 'Terms and conditions for using MenuList',
        changeFrequency: 'yearly',
        priority: 0.4,
    },
    {
        label: 'Refund Policy',
        path: '/refund-policy',
        description: 'Subscription payment and cancellation policy',
        changeFrequency: 'yearly',
        priority: 0.4,
    },
];

export function getPlatformDiscoveryBaseUrl(baseUrl = PLATFORM_URL): string {
    return normalizeBaseUrl(baseUrl) || PLATFORM_URL;
}

export function buildPlatformDiscoveryUrl(path: string, baseUrl = getPlatformDiscoveryBaseUrl()): string {
    const normalizedBase = normalizeBaseUrl(baseUrl) || PLATFORM_URL;
    if (!path || path === '/') return normalizedBase;
    return `${normalizedBase}/${path.replace(/^\/+/, '')}`;
}
