import { ANSWERLATTICE_SUPPORT_FEATURES } from './productFeatures';
import {
    ANSWERLATTICE_COMPARISONS,
    ANSWERLATTICE_DEVELOPER_DOCS,
    ANSWERLATTICE_RESOURCE_ARTICLES,
} from './publicContent';
import { ANSWERLATTICE_INSTALL_DOCS } from '@lib/answerlattice/installContract/contract';
import { getProductDeploymentTarget } from '@constant/deploymentTargets';

export const ANSWERLATTICE_SITE_URL = getProductDeploymentTarget('answerlattice').url.replace(/\/$/, '');
export const ANSWERLATTICE_SITE_TITLE = 'AnswerLattice - Reviewed Support Layer for SaaS Products';

export const ANSWERLATTICE_SITE_DESCRIPTION =
    'AnswerLattice turns scattered docs, tickets, releases, screenshots, recordings, notes, and repeated replies into reviewed support knowledge for your widget, help center, FAQs, fallback, and future AI agents.';

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
        title: 'Product | AnswerLattice',
        description: 'Turn scattered product material into reviewed support for your in-app widget, hosted help center, FAQs, changelog, ticket fallback, feedback review, and future AI agents.',
        priority: 0.9,
        changeFrequency: 'weekly',
    },
    {
        path: '/product/launch-setup',
        title: 'Set Up Support | AnswerLattice',
        description: 'Create an AnswerLattice workspace, add team access, teach AnswerLattice from selected links, files, screenshots, and short recordings, map important product pages, and verify the widget before launch.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/page-aware-widget',
        title: 'In-App Help Widget | AnswerLattice',
        description: 'Install AnswerLattice as an in-app widget with safe context, explicit screenshot attachments, allowed origins, blocked routes, hosted help, approved answers, and owner FAQ answers before fallback.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/support-control',
        title: 'Help Center and Tickets | AnswerLattice',
        description: 'Turn scattered product knowledge into hosted help, scannable articles, FAQs, widget support, ticket fallback, feedback review, and a focused read-only Daily Brief.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    {
        path: '/product/knowledge-governance',
        title: 'Approved Answer Review | AnswerLattice',
        description: 'Find missing, stale, or release-affected support, test critical answers, and approve what becomes official before users depend on it.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    ...ANSWERLATTICE_SUPPORT_FEATURES.map((feature) => ({
        path: feature.href,
        title: `${feature.label} | AnswerLattice`,
        description: feature.description,
        priority: 0.8,
        changeFrequency: 'monthly' as const,
    })),
    {
        path: '/demo',
        title: 'Demo | AnswerLattice',
        description: 'See a support question move from approved guidance or safe fallback to founder review, testing, and a reusable improvement.',
        priority: 0.9,
        changeFrequency: 'weekly',
    },
    {
        path: '/pre-onboarding',
        title: 'Pre-Onboarding Kit | AnswerLattice',
        description: 'Use an AI coding agent to organize scattered product website links, docs, owner notes, policies, support questions, and screenshot rules before AnswerLattice onboarding.',
        priority: 0.84,
        changeFrequency: 'monthly',
    },
    {
        path: '/pre-onboarding/guide',
        title: 'Pre-Onboarding Guide | AnswerLattice',
        description: 'End-to-end guide for using the AnswerLattice pre-onboarding prompt with a product repo, docs, public website, owner notes, screenshots, and owner review.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases',
        title: 'Use Cases | AnswerLattice',
        description: 'Support use cases for founder-led SaaS across billing, onboarding, settings, releases, approved answers, ticket fallback, and product errors.',
        priority: 0.86,
        changeFrequency: 'weekly',
    },
    {
        path: '/use-cases/ai-built-saas',
        title: 'Support for AI-Built SaaS Apps | AnswerLattice',
        description: 'Launch a support layer with in-app help, hosted help, approved answers, ticket fallback, and reviewable support gaps for SaaS apps built quickly with AI.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/founders',
        title: 'Support for SaaS Founders | AnswerLattice',
        description: 'Support layer for solo founders launching SaaS with in-app help, hosted help, approved answers, ticket fallback, and support-gap review.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/small-saas-teams',
        title: 'Small SaaS Teams | AnswerLattice',
        description: 'Support layer for small SaaS teams with in-app help, hosted help, FAQs, changelog, ticket fallback, feedback review, approved answers, and support-gap review.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/studios-agencies',
        title: 'Studios and Agencies | AnswerLattice',
        description: 'A repeatable first support layer for studios and agencies launching SaaS products with hosted help, widget support, ticket fallback, feedback review, and owner-approved answers.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/support-teams',
        title: 'Support Teams | AnswerLattice',
        description: 'Reduce repeated tickets with approved answers, ticket fallback, private Support Board follow-up, and a visible support-gap review queue.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/product-teams',
        title: 'Product Teams | AnswerLattice',
        description: 'See which product areas create support friction, stale answers, and review work after releases.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/use-cases/engineering',
        title: 'Engineering Teams | AnswerLattice',
        description: 'A support layer with safe page context, widget controls, and reviewed support answers.',
        priority: 0.74,
        changeFrequency: 'monthly',
    },
    {
        path: '/page-aware-support-widget',
        title: 'In-App Support Widget | AnswerLattice',
        description: 'An in-app support widget for AI-built SaaS that uses safe product context, optional screenshot attachments, approved answers, owner FAQ answers, and ticket fallback.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    {
        path: '/hosted-help-center-for-saas',
        title: 'Hosted Help Center for SaaS | AnswerLattice',
        description: 'Hosted help center for AI-built SaaS with docs, owner FAQ, changelog content, and the same knowledge powering the app widget.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/support-widget-for-solo-founders',
        title: 'Support Widget for Solo Founders | AnswerLattice',
        description: 'A support widget for solo founders shipping with AI who need in-app help, optional screenshot context, hosted docs, ticket fallback, and approved answers.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/install',
        title: 'Install AnswerLattice with your AI coding agent | AnswerLattice',
        description: 'Copy the AnswerLattice agent packet, install the v1 widget once, pass safe page context, and verify from the dashboard.',
        priority: 0.82,
        changeFrequency: 'monthly',
    },
    ...ANSWERLATTICE_INSTALL_DOCS
        .filter((doc) => doc.key !== 'overview' && doc.key !== 'contracts')
        .map((doc) => ({
            path: doc.path,
            title: `${doc.navTitle} | AnswerLattice Install`,
            description: doc.description,
            priority: doc.key === 'ai-agent' ? 0.8 : 0.64,
            changeFrequency: 'monthly' as const,
        })),
    {
        path: '/quickstarts',
        title: 'Developer Quickstarts | AnswerLattice',
        description: 'AnswerLattice widget quickstarts for Next.js App Router, React SPA, Vue/Nuxt, vanilla script installs, safe context validation, and manual screenshot input.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    {
        path: '/developers',
        title: 'Developers | AnswerLattice',
        description: 'AnswerLattice developer docs for widget install, safe page context, optional signed visitor context, bounded evidence links, verification, framework quickstarts, and agent install packets.',
        priority: 0.78,
        changeFrequency: 'monthly',
    },
    ...ANSWERLATTICE_DEVELOPER_DOCS.map((doc) => ({
        path: doc.path,
        title: doc.title,
        description: doc.metaDescription,
        priority: 0.7,
        changeFrequency: 'monthly' as const,
    })),
    {
        path: '/integrations',
        title: 'Integrations | AnswerLattice',
        description: 'Slack and email workflow notifications for AnswerLattice support review: digest-first alerts, test delivery, compact health, and bounded delivery.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    {
        path: '/resources',
        title: 'Resources | AnswerLattice',
        description: 'AnswerLattice resources for founders launching support for SaaS apps: demo, fit, knowledge intake, feedback review, install, Support Board, runtime safety, pricing, and setup.',
        priority: 0.78,
        changeFrequency: 'weekly',
    },
    {
        path: '/resources/founder-launch-kit',
        title: 'Founder Support Launch Kit | AnswerLattice',
        description: 'Prepare product sources, test ten priority support questions, verify the widget, and measure explicit end-user resolution.',
        priority: 0.8,
        changeFrequency: 'monthly',
    },
    ...ANSWERLATTICE_RESOURCE_ARTICLES.map((article) => ({
        path: article.path,
        title: article.metaTitle,
        description: article.metaDescription,
        priority: article.priority,
        changeFrequency: article.changeFrequency,
    })),
    {
        path: '/comparisons',
        title: 'Comparisons | AnswerLattice',
        description: 'Category comparisons for AnswerLattice against generic chatbots, helpdesks, and knowledge bases, with scoped claims and no unsupported competitor rankings.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    ...ANSWERLATTICE_COMPARISONS.map((comparison) => ({
        path: comparison.path,
        title: `${comparison.title} | AnswerLattice`,
        description: comparison.metaDescription,
        priority: 0.66,
        changeFrequency: 'monthly' as const,
    })),
    {
        path: '/updates',
        title: 'Updates | AnswerLattice',
        description: 'Recent AnswerLattice updates across knowledge intake, widget support, hosted help, tickets, feedback, approved-answer review, and support safety.',
        priority: 0.72,
        changeFrequency: 'weekly',
    },
    {
        path: '/pricing',
        title: 'Pricing | AnswerLattice',
        description: 'Clear INR and USD pricing, paid setup, support credits, intake media processing, and AnswerLattice plans for founder-led SaaS teams.',
        priority: 0.85,
        changeFrequency: 'weekly',
    },
    {
        path: '/roi-calculator',
        title: 'Support ROI Calculator | AnswerLattice',
        description: 'Estimate repeated support questions, founder time saved, support value, and AnswerLattice plan fit for founder-led SaaS support.',
        priority: 0.76,
        changeFrequency: 'monthly',
    },
    {
        path: '/proof',
        title: 'Proof Pack | AnswerLattice',
        description: 'Clearly labelled AnswerLattice workload examples plus consented customer evidence only after measurement and public-use approval are complete.',
        priority: 0.74,
        changeFrequency: 'monthly',
    },
    {
        path: '/get-started',
        title: 'Get Started | AnswerLattice',
        description: 'Choose an AnswerLattice monthly plan and INR or USD checkout, create the workspace safely, add your app, pick support pages, and get a one-time widget key.',
        priority: 0.85,
        changeFrequency: 'weekly',
    },
    {
        path: '/trust',
        title: 'Trust and Data Handling | AnswerLattice',
        description: 'Current AnswerLattice infrastructure, provider, retention, security-review, and compliance-claim facts for buyers and technical reviewers.',
        priority: 0.72,
        changeFrequency: 'monthly',
    },
    {
        path: '/security',
        title: 'Security | AnswerLattice',
        description: 'Security for the AnswerLattice support layer: safe page hints, optional signed visitor context, bounded evidence links and source intake, scoped workspaces, role permissions, approved answers, and bounded export.',
        priority: 0.7,
        changeFrequency: 'monthly',
    },
    {
        path: '/security-one-pager',
        title: 'Security and Ops One-Pager | AnswerLattice',
        description: 'Shareable AnswerLattice security and operations summary for allowed origins, signed context, evidence links, source intake, team roles, hashed keys, approval, bounded export, and rate limits.',
        priority: 0.68,
        changeFrequency: 'monthly',
    },
    {
        path: '/faq',
        title: 'FAQ | AnswerLattice',
        description: 'Answers about AnswerLattice setup, knowledge intake, widget support, hosted help, approved answers, fallback tickets, pricing, review controls, and data handling.',
        priority: 0.7,
        changeFrequency: 'monthly',
    },
    {
        path: '/about',
        title: 'About | AnswerLattice',
        description: 'Why AnswerLattice turns scattered founder knowledge into reviewed support for the widget, help center, FAQs, tickets, feedback, and future AI agents.',
        priority: 0.6,
        changeFrequency: 'monthly',
    },
    {
        path: '/contact',
        title: 'Contact | AnswerLattice',
        description: 'Contact AnswerLattice for setup help, demos, pricing, security questions, or partnership requests for your SaaS app or digital product.',
        priority: 0.6,
        changeFrequency: 'monthly',
    },
    {
        path: '/privacy-policy',
        title: 'Privacy Policy | AnswerLattice',
        description: 'How AnswerLattice handles product support knowledge, account information, team access data, and widget data.',
        priority: 0.4,
        changeFrequency: 'yearly',
    },
    {
        path: '/terms-of-service',
        title: 'Terms of Service | AnswerLattice',
        description: 'Terms for using AnswerLattice website, dashboard, widget, and support knowledge features.',
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
