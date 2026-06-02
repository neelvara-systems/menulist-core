import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticeResourceAnalytics from '../components/AnswerlatticeResourceAnalytics';
import { AnswerlatticeSequenceDiagram } from '../components/AnswerlatticeFlowDiagram';
import PageProofStrip from '../components/PageProofStrip';
import { ANSWERLATTICE_PRODUCT_AREAS } from '../productAreas';
import { ANSWERLATTICE_SUPPORT_FEATURES } from '../productFeatures';
import {
    ANSWERLATTICE_RESOURCE_ARTICLES,
    ANSWERLATTICE_RESOURCE_GROUPS,
    ANSWERLATTICE_RESOURCE_PATH_DETAILS,
} from '../publicContent';
import AnswerlatticeResourceStructuredData from './ResourceStructuredData';

export const metadata: Metadata = {
    title: 'Resources',
    description: 'AnswerLattice resources for founders launching support for SaaS apps and digital products: pre-onboarding, demo, fit, knowledge intake, feedback review, install, Support Board, screenshot boundaries, runtime safety, pricing, and setup.',
    alternates: { canonical: '/resources' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

export default function AnswerlatticeResourcesPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticeResourceStructuredData type="hub" />
            <AnswerlatticeResourceAnalytics pageType="hub" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Resources</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Start here if you are launching support for a SaaS app or digital product.
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
                                <h2 className="text-2xl font-bold text-white">Understand AnswerLattice in order.</h2>
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
                            items={ANSWERLATTICE_RESOURCE_GROUPS.map((group, index) => ({
                                title: group.title,
                                detail: ANSWERLATTICE_RESOURCE_PATH_DETAILS[index],
                                meta: `${group.items.length} links`,
                            }))}
                        />
                    </div>

                    <div className="mx-auto max-w-6xl space-y-4">
                        <div className="mb-12">
                            <div className="mb-6 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
                                <div>
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-teal-200">Resource articles</p>
                                    <h2 className="text-2xl font-bold text-white">Use focused guides when you need more than a link.</h2>
                                </div>
                                <p className="text-sm leading-relaxed text-[#a0a0c0]">
                                    These guides are static, public, and scoped to implemented AnswerLattice behavior. They avoid private dashboard routes and unsupported runtime claims.
                                </p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {ANSWERLATTICE_RESOURCE_ARTICLES.map((article) => (
                                    <AnswerlatticeLink
                                        key={article.path}
                                        basePath={basePath}
                                        href={article.path}
                                        data-answerlattice-event="answerlattice_resource_article_clicked"
                                        data-answerlattice-category={article.cluster}
                                        data-answerlattice-label={article.title}
                                        className="flex min-h-[16rem] flex-col justify-between rounded-[1.5rem] border border-white/[0.06] bg-white/[0.025] p-5 transition hover:border-teal-300/25 hover:bg-teal-400/[0.045]"
                                    >
                                        <div>
                                            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-teal-200">
                                                {article.cluster.replace(/-/g, ' ')}
                                            </p>
                                            <h3 className="text-xl font-semibold leading-tight text-white">{article.title}</h3>
                                            <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{article.description}</p>
                                        </div>
                                        <div className="mt-5 flex items-center justify-between gap-3 text-xs font-semibold text-teal-200">
                                            <span>{article.readingTime}</span>
                                            <span>Open guide</span>
                                        </div>
                                    </AnswerlatticeLink>
                                ))}
                            </div>
                        </div>

                        {ANSWERLATTICE_RESOURCE_GROUPS.map((group, index) => (
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
                                    {group.items.map(({ label, href, description, eventName }) => (
                                        <AnswerlatticeLink
                                            key={href}
                                            basePath={basePath}
                                            href={href}
                                            data-answerlattice-event={eventName || 'resource_link_clicked'}
                                            data-answerlattice-label={label}
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
