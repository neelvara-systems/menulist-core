import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import ProductPreviewSection from '../components/ProductPreviewSection';
import SupportKnowledgeMapSection from '../components/SupportKnowledgeMapSection';
import { CANONICA_ENGINE_PILLARS } from '../enginePillars';
import { CANONICA_PRODUCT_AREAS } from '../productAreas';
import { CANONICA_SUPPORT_FEATURES } from '../productFeatures';

export const metadata: Metadata = {
    title: 'Product',
    description: 'Canonica brings page-aware support truth, launch setup, hosted help domains, canonical answers, drift review, and support-gap governance into one SaaS support control plane.',
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
            'Product profile, support email, billing model, workspace subscription, and main product pages',
            'Knowledge import for docs, FAQs, starter answers, and existing files',
            'Activation checklist for widget install, custom help domains, allowed origins, and first answer readiness',
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
            'Hosted help center for docs, FAQ, and changelog on help/docs/support domains like help.yourapp.com',
            'Safe context payloads for page, feature, workflow, plan, and role hints',
            'Related articles, FAQs, and changelog entries filtered by product surface',
            'Tickets as fallback when approved content is missing, with safe debugging context to reduce back-and-forth',
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
            'Article-backed FAQ generation and review for short support answers',
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
            'Summary-backed coverage, trust, and readiness metrics to avoid expensive dashboard scans',
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
            'Ticket resolution extraction and safe ticket context when a support case teaches the product',
            'Cost-conscious summaries for dashboards, scheduler discovery, and product friction review',
        ],
    },
];

const OUTCOMES = [
    ['For the founder', 'Answer repeated billing, onboarding, settings, and release questions before they become manual support work.'],
    ['For the user', 'Get help from the exact product page where they are stuck instead of searching a generic docs site.'],
    ['For support truth', 'Keep approved answers, FAQs, changelogs, tickets, and product surfaces connected as the product changes.'],
];

export default function CanonicaProductPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/product" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                {/* Hero */}
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Product</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        The support knowledge loop behind accurate SaaS answers.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-[#a0a0c0]">
                        Canonica connects page-aware widget context, hosted help, approved canonical answers, release-aware review, and recurring-gap signals into one governed support-truth loop.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
                        {OUTCOMES.map(([title, detail]) => (
                            <article key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                <h2 className="text-lg font-semibold text-white">{title}</h2>
                                <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{detail}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <SupportKnowledgeMapSection context="product" />

                <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
                    <div className="mx-auto max-w-6xl">
                        <div className="mx-auto mb-10 max-w-3xl text-center">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Product areas</p>
                            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                                Each part of Canonica has its own job.
                            </h2>
                            <p className="mt-4 text-base leading-relaxed text-[#a0a0c0]">
                                Canonica is easier to evaluate when each capability can stand on its own: setup, widget, support control, and governance.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {CANONICA_PRODUCT_AREAS.map((area) => (
                                <CanonicaLink
                                    key={area.href}
                                    basePath={basePath}
                                    href={area.href}
                                    className="group rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-6 transition hover:border-white/[0.16] hover:bg-white/[0.04]"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-semibold text-white">{area.label}</h3>
                                            <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{area.description}</p>
                                        </div>
                                        <span className="rounded-full border border-white/[0.08] px-3 py-1 text-xs font-semibold text-[#a0a0c0] transition group-hover:text-white">
                                            View
                                        </span>
                                    </div>
                                </CanonicaLink>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Support features</p>
                                <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                                    Core support surfaces get their own product pages.
                                </h2>
                            </div>
                            <p className="text-base leading-relaxed text-[#a0a0c0]">
                                Each Canonica support surface now explains its outcome, workflow, and how it connects back to approved support truth.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {CANONICA_SUPPORT_FEATURES.map((feature) => (
                                <CanonicaLink
                                    key={feature.href}
                                    basePath={basePath}
                                    href={feature.href}
                                    className="group rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-sky-300/25 hover:bg-sky-400/[0.055]"
                                >
                                    <span className="mb-5 inline-flex rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#8f8faa]">
                                        Feature
                                    </span>
                                    <h3 className="text-lg font-semibold text-white">{feature.label}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{feature.description}</p>
                                    <span className="mt-5 inline-flex text-xs font-semibold text-indigo-300 transition group-hover:text-white">
                                        View feature page
                                    </span>
                                </CanonicaLink>
                            ))}
                        </div>
                    </div>
                </section>

                <ProductPreviewSection />

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
                            data-canonica-event="product_cta_clicked"
                            data-canonica-label="try_demo"
                            className="inline-block rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-[#d6d6ef] transition-all hover:border-white/[0.2] hover:text-white"
                        >
                            Try page-aware demo
                        </CanonicaLink>
                    </div>
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        data-canonica-event="product_cta_clicked"
                        data-canonica-label="start_free_setup"
                        className="inline-block rounded-xl bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
                    >
                        Start free setup
                    </CanonicaLink>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
