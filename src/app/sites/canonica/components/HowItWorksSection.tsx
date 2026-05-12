const STEPS = [
    {
        step: '1',
        title: 'Model your product',
        description: 'Define entities — features, plans, workflows, errors. Build a structured ontology of your product from existing docs.',
        visual: '{ }',
    },
    {
        step: '2',
        title: 'Write canonical answers',
        description: 'Create governed, versioned answers bound to entities. One true answer per concept. Scoped by plan, role, and product version.',
        visual: '✓',
    },
    {
        step: '3',
        title: 'Retrieve deterministically',
        description: 'Customer queries hit the canonical engine first. Entity matching → version filtering → specificity scoring. Same input = same output.',
        visual: '→',
    },
    {
        step: '4',
        title: 'Detect drift automatically',
        description: 'Product changes trigger drift evaluation. Four classes: version mismatch, signal anomaly, scope conflict, deprecated entity. Nightly audits.',
        visual: '⚡',
    },
    {
        step: '5',
        title: 'Evolve from signals',
        description: 'Tickets and negative feedback become structured signals. Signals cluster by entity. Clusters propose mutations. You approve. Knowledge improves.',
        visual: '↻',
    },
];

export default function HowItWorksSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-4xl">
                {/* Section header */}
                <div className="mb-16 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        How it works
                    </p>
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        From chaos to canonical in five steps
                    </h2>
                </div>

                {/* Steps */}
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-indigo-500/40 via-indigo-500/20 to-transparent md:block" />

                    <div className="space-y-12">
                        {STEPS.map((item) => (
                            <div key={item.step} className="flex gap-6">
                                {/* Step number */}
                                <div className="hidden flex-shrink-0 md:block">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-indigo-500/30 bg-indigo-500/10 text-lg font-bold text-indigo-400">
                                        {item.step}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                                    <div className="mb-1 flex items-center gap-3 md:hidden">
                                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/10 text-xs font-bold text-indigo-400">
                                            {item.step}
                                        </span>
                                    </div>
                                    <h3 className="mb-2 text-lg font-semibold text-white">
                                        {item.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-[#808099]">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
