import CanonicaLink from './CanonicaLink';

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
}: ProductCapabilityLandingPageProps) {
    return (
        <main className="pt-16">
            <section className="relative overflow-hidden border-b border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(30,206,255,0.12),transparent_38%),rgba(255,255,255,0.01)] px-4 py-20 sm:px-6 lg:py-24">
                <div className="mx-auto max-w-7xl">
                    <div className="mx-auto max-w-3xl text-center">
                        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-indigo-400">{eyebrow}</p>
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
                                            ? 'border-white/25 bg-white/[0.13] text-white shadow-lg shadow-indigo-500/10'
                                            : 'border-transparent bg-white/[0.03] text-[#8f8faa] hover:border-white/[0.14] hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </CanonicaLink>
                            );
                        })}
                    </div>

                    <div className="mx-auto mt-10 max-w-6xl rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
                        <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#f7f8ff] text-[#151729]">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfe3ee] bg-white px-5 py-4">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
                                </div>
                                <div className="rounded-full bg-[#f0f2fa] px-4 py-1.5 text-xs text-[#5b6275]">app.canonica.app</div>
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{canvasBadge}</span>
                            </div>

                            <div className="grid lg:grid-cols-[15rem_1fr]">
                                <aside className="hidden border-r border-[#e2e5ef] bg-[#fbfcff] p-5 lg:block">
                                    <div className="mb-6 flex items-center gap-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">C</div>
                                        <div>
                                            <div className="text-sm font-bold text-[#151729]">Canonica</div>
                                            <div className="text-xs text-[#7a8195]">Workspace</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        {tabs.map((tab) => (
                                            <div
                                                key={tab.label}
                                                className={`rounded-xl px-3 py-2 ${tab.label === activeTab ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-[#6b7280]'}`}
                                            >
                                                {tab.label}
                                            </div>
                                        ))}
                                    </div>
                                </aside>

                                <div className="p-5 sm:p-7">
                                    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">{activeTab}</p>
                                            <h2 className="mt-2 text-3xl font-bold text-[#151729]">{canvasTitle}</h2>
                                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#626a7e]">{canvasSubtitle}</p>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                                        <div className="space-y-3">
                                            {canvasItems.map((item, index) => (
                                                <article
                                                    key={item.title}
                                                    className={`rounded-2xl border p-4 ${
                                                        index === 0
                                                            ? 'border-indigo-100 bg-indigo-50'
                                                            : 'border-[#e3e6ef] bg-white'
                                                    }`}
                                                >
                                                    <div className="text-sm font-bold text-[#22263a]">{item.title}</div>
                                                    <p className="mt-2 text-sm leading-relaxed text-[#626a7e]">{item.description}</p>
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
                    <div className="mx-auto mb-10 max-w-3xl text-center">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">What this gives the owner</p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{bentoTitle}</h2>
                        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#a0a0c0]">{bentoDescription}</p>
                    </div>
                    <div className={`grid gap-4 md:grid-cols-2 ${bentoCards.length === 5 ? 'lg:grid-cols-6' : 'lg:grid-cols-4'}`}>
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
                <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Workflow</p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">{workflowTitle}</h2>
                        <p className="mt-4 text-base leading-relaxed text-[#a0a0c0] sm:text-lg">{workflowDescription}</p>
                        <div className="mt-8 flex flex-wrap gap-4">
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
                                className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600"
                            >
                                Start free setup
                            </CanonicaLink>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {workflowSteps.map((step, index) => (
                            <article key={step.title} className="flex gap-4 rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-300">
                                    {index + 1}
                                </span>
                                <div>
                                    <h3 className="text-base font-semibold text-white">{step.title}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#8f8faa]">{step.description}</p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}
