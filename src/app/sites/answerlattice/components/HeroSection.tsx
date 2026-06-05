import AnswerlatticeLink from './AnswerlatticeLink';
import AnswerlatticeAssetImage from './AnswerlatticeAssetImage';
import { ANSWERLATTICE_HOME_HERO_ASSET } from '../answerlatticeWebsiteAssets';
import {
    LuArrowRight,
    LuFileInput,
} from 'react-icons/lu';

const HERO_CHIPS = [
    'Page-aware widget',
    'Approved answers first',
    'Hosted help and FAQs',
    'Ticket fallback',
    'Feedback review',
    'Pre-Onboarding Kit',
    'Safe context',
];

export default function HeroSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="relative overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:pt-28">
            <div className="mx-auto grid min-h-[calc(78svh-4rem)] w-full min-w-0 max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
                <div className="relative min-w-0 text-center lg:text-left">
                    <div className="relative mb-6 inline-flex max-w-[18rem] items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-center sm:max-w-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
                        <span className="text-xs font-medium text-[#a0a0c0]">For founders shipping SaaS and digital products</span>
                    </div>

                    <h1 className="relative mx-auto w-full max-w-[17.5rem] break-words text-[2rem] font-bold leading-[1.08] tracking-tight sm:max-w-3xl sm:text-5xl lg:mx-0 lg:text-6xl">
                        <span className="block">Page-aware support answers </span>
                        <span className="answerlattice-hero-gradient mt-1 block">
                            <span className="block sm:inline">for SaaS and</span>
                            <span className="block sm:inline"> digital products.</span>
                        </span>
                    </h1>

                    <p className="relative mx-auto mt-6 w-full max-w-[18rem] text-base leading-relaxed text-[#a0a0c0] sm:max-w-2xl sm:text-lg lg:mx-0">
                        AnswerLattice turns product docs, FAQs, release notes, screenshots, recordings, support notes, and recurring questions into approved answers for your in-product widget, hosted help, and support review queue.
                    </p>

                    <div className="relative mx-auto mt-8 flex w-full max-w-[16rem] flex-col items-stretch justify-center gap-4 sm:max-w-none sm:flex-row sm:items-center lg:justify-start">
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
                            See page-aware demo
                        </AnswerlatticeLink>
                    </div>

                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/pre-onboarding"
                        className="relative mt-4 inline-flex max-w-[16rem] items-center justify-center gap-2 rounded-full border border-teal-300/20 bg-teal-400/[0.055] px-4 py-2 text-center text-xs font-semibold text-teal-100 transition hover:border-teal-200/30 hover:text-white sm:max-w-none"
                    >
                        <LuFileInput aria-hidden size={14} />
                        Prepare product sources first
                        <LuArrowRight aria-hidden size={14} />
                    </AnswerlatticeLink>

                    <div className="relative mx-auto mt-8 flex w-full max-w-[16rem] flex-wrap justify-center gap-2 border-y border-white/[0.06] py-4 sm:max-w-3xl lg:mx-0 lg:justify-start">
                        {HERO_CHIPS.map((label) => (
                            <span key={label} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-[#a0a0c0]">
                                {label}
                            </span>
                        ))}
                    </div>

                    <p className="relative mx-auto mt-6 w-full max-w-[18rem] text-xs leading-relaxed text-[#505070] sm:max-w-xl lg:mx-0">
                        Built for solo founders, small product teams, and studios that need credible support before hiring a support desk.
                    </p>
                </div>

                <article className="relative mx-auto min-w-0 w-full max-w-full rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:max-w-2xl lg:max-w-none" aria-label="Sample AnswerLattice workspace preview">
                    <AnswerlatticeAssetImage
                        asset={ANSWERLATTICE_HOME_HERO_ASSET}
                        priority
                        className="rounded-[1.5rem] border border-white/[0.08]"
                    />
                </article>
            </div>
        </section>
    );
}
