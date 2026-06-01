import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import { AnswerlatticeSequenceDiagram } from '../components/AnswerlatticeFlowDiagram';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../productAreas';
import { ANSWERLATTICE_SUPPORT_FEATURES } from '../productFeatures';

export const metadata: Metadata = {
    title: 'Resources',
    description: 'Answerlattice resources for founders launching support for AI-built SaaS apps: pre-onboarding, demo, fit, knowledge intake, feedback review, install, Support Board, screenshot boundaries, runtime safety, pricing, and setup.',
    alternates: { canonical: '/resources' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const RESOURCE_GROUPS = [
    {
        title: 'Evaluate Answerlattice',
        description: 'Start with proof, pricing, and common buying questions.',
        items: [
            ['See the demo', '/demo', 'Watch how the answer changes by page.'],
            ['Pricing', '/pricing', 'See the current Starter, Growth, and Studio packaging.'],
            ['ROI calculator', '/roi-calculator', 'Estimate repeated-question time saved and plan fit.'],
            ['Proof pack', '/proof', 'Review example workloads for launch, release, and studio use.'],
            ['FAQ', '/faq', 'Answers for setup, knowledge intake, widget context, screenshots, fallback, pricing, and data handling.'],
        ],
    },
    {
        title: 'Understand the fit',
        description: 'Match Answerlattice to the support problem your product has today.',
        items: [
            ['Use cases', '/use-cases', 'Map Answerlattice to billing, onboarding, settings, releases, and tickets.'],
            ['AI-built SaaS', '/use-cases/ai-built-saas', 'See the launch support path for apps built quickly with AI.'],
            ['Page-aware support widget', '/page-aware-support-widget', 'See how product-page context and optional screenshots change the answer.'],
        ],
    },
    {
        title: 'Plan the rollout',
        description: 'Check install, hosted help, runtime safety, and cost boundaries before implementation.',
        items: [
            ['Pre-Onboarding Kit', '/pre-onboarding', 'Use your AI coding agent to prepare Answerlattice-ready source inputs before setup.'],
            ['Pre-Onboarding Guide', '/pre-onboarding/guide', 'Follow the owner and agent runbook before uploading prepared sources.'],
            ['Starter surface templates', '/product/launch-setup', 'Seed billing, onboarding, settings, releases, integrations, and common-error pages before users arrive.'],
            ['Team access', '/product/team-access', 'Plan workspace roles, custom permissions, owner reset, and force sign-out before support work spreads.'],
            ['Knowledge Intake', '/product/knowledge-intake', 'Teach Answerlattice from selected product links, docs, FAQs, release notes, setup notes, support macros, supported files, screenshots, and short recordings.'],
            ['Knowledge Base', '/product/knowledge-base', 'Publish reviewed articles that power hosted help, FAQ, widget suggestions, and governance.'],
            ['Feedback Review', '/product/feedback-review', 'Plan how ratings, feature requests, and suggestions are sorted by Product Surface before becoming private support signals.'],
            ['Support Board', '/product/support-board', 'Plan private support cards, internal notes, status history, and answer proposal handoff.'],
            ['Install verifier and hosted help', '/install', 'Understand the script, allowed origins, blocked routes, hosted help domains, runtime verification, context passing, and screenshot boundaries.'],
            ['Developer quickstarts', '/quickstarts', 'Use Next.js, React, Vue/Nuxt, or vanilla script examples.'],
            ['Integrations', '/integrations', 'Set up Slack or email workflow notifications, test delivery, and health review.'],
            ['Hosted help center for SaaS', '/hosted-help-center-for-saas', 'Publish docs, FAQ, and changelog on a support domain.'],
            ['Security and runtime safety', '/security', 'Review tenant isolation, widget origin controls, screenshot input, compiled context boundaries, and owner-approved authority.'],
            ['Security one-pager', '/security-one-pager', 'Share the concise security and ops summary with developers or buyers, including the manual screenshot boundary.'],
        ],
    },
    {
        title: 'Track product movement',
        description: 'Follow updates or move into setup when the product is ready.',
        items: [
            ['Updates', '/updates', 'Read recent Answerlattice product and website changes.'],
            ['Get started', '/get-started', 'Create a workspace and land in the Activation Command Center.'],
            ['Contact', '/contact', 'Ask for setup help or partnership details.'],
        ],
    },
];

export default function AnswerlatticeResourcesPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/resources" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Resources</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Start here if you are launching support for an AI-built app.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Start with pre-onboarding, then use the demo, fit checks, knowledge intake, install steps, screenshot boundaries, runtime safety, pricing, and support-day governance.
                    </p>
                    <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/pre-onboarding"
                            className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                        >
                            Prepare inputs first
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/demo"
                            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                        >
                            See page-aware demo
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/get-started"
                            className="rounded-xl border border-teal-300/20 bg-teal-400/[0.055] px-6 py-3 text-sm font-semibold text-teal-100 transition hover:border-teal-300/35 hover:bg-teal-400/[0.08]"
                        >
                            Start setup
                        </AnswerlatticeLink>
                    </div>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-6xl text-left"
                        items={[
                            { label: 'Buyer path', value: 'Demo, proof, pricing, FAQ' },
                            { label: 'Setup path', value: 'Pre-onboarding, intake, install, security' },
                            { label: 'Product path', value: 'Setup, widget, hosted help, governance' },
                        ]}
                    />
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto mb-12 max-w-6xl rounded-[1.75rem] border border-teal-300/20 bg-teal-400/[0.055] p-6">
                        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-200">Start before setup</p>
                                <h2 className="text-2xl font-bold text-white">Run the Pre-Onboarding Kit before the first intake job.</h2>
                                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#d6d6ef]">
                                    The kit is the main route for the prompt, owner guidance, agent rules, source-mode handling, and safety boundaries.
                                </p>
                            </div>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/pre-onboarding"
                                className="inline-flex justify-center rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/20 transition hover:bg-teal-800"
                            >
                                Open Pre-Onboarding Kit
                            </AnswerlatticeLink>
                        </div>
                    </div>

                    <div className="mx-auto mb-12 max-w-6xl rounded-[1.75rem] border border-teal-500/20 bg-teal-500/[0.055] p-6">
                        <div className="mb-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-200">Product pages</p>
                                <h2 className="text-2xl font-bold text-white">Understand Answerlattice in order.</h2>
                            </div>
                            <p className="text-sm leading-relaxed text-[#d6d6ef]">
                                Start with setup, then understand the widget, hosted help with ticket fallback, and answer review.
                            </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            {ANSWERLATTICE_PRODUCT_AREAS.map((area) => (
                                <AnswerlatticeLink
                                    key={area.href}
                                    basePath={basePath}
                                    href={area.href}
                                    className="rounded-xl border border-white/[0.08] bg-[#09091a]/45 p-4 transition hover:border-white/[0.18] hover:bg-[#09091a]/65"
                                >
                                    <div className="text-sm font-semibold text-white">{area.label}</div>
                                    <p className="mt-2 text-xs leading-relaxed text-[#a0a0c0]">{area.description}</p>
                                </AnswerlatticeLink>
                            ))}
                        </div>
                    </div>

                    <div className="mx-auto mb-12 max-w-6xl">
                        <div className="mb-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-200">Feature pages</p>
                                <h2 className="text-2xl font-bold text-white">Evaluate the individual product features.</h2>
                            </div>
                            <p className="text-sm leading-relaxed text-[#a0a0c0]">
                                Core features now have dedicated buyer-facing pages. Each page shows workflow, proof cards, and connected support-truth context. Runtime scaling stays in Product and Security because it is core infrastructure, not a separate buyer feature.
                            </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                            {ANSWERLATTICE_SUPPORT_FEATURES.map((feature) => (
                                <AnswerlatticeLink
                                    key={feature.href}
                                    basePath={basePath}
                                    href={feature.href}
                                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-sky-300/25 hover:bg-sky-400/[0.055]"
                                >
                                    <div className="text-sm font-semibold text-white">{feature.label}</div>
                                    <p className="mt-2 text-xs leading-relaxed text-[#a0a0c0]">{feature.heroBullets[0]}</p>
                                </AnswerlatticeLink>
                            ))}
                        </div>
                    </div>

                    <div className="mx-auto mb-12 max-w-7xl">
                        <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-200">Resource path</p>
                                <h2 className="text-2xl font-bold text-white">Move from evaluation to rollout in order.</h2>
                            </div>
                            <p className="text-sm leading-relaxed text-[#a0a0c0]">
                                The links below stay available, but the diagram shows the recommended path first.
                            </p>
                        </div>
                        <AnswerlatticeSequenceDiagram
                            idPrefix="al-resources-path"
                            splitAfter={2}
                            items={RESOURCE_GROUPS.map((group) => ({
                                title: group.title,
                                detail: group.description,
                                meta: `${group.items.length} links`,
                            }))}
                        />
                    </div>

                    <div className="mx-auto max-w-6xl space-y-4">
                        {RESOURCE_GROUPS.map((group, index) => (
                            <article
                                key={group.title}
                                className="grid gap-5 border-t border-white/[0.06] py-6 first:border-t-0 first:pt-0 lg:grid-cols-[16rem_1fr] lg:items-stretch"
                            >
                                <div className="flex flex-col justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                                    <div>
                                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                            Step {String(index + 1).padStart(2, '0')}
                                        </p>
                                        <h2 className="text-xl font-semibold leading-tight text-white">{group.title}</h2>
                                    </div>
                                    <p className="text-xs leading-relaxed text-[#808099]">
                                        {group.description}
                                    </p>
                                </div>
                                <div className="grid gap-3 md:grid-cols-3">
                                    {group.items.map(([label, href, description]) => (
                                        <AnswerlatticeLink
                                            key={href}
                                            basePath={basePath}
                                            href={href}
                                            className="flex min-h-[8.75rem] flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-teal-500/30 hover:bg-white/[0.04]"
                                        >
                                            <div>
                                                <div className="text-sm font-semibold text-[#d6d6ef]">{label}</div>
                                                <p className="mt-2 text-sm leading-relaxed text-[#808099]">{description}</p>
                                            </div>
                                            <span className="mt-4 text-xs font-semibold text-teal-200">Open</span>
                                        </AnswerlatticeLink>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
