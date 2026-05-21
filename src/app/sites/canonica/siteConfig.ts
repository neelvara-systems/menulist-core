export const CANONICA_SITE_URL = 'https://canonica.app';

export const CANONICA_SITE_DESCRIPTION =
    'Canonica keeps support answers correct, approved, and connected to the exact product screen where users need help.';

export const CANONICA_PUBLIC_PAGES: Array<{
    path: string;
    title: string;
    description: string;
    priority: number;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
}> = [
    {
        path: '/',
        title: 'Canonica — Page-Aware Support Knowledge for SaaS',
        description: CANONICA_SITE_DESCRIPTION,
        priority: 1,
        changeFrequency: 'weekly',
    },
    {
        path: '/product',
        title: 'Product | Canonica',
        description: 'Launch setup, page-aware support, canonical answers, release awareness, and support-gap review for SaaS teams.',
        priority: 0.9,
        changeFrequency: 'weekly',
    },
    {
        path: '/demo',
        title: 'Demo | Canonica',
        description: 'Try a static Canonica demo showing canonical answers, page-aware support, fallback, and support gaps.',
        priority: 0.9,
        changeFrequency: 'weekly',
    },
    {
        path: '/use-cases',
        title: 'Use Cases | Canonica',
        description: 'Page-aware support use cases for billing, onboarding, settings, releases, support fallback, and product errors.',
        priority: 0.86,
        changeFrequency: 'weekly',
    },
    {
        path: '/install',
        title: 'Widget Install | Canonica',
        description: 'Install Canonica with one widget script, allowed origins, blocked routes, runtime verification, and safe page context.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    {
        path: '/resources',
        title: 'Resources | Canonica',
        description: 'Canonica resources for evaluating, launching, installing, and operating page-aware support knowledge.',
        priority: 0.78,
        changeFrequency: 'weekly',
    },
    {
        path: '/updates',
        title: 'Updates | Canonica',
        description: 'Recent Canonica product updates across launch setup, widget management, governance, and public website work.',
        priority: 0.72,
        changeFrequency: 'weekly',
    },
    {
        path: '/pricing',
        title: 'Pricing | Canonica',
        description: 'Founder-friendly INR pricing for Canonica support knowledge infrastructure.',
        priority: 0.85,
        changeFrequency: 'weekly',
    },
    {
        path: '/get-started',
        title: 'Get Started | Canonica',
        description: 'Create your Canonica workspace and launch page-aware support for your SaaS product.',
        priority: 0.85,
        changeFrequency: 'weekly',
    },
    {
        path: '/security',
        title: 'Security | Canonica',
        description: 'How Canonica protects support knowledge, widget context, and customer workspaces.',
        priority: 0.7,
        changeFrequency: 'monthly',
    },
    {
        path: '/faq',
        title: 'FAQ | Canonica',
        description: 'Answers to common questions about Canonica setup, widget context, pricing, tickets, and data handling.',
        priority: 0.7,
        changeFrequency: 'monthly',
    },
    {
        path: '/about',
        title: 'About | Canonica',
        description: 'Canonica helps small SaaS teams keep support answers correct as products change.',
        priority: 0.6,
        changeFrequency: 'monthly',
    },
    {
        path: '/contact',
        title: 'Contact | Canonica',
        description: 'Contact Canonica for product questions, onboarding help, and partnerships.',
        priority: 0.6,
        changeFrequency: 'monthly',
    },
    {
        path: '/privacy-policy',
        title: 'Privacy Policy | Canonica',
        description: 'How Canonica handles product support knowledge, account information, and widget data.',
        priority: 0.4,
        changeFrequency: 'yearly',
    },
    {
        path: '/terms-of-service',
        title: 'Terms of Service | Canonica',
        description: 'Terms for using Canonica website, dashboard, widget, and support knowledge features.',
        priority: 0.4,
        changeFrequency: 'yearly',
    },
];

export function buildCanonicaUrl(path: string): string {
    return `${CANONICA_SITE_URL}${path === '/' ? '' : path}`;
}
