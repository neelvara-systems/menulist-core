import CanonicaLink from './CanonicaLink';

export default function HeroSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-6 pt-16">
            {/* Background gradient orb */}
            <div className="pointer-events-none absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/[0.07] blur-[120px]" />

            {/* Badge */}
            <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span className="text-xs font-medium text-[#a0a0c0]">Now in private beta</span>
            </div>

            {/* Headline */}
            <h1 className="relative max-w-3xl text-center text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                The Support Knowledge{' '}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                    Control Plane
                </span>{' '}
                for SaaS
            </h1>

            {/* Subheadline */}
            <p className="relative mt-6 max-w-xl text-center text-lg leading-relaxed text-[#a0a0c0]">
                One governed source of truth for every support answer.
                Deterministic. Version-aware. Drift-detecting.
                Replace probabilistic AI with canonical knowledge infrastructure.
            </p>

            {/* CTAs */}
            <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4">
                <CanonicaLink
                    basePath={basePath}
                    href="/get-started"
                    className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-indigo-500/40"
                >
                    Request Early Access
                </CanonicaLink>
                <CanonicaLink
                    basePath={basePath}
                    href="/product"
                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-medium text-[#a0a0c0] transition-all hover:border-white/[0.2] hover:text-white"
                >
                    See How It Works
                </CanonicaLink>
            </div>

            {/* Trust line */}
            <p className="relative mt-12 text-xs text-[#505070]">
                No credit card required &middot; Setup in minutes &middot; Cancel anytime
            </p>
        </section>
    );
}
