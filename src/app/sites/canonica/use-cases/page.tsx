import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import { CanonicaBeforeAfterStrip } from '../components/CanonicaProofBlocks';

export const metadata: Metadata = {
    title: 'Use Cases',
    description: 'Canonica use cases for AI-built SaaS apps across billing, onboarding, settings, releases, errors, and support fallback.',
    alternates: { canonical: '/use-cases' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const USE_CASES = [
    {
        title: 'AI-built app launch',
        context: 'Cursor, Replit, Lovable, Bolt, or another AI-assisted build path',
        question: 'Users are asking questions before my docs are ready. What do I launch first?',
        generic: 'Create documentation and add a chatbot when you are ready.',
        canonica: 'Launch a widget, hosted help center, ticket fallback, and review queue from your existing notes, FAQs, release notes, and recurring questions.',
        outcome: 'Start support without building a full support stack from scratch.',
    },
    {
        title: 'Billing and plan questions',
        context: 'Billing, invoices, plan limits, upgrades, downgrades',
        question: 'Why was I charged again?',
        generic: 'Please check your billing page or contact support.',
        canonica: 'You are on Billing. Your plan renews monthly, failed invoice retries run for the configured retry window, and payment can be updated from Settings -> Billing.',
        outcome: 'Show scoped answers tied to plan entities and recent billing-related releases.',
    },
    {
        title: 'Onboarding confusion',
        context: 'Setup checklist, first project, invite flow, import flow',
        question: 'What should I do first?',
        generic: 'Follow the setup checklist and complete each step.',
        canonica: 'You are on Import. Start with docs, setup guides, FAQs, and recurring support questions so drafts and entity candidates can be reviewed.',
        outcome: 'Return surface-specific guidance and turn repeated gaps into a reviewable knowledge proposal.',
    },
    {
        title: 'Settings and configuration',
        context: 'Domains, account roles, permissions, product setup, billing settings',
        question: 'Can my teammate change billing?',
        generic: 'Check your user role permissions in settings.',
        canonica: 'You are on Team Settings. Billing changes require an owner-level permission; if that answer is incomplete, Canonica routes the gap to review.',
        outcome: 'Ground answers in configured product surfaces instead of sending every user to generic docs.',
    },
    {
        title: 'Release support',
        context: 'New features, changed workflows, removed states, version mismatch',
        question: 'Did usage limits change?',
        generic: 'Read the latest release notes for usage limits.',
        canonica: 'The usage-limits release affected plan quota answers. Canonica flags stale-answer risk until the related approved answer is reviewed.',
        outcome: 'Connect changelog entries to affected answers so stale support content becomes visible.',
    },
    {
        title: 'Hosted help for public support',
        context: 'help.yourapp.com, docs.yourapp.com, FAQ, changelog, public article pages',
        question: 'Where can users read help without logging in?',
        generic: 'Create a public docs or help center site.',
        canonica: 'Publish reviewed docs, FAQ, and changelog on a hosted help domain while tickets and workspace internals stay private.',
        outcome: 'Publish reviewed docs, FAQs, and release notes without exposing tickets, chat history, or workspace internals.',
    },
    {
        title: 'Support fallback',
        context: 'No approved answer, low-confidence result, negative feedback, ticket resolution',
        question: 'Why did this action fail?',
        generic: 'Try again or contact support with a screenshot.',
        canonica: 'If approved content is missing, fallback is marked, feedback is captured, and the repeated gap becomes a signal-to-knowledge proposal.',
        outcome: 'Capture the gap as a signal and route it toward mutation proposals for owner review.',
    },
    {
        title: 'Errors and edge cases',
        context: 'Failed import, webhook error, blocked action, permission issue',
        question: 'What does this error mean?',
        generic: 'Search the docs for this error or contact support.',
        canonica: 'The error is mapped as a product entity so the next user sees a stable, reviewed explanation tied to the affected workflow.',
        outcome: 'Treat errors as product entities so future answers can stay stable and searchable.',
    },
];

const ROLE_PAGES = [
    {
        title: 'For founders',
        href: '/use-cases/founders',
        detail: 'Launch a support layer before hiring support.',
    },
    {
        title: 'For support teams',
        href: '/use-cases/support-teams',
        detail: 'Reduce repeated tickets without losing answer control.',
    },
    {
        title: 'For product teams',
        href: '/use-cases/product-teams',
        detail: 'See which product areas create stale support.',
    },
    {
        title: 'For engineering',
        href: '/use-cases/engineering',
        detail: 'Install a widget that respects product structure and route safety.',
    },
];

export default function CanonicaUseCasesPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/use-cases" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Use Cases</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Support use cases for AI-built SaaS apps.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        When users ask from billing, onboarding, settings, releases, or error screens, Canonica serves support that matches the page instead of giving generic AI replies.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto mb-12 grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-5">
                        <CanonicaLink
                            basePath={basePath}
                            href="/use-cases/ai-built-saas"
                            className="rounded-2xl border border-indigo-400/20 bg-indigo-500/[0.055] p-5 transition hover:border-indigo-300/40 hover:bg-indigo-500/[0.08]"
                        >
                            <h2 className="text-base font-semibold text-white">For AI-built SaaS</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#d6d6ef]">Launch support after building quickly with AI.</p>
                        </CanonicaLink>
                        {ROLE_PAGES.map((item) => (
                            <CanonicaLink
                                key={item.href}
                                basePath={basePath}
                                href={item.href}
                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-indigo-400/30 hover:bg-indigo-500/[0.04]"
                            >
                                <h2 className="text-base font-semibold text-white">{item.title}</h2>
                                <p className="mt-2 text-sm leading-relaxed text-[#808099]">{item.detail}</p>
                            </CanonicaLink>
                        ))}
                    </div>

                    <div className="mx-auto max-w-7xl">
                        <CanonicaBeforeAfterStrip
                            items={USE_CASES.map((item) => ({
                                title: item.title,
                                context: item.context,
                                question: item.question,
                                before: item.generic,
                                after: item.canonica,
                                outcome: item.outcome,
                            }))}
                        />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20 text-center">
                    <h2 className="text-3xl font-bold">Try the page-aware demo</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-[#a0a0c0]">
                        Switch between billing, onboarding, and settings surfaces to see why the same question should not always produce the same support path.
                    </p>
                    <CanonicaLink
                        basePath={basePath}
                        href="/demo"
                        className="mt-8 inline-block rounded-xl bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
                    >
                        Open Demo
                    </CanonicaLink>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
