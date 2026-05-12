const COMPARISON_ROWS = [
    {
        feature: 'Answer consistency',
        traditional: 'Different generated output every time',
        canonica: 'Same query = same answer. Always.',
    },
    {
        feature: 'Version awareness',
        traditional: 'No concept of product versions',
        canonica: 'Answers scoped to version windows',
    },
    {
        feature: 'Staleness detection',
        traditional: 'Manual review or nothing',
        canonica: '4-class drift detection, nightly audits',
    },
    {
        feature: 'Knowledge improvement',
        traditional: 'Ad-hoc article updates',
        canonica: 'Signal-driven mutation proposals',
    },
    {
        feature: 'Product structure',
        traditional: 'Flat article tags',
        canonica: 'Entity ontology with relationships',
    },
    {
        feature: 'Governance',
        traditional: 'Anyone can edit anything',
        canonica: 'Mutation pipeline + human approval',
    },
    {
        feature: 'Retrieval method',
        traditional: 'Probabilistic RAG / vector search',
        canonica: 'Deterministic entity resolution',
    },
    {
        feature: 'Coverage tracking',
        traditional: 'No visibility',
        canonica: 'Canonical coverage KPI per entity',
    },
];

export default function ComparisonSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-4xl">
                <div className="mb-12 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Why Canonica
                    </p>
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        Traditional KB vs. Canonica
                    </h2>
                    <p className="mt-4 text-lg text-[#a0a0c0]">
                        Knowledge bases store articles. Canonica governs truth.
                    </p>
                </div>

                {/* Comparison table */}
                <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
                    <div className="min-w-[720px]">
                        {/* Header */}
                        <div className="grid grid-cols-3 border-b border-white/[0.06] bg-white/[0.03]">
                            <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                Capability
                            </div>
                            <div className="border-l border-white/[0.06] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                Traditional KB / RAG
                            </div>
                            <div className="border-l border-white/[0.06] bg-indigo-500/[0.05] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                                Canonica
                            </div>
                        </div>

                        {/* Rows */}
                        {COMPARISON_ROWS.map((row, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-3 border-b border-white/[0.04] last:border-b-0"
                            >
                                <div className="px-6 py-4 text-sm font-medium text-white">
                                    {row.feature}
                                </div>
                                <div className="border-l border-white/[0.06] px-6 py-4 text-sm text-[#6b6b8a]">
                                    {row.traditional}
                                </div>
                                <div className="border-l border-white/[0.06] bg-indigo-500/[0.03] px-6 py-4 text-sm text-[#a0a0c0]">
                                    {row.canonica}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
