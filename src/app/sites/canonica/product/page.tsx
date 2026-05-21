import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import { CANONICA_ENGINE_PILLARS } from '../enginePillars';

export const metadata: Metadata = {
    title: 'Product',
    description: 'Canonica keeps support answers correct across help centers, widgets, changelogs, and tickets for small SaaS teams.',
    alternates: { canonical: '/product' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const FEATURES = [
    {
        id: 'launch-setup',
        badge: 'Launch Setup',
        title: 'Go from blank support to a working support layer',
        description: 'Create a workspace, add your product details, import the help content you already have, and verify the widget on your own product pages.',
        capabilities: [
            'Product profile, support email, billing model, and main product pages',
            'Knowledge import for docs, FAQs, starter answers, and existing files',
            'Activation checklist for widget install, allowed origins, and first answer readiness',
            'Initial product surfaces so coverage is measured by page, not only by article count',
            'Human review before generated drafts become approved answers',
        ],
    },
    {
        id: 'page-aware-support',
        badge: 'Support Control',
        title: 'Show help that matches the page the user is on',
        description: 'Canonica receives safe route and product-surface context from the widget, so billing, onboarding, settings, and release questions can resolve to different help.',
        capabilities: [
            'Widget install script with allowed-origin and blocked-route controls',
            'Safe context payloads for page, feature, workflow, plan, and role hints',
            'Related articles and changelog entries filtered by product surface',
            'Tickets as fallback when approved content is missing',
            'Mobile-first widget UI for end users inside client products',
        ],
    },
    {
        id: 'canonical-answers',
        badge: 'Knowledge Governance',
        title: 'Serve approved answers before fallback',
        description: 'Canonica treats approved support answers as durable product knowledge. Fallback can help while coverage grows, but repeated fallback becomes a visible gap.',
        capabilities: [
            'Canonical-first retrieval before RAG fallback',
            'Owner-approved answer drafts and mutation proposals',
            'Coverage metrics by surface, entity, and answer readiness',
            'Cache freshness checks so updated content does not serve stale answers',
            'Audit trail for answer review and governance actions',
        ],
    },
    {
        id: 'release-awareness',
        badge: 'Release Awareness',
        title: 'Keep support aligned when the product changes',
        description: 'Changelogs, product surfaces, and affected answers stay connected, so a release can point owners to the support content that needs review.',
        capabilities: [
            'Changelog entries assigned to surfaces, tags, and affected answers',
            'Drift flags for stale or conflicting support knowledge',
            'Release impact checks without creating a separate scheduler',
            'Weekly digest of what needs review next',
            'Summary-backed readiness metrics to avoid expensive dashboard scans',
        ],
    },
    {
        id: 'support-gap-loop',
        badge: 'Support Gap Loop',
        title: 'Turn missed questions into better knowledge',
        description: 'Tickets, low-confidence answers, and negative feedback become signals. Canonica clusters those signals and routes the useful ones into owner-reviewed improvements.',
        capabilities: [
            'Fire-and-forget signal writes with bounded payloads',
            'Signal-to-knowledge queue for recurring gaps',
            'Draft canonical answers for owner review',
            'Ticket resolution extraction when a support case teaches the product',
            'Cost-conscious summaries for dashboards and scheduler discovery',
        ],
    },
];

export default function CanonicaProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                {/* Hero */}
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Product</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Support answers tied to the product screen where users need help.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-[#a0a0c0]">
                        Canonica gives small SaaS teams a governed support knowledge layer: product surfaces, canonical answers, release-aware review, and a signal queue for recurring gaps.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-12 max-w-3xl">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Canonica Engine</p>
                            <h2 className="text-3xl font-bold sm:text-4xl">Built as a knowledge control plane, not a chatbot wrapper.</h2>
                            <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                                These are the implemented architecture layers behind the website, widget, help center, tickets, and governance screens.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {CANONICA_ENGINE_PILLARS.map((pillar) => (
                                <article
                                    key={pillar.number}
                                    className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
                                >
                                    <div className="mb-4 flex items-center gap-3">
                                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-400">
                                            {pillar.number}
                                        </span>
                                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                            {pillar.highlight}
                                        </span>
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-white">{pillar.title}</h3>
                                    <p className="text-sm leading-relaxed text-[#808099]">{pillar.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Feature sections */}
                {FEATURES.map((feature, i) => (
                    <section
                        key={feature.id}
                        id={feature.id}
                        className={`border-t border-white/[0.06] px-6 py-20 ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}
                    >
                        <div className="mx-auto max-w-4xl">
                            <span className="mb-4 inline-block rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
                                {feature.badge}
                            </span>
                            <h2 className="mb-4 text-3xl font-bold">{feature.title}</h2>
                            <p className="mb-8 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                                {feature.description}
                            </p>
                            <ul className="space-y-3">
                                {feature.capabilities.map((cap, j) => (
                                    <li key={j} className="flex items-start gap-3 text-sm text-[#808099]">
                                        <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[10px] text-indigo-400">
                                            ✓
                                        </span>
                                        {cap}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </section>
                ))}

                {/* Bottom CTA */}
                <section className="border-t border-white/[0.06] px-6 py-20 text-center">
                    <h2 className="mb-4 text-3xl font-bold">See it in action</h2>
                    <p className="mb-8 text-lg text-[#a0a0c0]">
                        Try the static demo first, then create a workspace and connect your own product.
                    </p>
                    <div className="mb-4">
                        <CanonicaLink
                            basePath={basePath}
                            href="/demo"
                            className="inline-block rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-[#d6d6ef] transition-all hover:border-white/[0.2] hover:text-white"
                        >
                            Try Demo
                        </CanonicaLink>
                    </div>
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        className="inline-block rounded-xl bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
                    >
                        Start Free
                    </CanonicaLink>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
