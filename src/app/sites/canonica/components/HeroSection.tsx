import CanonicaLink from './CanonicaLink';

export default function HeroSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="relative flex min-h-[calc(76svh-4rem)] flex-col items-center justify-center overflow-hidden px-6 pb-8 pt-24">
            {/* Badge */}
            <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                <span className="text-xs font-medium text-[#a0a0c0]">For AI-built SaaS apps shipping fast</span>
            </div>

            {/* Headline */}
            <h1 className="relative w-full max-w-[18rem] break-words text-center text-[1.9rem] font-bold leading-[1.12] tracking-tight sm:max-w-5xl sm:text-5xl lg:text-6xl">
                <span className="block">You shipped the app.</span>
                <span className="canonica-hero-gradient mt-1 block">
                    Now users need correct answers.
                </span>
            </h1>

            {/* Subheadline */}
            <p className="relative mt-6 w-full max-w-[17rem] text-center text-base leading-relaxed text-[#a0a0c0] sm:max-w-3xl sm:text-lg">
                Canonica adds page-aware support to your SaaS: an in-app help widget, hosted help center, ticket fallback, and owner-approved answers or FAQs that improve when users get stuck.
            </p>

            {/* CTAs */}
            <div className="relative mt-8 flex w-full max-w-[17rem] flex-col items-stretch justify-center gap-4 sm:max-w-none sm:flex-row sm:items-center">
                <CanonicaLink
                    basePath={basePath}
                    href="/demo"
                    data-canonica-event="hero_cta_clicked"
                    data-canonica-label="try_page_aware_demo"
                    className="rounded-xl bg-indigo-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-indigo-500/40"
                >
                    Try the page-aware demo
                </CanonicaLink>
                <CanonicaLink
                    basePath={basePath}
                    href="/get-started"
                    data-canonica-event="hero_cta_clicked"
                    data-canonica-label="start_free_setup"
                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-medium text-[#a0a0c0] transition-all hover:border-white/[0.2] hover:text-white"
                >
                    Start free setup
                </CanonicaLink>
            </div>

            <div className="relative mt-8 flex w-full max-w-[17rem] flex-wrap justify-center gap-2 border-y border-white/[0.06] py-4 sm:max-w-4xl">
                {[
                    'One script',
                    'Page-aware answers',
                    'Hosted help',
                    'Ticket fallback',
                    'Human approval',
                ].map((label) => (
                    <span key={label} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[#a0a0c0]">
                        {label}
                    </span>
                ))}
            </div>

            {/* Trust line */}
            <p className="relative mt-6 w-full max-w-[17rem] text-center text-xs leading-relaxed text-[#505070] sm:max-w-none">
                Built for solo founders, small SaaS teams, and studios launching AI-built products.
            </p>
        </section>
    );
}
