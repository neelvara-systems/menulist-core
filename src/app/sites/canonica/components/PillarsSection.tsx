const PILLARS = [
    {
        number: '01',
        title: 'Product Ontology',
        description: 'Model your product as structured entities — features, plans, roles, workflows, states, integrations, errors. Not documents. Not tags. First-class concepts with relationships.',
        highlight: 'Foundation layer',
    },
    {
        number: '02',
        title: 'Canonical Answer Engine',
        description: 'Governed, versioned, entity-bound answers that replace probabilistic AI outputs. Same query = same answer. Every time. Deterministic retrieval with zero LLM calls.',
        highlight: 'Core engine',
    },
    {
        number: '03',
        title: 'Drift Governance',
        description: 'Four drift classes detect when answers become stale: version mismatch, signal anomaly, scope conflict, deprecated entity. Nightly automated audits. Advisory, never blocking.',
        highlight: 'Control plane',
    },
    {
        number: '04',
        title: 'Signal Mutation',
        description: 'Support friction — tickets, negative feedback, escalations — becomes structured signals. Signals cluster by entity. Clusters propose knowledge mutations. Humans approve.',
        highlight: 'Self-improvement',
    },
    {
        number: '05',
        title: 'API & Integration',
        description: 'Public API for canonical answers. Version-aware retrieval. Drift webhooks. Signal ingestion. Embed Canonica behind your existing support tools — Zendesk, Intercom, custom systems.',
        highlight: 'Distribution',
    },
];

export default function PillarsSection() {
    return (
        <section className="px-6 py-24">
            <div className="mx-auto max-w-6xl">
                {/* Section header */}
                <div className="mb-16 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Architecture
                    </p>
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        Five pillars. One control plane.
                    </h2>
                    <p className="mt-4 text-lg text-[#a0a0c0]">
                        Knowledge is the spine. Everything else orbits it.
                    </p>
                </div>

                {/* Pillar cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {PILLARS.map((pillar) => (
                        <div
                            key={pillar.number}
                            className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all hover:border-indigo-500/30 hover:bg-white/[0.04]"
                        >
                            <div className="mb-4 flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-400">
                                    {pillar.number}
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">
                                    {pillar.highlight}
                                </span>
                            </div>
                            <h3 className="mb-2 text-lg font-semibold text-white">
                                {pillar.title}
                            </h3>
                            <p className="text-sm leading-relaxed text-[#808099]">
                                {pillar.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
