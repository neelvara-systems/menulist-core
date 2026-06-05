import {
    LuArrowRight,
    LuBookOpen,
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
import type { AnswerlatticeProductFeature } from '../productFeatures';
import AnswerlatticeLink from './AnswerlatticeLink';
import { AnswerlatticeHubDiagram, AnswerlatticeSequenceDiagram } from './AnswerlatticeFlowDiagram';
import AnswerlatticeAssetImage from './AnswerlatticeAssetImage';
import PageProofStrip from './PageProofStrip';
import SectionHeader from './SectionHeader';
import { ANSWERLATTICE_FEATURE_ASSETS } from '../answerlatticeWebsiteAssets';

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

function FeatureHeroMockup({ feature }: { feature: AnswerlatticeProductFeature }) {
    const asset = ANSWERLATTICE_FEATURE_ASSETS[feature.slug];

    return (
        <div className="relative mx-auto w-full max-w-xl rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
            <AnswerlatticeAssetImage asset={asset} className="rounded-[1.45rem] border border-white/[0.08]" />
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
                <LuArrowRight aria-hidden size={24} className="al-primary-accent-text" />
                <div className="al-primary-accent-gradient flex h-16 w-20 items-center justify-center rounded-2xl text-white shadow-lg shadow-teal-500/20">
                    <LuDatabase aria-hidden size={26} />
                </div>
            </div>
        ),
        (
            <div key="flow" className="mt-8 flex items-center justify-center gap-3">
                <div className="h-12 w-16 rounded-xl border border-white/[0.08] bg-white/[0.08]" />
                <div className="al-primary-accent-line h-px w-12" />
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.08]">
                    <LuSparkles aria-hidden size={24} className="al-primary-accent-text" />
                </div>
                <div className="al-primary-accent-line h-px w-12" />
                <div className="h-12 w-20 rounded-xl border border-white/[0.08] bg-white/[0.08]" />
            </div>
        ),
        (
            <div key="list" className="mt-8 flex items-center justify-center">
                <div className="w-full max-w-72 rounded-2xl border border-white/[0.08] bg-[#101028] p-3">
                    <div className="mb-2 flex items-center justify-between">
                        <span className="h-3 w-20 rounded-full bg-white/[0.12]" />
                        <span className="al-primary-accent-fill h-5 w-10 rounded-full" />
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
                <LuArrowRight aria-hidden size={20} className="al-primary-accent-text" />
                <div className="flex -space-x-2">
                    <span className="al-primary-accent-fill h-9 w-9 rounded-full border-2 border-[#09091a]" />
                    <span className="al-primary-accent-fill-main h-9 w-9 rounded-full border-2 border-[#09091a]" />
                    <span className="al-primary-accent-fill-hover h-9 w-9 rounded-full border-2 border-[#09091a]" />
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
    feature: AnswerlatticeProductFeature;
    basePath?: string;
}) {
    const featureName = feature.label === 'FAQ Management' ? 'FAQ management' : feature.label.toLowerCase();

    return (
        <main className="al-page-flow">
            <section className="al-primary-radial-page relative overflow-hidden border-b border-white/[0.06] px-4 py-20 sm:px-6 lg:py-24">
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
                        <PageProofStrip
                            className="mt-5 max-w-2xl"
                            items={[
                                { label: 'Connected to', value: 'Widget, hosted help, tickets, and review' },
                                { label: 'Authority rule', value: 'Drafts stay review work until approved' },
                                { label: 'Conversion proof', value: 'Shows what the feature changes in the support loop' },
                            ]}
                        />
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/get-started"
                                data-answerlattice-event="feature_page_cta_clicked"
                                data-answerlattice-label={`${feature.slug}_start_setup`}
                                className="rounded-xl bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                            >
                                Start support setup
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/demo"
                                data-answerlattice-event="feature_page_cta_clicked"
                                data-answerlattice-label={`${feature.slug}_demo`}
                                className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                            >
                                Try the demo
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/pre-onboarding"
                                data-answerlattice-event="feature_page_cta_clicked"
                                data-answerlattice-label={`${feature.slug}_pre_onboarding`}
                                className="rounded-xl border border-teal-300/20 bg-teal-400/[0.055] px-6 py-3 text-center text-sm font-semibold text-teal-100 transition hover:border-teal-300/35 hover:bg-teal-400/[0.08]"
                            >
                                Prepare inputs
                            </AnswerlatticeLink>
                        </div>
                    </div>

                    <FeatureHeroMockup feature={feature} />
                </div>
            </section>

            <section className="al-primary-radial-section-strong border-b border-white/[0.06] px-4 py-20 text-white sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow={feature.label}
                        title={feature.proofTitle}
                        description={feature.proofDescription}
                    />
                    <div className="grid gap-5 md:grid-cols-2">
                        {feature.cards.map((card, index) => {
                            const Icon = CARD_ICONS[index % CARD_ICONS.length];
                            return (
                                <article key={card.title} className="min-h-[22rem] min-w-0 rounded-[1.75rem] border border-white/[0.08] bg-white/[0.025] p-6">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold leading-snug text-white">{card.title}</h3>
                                            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#a0a0c0]">{card.description}</p>
                                        </div>
                                        <span className="al-primary-accent-text flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.05]">
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
                    <SectionHeader
                        eyebrow="Workflow"
                        title={feature.workflowTitle}
                        description={feature.workflowDescription}
                    />
                    <AnswerlatticeSequenceDiagram
                        idPrefix={`al-feature-workflow-${feature.slug}`}
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
                    <SectionHeader
                        eyebrow="Connected product truth"
                        title={feature.connectedTitle}
                        description={feature.connectedDescription}
                    />
                    <AnswerlatticeHubDiagram
                        idPrefix={`al-feature-connected-${feature.slug}`}
                        inputLabel="Feature layer"
                        outputLabel="Connected surfaces"
                        inputs={[
                            {
                                title: feature.label,
                                detail: `${feature.label} stays tied to reviewed sources, safe page context, and owner-approved support output.`,
                            },
                            {
                                title: 'Reviewed source',
                                detail: 'Support content feeds the widget, hosted help, tickets, and governance review from one controlled workspace.',
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
                <div className="mx-auto max-w-6xl">
                    <SectionHeader
                        eyebrow="Questions"
                        title={`What owners usually ask about ${featureName}.`}
                    />
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
                    AnswerLattice works best when {featureName} stays connected to widget answers, hosted help, tickets, and answer review.
                </p>
                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/get-started"
                        className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                    >
                        Start support setup
                    </AnswerlatticeLink>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/product/support-control"
                        className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                    >
                        See Help Center and Tickets
                    </AnswerlatticeLink>
                </div>
            </section>
        </main>
    );
}
