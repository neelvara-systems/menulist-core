import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import { CanonicaSequenceDiagram } from '../components/CanonicaFlowDiagram';
import CanonicaPageStructuredData from '../components/PageStructuredData';
import { CANONICA_PRODUCT_AREAS } from '../productAreas';
import { CANONICA_SUPPORT_FEATURES } from '../productFeatures';

export const metadata: Metadata = {
    title: 'Resources',
    description: 'Canonica resources for founders launching support for AI-built SaaS apps: demo, fit, install, pricing, safety, and setup.',
    alternates: { canonical: '/resources' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const RESOURCE_GROUPS = [
    {
        title: 'Evaluate Canonica',
        description: 'Start with proof, pricing, and common buying questions.',
        items: [
            ['See the demo', '/demo', 'Watch how the answer changes by page.'],
            ['Pricing', '/pricing', 'See the current Starter, Growth, and Studio packaging.'],
            ['FAQ', '/faq', 'Answers for setup, widget context, fallback, pricing, and data handling.'],
        ],
    },
    {
        title: 'Understand the fit',
        description: 'Match Canonica to the support problem your product has today.',
        items: [
            ['Use cases', '/use-cases', 'Map Canonica to billing, onboarding, settings, releases, and tickets.'],
            ['AI-built SaaS', '/use-cases/ai-built-saas', 'See the launch support path for apps built quickly with AI.'],
            ['Page-aware support widget', '/page-aware-support-widget', 'See how product-page context changes the answer.'],
        ],
    },
    {
        title: 'Plan the rollout',
        description: 'Check install, hosted help, and security before implementation.',
        items: [
            ['Widget and hosted help', '/install', 'Understand the script, allowed origins, blocked routes, hosted help domains, runtime verification, and context passing.'],
            ['Hosted help center for SaaS', '/hosted-help-center-for-saas', 'Publish docs, FAQ, and changelog on a support domain.'],
            ['Security', '/security', 'Review tenant isolation, widget origin controls, and owner-approved authority.'],
        ],
    },
    {
        title: 'Track product movement',
        description: 'Follow updates or move into setup when the product is ready.',
        items: [
            ['Updates', '/updates', 'Read recent Canonica product and website changes.'],
            ['Get started', '/get-started', 'Create a workspace and land in the Activation Command Center.'],
            ['Contact', '/contact', 'Ask for setup help or partnership details.'],
        ],
    },
];

export default function CanonicaResourcesPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/resources" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Resources</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Start here if you are launching support for an AI-built app.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Use the demo first, then check fit, install steps, pricing, and safety.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto mb-12 max-w-6xl rounded-[1.75rem] border border-indigo-500/20 bg-indigo-500/[0.055] p-6">
                        <div className="mb-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Product pages</p>
                                <h2 className="text-2xl font-bold text-white">Understand Canonica in order.</h2>
                            </div>
                            <p className="text-sm leading-relaxed text-[#d6d6ef]">
                                Start with setup, then understand the widget, hosted help with ticket fallback, and answer review.
                            </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            {CANONICA_PRODUCT_AREAS.map((area) => (
                                <CanonicaLink
                                    key={area.href}
                                    basePath={basePath}
                                    href={area.href}
                                    className="rounded-xl border border-white/[0.08] bg-[#09091a]/45 p-4 transition hover:border-white/[0.18] hover:bg-[#09091a]/65"
                                >
                                    <div className="text-sm font-semibold text-white">{area.label}</div>
                                    <p className="mt-2 text-xs leading-relaxed text-[#a0a0c0]">{area.description}</p>
                                </CanonicaLink>
                            ))}
                        </div>
                    </div>

                    <div className="mx-auto mb-12 max-w-6xl">
                        <div className="mb-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Feature pages</p>
                                <h2 className="text-2xl font-bold text-white">Evaluate the individual support surfaces.</h2>
                            </div>
                            <p className="text-sm leading-relaxed text-[#a0a0c0]">
                                Knowledge Base, FAQ, Changelog, and Tickets each have a dedicated buyer-facing page with workflow, proof cards, and connected support-truth context.
                            </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                            {CANONICA_SUPPORT_FEATURES.map((feature) => (
                                <CanonicaLink
                                    key={feature.href}
                                    basePath={basePath}
                                    href={feature.href}
                                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-sky-300/25 hover:bg-sky-400/[0.055]"
                                >
                                    <div className="text-sm font-semibold text-white">{feature.label}</div>
                                    <p className="mt-2 text-xs leading-relaxed text-[#a0a0c0]">{feature.heroBullets[0]}</p>
                                </CanonicaLink>
                            ))}
                        </div>
                    </div>

                    <div className="mx-auto mb-12 max-w-7xl">
                        <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Resource path</p>
                                <h2 className="text-2xl font-bold text-white">Move from evaluation to rollout in order.</h2>
                            </div>
                            <p className="text-sm leading-relaxed text-[#a0a0c0]">
                                The links below stay available, but the diagram shows the recommended path first.
                            </p>
                        </div>
                        <CanonicaSequenceDiagram
                            idPrefix="cn-resources-path"
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
                                        <CanonicaLink
                                            key={href}
                                            basePath={basePath}
                                            href={href}
                                            className="flex min-h-[8.75rem] flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-indigo-500/30 hover:bg-white/[0.04]"
                                        >
                                            <div>
                                                <div className="text-sm font-semibold text-[#d6d6ef]">{label}</div>
                                                <p className="mt-2 text-sm leading-relaxed text-[#808099]">{description}</p>
                                            </div>
                                            <span className="mt-4 text-xs font-semibold text-indigo-300">Open</span>
                                        </CanonicaLink>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
