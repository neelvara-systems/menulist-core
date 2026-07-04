import { getProductDeploymentTarget } from '@constant/deploymentTargets';
import { normalizeBaseUrl } from '@constant/urls';
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
    'OAI-AdsBot',
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
    '/signin',
    '/forgot-password',
    '/error',
    '/login/',
    '/register/',
    '/dashboard/',
    '/app/',
    '/account/',
    '/billing/',
    '/settings/',
    '/api/',
    '/client/',
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
        label: 'AI Menu Manager',
        path: '/ai-menu-manager',
        description: 'Approval-based AI menu operations for prices, sold-out items, specials, images, imports, design, and publishing',
        changeFrequency: 'monthly',
        priority: 0.92,
    },
    {
        label: 'WhatsApp Onboarding',
        path: '/whatsapp',
        description: 'WhatsApp-first onboarding for menus, service lists, rate cards, catalogs, and price lists into one official customer link',
        changeFrequency: 'monthly',
        priority: 0.94,
    },
    {
        label: 'MenuList Tools',
        path: '/tools',
        description: 'Public index of free MenuList browser-local tools for checking business truth, customer links, menu or service clarity, customer actions, hours, photos, and setup gaps',
        changeFrequency: 'monthly',
        priority: 0.84,
    },
    {
        label: 'MenuList Tool Reports',
        path: '/tools/reports',
        description: 'Public shareable MenuList tool report viewer for checked facts, evidence text, clear boundaries, and the next MenuList action',
        changeFrequency: 'monthly',
        priority: 0.72,
    },
    {
        label: 'Public Truth Check',
        path: '/tools/public-truth-check',
        description: 'Browser-local check for whether a business has clear public facts for its menu or service list, hours, location, contact, action links, and current customer source',
        changeFrequency: 'monthly',
        priority: 0.82,
    },
    {
        label: 'QR Link Health Check',
        path: '/tools/qr-link-health-check',
        description: 'Browser-local check for whether a QR code opens a clear current customer link for menus, services, booking, WhatsApp, directions, or public business pages',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Menu Readability Check',
        path: '/tools/menu-readability-check',
        description: 'Browser-local check for whether pasted menu, service, catalog, rate-card, or package text is clear enough for customers to understand prices, details, and the next action',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Customer Question Coverage Check',
        path: '/tools/customer-question-coverage-check',
        description: 'Browser-local check for whether pasted public business source text can answer common customer questions about menu, services, hours, prices, location, contact, and next actions',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Customer FAQ Reply Pack',
        path: '/tools/customer-faq-reply-pack',
        description: 'Browser-local reply pack that turns owner-entered customer questions and business facts into reusable FAQ and auto-reply text without reading conversations, creating a chatbot, sending messages, or calling AI providers',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Booking Inquiry Readiness Check',
        path: '/tools/booking-inquiry-readiness-check',
        description: 'Browser-local check for whether customers can clearly order, book, reserve, call, message, request a quote, or visit from the public business source they see',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Price Availability Gap Check',
        path: '/tools/price-availability-gap-check',
        description: 'Browser-local check for whether pasted menu, service, catalog, package, or price-list text makes prices, rates, availability, unavailable items, and quote paths clear for customers',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Menu PDF Cleanup Check',
        path: '/tools/menu-pdf-cleanup-check',
        description: 'Browser-local check for whether an old menu, service, catalog, package, or rate-card PDF is still clear enough for customers or should be replaced with one current customer link',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Google Profile Basics Checklist',
        path: '/tools/google-profile-basics-checklist',
        description: 'Browser-local checklist for whether owner-maintained Google Business Profile basics are ready for customers and connected to one current customer link',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Business Facts Copy Pack',
        path: '/tools/business-facts-copy-pack',
        description: 'Browser-local copy pack that turns owner-entered business facts into reusable profile, WhatsApp, social, website, staff, and customer-link copy',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'One Customer Link Preview',
        path: '/tools/customer-link-preview',
        description: 'Browser-local preview check for whether one customer-facing business link has the facts customers need before they call, visit, order, book, or ask a question',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Social Bio Link Consistency Check',
        path: '/tools/social-bio-link-check',
        description: 'Browser-local check for whether owner-controlled social bios, profiles, website links, QR codes, and print materials point customers to one current customer link',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'WhatsApp Action Link Check',
        path: '/tools/whatsapp-action-link-check',
        description: 'Browser-local check for whether customers can tap once to message, order, book, or ask through WhatsApp with a clear customer link and fallback action',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'WhatsApp Reply Pack',
        path: '/tools/whatsapp-reply-pack',
        description: 'Browser-local reply pack that turns owner-entered business facts into reusable WhatsApp greeting, hours, menu, price, order, delivery, fallback, and customer-link replies',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Hours Check',
        path: '/tools/hours-check',
        description: 'Browser-local check for whether regular hours, closed days, holiday hours, timing context, fallback contact, and the current customer link are clear',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Photo Gap Check',
        path: '/tools/photo-gap-check',
        description: 'Browser-local check for whether basic visual proof such as logo, cover image, location photo, product or service photos, and current customer link are clear',
        changeFrequency: 'monthly',
        priority: 0.8,
    },
    {
        label: 'Menu Import',
        path: '/features/menu-import',
        description: 'Upload a menu photo, PDF, typed menu, or permission-confirmed public menu link for owner review before publishing',
        changeFrequency: 'monthly',
        priority: 0.86,
    },
    {
        label: 'Menu Content Prep',
        path: '/features/menu-content-prep',
        description: 'Prepare customer-friendly descriptions, menu images, and customer languages from the same approved menu source',
        changeFrequency: 'monthly',
        priority: 0.88,
    },
    {
        label: 'Featured Choices',
        path: '/features/featured-choices',
        description: 'Show Featured, Quick, and Value choices from the approved menu so customers have a clearer starting point while owners keep control',
        changeFrequency: 'monthly',
        priority: 0.86,
    },
    {
        label: 'Official Business Page',
        path: '/features/official-business-page',
        description: 'One official customer-facing page for menu, hours, photos, key photo checks, contact details, actions, QR options, and business information',
        changeFrequency: 'monthly',
        priority: 0.86,
    },
    {
        label: 'QR Menu and Links',
        path: '/features/qr-menu-links',
        description: 'QR menu, stable share links, saveable customer shortcuts, and optional print files from the same approved menu source',
        changeFrequency: 'monthly',
        priority: 0.86,
    },
    {
        label: 'Print-ready Kit',
        path: '/features/print-ready-kit',
        description: 'Table cards, counter cards, stickers, posters, social images, and printer handoff files from the approved menu source',
        changeFrequency: 'monthly',
        priority: 0.86,
    },
    {
        label: 'Owner PWA Dashboard',
        path: '/features/owner-phone-dashboard',
        description: 'Owner PWA dashboard for menu edits, publishing, QR links, feedback review, Business Health, screens, status, hours, and key settings from phone or PWA',
        changeFrequency: 'monthly',
        priority: 0.84,
    },
    {
        label: 'Analytics',
        path: '/features/analytics',
        description: 'Today, daily, weekly, monthly, and overall customer activity from the public menu, Official Business Page, and customer app in the owner dashboard',
        changeFrequency: 'monthly',
        priority: 0.84,
    },
    {
        label: 'Menu Quality Validation',
        path: '/features/menu-quality-validation',
        description: 'Menu quality, pricing, detail, and public-readiness checks before publishing the approved source',
        changeFrequency: 'monthly',
        priority: 0.86,
    },
    {
        label: 'Business Health',
        path: '/features/business-health',
        description: 'Owner dashboard check for latest business state, freshness, customer attention, and safe next actions',
        changeFrequency: 'monthly',
        priority: 0.88,
    },
    {
        label: 'Customer Feedback Loop',
        path: '/features/customer-feedback-loop',
        description: 'Private customer feedback from public menu, Official Business Page, QR, or direct links so owners can review issues and keep the approved source correct',
        changeFrequency: 'monthly',
        priority: 0.84,
    },
    {
        label: 'Public Discovery',
        path: '/features/public-discovery',
        description: 'Clear public business information, structured pages, sitemap signals, crawler context, and discovery files without ranking or answer-placement promises',
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
    {
        label: 'Salons and Spas',
        path: '/industries/salons-spas',
        description: 'Current service-list source layer for salons, barber shops, beauty studios, and spas',
        changeFrequency: 'monthly',
        priority: 0.72,
    },
    {
        label: 'Service-list Businesses',
        path: '/industries/service-list-businesses',
        description: 'Official customer link layer for SMB service lists, package lists, price lists, and rate cards',
        changeFrequency: 'monthly',
        priority: 0.72,
    },
    {
        label: 'Local Service Businesses',
        path: '/industries/local-service-businesses',
        description: 'Current package and rate-card source layer for local service businesses',
        changeFrequency: 'monthly',
        priority: 0.7,
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
        label: 'FAQ',
        path: '/faq',
        description: 'MenuList questions about customer links, imports, review before publishing, pricing, data safety, AI Menu Manager, and supported publishing boundaries',
        changeFrequency: 'monthly',
        priority: 0.62,
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

const PLATFORM_DISCOVERY_BASE_URL = normalizeBaseUrl(getProductDeploymentTarget('menulist', 'production').url) || 'https://menulist.ai';

export function getPlatformDiscoveryBaseUrl(baseUrl = PLATFORM_DISCOVERY_BASE_URL): string {
    return normalizeBaseUrl(baseUrl) || PLATFORM_DISCOVERY_BASE_URL;
}

export function buildPlatformDiscoveryUrl(path: string, baseUrl = getPlatformDiscoveryBaseUrl()): string {
    const normalizedBase = normalizeBaseUrl(baseUrl) || PLATFORM_DISCOVERY_BASE_URL;
    if (!path || path === '/') return normalizedBase;
    return `${normalizedBase}/${path.replace(/^\/+/, '')}`;
}
