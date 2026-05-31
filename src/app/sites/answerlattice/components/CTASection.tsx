import AnswerlatticeLink from './AnswerlatticeLink';

export default function CTASection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-3xl font-bold sm:text-4xl">
                    Get your SaaS support-ready before users arrive.
                </h2>
                <p className="mt-4 text-lg text-[#a0a0c0]">
                    Start with your existing docs, notes, FAQs, and release updates. Answerlattice prepares help content, answer drafts, and page-aware support while tickets, changelogs, feedback, ratings, and feature requests stay owner-managed.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/get-started"
                        data-answerlattice-event="final_cta_clicked"
                        data-answerlattice-label="start_support_setup"
                        className="rounded-xl bg-teal-700 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-800 hover:shadow-teal-500/40"
                    >
                        Start support setup
                    </AnswerlatticeLink>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/demo"
                        data-answerlattice-event="final_cta_clicked"
                        data-answerlattice-label="try_page_aware_demo"
                        className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-sm font-medium text-[#a0a0c0] transition-all hover:border-white/[0.2] hover:text-white"
                    >
                        Try page-aware demo
                    </AnswerlatticeLink>
                </div>
                <p className="mt-6 text-xs text-[#505070]">
                    Built for solo founders, small SaaS teams, and studios managing multiple launches.
                </p>
            </div>
        </section>
    );
}
