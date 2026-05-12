import CanonicaLink from './CanonicaLink';

export default function HeroSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="relative flex min-h-[calc(100svh-4rem)] flex-col items-center justify-center overflow-hidden px-6 pb-10 pt-24">
            {/* Badge */}
            <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span className="text-xs font-medium text-[#a0a0c0]">Now in private beta</span>
            </div>

            {/* Headline */}
            <h1 className="relative w-full max-w-[22rem] text-center text-4xl font-bold leading-[1.1] tracking-tight sm:max-w-3xl sm:text-5xl lg:text-6xl">
                The Support Knowledge{' '}
                <span className="text-indigo-300">
                    Control Plane
                </span>{' '}
                for SaaS
            </h1>

            {/* Subheadline */}
            <p className="relative mt-6 w-full max-w-[21rem] text-center text-lg leading-relaxed text-[#a0a0c0] sm:max-w-xl">
                One governed source of truth for every support answer.
                Deterministic. Version-aware. Drift-detecting.
                Replace generated guesswork with canonical knowledge infrastructure.
            </p>

            {/* CTAs */}
            <div className="relative mt-8 flex w-full max-w-[20rem] flex-col items-stretch justify-center gap-4 sm:max-w-none sm:flex-row sm:items-center">
                <CanonicaLink
                    basePath={basePath}
                    href="/get-started"
                    className="rounded-xl bg-indigo-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-indigo-500/40"
                >
                    Request Early Access
                </CanonicaLink>
                <CanonicaLink
                    basePath={basePath}
                    href="/product"
                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-medium text-[#a0a0c0] transition-all hover:border-white/[0.2] hover:text-white"
                >
                    See How It Works
                </CanonicaLink>
            </div>

            <div className="relative mt-10 w-full max-w-[22rem] border-y border-white/[0.06] py-4 sm:max-w-3xl">
                <div className="grid gap-3 text-left sm:grid-cols-3">
                    {[
                        ['Canonical answers', 'Approved, version-bound truth'],
                        ['Drift governance', 'Stale answers flagged early'],
                        ['Support signals', 'Tickets become reviewable evidence'],
                    ].map(([title, detail]) => (
                        <div key={title} className="px-2">
                            <div className="text-sm font-semibold text-white">{title}</div>
                            <div className="mt-1 text-xs leading-relaxed text-[#6b6b8a]">{detail}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trust line */}
            <p className="relative mt-8 w-full max-w-[20rem] text-center text-xs leading-relaxed text-[#505070] sm:max-w-none">
                No credit card required &middot; Setup in minutes &middot; Cancel anytime
            </p>
        </section>
    );
}
