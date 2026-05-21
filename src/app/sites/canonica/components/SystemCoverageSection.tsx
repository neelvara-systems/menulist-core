import { CANONICA_SYSTEM_COVERAGE } from '../systemCoverage';

export default function SystemCoverageSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-6xl">
                <div className="mb-14 max-w-3xl">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Product System
                    </p>
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        One control plane across setup, support, governance, and runtime.
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                        Canonica is not only a search box. It connects onboarding, help content, product pages, widget context, tickets, release notes, and review queues so support can keep up with fast-moving software.
                    </p>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                    {CANONICA_SYSTEM_COVERAGE.map((group) => (
                        <article
                            key={group.mode}
                            className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6"
                        >
                            <div className="mb-5">
                                <h3 className="text-xl font-semibold text-white">{group.mode}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#808099]">{group.summary}</p>
                            </div>

                            <div className="divide-y divide-white/[0.06]">
                                {group.items.map((item) => (
                                    <div key={item.title} className="py-4 first:pt-0 last:pb-0">
                                        <div className="text-sm font-semibold text-[#d6d6ef]">{item.title}</div>
                                        <p className="mt-1 text-sm leading-relaxed text-[#6b6b8a]">{item.detail}</p>
                                    </div>
                                ))}
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

