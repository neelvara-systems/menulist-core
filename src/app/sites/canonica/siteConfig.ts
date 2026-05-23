import { CANONICA_SUPPORT_FEATURES } from './productFeatures';

export const CANONICA_SITE_URL = 'https://canonica.app';

export const CANONICA_SITE_DESCRIPTION =
    'Canonica helps SaaS founders ship fast without support chaos: approved page-aware answers before fallback, hosted help on their own domain, and reviewable fixes for missed questions.';

export const CANONICA_PUBLIC_PAGES: Array<{
    path: string;
    title: string;
    description: string;
    priority: number;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
}> = [
    {
        path: '/',
        title: 'Canonica — Accurate Page-Aware Support for SaaS',
        description: CANONICA_SITE_DESCRIPTION,
        priority: 1,
        changeFrequency: 'weekly',
    },
    {
        path: '/product',
        title: 'Product | Canonica',
        description: 'Launch setup, support control, knowledge governance, page-aware widget, hosted help domains, safe ticket context, canonical answers, and support-gap review for SaaS teams.',
        priority: 0.9,
        changeFrequency: 'weekly',
    },
    {
        path: '/product/launch-setup',
        title: 'Launch Setup | Canonica',
        description: 'Create a Canonica workspace, add product details, import starter knowledge, map product surfaces, and verify the widget before launch.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/page-aware-widget',
        title: 'Page-Aware Widget | Canonica',
        description: 'Install Canonica as a page-aware widget with safe context, allowed origins, blocked routes, hosted help, and approved answers before fallback.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/support-control',
        title: 'Support Control | Canonica',
        description: 'Operate Canonica help center, docs, FAQ, changelog, tickets, conversations, and weekly support review from one support control layer.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/knowledge-governance',
        title: 'Knowledge Governance | Canonica',
        description: 'Govern Canonica product ontology, canonical answers, drift, signal mutation, coverage KPI, and trust/readiness metrics.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    ...CANONICA_SUPPORT_FEATURES.map((feature) => ({
        path: feature.href,
        title: `${feature.label} | Canonica`,
        description: feature.description,
        priority: 0.8,
        changeFrequency: 'monthly' as const,
    })),
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
        path: '/use-cases/founders',
        title: 'Support for SaaS Founders | Canonica',
        description: 'Page-aware support, approved answers, and support-gap review for solo SaaS founders.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/support-teams',
        title: 'Support Teams | Canonica',
        description: 'Reduce repeated tickets with approved answers, ticket fallback, and a signal-to-knowledge queue.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/product-teams',
        title: 'Product Teams | Canonica',
        description: 'See which product surfaces create support friction, stale answers, and review work after releases.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/engineering',
        title: 'Engineering Teams | Canonica',
        description: 'A support layer with safe page context, widget controls, and governed retrieval.',
        priority: 0.74,
        changeFrequency: 'monthly',
    },
    {
        path: '/page-aware-support-widget',
        title: 'Page-Aware Support Widget | Canonica',
        description: 'A page-aware support widget for SaaS products that uses safe product context and owner-approved answers before fallback.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    {
        path: '/hosted-help-center-for-saas',
        title: 'Hosted Help Center for SaaS | Canonica',
        description: 'Hosted SaaS help center for docs, FAQ, and changelog content connected to Canonica product surfaces and approved answers.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/support-widget-for-solo-founders',
        title: 'Support Widget for Solo Founders | Canonica',
        description: 'A support widget for solo SaaS founders who need approved answers, page-aware help, and support-gap review before hiring support.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/install',
        title: 'Widget Install | Canonica',
        description: 'Install Canonica with one widget script, allowed origins, blocked routes, help.yourapp.com hosted help domains, runtime verification, and safe page context.',
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
        description: 'Founder-friendly INR pricing, beta setup, support credits, and paid Canonica plans for small SaaS teams.',
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
        description: 'How Canonica protects support knowledge, widget context, ticket debugging context, hosted help domains, and customer workspaces.',
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

export function getCanonicaPublicPage(path: string) {
    return CANONICA_PUBLIC_PAGES.find((page) => page.path === path);
}
