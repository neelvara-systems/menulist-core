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
import { ANSWERLATTICE_PRODUCT_AREAS } from '../productAreas';
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

const FEATURE_PAGE_PROOF_ITEMS = [
    {
        title: 'A familiar support surface',
        description: 'Each feature is explained as something buyers already recognize: docs, FAQs, releases, tickets, feedback, notifications, or review work.',
    },
    {
        title: 'Feeds the support suite',
        description: 'The feature does not live alone. It helps turn scattered product knowledge, tickets, and signals into widget answers, hosted help, fallback, and owner review.',
    },
    {
        title: 'Owner control stays visible',
        description: 'Drafts, generated content, ticket gaps, and feedback remain reviewable before anything becomes official support.',
    },
];

const FEATURE_EVALUATION_ITEMS = [
    {
        title: 'Setup path',
        description: 'Show how the feature fits into the widget, hosted help, fallback, and owner review before users depend on it.',
        href: '/product',
        cta: 'View product map',
    },
    {
        title: 'Security boundary',
        description: 'Review safe page context, blocked private data, owner roles, fallback behavior, and approved-answer authority.',
        href: '/security',
        cta: 'Review security',
    },
    {
        title: 'Compare support options',
        description: 'See where AnswerLattice fits against chatbots, helpdesks, and static knowledge bases without treating them as the same product.',
        href: '/comparisons',
        cta: 'Compare options',
    },
];

function FeatureHeroMockup({ feature }: { feature: AnswerlatticeProductFeature }) {
    const asset = ANSWERLATTICE_FEATURE_ASSETS[feature.slug];

    return (
        <div className="relative mx-auto w-full max-w-xl rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
            <AnswerlatticeAssetImage
                asset={asset}
                assetSlotId="feature.template.hero-scene"
                assetRole={feature.slug}
                className="rounded-[1.45rem] border border-white/[0.08]"
            />
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
                                { label: 'Feeds', value: 'Widget, hosted help, tickets, and review' },
                                { label: 'Authority rule', value: 'Drafts stay review work until approved' },
                                { label: 'Buyer proof', value: 'Shows what the feature changes in the support loop' },
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
                        eyebrow="Generated support truth"
                        title={feature.connectedTitle}
                        description={feature.connectedDescription}
                    />
                    <AnswerlatticeHubDiagram
                        idPrefix={`al-feature-connected-${feature.slug}`}
                        inputLabel="Feature layer"
                        outputLabel="Support outputs"
                        inputs={[
                            {
                                title: feature.label,
                                detail: `${feature.label} turns structured support knowledge, safe page context, and owner approval into usable support output.`,
                            },
                            {
                                title: 'Scattered knowledge',
                                detail: 'Docs, tickets, releases, screenshots, recordings, and notes become widget help, hosted help, tickets, and answer review from one controlled workspace.',
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
                <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
                    <div data-answerlattice-reveal>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Support output layer</p>
                        <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                            {feature.label} is one part of the full support layer.
                        </h2>
                        <p className="mt-5 text-base leading-relaxed text-[#a0a0c0]">
                            A founder may start with {featureName}, but the value comes from turning it into setup, in-app support, hosted help, fallback, and approved-answer review.
                        </p>
                        <div className="mt-6 grid gap-3">
                            {FEATURE_PAGE_PROOF_ITEMS.map((item) => (
                                <article key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5">
                                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#8f8faa]">{item.description}</p>
                                </article>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-4 shadow-2xl shadow-black/30 sm:p-6">
                        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">
                            Explore the support layer
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {ANSWERLATTICE_PRODUCT_AREAS.map((area) => (
                                <AnswerlatticeLink
                                    key={area.href}
                                    basePath={basePath}
                                    href={area.href}
                                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 transition hover:border-teal-300/25 hover:bg-teal-500/[0.045]"
                                    data-answerlattice-reveal-item
                                >
                                    <h3 className="text-base font-semibold text-white">{area.label}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#8f8faa]">{area.description}</p>
                                </AnswerlatticeLink>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <section className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Worth checking"
                        title={`Before choosing ${featureName}, check the product fit.`}
                        description="Answer the evaluation questions before setup: how it launches, what stays safe, and how it differs from nearby support tools."
                    />
                    <div className="mt-8 grid gap-4 lg:grid-cols-3">
                        {FEATURE_EVALUATION_ITEMS.map((item) => (
                            <AnswerlatticeLink
                                key={item.href}
                                basePath={basePath}
                                href={item.href}
                                className="group rounded-[1.75rem] border border-white/[0.08] bg-[#09091a] p-6 transition hover:border-teal-300/25 hover:bg-teal-500/[0.045]"
                                data-answerlattice-reveal-item
                            >
                                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{item.description}</p>
                                <span className="mt-5 inline-flex text-sm font-semibold text-teal-200 transition group-hover:text-white">
                                    {item.cta}
                                </span>
                            </AnswerlatticeLink>
                        ))}
                    </div>
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
                    AnswerLattice works best when {featureName} feeds widget answers, hosted help, tickets, and answer review from the same approved support truth.
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
