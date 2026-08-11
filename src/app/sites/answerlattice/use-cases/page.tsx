import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import { AnswerlatticeBeforeAfterStrip } from '../components/AnswerlatticeProofBlocks';
import PageProofStrip from '../components/PageProofStrip';

export const metadata: Metadata = {
    title: 'Use Cases',
    description: 'See how founders and small SaaS teams turn scattered product knowledge into reviewed support for users across the widget, help center, tickets, and releases.',
    alternates: { canonical: '/use-cases' },
};

async function getBasePath(): Promise<string> {
    try {
        const h = (await headers());
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const USE_CASES = [
        {
            title: 'AI-built SaaS launch',
            context: 'Cursor, Replit, Lovable, Bolt, or another AI-assisted build path',
            question: 'Users are asking questions before my docs are ready. What do I launch first?',
            generic: 'Create documentation and add a chatbot when you are ready.',
            answerlattice: 'Launch a widget, hosted help center, ticket fallback, and review queue from the scattered docs, tickets, release notes, screenshots, recordings, notes, and recurring questions you already have.',
            outcome: 'Start support without building a full support stack from scratch.',
    },
    {
        title: 'Billing and plan questions',
        context: 'Billing, invoices, plan limits, upgrades, downgrades',
        question: 'Why was I charged again?',
        generic: 'Please check your billing page or contact support.',
        answerlattice: 'You are on Billing. Your plan renews monthly, failed invoice retries run for the configured retry window, and payment can be updated from Settings -> Billing.',
        outcome: 'Show scoped answers tied to plan entities and recent billing-related releases.',
    },
    {
        title: 'Onboarding confusion',
        context: 'Setup checklist, first project, invite flow, import flow',
        question: 'What should I do first?',
        generic: 'Follow the setup checklist and complete each step.',
            answerlattice: 'You are on Import. Start with docs, setup guides, FAQs, and recurring support questions so draft answers and product details can be reviewed.',
            outcome: 'Give page-specific guidance and turn repeated gaps into a draft improvement the owner can review.',
    },
    {
        title: 'Settings and configuration',
        context: 'Domains, account roles, permissions, product setup, billing settings',
        question: 'Can my teammate change billing?',
        generic: 'Check your user role permissions in settings.',
        answerlattice: 'You are on Team Settings. Billing changes require an owner-level permission; if that answer is incomplete, AnswerLattice routes the gap to review.',
        outcome: 'Use the current product page and role instead of sending every user to generic docs.',
    },
    {
        title: 'Release support',
        context: 'New features, changed workflows, removed states, version mismatch',
        question: 'Did usage limits change?',
            generic: 'Read the latest release notes for usage limits.',
            answerlattice: 'The usage-limits release affected plan quota answers. AnswerLattice flags stale-answer risk until the related approved answer is reviewed.',
            outcome: 'Turn changelog entries into affected-answer review so stale support content becomes visible.',
        },
    {
        title: 'Hosted help for public support',
        context: 'help.yourapp.com, docs.yourapp.com, FAQ, changelog, public article pages',
        question: 'Where can users read help without logging in?',
        generic: 'Create a public docs or help center site.',
        answerlattice: 'Publish reviewed docs, FAQ, and changelog on a hosted help domain while tickets and workspace internals stay private.',
        outcome: 'Publish reviewed docs, FAQs, and release notes without exposing tickets, chat history, or workspace internals.',
    },
    {
        title: 'Support fallback',
        context: 'No approved answer, low-confidence result, negative feedback, ticket resolution',
        question: 'Why did this action fail?',
        generic: 'Try again or contact support with a screenshot.',
        answerlattice: 'If approved content is missing, fallback is marked, feedback is captured, and the repeated gap becomes a draft improvement for review.',
        outcome: 'Give the user a path now and give the owner a visible support gap to improve.',
    },
    {
        title: 'Errors and edge cases',
        context: 'Failed import, webhook error, blocked action, permission issue',
        question: 'What does this error mean?',
        generic: 'Search the docs for this error or contact support.',
        answerlattice: 'The error is tied to the affected product area so the next user sees a stable, reviewed explanation in the right workflow.',
        outcome: 'Keep error guidance tied to the right product area so future answers stay stable and searchable.',
    },
];

const ROLE_PAGES = [
    {
        title: 'For founders',
        href: '/use-cases/founders',
        detail: 'Launch a support layer before hiring support.',
    },
    {
        title: 'For small SaaS teams',
        href: '/use-cases/small-saas-teams',
        detail: 'Manage support across widget, help center, tickets, changelog, and feedback before support becomes a team problem.',
    },
    {
        title: 'For studios & agencies',
        href: '/use-cases/studios-agencies',
        detail: 'Add a repeatable support layer to SaaS products before launch or handoff.',
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

export default async function AnswerlatticeUseCasesPage() {
    const basePath = await getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/use-cases" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Use Cases</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Support use cases from one founder to a growing product team.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Start with one accountable owner and the questions that matter now. Add teammates and deeper review controls only when support ownership, release frequency, or answer risk grows.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/demo"
                            className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                        >See 60-sec demo</AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/proof"
                            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                        >
                            Review proof pack
                        </AnswerlatticeLink>
                    </div>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-6xl text-left"
                        items={[
                            { label: 'Best pages', value: 'Billing, onboarding, settings, releases, integrations, errors' },
                            { label: 'Operating path', value: 'Start small, add teammates, deepen review when needed' },
                            { label: 'Best teams', value: 'Founders and bounded product, support, and engineering groups' },
                            { label: 'Best proof', value: 'Generic reply vs reviewed support answer' },
                        ]}
                    />
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto mb-12 grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/use-cases/ai-built-saas"
                            className="rounded-2xl border border-teal-300/20 bg-teal-500/[0.055] p-5 transition hover:border-teal-300/40 hover:bg-teal-500/[0.08]"
                        >
                            <h2 className="text-base font-semibold text-white">For AI-built SaaS</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#d6d6ef]">Launch support after building quickly with AI.</p>
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/use-cases/vibe-coded-saas"
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-teal-300/30 hover:bg-teal-500/[0.04]"
                        >
                            <h2 className="text-base font-semibold text-white">For AI-assisted builders</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">A launch-support guide for products built fast with AI coding tools.</p>
                        </AnswerlatticeLink>
                        {ROLE_PAGES.map((item) => (
                            <AnswerlatticeLink
                                key={item.href}
                                basePath={basePath}
                                href={item.href}
                                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition hover:border-teal-300/30 hover:bg-teal-500/[0.04]"
                            >
                                <h2 className="text-base font-semibold text-white">{item.title}</h2>
                                <p className="mt-2 text-sm leading-relaxed text-[#808099]">{item.detail}</p>
                            </AnswerlatticeLink>
                        ))}
                    </div>

                    <div className="mx-auto max-w-7xl">
                        <AnswerlatticeBeforeAfterStrip
                            items={USE_CASES.map((item) => ({
                                title: item.title,
                                context: item.context,
                                question: item.question,
                                before: item.generic,
                                after: item.answerlattice,
                                outcome: item.outcome,
                            }))}
                        />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20 text-center">
                    <h2 className="text-3xl font-bold">Try the support-loop demo</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-[#a0a0c0]">
                        Switch between billing, onboarding, and settings surfaces to see why the same question should not always produce the same support path.
                    </p>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/demo"
                        className="mt-8 inline-block rounded-xl bg-teal-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-800"
                    >
                        Open demo
                    </AnswerlatticeLink>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
