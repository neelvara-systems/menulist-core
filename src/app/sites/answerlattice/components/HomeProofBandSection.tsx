import {
    LuBookOpen,
    LuCalculator,
    LuCode2,
    LuFileInput,
    LuMessageSquare,
    LuShieldCheck,
    LuTicket,
} from 'react-icons/lu';
import type { IconType } from 'react-icons';
import AnswerlatticeLink from './AnswerlatticeLink';

type ProofPoint = {
    icon: IconType;
    title: string;
    detail: string;
};

const PROOF_POINTS: ProofPoint[] = [
    {
        icon: LuMessageSquare,
        title: 'Users ask from the exact app page',
        detail: 'Billing, onboarding, settings, releases, and error screens can each get different support context.',
    },
    {
        icon: LuShieldCheck,
        title: 'Approved answers win before fallback',
        detail: 'Official support stays reviewable instead of depending on an open-ended chat reply.',
    },
    {
        icon: LuBookOpen,
        title: 'Scattered knowledge becomes one support structure',
        detail: 'The same structured support knowledge can become public help pages, in-app answers, and review workflows.',
    },
    {
        icon: LuTicket,
        title: 'Tickets and feedback become support gaps',
        detail: 'Missed questions, low ratings, and repeated fallback are routed into owner review work.',
    },
    {
        icon: LuCode2,
        title: 'Developers get one widget path',
        detail: 'Allowed origins, blocked routes, safe page hints, and install checks keep runtime setup practical.',
    },
    {
        icon: LuFileInput,
        title: 'Messy sources get a preparation path',
        detail: 'Docs, files, screenshots, recordings, owner notes, and release updates can be packaged before setup.',
    },
];

const PROOF_LINKS = [
    { href: '/demo', label: 'Static demo' },
    { href: '/proof', label: 'Proof pack' },
    { href: '/roi-calculator', label: 'ROI calculator' },
    { href: '/security-one-pager', label: 'Security one-pager' },
];

export default function HomeProofBandSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="border-y border-white/[0.06] bg-white/[0.012] px-4 py-12 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--al-primary-light)]">
                            Why founders choose it
                        </p>
                        <h2 className="text-2xl font-bold leading-tight text-white sm:text-3xl">
                            Specific answers, reviewed knowledge, visible gaps, and a practical install path.
                        </h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {PROOF_LINKS.map((link) => (
                            <AnswerlatticeLink
                                key={link.href}
                                basePath={basePath}
                                href={link.href}
                                className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-xs font-semibold text-[#d6d6ef] transition hover:border-teal-200/30 hover:text-white"
                            >
                                {link.label}
                            </AnswerlatticeLink>
                        ))}
                    </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {PROOF_POINTS.map((point) => {
                        const Icon = point.icon;
                        return (
                            <article key={point.title} className="rounded-2xl border border-white/[0.06] bg-[#101028]/80 p-5">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-teal-200/10 bg-teal-300/[0.07] text-teal-200">
                                    <Icon aria-hidden size={18} />
                                </span>
                                <h3 className="mt-4 text-base font-semibold leading-snug text-white">{point.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#8f8faa]">{point.detail}</p>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-teal-300/20 bg-teal-400/[0.045] p-5 text-sm leading-relaxed text-[#d6d6ef] sm:flex-row sm:items-center sm:justify-between">
                    <p>
                        Evaluate AnswerLattice through concrete product proof: demo, preview screens, install verifier, ROI calculator, proof pack, and security handoff.
                    </p>
                    <LuCalculator aria-hidden className="hidden shrink-0 text-teal-200 sm:block" size={24} />
                </div>
            </div>
        </section>
    );
}
