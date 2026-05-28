import CanonicaLink from './CanonicaLink';
import { CanonicaSequenceDiagram } from './CanonicaFlowDiagram';
import CanonicaPageStructuredData from './PageStructuredData';
import SectionHeader from './SectionHeader';

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
    canvasTitle: string;
    canvasSubtitle: string;
    canvasBadge: string;
    canvasItems: ProductCapabilityCard[];
    metrics: ProductCapabilityMetric[];
    bentoTitle: string;
    bentoDescription: string;
    bentoCards: ProductCapabilityCard[];
    workflowTitle: string;
    workflowDescription: string;
    workflowSteps: ProductCapabilityCard[];
    basePath?: string;
    canonicalPath?: string;
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
    canvasTitle,
    canvasSubtitle,
    canvasBadge,
    canvasItems,
    metrics,
    bentoTitle,
    bentoDescription,
    bentoCards,
    workflowTitle,
    workflowDescription,
    workflowSteps,
    basePath = '',
    canonicalPath,
}: ProductCapabilityLandingPageProps) {
    return (
        <main className="cn-page-flow">
            {canonicalPath ? <CanonicaPageStructuredData path={canonicalPath} /> : null}
            <section className="relative overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(30,206,255,0.12),transparent_38%),rgba(255,255,255,0.01)] px-4 py-20 sm:px-6 lg:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-teal-300">{eyebrow}</p>
                        <h1 className="text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">{title}</h1>
                        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#a0a0c0] sm:text-lg">{description}</p>
                    </div>

                    <div className="mx-auto mt-10 flex max-w-5xl gap-2 overflow-x-auto pb-2 sm:justify-center">
                        {tabs.map((tab) => {
                            const active = tab.label === activeTab;
                            return (
                                <CanonicaLink
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
                                </CanonicaLink>
                            );
                        })}
                    </div>

                    <div className="mx-auto mt-10 max-w-6xl rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
                        <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#101028] text-white">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-white/[0.035] px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
                                </div>
                                <div className="rounded-full border border-white/[0.08] bg-white/[0.05] px-4 py-1.5 text-xs text-[#d6d6ef]">app.canonica.app</div>
                                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">{canvasBadge}</span>
                            </div>

                            <div className="grid lg:grid-cols-[15rem_1fr]">
                                <aside className="hidden border-r border-white/[0.08] bg-[#0d0d22] p-5 lg:block">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-sm font-bold text-white">C</div>
                                        <div>
                                            <div className="text-sm font-bold text-white">Canonica</div>
                                            <div className="text-xs text-[#8f8faa]">Workspace</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        {tabs.map((tab) => (
                                            <div
                                                key={tab.label}
                                                className={`rounded-xl px-3 py-2 ${tab.label === activeTab ? 'border border-teal-300/20 bg-teal-400/10 font-semibold text-teal-100' : 'text-[#8f8faa]'}`}
                                            >
                                                {tab.label}
                                            </div>
                                        ))}
                                    </div>
                                </aside>

                                <div className="p-5 sm:p-7">
                                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-widest text-teal-200">{activeTab}</p>
                                            <h2 className="mt-2 text-3xl font-bold text-white">{canvasTitle}</h2>
                                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#a0a0c0]">{canvasSubtitle}</p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                                        <div className="space-y-3">
                                            {canvasItems.map((item, index) => (
                                                <article
                                                    key={item.title}
                                                    className={`rounded-2xl border p-4 ${
                                                        index === 0
                                                            ? 'border-teal-300/20 bg-teal-400/10'
                                                            : 'border-white/[0.08] bg-white/[0.035]'
                                                    }`}
                                                >
                                                    <div className="text-sm font-bold text-[#d6d6ef]">{item.title}</div>
                                                    <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{item.description}</p>
                                                </article>
                                            ))}
                                        </div>

                                        <div className="rounded-2xl bg-[#151729] p-5 text-white">
                                            <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#9298b8]">Readiness view</div>
                                            <div className="grid gap-3">
                                                {metrics.map((metric) => (
                                                    <div key={metric.label} className="rounded-xl border border-white/[0.08] bg-white/[0.05] p-4">
                                                        <div className="text-xs uppercase tracking-widest text-[#9298b8]">{metric.label}</div>
                                                        <div className="mt-2 text-xl font-bold text-white">{metric.value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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

                    <CanonicaSequenceDiagram
                        idPrefix={`cn-product-capability-${activeTab.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                        splitAfter={Math.ceil(workflowSteps.length / 2)}
                        items={workflowSteps.map((step) => ({
                            title: step.title,
                            detail: step.description,
                        }))}
                    />

                    <div className="mt-8 flex flex-wrap justify-center gap-4">
                        <CanonicaLink
                            basePath={basePath}
                            href="/demo"
                            className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                        >
                            See the demo
                        </CanonicaLink>
                        <CanonicaLink
                            basePath={basePath}
                            href="/get-started"
                            className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                        >
                            Start free setup
                        </CanonicaLink>
                    </div>
                </div>
            </section>
        </main>
    );
}
