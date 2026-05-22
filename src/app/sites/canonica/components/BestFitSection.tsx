const BEST_FIT = [
    'Solo founders and small SaaS teams with recurring onboarding, billing, settings, or release questions.',
    'Products where users get stuck on specific pages and need help that matches that screen.',
    'Teams that want support automation from approved knowledge, not unreviewed answers.',
];

const NOT_FIT = [
    'Teams looking for Canonica to replace a full human helpdesk or agent inbox.',
    'Products with no live or near-live app and no support knowledge to start from.',
    'Teams that want generated answers to auto-publish without owner review.',
];

export default function BestFitSection() {
    return (
        <section className="px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <div className="mb-10 max-w-2xl">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Best fit</p>
                    <h2 className="text-3xl font-bold sm:text-4xl">Built for products where support questions repeat by page.</h2>
                    <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                        Canonica is intentionally narrow: it governs support knowledge, serves page-aware help, and turns missed answers into review work.
                    </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                    <article className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-6">
                        <h3 className="mb-5 text-xl font-semibold text-white">Canonica is best for</h3>
                        <ul className="space-y-4">
                            {BEST_FIT.map((item) => (
                                <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#d6d6ef]">
                                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-[10px] font-bold text-emerald-300">
                                        ✓
                                    </span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </article>
                    <article className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                        <h3 className="mb-5 text-xl font-semibold text-white">Canonica is not for</h3>
                        <ul className="space-y-4">
                            {NOT_FIT.map((item) => (
                                <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#a0a0c0]">
                                    <span className="mt-1 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-bold text-[#808099]">
                                        -
                                    </span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </article>
                </div>
            </div>
        </section>
    );
}
