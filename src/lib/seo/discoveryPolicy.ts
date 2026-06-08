import { PLATFORM_URL, normalizeBaseUrl } from '@constant/urls';
import { WEBSITE_RESOURCE_ALL_DISCOVERY_PAGES } from '@/content/websiteResources';

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
    'Claude-User',
    'Claude-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'Googlebot',
    'Bingbot',
    'CCBot',
] as const;

export const PUBLIC_DISCOVERY_DISALLOWED_PATHS = [
    '/admin/',
    '/login/',
    '/register/',
    '/dashboard/',
    '/api/',
    '/editor/',
    '/preview/',
    '/auth/',
    '/internal/',
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
        label: 'Menu Import',
        path: '/features/menu-import',
        description: 'Upload a menu photo, PDF, link, or typed menu for owner review before publishing',
        changeFrequency: 'monthly',
        priority: 0.86,
    },
    {
        label: 'Official Business Page',
        path: '/features/official-business-page',
        description: 'One official customer-facing page for menu, hours, photos, contact details, actions, and business information',
        changeFrequency: 'monthly',
        priority: 0.86,
    },
    {
        label: 'QR Menu and Links',
        path: '/features/qr-menu-links',
        description: 'QR menu, share links, saved shortcuts, and print materials from the same approved menu source',
        changeFrequency: 'monthly',
        priority: 0.86,
    },
    {
        label: 'Owner Phone Dashboard',
        path: '/features/owner-phone-dashboard',
        description: 'Mobile owner dashboard for reviewing, publishing, and managing daily menu operations without a desktop',
        changeFrequency: 'monthly',
        priority: 0.84,
    },
    {
        label: 'Business Health',
        path: '/features/business-health',
        description: 'Owner dashboard check for latest business state, freshness, customer attention, and safe next actions',
        changeFrequency: 'monthly',
        priority: 0.88,
    },
    {
        label: 'Public Discovery',
        path: '/features/public-discovery',
        description: 'Clear public business information, structured pages, and discovery signals without ranking or AI placement promises',
        changeFrequency: 'monthly',
        priority: 0.84,
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
        label: 'Restaurants',
        path: '/industries/restaurants',
        description: 'Official menu source layer for restaurants',
        changeFrequency: 'monthly',
        priority: 0.76,
    },
    {
        label: 'Cafes and Bakeries',
        path: '/industries/cafes-bakeries',
        description: 'Current menu source layer for cafes, bakeries, dessert shops, and beverage counters',
        changeFrequency: 'monthly',
        priority: 0.74,
    },
    {
        label: 'Takeaways and Cloud Kitchens',
        path: '/industries/takeaway-cloud-kitchens',
        description: 'Public menu source layer for takeaways, pickup kitchens, and cloud kitchens',
        changeFrequency: 'monthly',
        priority: 0.74,
    },
    {
        label: 'Multi-location Food Businesses',
        path: '/industries/multi-location-food-businesses',
        description: 'Menu source control for branch and outlet food businesses',
        changeFrequency: 'monthly',
        priority: 0.76,
    },
    ...WEBSITE_RESOURCE_ALL_DISCOVERY_PAGES,
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
