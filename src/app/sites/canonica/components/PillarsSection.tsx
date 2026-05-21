import { CANONICA_ENGINE_PILLARS } from '../enginePillars';

export default function PillarsSection() {
    return (
        <section className="px-6 py-24">
            <div className="mx-auto max-w-6xl">
                {/* Section header */}
                <div className="mb-16 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Canonica Engine
                    </p>
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        The support truth layer under your product.
                    </h2>
                    <p className="mt-4 text-lg text-[#a0a0c0]">
                        Canonica is built around structured product knowledge, approved answers, drift detection, and support-signal review.
                    </p>
                </div>

                {/* Pillar cards */}
                <div className="grid gap-4 md:grid-cols-2">
                    {CANONICA_ENGINE_PILLARS.map((pillar) => (
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
