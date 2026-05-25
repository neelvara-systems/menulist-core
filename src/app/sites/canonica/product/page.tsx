import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import DayOneLaunchPackSection from '../components/DayOneLaunchPackSection';
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
    description: 'Canonica is the support layer for AI-built SaaS apps: starter surfaces, import pack, page-aware widget, hosted help, approved answers, and reviewable support gaps.',
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
        title: 'Set up support before users start asking',
        description: 'Create a workspace, add your app details, import starter knowledge, map important pages, and verify the widget before support goes live.',
        capabilities: [
            'Product profile, support email, billing model, workspace subscription, and main product pages',
            'Knowledge import for docs, FAQs, starter answers, and existing files',
            'Activation checklist for widget install, custom help domains, allowed origins, and first answer readiness',
            'Initial product surfaces so coverage is measured by page, not only by article count',
            'Compiled context readiness so the widget can use cache-first product context after approval',
            'Human review before generated drafts become approved answers',
        ],
    },
    {
        id: 'page-aware-support',
        badge: 'Support Control',
        title: 'Show help that matches the page the user is on',
        description: 'Canonica receives safe route and product-surface context from the widget, so billing, onboarding, settings, and release questions can resolve to different help. Configured proactive prompts can appear only where active triggers exist.',
        capabilities: [
            'Widget install script with allowed-origin and blocked-route controls',
            'Hosted help center for docs, FAQ, and changelog on help/docs/support domains like help.yourapp.com',
            'Safe context payloads for page, feature, workflow, plan, and role hints',
            'Related articles, FAQs, and changelog entries filtered by product surface',
            'Rule-based proactive help that skips backend calls when the feature is disabled or no active trigger exists',
            'Tickets as fallback when approved content is missing, with safe debugging context to reduce back-and-forth',
            'Mobile-first widget UI for end users inside client products',
        ],
    },
    {
        id: 'canonical-answers',
        badge: 'Knowledge Governance',
        title: 'Approve answers before they become official',
        description: 'Canonica treats approved answers as durable product knowledge. Fallback can help while coverage grows, but repeated fallback becomes a visible gap.',
        capabilities: [
            'Approved-answer retrieval before fallback',
            'Owner-approved answer drafts and mutation proposals',
            'Article-backed FAQ generation and review for short support answers',
            'Coverage metrics by surface, entity, and answer readiness',
            'Compiled approved context for widget/runtime reads, with cache freshness checks so updates do not serve stale answers',
            'Audit trail for answer review and governance actions',
        ],
    },
    {
        id: 'release-awareness',
        badge: 'Release Awareness',
        title: 'When the product changes, support gets reviewed',
        description: 'Changelogs, product surfaces, and affected answers stay connected, so a release can point owners to the support content that needs review.',
        capabilities: [
            'Changelog entries assigned to surfaces, tags, and affected answers',
            'Drift flags for stale or conflicting support knowledge',
            'Release impact checks inside the centralized workspace-local governance scheduler',
            'Weekly digest and Slack/email notifications for support governance movement',
            'Summary-backed coverage, trust, and readiness metrics to avoid expensive dashboard scans',
        ],
    },
    {
        id: 'support-gap-loop',
        badge: 'Support Gap Loop',
        title: 'Use missed questions to create better answers',
        description: 'Tickets, low-confidence answers, and negative feedback become signals. Canonica clusters those signals and routes the useful ones into owner-reviewed improvements.',
        capabilities: [
            'Fire-and-forget signal writes with bounded payloads',
            'Signal-to-knowledge queue for recurring gaps',
            'Draft approved answers for owner review',
            'Critical workflow notifications for coverage drops and repeated answer failures',
            'Ticket resolution extraction and safe ticket context when a support case teaches the product',
            'Cost-conscious summaries, compiled context repair, and product friction review without per-request collection scans',
        ],
    },
];

const OUTCOMES = [
    ['For the founder', 'Launch support before repeated billing, onboarding, settings, and release questions become manual work.'],
    ['For the user', 'Get help from the exact app page where they are stuck instead of searching a generic docs site.'],
    ['For the product', 'Keep approved answers, FAQs, changelogs, tickets, and app pages connected as the product changes.'],
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
                        The support layer for AI-built SaaS apps.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-[#a0a0c0]">
                        Canonica connects your app pages, help content, widget, tickets, releases, and approved answers so users get correct support while your product keeps changing.
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
                                Canonica is easier to evaluate when each capability can stand on its own: setup, widget, hosted help with tickets, and answer review.
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

                <DayOneLaunchPackSection basePath={basePath} context="product" />

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
                                Each Canonica support surface now explains its outcome, workflow, and how it connects back to approved answers.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

                <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
                    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Runtime readiness</p>
                            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                                Approved support context is prepared before runtime needs it.
                            </h2>
                            <p className="mt-4 text-base leading-relaxed text-[#a0a0c0]">
                                Canonica keeps governed source records separate, then prepares approved public widget context and private server context into versioned runtime bundles. That keeps user-facing support fast without exposing drafts, tickets, audit logs, or workspace internals.
                            </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {[
                                ['Owner-visible readiness', 'Activation shows compiled context status, version, stale state, public/private readiness, and manual rebuild controls.'],
                                ['Cache-first widget config', 'Ready widget context can return bundle pointers with runtime config, so browsers avoid repeated setup reads.'],
                                ['Workspace-local governance', 'Daily governance runs by each workspace timezone and support-day end time, then repairs stale compiled context only when source versions changed.'],
                                ['Agent context stays controlled', 'Authenticated agent-context endpoints stay rollout-gated; public pages do not promise agent-side knowledge writes.'],
                            ].map(([title, detail]) => (
                                <article key={title} className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                    <h3 className="text-base font-semibold text-white">{title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{detail}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <ProductPreviewSection />

                <section className="border-t border-white/[0.06] px-6 py-20">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-12 max-w-3xl">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Behind the support layer</p>
                            <h2 className="text-3xl font-bold sm:text-4xl">Not only a chatbot.</h2>
                            <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                                Canonica keeps your product structure, approved answers, support gaps, and stale content connected behind the widget and help center.
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
