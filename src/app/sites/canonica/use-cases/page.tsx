import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';

export const metadata: Metadata = {
    title: 'Use Cases',
    description: 'Canonica use cases for page-aware support across billing, onboarding, settings, releases, and support fallback.',
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
        title: 'Billing and plan questions',
        context: 'Billing, invoices, plan limits, upgrades, downgrades',
        outcome: 'Show scoped answers tied to plan entities and recent billing-related releases.',
    },
    {
        title: 'Onboarding confusion',
        context: 'Setup checklist, first project, invite flow, import flow',
        outcome: 'Return surface-specific guidance and turn repeated gaps into a reviewable knowledge proposal.',
    },
    {
        title: 'Settings and configuration',
        context: 'Domains, account roles, permissions, product setup, billing settings',
        outcome: 'Ground answers in configured product surfaces instead of sending every user to generic docs.',
    },
    {
        title: 'Release support',
        context: 'New features, changed workflows, removed states, version mismatch',
        outcome: 'Connect changelog entries to affected answers so stale support content becomes visible.',
    },
    {
        title: 'Hosted help for public support',
        context: 'help.myapp.com, docs.myapp.com, FAQ, changelog, public article pages',
        outcome: 'Publish reviewed docs, FAQs, and release notes without exposing tickets, chat history, or workspace internals.',
    },
    {
        title: 'Support fallback',
        context: 'No canonical answer, low-confidence result, negative feedback, ticket resolution',
        outcome: 'Capture the gap as a signal and route it toward mutation proposals for owner review.',
    },
    {
        title: 'Errors and edge cases',
        context: 'Failed import, webhook error, blocked action, permission issue',
        outcome: 'Treat errors as product entities so future answers can stay stable and searchable.',
    },
];

export default function CanonicaUseCasesPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Use Cases</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Support that changes by product page, not only by keyword.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Canonica is strongest where SaaS users ask the same question from different screens and need different support truth.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
                        {USE_CASES.map((item) => (
                            <article key={item.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                                <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Context</div>
                                    <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{item.context}</p>
                                </div>
                                <div className="mt-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4">
                                    <div className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Outcome</div>
                                    <p className="mt-2 text-sm leading-relaxed text-[#d6d6ef]">{item.outcome}</p>
                                </div>
                            </article>
                        ))}
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
