import AnswerlatticeLink from './AnswerlatticeLink';
import { LuArrowRight, LuFileInput } from 'react-icons/lu';

export default function HeroSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="relative flex min-h-[calc(76svh-4rem)] flex-col items-center justify-center overflow-hidden px-6 pb-8 pt-24">
            {/* Badge */}
            <div className="relative mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
                <span className="text-xs font-medium text-[#a0a0c0]">For SaaS founders before a support team</span>
            </div>

            {/* Headline */}
            <h1 className="relative w-full max-w-[18rem] break-words text-center text-[1.9rem] font-bold leading-[1.12] tracking-tight sm:max-w-5xl sm:text-5xl lg:text-6xl">
                <span className="block">Launch your SaaS</span>
                <span className="answerlattice-hero-gradient mt-1 block">
                    with support already built.
                </span>
            </h1>

            {/* Subheadline */}
            <p className="relative mt-6 w-full max-w-[17rem] text-center text-base leading-relaxed text-[#a0a0c0] sm:max-w-3xl sm:text-lg">
                Add your specs, docs, screenshots, recordings, release notes, and common answers. Answerlattice prepares docs, FAQs, answer drafts, hosted help, and a page-aware widget for owner review, while tickets, changelogs, feedback, ratings, and feature requests stay owner-managed.
            </p>

            {/* CTAs */}
            <div className="relative mt-8 flex w-full max-w-[17rem] flex-col items-stretch justify-center gap-4 sm:max-w-none sm:flex-row sm:items-center">
                <AnswerlatticeLink
                    basePath={basePath}
                    href="/get-started"
                    data-answerlattice-event="hero_cta_clicked"
                    data-answerlattice-label="start_support_setup"
                    className="rounded-xl bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:bg-teal-800 hover:shadow-teal-500/40"
                >
                    Start support setup
                </AnswerlatticeLink>
                <AnswerlatticeLink
                    basePath={basePath}
                    href="/demo"
                    data-answerlattice-event="hero_cta_clicked"
                    data-answerlattice-label="try_page_aware_demo"
                    className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-center text-sm font-medium text-[#a0a0c0] transition-all hover:border-white/[0.2] hover:text-white"
                >
                    Try the page-aware demo
                </AnswerlatticeLink>
            </div>

            <AnswerlatticeLink
                basePath={basePath}
                href="/pre-onboarding"
                className="relative mt-4 inline-flex max-w-[17rem] items-center justify-center gap-2 rounded-full border border-teal-300/15 bg-teal-400/[0.055] px-4 py-2 text-center text-xs font-semibold text-teal-100 transition hover:border-teal-200/30 hover:text-white sm:max-w-none"
            >
                <LuFileInput aria-hidden size={14} />
                Prepare your product sources first
                <LuArrowRight aria-hidden size={14} />
            </AnswerlatticeLink>

            <div className="relative mt-8 flex w-full max-w-[17rem] flex-wrap justify-center gap-2 border-y border-white/[0.06] py-4 sm:max-w-4xl">
                {[
                    'Docs + FAQs',
                    'Answer drafts',
                    'Page-aware widget',
                    'Hosted help',
                    'Ticket fallback',
                    'Feedback signals',
                ].map((label) => (
                    <span key={label} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[#a0a0c0]">
                        {label}
                    </span>
                ))}
            </div>

            {/* Trust line */}
            <p className="relative mt-6 w-full max-w-[17rem] text-center text-xs leading-relaxed text-[#505070] sm:max-w-none">
                Built for solo founders, small SaaS teams, and studios closing the support layer before users arrive.
            </p>
        </section>
    );
}
