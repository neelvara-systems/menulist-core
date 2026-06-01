import AnswerlatticeLink from './AnswerlatticeLink';
import {
    LuArrowRight,
    LuCheckCircle,
    LuFileInput,
    LuMessageSquare,
    LuShieldCheck,
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

const HERO_CONTEXT = [
    ['User screen', 'Billing / Invoices'],
    ['Question', 'Why was I charged today?'],
    ['Answer source', 'Approved billing answer'],
    ['Fallback path', 'Ticket and review signal'],
];

const HERO_QUEUE = [
    ['Invoice retry confusion', 'Draft answer'],
    ['Usage-limit release', 'Drift review'],
    ['Team role billing scope', 'Owner approval'],
];

export default function HeroSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="relative overflow-hidden px-4 pb-10 pt-24 sm:px-6 lg:pt-28">
            <div className="mx-auto grid min-h-[calc(78svh-4rem)] w-full min-w-0 max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
                <div className="relative min-w-0 text-center lg:text-left">
                    <div className="relative mb-6 inline-flex max-w-[18rem] items-center justify-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-center sm:max-w-none">
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
                        <span className="text-xs font-medium text-[#a0a0c0]">For SaaS founders before a support team</span>
                    </div>

                    <h1 className="relative mx-auto w-full max-w-[17.5rem] break-words text-[2rem] font-bold leading-[1.08] tracking-tight sm:max-w-3xl sm:text-5xl lg:mx-0 lg:text-6xl">
                        <span className="block">Give every SaaS page </span>
                        <span className="answerlattice-hero-gradient mt-1 block">
                            <span className="block sm:inline">the right</span>
                            <span className="block sm:inline"> support answer.</span>
                        </span>
                    </h1>

                    <p className="relative mx-auto mt-6 w-full max-w-[18rem] text-base leading-relaxed text-[#a0a0c0] sm:max-w-2xl sm:text-lg lg:mx-0">
                        Answerlattice turns product docs, FAQs, release notes, screenshots, recordings, and repeated questions into approved answers for your app widget, hosted help, and support review queue.
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
                        Built for solo founders, small SaaS teams, and studios that need credible support before hiring a support desk.
                    </p>
                </div>

                <article className="relative mx-auto min-w-0 w-full max-w-full rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:max-w-2xl lg:max-w-none" aria-label="Sample Answerlattice workspace preview">
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0d0d22]">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.025] px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                                <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                                <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
                            </div>
                            <span className="rounded-full border border-white/[0.08] bg-[#070714] px-3 py-1 text-xs font-semibold text-[#a0a0c0]">
                                Sample workspace
                            </span>
                        </div>

                        <div className="grid min-w-0 gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_18rem]">
                            <div className="min-w-0 space-y-4">
                                <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Page-aware answer</div>
                                            <h2 className="mt-1 text-xl font-semibold text-white">Billing page support</h2>
                                        </div>
                                        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-teal-300/20 bg-teal-400/[0.08] text-teal-100">
                                            <LuMessageSquare aria-hidden size={17} />
                                        </span>
                                    </div>
                                    <div className="rounded-2xl border border-white/[0.06] bg-[#070714] p-4">
                                        <p className="text-sm font-semibold text-white">Why was I charged today?</p>
                                        <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">
                                            This page uses the approved billing answer, links the invoice FAQ, and flags any missing follow-up as review work.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {['Approved', 'FAQ linked', 'Release aware'].map((label) => (
                                                <span key={label} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-[#d6d6ef]">
                                                    {label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2">
                                    {HERO_CONTEXT.map(([label, value]) => (
                                        <div key={label} className="rounded-2xl border border-white/[0.06] bg-[#101028] p-4">
                                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#6b6b8a]">{label}</div>
                                            <div className="mt-1 text-sm font-semibold text-[#eeeeff]">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="min-w-0 space-y-4">
                                <div className="rounded-2xl border border-teal-300/20 bg-teal-400/[0.055] p-5">
                                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-100">
                                        <LuShieldCheck aria-hidden size={14} />
                                        Runtime controls
                                    </div>
                                    <div className="space-y-3">
                                        {['Allowed origin', 'Blocked routes', 'Safe page context'].map((label) => (
                                            <div key={label} className="flex items-center gap-2 text-sm text-[#d6d6ef]">
                                                <LuCheckCircle aria-hidden className="shrink-0 text-teal-200" size={16} />
                                                <span>{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                    <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Review queue</div>
                                    <div className="space-y-3">
                                        {HERO_QUEUE.map(([title, status]) => (
                                            <div key={title} className="rounded-xl border border-white/[0.06] bg-[#070714] p-3">
                                                <div className="text-sm font-semibold text-white">{title}</div>
                                                <div className="mt-2 inline-flex rounded-full bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-200">
                                                    {status}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </article>
            </div>
        </section>
    );
}
