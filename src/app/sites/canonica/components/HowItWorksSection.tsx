const STEPS = [
    {
        step: '1',
        title: 'Add product details',
        description: 'Create the workspace, add your product URL, support email, billing model, and the core product surfaces users ask about.',
        visual: '{ }',
    },
    {
        step: '2',
        title: 'Import starter knowledge',
        description: 'Upload docs or starter articles. Canonica keeps support working through fallback while it prepares governed answer drafts.',
        visual: '✓',
    },
    {
        step: '3',
        title: 'Review approved answers',
        description: 'Entity candidates and canonical answer drafts go to the review queue. Nothing becomes authoritative without owner approval.',
        visual: '→',
    },
    {
        step: '4',
        title: 'Install page-aware support',
        description: 'Embed the widget, lock allowed origins, and pass route context so billing, onboarding, and settings pages get relevant help.',
        visual: '⚡',
    },
    {
        step: '5',
        title: 'Improve from support gaps',
        description: 'Repeated fallback, tickets, and negative feedback become signal-to-knowledge tasks you can review each week.',
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
                        Launch support without building a support team
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
