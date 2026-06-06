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

function getBentoCardClass(index: number, totalCards: number) {
    if (totalCards === 5) {
        const fiveCardLayout = [
            'md:col-span-2 lg:col-span-3',
            'md:col-span-2 lg:col-span-3',
            'lg:col-span-2',
            'lg:col-span-2',
            'lg:col-span-2',
        ];

        return fiveCardLayout[index] || '';
    }

    if (totalCards === 6) {
        const sixCardLayout = [
            'md:col-span-2 lg:col-span-3',
            'md:col-span-2 lg:col-span-3',
            'lg:col-span-2',
            'lg:col-span-2',
            'lg:col-span-2',
            'lg:col-span-6',
        ];

        return sixCardLayout[index] || '';
    }

    if (index === 0) {
        return 'md:col-span-2 lg:col-span-2';
    }

    return '';
}

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
                            className="rounded-[1.5rem] border border-white/[0.08]"
                        />
                    </div>
                </div>
            </section>

            <section className="border-b border-white/[0.06] px-4 py-20 sm:px-6">
                <div className="mx-auto max-w-7xl">
                    <SectionHeader
                        eyebrow="What this gives the owner"
                        title={bentoTitle}
                        description={bentoDescription}
                    />
                    <div className={`grid gap-4 md:grid-cols-2 ${bentoCards.length >= 5 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
                        {bentoCards.map((card, index) => (
                            <article
                                key={card.title}
                                className={`rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-6 ${getBentoCardClass(index, bentoCards.length)}`}
                            >
                                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{card.description}</p>
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
        </main>
    );
}
