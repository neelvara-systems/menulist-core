import CanonicaLink from './CanonicaLink';

export default function CTASection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold sm:text-4xl">
                    Keep building. Let Canonica guard your support truth.
                </h2>
                <p className="mt-4 text-lg text-[#a0a0c0]">
                    Give users approved answers before fallback, keep stale support visible, and turn repeated misses into reviewable fixes from one activation dashboard.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        data-canonica-event="final_cta_clicked"
                        data-canonica-label="start_free_setup"
                        className="rounded-xl bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600 hover:shadow-indigo-500/40"
                    >
                        Start free setup
                    </CanonicaLink>
                    <CanonicaLink
                        basePath={basePath}
                        href="/demo"
                        data-canonica-event="final_cta_clicked"
                        data-canonica-label="try_page_aware_demo"
                        className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-sm font-medium text-[#a0a0c0] transition-all hover:border-white/[0.2] hover:text-white"
                    >
                        Try page-aware demo
                    </CanonicaLink>
                </div>
                <p className="mt-6 text-xs text-[#505070]">
                    Built for solo founders, small SaaS teams, and studios managing multiple launches.
                </p>
            </div>
        </section>
    );
}
