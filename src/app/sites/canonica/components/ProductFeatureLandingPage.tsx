import {
    LuArrowRight,
    LuBookOpen,
    LuCheck,
    LuDatabase,
    LuFileText,
    LuHelpCircle,
    LuLink,
    LuMegaphone,
    LuRouter,
    LuSearch,
    LuShieldCheck,
    LuSparkles,
    LuTags,
    LuTicket,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import type { CanonicaProductFeature } from '../productFeatures';
import CanonicaLink from './CanonicaLink';
import { CanonicaHubDiagram, CanonicaSequenceDiagram } from './CanonicaFlowDiagram';

const CARD_ICONS: IconType[] = [
    LuBookOpen,
    LuFileText,
    LuTags,
    LuHelpCircle,
    LuMegaphone,
    LuTicket,
    LuRouter,
    LuShieldCheck,
];

const HERO_ICONS: IconType[] = [LuDatabase, LuSearch, LuLink, LuSparkles];

function FeatureHeroMockup({ feature }: { feature: CanonicaProductFeature }) {
    return (
        <div className="relative mx-auto w-full max-w-xl rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
            <div className="overflow-hidden rounded-[1.45rem] border border-white/[0.08] bg-[#101028] text-white">
                <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.025] px-5 py-4">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-semibold text-[#d6d6ef]">
                        {feature.label}
                    </span>
                </div>
                <div className="grid gap-4 p-5 sm:p-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">Canonica product layer</p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">{feature.label}</h2>
                        <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{feature.description}</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {feature.heroBullets.map((bullet, index) => {
                            const Icon = HERO_ICONS[index % HERO_ICONS.length];
                            return (
                                <div key={bullet} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                                    <Icon aria-hidden size={18} className="text-[#1eceff]" />
                                    <p className="mt-3 text-sm font-semibold leading-snug text-[#d6d6ef]">{bullet}</p>
                                </div>
                            );
                        })}
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-[#070714] p-4 text-white">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-widest text-[#8ea0c0]">Support truth flow</span>
                            <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">Reviewed</span>
                        </div>
                        <div className="grid gap-2 text-xs text-[#d9e4ff]">
                            {['Source content', 'Product context', 'Approved answer'].map((step, index) => (
                                <div key={step} className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2.5">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-bold">
                                        {index + 1}
                                    </span>
                                    <span>{step}</span>
                                    {index < 2 ? <LuArrowRight aria-hidden size={14} className="ml-auto text-[#8ea0c0]" /> : <LuCheck aria-hidden size={14} className="ml-auto text-emerald-300" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FeatureCardVisual({ index }: { index: number }) {
    const layouts = [
        (
            <div key="import" className="mt-8 flex items-center justify-center gap-4">
                <div className="grid gap-2">
                    <span className="h-11 w-9 rotate-[-8deg] rounded-md border border-white/[0.08] bg-white/[0.12]" />
                    <span className="h-9 w-14 rounded-md border border-white/[0.08] bg-white/[0.08]" />
                </div>
                <LuArrowRight aria-hidden size={24} className="text-[#1eceff]" />
                <div className="flex h-16 w-20 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#22d3ee,#0f766e)] text-white shadow-lg shadow-teal-500/20">
                    <LuDatabase aria-hidden size={26} />
                </div>
            </div>
        ),
        (
            <div key="flow" className="mt-8 flex items-center justify-center gap-3">
                <div className="h-12 w-16 rounded-xl border border-white/[0.08] bg-white/[0.08]" />
                <div className="h-px w-12 bg-[#1eceff]/45" />
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.08]">
                    <LuSparkles aria-hidden size={24} className="text-[#1eceff]" />
                </div>
                <div className="h-px w-12 bg-[#1eceff]/45" />
                <div className="h-12 w-20 rounded-xl border border-white/[0.08] bg-white/[0.08]" />
            </div>
        ),
        (
            <div key="list" className="mt-8 flex items-center justify-center">
                <div className="w-72 rounded-2xl border border-white/[0.08] bg-[#101028] p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="h-3 w-20 rounded-full bg-white/[0.12]" />
                        <span className="h-5 w-10 rounded-full bg-[#1eceff]" />
                    </div>
                    <div className="space-y-2">
                        <span className="block h-8 rounded-lg bg-white/[0.055]" />
                        <span className="block h-8 rounded-lg bg-white/[0.055]" />
                        <span className="block h-8 rounded-lg bg-white/[0.055]" />
                    </div>
                </div>
            </div>
        ),
        (
            <div key="people" className="mt-8 flex items-center justify-center gap-3">
                <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-4">
                    <div className="mb-2 h-3 w-20 rounded-full bg-white/[0.12]" />
                    <div className="h-3 w-28 rounded-full bg-white/[0.06]" />
                </div>
                <LuArrowRight aria-hidden size={20} className="text-[#1eceff]" />
                <div className="flex -space-x-2">
                    <span className="h-9 w-9 rounded-full border-2 border-[#09091a] bg-[#1eceff]" />
                    <span className="h-9 w-9 rounded-full border-2 border-[#09091a] bg-[#0f766e]" />
                    <span className="h-9 w-9 rounded-full border-2 border-[#09091a] bg-[#06b6d4]" />
                </div>
            </div>
        ),
    ];

    return layouts[index % layouts.length];
}

export default function ProductFeatureLandingPage({
    feature,
    basePath = '',
}: {
    feature: CanonicaProductFeature;
    basePath?: string;
}) {
    const featureName = feature.label === 'FAQ Management' ? 'FAQ management' : feature.label.toLowerCase();

    return (
        <main className="pt-16">
            <section className="relative overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(30,206,255,0.12),transparent_38%),rgba(255,255,255,0.01)] px-4 py-20 sm:px-6 lg:py-24">
                <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                    <div>
                        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-teal-300">{feature.eyebrow}</p>
                        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{feature.title}</h1>
                        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[#a0a0c0] sm:text-lg">{feature.description}</p>
                        <div className="mt-8 grid gap-3 sm:max-w-2xl sm:grid-cols-3">
                            {feature.heroBullets.map((bullet) => (
                                <div key={bullet} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm font-medium leading-snug text-[#d6d6ef]">
                                    {bullet}
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <CanonicaLink
                                basePath={basePath}
                                href="/get-started"
                                data-canonica-event="feature_page_cta_clicked"
                                data-canonica-label={`${feature.slug}_start_setup`}
                                className="rounded-xl bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                            >
                                Start free setup
                            </CanonicaLink>
                            <CanonicaLink
                                basePath={basePath}
                                href="/demo"
                                data-canonica-event="feature_page_cta_clicked"
                                data-canonica-label={`${feature.slug}_demo`}
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                            >
                                Try the demo
                            </CanonicaLink>
                        </div>
                    </div>

                    <FeatureHeroMockup feature={feature} />
                </div>
            </section>

            <section className="border-b border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.13),transparent_36%),rgba(255,255,255,0.01)] px-4 py-20 text-white sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto mb-10 max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">{feature.label}</p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{feature.proofTitle}</h2>
                        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#a0a0c0]">{feature.proofDescription}</p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                        {feature.cards.map((card, index) => {
                            const Icon = CARD_ICONS[index % CARD_ICONS.length];
                            return (
                                <article key={card.title} className="min-h-[22rem] rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold leading-snug text-white">{card.title}</h3>
                                            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#a0a0c0]">{card.description}</p>
                                        </div>
                                        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05] text-[#1eceff]">
                                            <Icon aria-hidden size={20} />
                                        </span>
                                    </div>
                                    <FeatureCardVisual index={index} />
                                </article>
                            );
                        })}
                    </div>
                </div>
            </section>

            <section className="border-t border-white/[0.06] px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-10 grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Workflow</p>
                            <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{feature.workflowTitle}</h2>
                        </div>
                        <p className="text-base leading-relaxed text-[#a0a0c0] sm:text-lg">{feature.workflowDescription}</p>
                    </div>
                    <CanonicaSequenceDiagram
                        idPrefix={`cn-feature-workflow-${feature.slug}`}
                        splitAfter={Math.ceil(feature.workflowSteps.length / 2)}
                        items={feature.workflowSteps.map((step) => ({
                            title: step.title,
                            detail: step.description,
                        }))}
                    />
                </div>
            </section>

            <section className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-10 max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Connected product truth</p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{feature.connectedTitle}</h2>
                        <p className="mt-4 text-base leading-relaxed text-[#a0a0c0]">{feature.connectedDescription}</p>
                    </div>
                    <CanonicaHubDiagram
                        idPrefix={`cn-feature-connected-${feature.slug}`}
                        inputLabel="Feature layer"
                        outputLabel="Connected surfaces"
                        inputs={[
                            {
                                title: feature.label,
                                detail: feature.description,
                            },
                            {
                                title: 'Reviewed source',
                                detail: feature.connectedDescription,
                            },
                            {
                                title: 'Page context',
                                detail: feature.heroBullets[0],
                            },
                        ]}
                        outputs={feature.connectedItems.map((item) => ({
                            title: item.title,
                            detail: item.description,
                        }))}
                    />
                </div>
            </section>

            <section className="border-t border-white/[0.06] px-4 py-20 sm:px-6">
                <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.8fr_1.2fr]">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Questions</p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">What owners usually ask about {featureName}.</h2>
                    </div>
                    <div className="space-y-3">
                        {feature.faq.map((item) => (
                            <article key={item.title} className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                <h3 className="text-base font-semibold text-white">{item.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#8f8faa]">{item.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-t border-white/[0.06] px-4 py-20 text-center sm:px-6">
                <h2 className="mx-auto max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
                    Launch {featureName} as part of the full support loop.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#a0a0c0]">
                    Canonica works best when {featureName} stays connected to widget answers, hosted help, tickets, and answer review.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                    >
                        Start free setup
                    </CanonicaLink>
                    <CanonicaLink
                        basePath={basePath}
                        href="/product/support-control"
                        className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                    >
                        See Help Center + Tickets
                    </CanonicaLink>
                </div>
            </section>
        </main>
    );
}
