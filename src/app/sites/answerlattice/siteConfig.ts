import { ANSWERLATTICE_SUPPORT_FEATURES } from './productFeatures';
import { ANSWERLATTICE_INSTALL_DOCS } from '@lib/answerlattice/installContract/contract';

export const ANSWERLATTICE_SITE_URL = 'https://answerlattice.com';
export const ANSWERLATTICE_SITE_TITLE = 'Answerlattice — Page-Aware Support Answers for SaaS and Digital Products';

export const ANSWERLATTICE_SITE_DESCRIPTION =
    'Answerlattice helps SaaS and digital-product teams turn docs, FAQs, release notes, screenshots, recordings, and repeated questions into approved page-aware answers for the app widget, hosted help, and support review queue.';

export const ANSWERLATTICE_PUBLIC_PAGES: Array<{
    path: string;
    title: string;
    description: string;
    priority: number;
    changeFrequency: 'weekly' | 'monthly' | 'yearly';
}> = [
    {
        path: '/',
        title: ANSWERLATTICE_SITE_TITLE,
        description: ANSWERLATTICE_SITE_DESCRIPTION,
        priority: 1,
        changeFrequency: 'weekly',
    },
    {
        path: '/product',
        title: 'Product | Answerlattice',
        description: 'Support layer for SaaS and digital products: knowledge intake, team access, widget, hosted help, feedback review, Support Board, custom owner Q&A, approved answers, and support-gap review.',
        priority: 0.9,
        changeFrequency: 'weekly',
    },
    {
        path: '/product/launch-setup',
        title: 'Set Up Support | Answerlattice',
        description: 'Create an Answerlattice workspace, add team access, teach Answerlattice from selected links, files, screenshots, and short recordings, map important product pages, and verify the widget before launch.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/page-aware-widget',
        title: 'In-App Help Widget | Answerlattice',
        description: 'Install Answerlattice as a page-aware widget with safe context, explicit screenshot attachments, allowed origins, blocked routes, hosted help, canonical answers, and owner FAQ answers before fallback.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/support-control',
        title: 'Help Center and Tickets | Answerlattice',
        description: 'Operate Answerlattice help center, docs, FAQ, custom owner Q&A, changelog, tickets, feedback, Support Board, conversations, and weekly support review from one support control layer.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/knowledge-governance',
        title: 'Review Approved Answers | Answerlattice',
        description: 'Review approved answers, stale support, repeated misses, coverage KPI, and trust/readiness metrics.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    ...ANSWERLATTICE_SUPPORT_FEATURES.map((feature) => ({
        path: feature.href,
        title: `${feature.label} | Answerlattice`,
        description: feature.description,
        priority: 0.8,
        changeFrequency: 'monthly' as const,
    })),
    {
        path: '/demo',
        title: 'Demo | Answerlattice',
        description: 'See page-aware support in 60 seconds with static examples for billing, onboarding, settings, fallback, and support gaps.',
        priority: 0.9,
        changeFrequency: 'weekly',
    },
    {
        path: '/pre-onboarding',
        title: 'Pre-Onboarding Kit | Answerlattice',
        description: 'Use an AI coding agent to prepare product website links, docs, owner notes, policies, support questions, and screenshot rules before Answerlattice onboarding.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/pre-onboarding/guide',
        title: 'Pre-Onboarding Guide | Answerlattice',
        description: 'End-to-end guide for using the Answerlattice pre-onboarding prompt with a product repo, docs, public website, owner notes, screenshots, and owner review.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases',
        title: 'Use Cases | Answerlattice',
        description: 'Support use cases for AI-built SaaS apps across billing, onboarding, settings, releases, support fallback, and product errors.',
        priority: 0.86,
        changeFrequency: 'weekly',
    },
    {
        path: '/use-cases/ai-built-saas',
        title: 'Support for AI-Built SaaS Apps | Answerlattice',
        description: 'Launch page-aware support, hosted help, approved answers, ticket fallback, and reviewable support gaps for apps built quickly with AI.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/founders',
        title: 'Support for AI-Built SaaS Founders | Answerlattice',
        description: 'Page-aware support, approved answers, and support-gap review for solo founders launching AI-built SaaS apps.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/support-teams',
        title: 'Support Teams | Answerlattice',
        description: 'Reduce repeated tickets with approved answers, ticket fallback, private Support Board follow-up, and a signal-to-knowledge queue.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/product-teams',
        title: 'Product Teams | Answerlattice',
        description: 'See which product surfaces create support friction, stale answers, and review work after releases.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/engineering',
        title: 'Engineering Teams | Answerlattice',
        description: 'A support layer with safe page context, widget controls, and governed retrieval.',
        priority: 0.74,
        changeFrequency: 'monthly',
    },
    {
        path: '/page-aware-support-widget',
        title: 'Page-Aware Support Widget | Answerlattice',
        description: 'A page-aware support widget for AI-built SaaS that uses safe product context, optional screenshot attachments, canonical answers, and owner FAQ answers before fallback.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    {
        path: '/hosted-help-center-for-saas',
        title: 'Hosted Help Center for SaaS | Answerlattice',
        description: 'Hosted help center for AI-built SaaS with docs, owner FAQ, changelog content, and the same knowledge powering the app widget.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/support-widget-for-solo-founders',
        title: 'Support Widget for Solo Founders | Answerlattice',
        description: 'A support widget for solo founders shipping with AI who need page-aware help, optional screenshot context, hosted docs, ticket fallback, and approved answers.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/install',
        title: 'Install Answerlattice with your AI coding agent | Answerlattice',
        description: 'Copy the Answerlattice agent packet, install the v1 widget once, pass safe page context, and verify from the dashboard.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    ...ANSWERLATTICE_INSTALL_DOCS
        .filter((doc) => doc.key !== 'overview' && doc.key !== 'contracts')
        .map((doc) => ({
            path: doc.path,
            title: `${doc.navTitle} | Answerlattice Install`,
            description: doc.description,
            priority: doc.key === 'ai-agent' ? 0.8 : 0.64,
            changeFrequency: 'monthly' as const,
        })),
    {
        path: '/quickstarts',
        title: 'Developer Quickstarts | Answerlattice',
        description: 'Answerlattice widget quickstarts for Next.js App Router, React SPA, Vue/Nuxt, vanilla script installs, safe context validation, and manual screenshot input.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/integrations',
        title: 'Integrations | Answerlattice',
        description: 'Slack and email workflow notifications for Answerlattice support governance: digest-first alerts, test delivery, compact health, and bounded delivery.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/resources',
        title: 'Resources | Answerlattice',
        description: 'Answerlattice resources for founders launching support for SaaS apps and digital products: demo, fit, knowledge intake, feedback review, install, Support Board, runtime safety, pricing, and setup.',
        priority: 0.78,
        changeFrequency: 'weekly',
    },
    {
        path: '/updates',
        title: 'Updates | Answerlattice',
        description: 'Recent Answerlattice product updates across knowledge intake, launch setup, team access, widget runtime, feedback review, Support Board, compiled context, governance, and public website work.',
        priority: 0.72,
        changeFrequency: 'weekly',
    },
    {
        path: '/pricing',
        title: 'Pricing | Answerlattice',
        description: 'Founder-friendly INR pricing, beta setup, support credits, intake media processing, and paid Answerlattice plans for SaaS and digital-product teams.',
        priority: 0.85,
        changeFrequency: 'weekly',
    },
    {
        path: '/roi-calculator',
        title: 'Support ROI Calculator | Answerlattice',
        description: 'Estimate repeated support questions, founder time saved, support value, and Answerlattice plan fit for SaaS and digital-product support.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/proof',
        title: 'Proof Pack | Answerlattice',
        description: 'Example Answerlattice workloads for billing, onboarding, releases, errors, and support-gap review.',
        priority: 0.74,
        changeFrequency: 'monthly',
    },
    {
        path: '/get-started',
        title: 'Get Started | Answerlattice',
        description: 'Create your Answerlattice workspace, add your app, invite the first team members, teach Answerlattice from starter sources, pick pages where users get stuck, and get a widget key for page-aware support.',
        priority: 0.85,
        changeFrequency: 'weekly',
    },
    {
        path: '/security',
        title: 'Security | Answerlattice',
        description: 'Security for Answerlattice page-aware support: safe page hints, explicit screenshots, bounded source intake, allowed origins, blocked routes, compiled context, scoped workspaces, role permissions, and owner-approved answers.',
        priority: 0.7,
        changeFrequency: 'monthly',
    },
    {
        path: '/security-one-pager',
        title: 'Security and Ops One-Pager | Answerlattice',
        description: 'Shareable Answerlattice security and operations summary for allowed origins, blocked routes, safe context, safe source intake, team roles, manual screenshots, hashed keys, owner approval, and rate limits.',
        priority: 0.68,
        changeFrequency: 'monthly',
    },
    {
        path: '/faq',
        title: 'FAQ | Answerlattice',
        description: 'Answers to common questions founders ask about Answerlattice setup, knowledge intake, team access, digital products, page-aware support, feedback review, Support Board, screenshots, pricing, tickets, and data handling.',
        priority: 0.7,
        changeFrequency: 'monthly',
    },
    {
        path: '/about',
        title: 'About | Answerlattice',
        description: 'Answerlattice helps SaaS and digital-product teams keep support answers correct as products change.',
        priority: 0.6,
        changeFrequency: 'monthly',
    },
    {
        path: '/contact',
        title: 'Contact | Answerlattice',
        description: 'Contact Answerlattice for setup help, demos, pricing, security questions, or partnership requests for your SaaS app or digital product.',
        priority: 0.6,
        changeFrequency: 'monthly',
    },
    {
        path: '/privacy-policy',
        title: 'Privacy Policy | Answerlattice',
        description: 'How Answerlattice handles product support knowledge, account information, team access data, and widget data.',
        priority: 0.4,
        changeFrequency: 'yearly',
    },
    {
        path: '/terms-of-service',
        title: 'Terms of Service | Answerlattice',
        description: 'Terms for using Answerlattice website, dashboard, widget, and support knowledge features.',
        priority: 0.4,
        changeFrequency: 'yearly',
    },
];

export function buildAnswerlatticeUrl(path: string): string {
    return `${ANSWERLATTICE_SITE_URL}${path === '/' ? '' : path}`;
}

export function getAnswerlatticePublicPage(path: string) {
    return ANSWERLATTICE_PUBLIC_PAGES.find((page) => page.path === path);
}
