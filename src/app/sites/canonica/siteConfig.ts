import { CANONICA_SUPPORT_FEATURES } from './productFeatures';
import { CANONICA_INSTALL_DOCS } from '@lib/canonica/installContract/contract';

export const CANONICA_SITE_URL = 'https://canonica.app';
export const CANONICA_SITE_TITLE = 'Canonica — Launch-Ready Support for SaaS Founders';

export const CANONICA_SITE_DESCRIPTION =
    'Canonica helps SaaS founders launch support-ready: turn product material into docs, FAQs, answer drafts, hosted help, and a page-aware widget while tickets, changelogs, feedback, and feature requests stay owner-managed.';

export const CANONICA_PUBLIC_PAGES: Array<{
    path: string;
    title: string;
    description: string;
    priority: number;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
}> = [
    {
        path: '/',
        title: CANONICA_SITE_TITLE,
        description: CANONICA_SITE_DESCRIPTION,
        priority: 1,
        changeFrequency: 'weekly',
    },
    {
        path: '/product',
        title: 'Product | Canonica',
        description: 'Support layer for AI-built SaaS apps: knowledge intake, team access, widget, hosted help, feedback review, Support Board, custom owner Q&A, approved answers, and support-gap review.',
        priority: 0.9,
        changeFrequency: 'weekly',
    },
    {
        path: '/product/launch-setup',
        title: 'Set Up Support | Canonica',
        description: 'Create a Canonica workspace, add team access, teach Canonica from selected links, files, screenshots, and short recordings, map important app pages, and verify the widget before launch.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/page-aware-widget',
        title: 'In-App Help Widget | Canonica',
        description: 'Install Canonica as a page-aware widget with safe context, explicit screenshot attachments, allowed origins, blocked routes, hosted help, canonical answers, and owner FAQ answers before fallback.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/support-control',
        title: 'Help Center and Tickets | Canonica',
        description: 'Operate Canonica help center, docs, FAQ, custom owner Q&A, changelog, tickets, feedback, Support Board, conversations, and weekly support review from one support control layer.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/knowledge-governance',
        title: 'Review Approved Answers | Canonica',
        description: 'Review approved answers, stale support, repeated misses, coverage KPI, and trust/readiness metrics.',
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
        description: 'See page-aware support in 60 seconds with static examples for billing, onboarding, settings, fallback, and support gaps.',
        priority: 0.9,
        changeFrequency: 'weekly',
    },
    {
        path: '/use-cases',
        title: 'Use Cases | Canonica',
        description: 'Support use cases for AI-built SaaS apps across billing, onboarding, settings, releases, support fallback, and product errors.',
        priority: 0.86,
        changeFrequency: 'weekly',
    },
    {
        path: '/use-cases/ai-built-saas',
        title: 'Support for AI-Built SaaS Apps | Canonica',
        description: 'Launch page-aware support, hosted help, approved answers, ticket fallback, and reviewable support gaps for apps built quickly with AI.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/founders',
        title: 'Support for AI-Built SaaS Founders | Canonica',
        description: 'Page-aware support, approved answers, and support-gap review for solo founders launching AI-built SaaS apps.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/support-teams',
        title: 'Support Teams | Canonica',
        description: 'Reduce repeated tickets with approved answers, ticket fallback, private Support Board follow-up, and a signal-to-knowledge queue.',
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
        description: 'A page-aware support widget for AI-built SaaS that uses safe product context, optional screenshot attachments, canonical answers, and owner FAQ answers before fallback.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    {
        path: '/hosted-help-center-for-saas',
        title: 'Hosted Help Center for SaaS | Canonica',
        description: 'Hosted help center for AI-built SaaS with docs, owner FAQ, changelog content, and the same knowledge powering the app widget.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/support-widget-for-solo-founders',
        title: 'Support Widget for Solo Founders | Canonica',
        description: 'A support widget for solo founders shipping with AI who need page-aware help, optional screenshot context, hosted docs, ticket fallback, and approved answers.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/install',
        title: 'Install Canonica with your AI coding agent | Canonica',
        description: 'Copy the Canonica agent packet, install the v1 widget once, pass safe page context, and verify from the dashboard.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    ...CANONICA_INSTALL_DOCS
        .filter((doc) => doc.key !== 'overview' && doc.key !== 'contracts')
        .map((doc) => ({
            path: doc.path,
            title: `${doc.navTitle} | Canonica Install`,
            description: doc.description,
            priority: doc.key === 'ai-agent' ? 0.8 : 0.64,
            changeFrequency: 'monthly' as const,
        })),
    {
        path: '/quickstarts',
        title: 'Developer Quickstarts | Canonica',
        description: 'Canonica widget quickstarts for Next.js App Router, React SPA, Vue/Nuxt, vanilla script installs, safe context validation, and manual screenshot input.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/integrations',
        title: 'Integrations | Canonica',
        description: 'Slack and email workflow notifications for Canonica support governance: digest-first alerts, test delivery, compact health, and bounded delivery.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/resources',
        title: 'Resources | Canonica',
        description: 'Canonica resources for founders launching support for AI-built SaaS apps: demo, fit, knowledge intake, feedback review, install, Support Board, runtime safety, pricing, and setup.',
        priority: 0.78,
        changeFrequency: 'weekly',
    },
    {
        path: '/updates',
        title: 'Updates | Canonica',
        description: 'Recent Canonica product updates across knowledge intake, launch setup, team access, widget runtime, feedback review, Support Board, compiled context, governance, and public website work.',
        priority: 0.72,
        changeFrequency: 'weekly',
    },
    {
        path: '/pricing',
        title: 'Pricing | Canonica',
        description: 'Founder-friendly INR pricing, beta setup, support credits, intake media processing, and paid Canonica plans for AI-built SaaS teams.',
        priority: 0.85,
        changeFrequency: 'weekly',
    },
    {
        path: '/roi-calculator',
        title: 'Support ROI Calculator | Canonica',
        description: 'Estimate repeated support questions, founder time saved, support value, and Canonica plan fit for AI-built SaaS support.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/proof',
        title: 'Proof Pack | Canonica',
        description: 'Example Canonica workloads for billing, onboarding, releases, errors, and support-gap review.',
        priority: 0.74,
        changeFrequency: 'monthly',
    },
    {
        path: '/get-started',
        title: 'Get Started | Canonica',
        description: 'Create your Canonica workspace, add your app, invite the first team members, teach Canonica from starter sources, pick pages where users get stuck, and get a widget key for page-aware support.',
        priority: 0.85,
        changeFrequency: 'weekly',
    },
    {
        path: '/security',
        title: 'Security | Canonica',
        description: 'Security for Canonica page-aware support: safe page hints, explicit screenshots, bounded source intake, allowed origins, blocked routes, compiled context, scoped workspaces, role permissions, and owner-approved answers.',
        priority: 0.7,
        changeFrequency: 'monthly',
    },
    {
        path: '/security-one-pager',
        title: 'Security and Ops One-Pager | Canonica',
        description: 'Shareable Canonica security and operations summary for allowed origins, blocked routes, safe context, safe source intake, team roles, manual screenshots, hashed keys, owner approval, and rate limits.',
        priority: 0.68,
        changeFrequency: 'monthly',
    },
    {
        path: '/faq',
        title: 'FAQ | Canonica',
        description: 'Answers to common questions founders ask about Canonica setup, knowledge intake, team access, AI-built apps, page-aware support, feedback review, Support Board, screenshots, pricing, tickets, and data handling.',
        priority: 0.7,
        changeFrequency: 'monthly',
    },
    {
        path: '/about',
        title: 'About | Canonica',
        description: 'Canonica helps AI-built SaaS teams keep support answers correct as products change.',
        priority: 0.6,
        changeFrequency: 'monthly',
    },
    {
        path: '/contact',
        title: 'Contact | Canonica',
        description: 'Contact Canonica for setup help, demos, pricing, security questions, or partnership requests for your AI-built SaaS app.',
        priority: 0.6,
        changeFrequency: 'monthly',
    },
    {
        path: '/privacy-policy',
        title: 'Privacy Policy | Canonica',
        description: 'How Canonica handles product support knowledge, account information, team access data, and widget data.',
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
