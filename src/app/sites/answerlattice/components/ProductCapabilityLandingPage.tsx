import AnswerlatticeLink from './AnswerlatticeLink';
import { AnswerlatticeSequenceDiagram } from './AnswerlatticeFlowDiagram';
import AnswerlatticeAssetImage from './AnswerlatticeAssetImage';
import AnswerlatticePageStructuredData from './PageStructuredData';
import PageProofStrip from './PageProofStrip';
import SectionHeader from './SectionHeader';
import { ANSWERLATTICE_PRODUCT_AREA_ASSETS } from '../answerlatticeWebsiteAssets';

export type ProductCapabilityCard = {
    title: string;
    description: string;
};

export type ProductCapabilityMetric = {
    label: string;
    value: string;
};

export type ProductCapabilityLandingPageProps = {
    eyebrow: string;
    title: string;
    description: string;
    activeTab: string;
    tabs: Array<{ label: string; href: string }>;
    bentoTitle: string;
    bentoDescription: string;
    bentoCards: ProductCapabilityCard[];
    workflowTitle: string;
    workflowDescription: string;
    workflowSteps: ProductCapabilityCard[];
    basePath?: string;
    canonicalPath?: string;
    proofItems?: ProductCapabilityMetric[];
};

const CAPABILITY_SUITE_ITEMS = [
    {
        label: 'Source',
        value: 'Docs, product pages, FAQs, release notes, screenshots, tickets, and repeated replies become setup material.',
    },
    {
        label: 'Surface',
        value: 'The widget, hosted help center, FAQ, changelog, and ticket fallback share the same support layer.',
    },
    {
        label: 'Control',
        value: 'Drafts and generated guidance stay review work until the owner approves what becomes official.',
    },
    {
        label: 'Loop',
        value: 'Fallback, ratings, feedback, and stale support turn into the next review pass.',
    },
];

const CAPABILITY_EVALUATION_ITEMS = [
    {
        title: 'Implementation path',
        description: 'Check the widget contract, framework guides, safe context rules, and verification path before launch.',
        href: '/install',
        cta: 'Open install guide',
    },
    {
        title: 'Trust boundary',
        description: 'Review what the widget can see, what stays blocked, and how owner-approved answers remain authoritative.',
        href: '/security',
        cta: 'Review security',
    },
    {
        title: 'Category fit',
        description: 'Compare AnswerLattice with chatbots, helpdesks, and static knowledge bases before choosing the support layer.',
        href: '/comparisons',
        cta: 'Compare options',
    },
];

const CAPABILITY_ASSET_SLOT_IDS: Record<string, string> = {
    'Set up support': 'product.area.launch-setup',
    'In-app help widget': 'product.area.page-aware-widget',
    'Help center and tickets': 'product.area.support-control',
    'Review approved answers': 'product.area.knowledge-governance',
};

export default function ProductCapabilityLandingPage({
    eyebrow,
    title,
    description,
    activeTab,
    tabs,
    bentoTitle,
    bentoDescription,
    bentoCards,
    workflowTitle,
    workflowDescription,
    workflowSteps,
    basePath = '',
    canonicalPath,
    proofItems = [
        { label: 'Context', value: 'Safe page context for relevant help' },
        { label: 'Authority', value: 'Approved answers before fallback' },
        { label: 'Review', value: 'Owner approval before official guidance' },
        { label: 'Runtime', value: 'Widget, hosted help, tickets, and signals connected' },
    ],
}: ProductCapabilityLandingPageProps) {
    const canvasAsset = ANSWERLATTICE_PRODUCT_AREA_ASSETS[activeTab as keyof typeof ANSWERLATTICE_PRODUCT_AREA_ASSETS];
    const canvasAssetSlotId = CAPABILITY_ASSET_SLOT_IDS[activeTab];

    return (
        <main className="al-page-flow">
            {canonicalPath ? <AnswerlatticePageStructuredData path={canonicalPath} /> : null}
            <section className="al-page-hero al-primary-radial-page relative overflow-hidden border-b border-white/[0.06]">
                <div className="al-page-hero__inner">
                    <div className="al-page-hero__copy al-page-hero__copy--center">
                        <p className="al-page-hero__eyebrow">{eyebrow}</p>
                        <h1 className="al-page-hero__title">{title}</h1>
                        <p className="al-page-hero__description">{description}</p>
                        <div className="al-page-hero__actions">
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/get-started"
                                data-answerlattice-event="product_area_cta_clicked"
                                data-answerlattice-label={`${activeTab.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_start_setup`}
                                className="al-page-hero__button al-page-hero__button--primary"
                            >
                                Start support setup
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/demo"
                                data-answerlattice-event="product_area_cta_clicked"
                                data-answerlattice-label={`${activeTab.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_demo`}
                                className="al-page-hero__button al-page-hero__button--secondary"
                            >
                                See demo
                            </AnswerlatticeLink>
                            <AnswerlatticeLink
                                basePath={basePath}
                                href="/pre-onboarding"
                                data-answerlattice-event="product_area_cta_clicked"
                                data-answerlattice-label={`${activeTab.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_prepare_inputs`}
                                className="al-page-hero__button al-page-hero__button--tertiary"
                            >
                                Prepare inputs first
                            </AnswerlatticeLink>
                        </div>
                    </div>

                    <div className="mx-auto mt-10 flex max-w-5xl gap-2 overflow-x-auto pb-2 sm:justify-center">
                        {tabs.map((tab) => {
                            const active = tab.label === activeTab;
                            return (
                                <AnswerlatticeLink
                                    key={tab.href}
                                    basePath={basePath}
                                    href={tab.href}
                                    className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-semibold transition ${
                                        active
                                            ? 'border-white/25 bg-white/[0.13] text-white shadow-lg shadow-teal-500/10'
                                            : 'border-transparent bg-white/[0.03] text-[#8f8faa] hover:border-white/[0.14] hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </AnswerlatticeLink>
                            );
                        })}
                    </div>

                    <PageProofStrip items={proofItems} className="mx-auto mt-8 max-w-6xl" />

                    <div className="mx-auto mt-10 max-w-6xl rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
                        <AnswerlatticeAssetImage
                            asset={canvasAsset}
                            assetSlotId={canvasAssetSlotId}
                            assetRole="product-area-hero-canvas"
                            className="rounded-[1.5rem] border border-white/[0.08]"
                        />
                    </div>
                </div>
            </section>

            <section className="border-b border-white/[0.06] bg-white/[0.012] px-4 py-16 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Where this fits"
                        title={`${activeTab} stays connected to the whole support suite.`}
                        description="Founders can start with one support problem, then keep sources, user-facing surfaces, owner control, and support-gap review moving together."
                    />
                    <div className="mt-8 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {CAPABILITY_SUITE_ITEMS.map((item) => (
                            <article key={item.label} className="rounded-2xl border border-white/[0.08] bg-[#09091a] p-5" data-answerlattice-reveal-item>
                                <h3 className="text-base font-semibold text-white">{item.label}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#8f8faa]">{item.value}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="al-linear-proof border-b border-white/[0.06] px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="What this gives the owner"
                        title={bentoTitle}
                        description={bentoDescription}
                    />
                    <div className="al-linear-proof__grid al-linear-proof__grid--compact">
                        <article className="al-linear-proof__copy" data-answerlattice-reveal>
                            <p className="al-linear-proof__kicker">01 / {activeTab}</p>
                            <h3>{bentoCards[0]?.title || bentoTitle}</h3>
                            <p>{bentoCards[0]?.description || bentoDescription}</p>
                            <div className="al-linear-proof__chips">
                                {proofItems.slice(0, 4).map((item) => (
                                    <span key={item.label}>{item.label}</span>
                                ))}
                            </div>
                        </article>

                        <div className="al-linear-proof__visual" data-answerlattice-reveal>
                            <div className="al-linear-proof__mode-stack">
                                {proofItems.map((item, index) => (
                                    <article key={item.label} className="al-linear-proof__mode">
                                        <span className="al-linear-proof__card-index">{String(index + 1).padStart(2, '0')}</span>
                                        <div>
                                            <h3>{item.label}</h3>
                                            <p>{item.value}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="al-linear-proof__cards">
                        {bentoCards.slice(1).map((card, index) => (
                            <article key={card.title} className="al-linear-proof__card" data-answerlattice-reveal-item>
                                <div className="al-linear-proof__card-header">
                                    <span className="al-linear-proof__card-index">{String(index + 2).padStart(2, '0')}</span>
                                </div>
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Workflow"
                        title={workflowTitle}
                        description={workflowDescription}
                    />

                    <AnswerlatticeSequenceDiagram
                        idPrefix={`al-product-capability-${activeTab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        splitAfter={Math.ceil(workflowSteps.length / 2)}
                        items={workflowSteps.map((step) => ({
                            title: step.title,
                            detail: step.description,
                        }))}
                    />

                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/demo"
                            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                        >
                            See the demo
                        </AnswerlatticeLink>
                        <AnswerlatticeLink
                            basePath={basePath}
                            href="/get-started"
                            className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                        >
                            Start support setup
                        </AnswerlatticeLink>
                    </div>
                </div>
            </section>

            <section className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="Before you launch"
                        title="The support layer should be easy to evaluate before it touches users."
                        description="Remove evaluation doubt with setup, security, and category-fit checks that stay tied to the implemented product."
                    />
                    <div className="mt-8 grid gap-4 lg:grid-cols-3">
                        {CAPABILITY_EVALUATION_ITEMS.map((item) => (
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
        </main>
    );
}
