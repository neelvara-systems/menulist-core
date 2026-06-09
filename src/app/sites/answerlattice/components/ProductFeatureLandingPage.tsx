import {
    LuBookOpen,
    LuFileText,
    LuHelpCircle,
    LuMegaphone,
    LuRouter,
    LuShieldCheck,
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
            <section className="al-page-hero al-primary-radial-page relative overflow-hidden border-b border-white/[0.06]">
                <div className="al-page-hero__inner al-page-hero__inner--split">
                    <div className="al-page-hero__copy">
                        <p className="al-page-hero__eyebrow">{feature.eyebrow}</p>
                        <h1 className="al-page-hero__title">{feature.title}</h1>
                        <p className="al-page-hero__description">{feature.description}</p>
                        <div className="mt-8 grid gap-3 sm:max-w-2xl sm:grid-cols-2 xl:grid-cols-3">
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
                        <div className="al-page-hero__actions">
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/get-started"
                                data-answerlattice-event="feature_page_cta_clicked"
                                data-answerlattice-label={`${feature.slug}_start_setup`}
                                className="al-page-hero__button al-page-hero__button--primary"
                            >
                                Start support setup
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/demo"
                                data-answerlattice-event="feature_page_cta_clicked"
                                data-answerlattice-label={`${feature.slug}_demo`}
                                className="al-page-hero__button al-page-hero__button--secondary"
                            >
                                Try the demo
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/pre-onboarding"
                                data-answerlattice-event="feature_page_cta_clicked"
                                data-answerlattice-label={`${feature.slug}_pre_onboarding`}
                                className="al-page-hero__button al-page-hero__button--tertiary"
                            >
                                Prepare inputs
                            </AnswerlatticeLink>
                        </div>
                    </div>

                    <FeatureHeroMockup feature={feature} />
                </div>
            </section>

            <section className="al-linear-proof al-primary-radial-section-strong border-b border-white/[0.06] px-4 py-20 text-white sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow={feature.label}
                        title={feature.proofTitle}
                        description={feature.proofDescription}
                    />
                    <div className="al-linear-proof__grid">
                        <article className="al-linear-proof__copy" data-answerlattice-reveal>
                            <p className="al-linear-proof__kicker">01 / {feature.label}</p>
                            <h3>{feature.cards[0]?.title || feature.proofTitle}</h3>
                            <p>{feature.cards[0]?.description || feature.proofDescription}</p>
                            <div className="al-linear-proof__chips">
                                {feature.heroBullets.slice(0, 4).map((bullet) => (
                                    <span key={bullet}>{bullet}</span>
                                ))}
                            </div>
                        </article>

                        <div className="al-linear-proof__visual" data-answerlattice-reveal>
                            <FeatureHeroMockup feature={feature} />
                        </div>
                    </div>

                    <div className="al-linear-proof__cards">
                        {feature.cards.slice(1).map((card, index) => {
                            const Icon = CARD_ICONS[index % CARD_ICONS.length];
                            return (
                                <article key={card.title} className="al-linear-proof__card" data-answerlattice-reveal-item>
                                    <div className="al-linear-proof__card-header">
                                        <span className="al-linear-proof__card-index">{String(index + 2).padStart(2, '0')}</span>
                                        <span className="al-linear-proof__icon">
                                            <Icon aria-hidden size={19} />
                                        </span>
                                    </div>
                                    <h3>{card.title}</h3>
                                    <p>{card.description}</p>
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
                                detail: 'Support content feeds the widget, hosted help, tickets, and answer review from one controlled workspace.',
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
