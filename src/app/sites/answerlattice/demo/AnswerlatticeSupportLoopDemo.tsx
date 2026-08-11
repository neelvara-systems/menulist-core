'use client';

import { useState } from 'react';
import {
    LuAlertTriangle,
    LuArrowRight,
    LuCheck,
    LuHelpCircle,
    LuRotateCcw,
    LuShieldCheck,
    LuTicket,
} from 'react-icons/lu';

const SUPPORT_DEMO_STAGES = [
    { key: 'known-question', label: 'Known question', action: 'Serve approved answer' },
    { key: 'approved-answer', label: 'Approved answer', action: 'Ask an uncovered question' },
    { key: 'missing-evidence', label: 'Missing evidence', action: 'Open safe fallback' },
    { key: 'safe-fallback', label: 'Safe fallback', action: 'Open founder review' },
    { key: 'founder-review', label: 'Founder review', action: 'Approve and test' },
    { key: 'tested-improvement', label: 'Tested improvement', action: 'Run demo again' },
] as const;

const CONTEXT_ROWS = [
    ['Product page', 'Billing settings'],
    ['Plan', 'Starter'],
    ['User role', 'Account owner'],
    ['Approved source', 'Billing policy'],
] as const;

export default function AnswerlatticeSupportLoopDemo() {
    const [stageIndex, setStageIndex] = useState(0);
    const stage = SUPPORT_DEMO_STAGES[stageIndex];
    const isFinal = stageIndex === SUPPORT_DEMO_STAGES.length - 1;

    const advance = () => {
        setStageIndex((current) => isFinal ? 0 : current + 1);
    };

    return (
        <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-[#0b0b1c] shadow-2xl shadow-black/30">
            <div className="border-b border-white/[0.07] px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Seeded support simulation</p>
                        <p className="mt-2 text-lg font-semibold text-white">From repeated question to reviewed support answer</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setStageIndex(0)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/[0.11] bg-white/[0.04] px-4 text-sm font-semibold text-[#c8c8dd] transition hover:border-white/[0.2] hover:text-white active:scale-[0.98] motion-reduce:transition-none lg:self-auto"
                    >
                        <LuRotateCcw aria-hidden />
                        Reset
                    </button>
                </div>
            </div>

            <div className="grid min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
                <nav className="min-w-0 border-b border-white/[0.07] bg-white/[0.018] p-3 lg:border-b-0 lg:border-r lg:p-4" aria-label="Support-loop demo stages">
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                        {SUPPORT_DEMO_STAGES.map((item, index) => {
                            const active = index === stageIndex;
                            const complete = index < stageIndex;

                            return (
                                <button
                                    key={item.key}
                                    type="button"
                                    onClick={() => setStageIndex(index)}
                                    aria-current={active ? 'step' : undefined}
                                    className={`flex min-h-11 min-w-[10.5rem] items-center gap-3 rounded-xl px-3 text-left text-sm transition active:scale-[0.98] motion-reduce:transition-none lg:min-w-0 ${
                                        active
                                            ? 'bg-teal-400/[0.12] font-semibold text-white ring-1 ring-inset ring-teal-300/25'
                                            : 'text-[#8989a7] hover:bg-white/[0.04] hover:text-white'
                                    }`}
                                >
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                                        complete
                                            ? 'border-teal-300/30 bg-teal-400/[0.12] text-teal-200'
                                            : active
                                                ? 'border-teal-300/35 text-teal-200'
                                                : 'border-white/[0.09] text-[#686885]'
                                    }`}>
                                        {complete ? <LuCheck aria-hidden /> : index + 1}
                                    </span>
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <div className="min-w-0 p-4 sm:p-6 lg:p-8">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
                        <section className="min-h-[28rem] rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5 sm:p-6" aria-live="polite">
                            {stageIndex === 0 && (
                                <>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                                        <LuHelpCircle aria-hidden />
                                        User question
                                    </div>
                                    <h2 className="mt-4 text-2xl font-semibold text-white">“Why can&apos;t I change my plan?”</h2>
                                    <p className="mt-4 text-sm leading-6 text-[#a6a6c1]">
                                        The widget receives safe, allowlisted context from the client product. It does not inspect the raw page or unrestricted application state.
                                    </p>
                                    <div className="mt-6 rounded-xl border border-white/[0.08] bg-black/15 p-4 text-sm text-[#dddded]">
                                        Billing settings · Starter plan · Account owner
                                    </div>
                                </>
                            )}

                            {stageIndex === 1 && (
                                <>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                                        <LuShieldCheck aria-hidden />
                                        Approved answer
                                    </div>
                                    <h2 className="mt-4 text-2xl font-semibold text-white">The answer is supported and applicable.</h2>
                                    <p className="mt-4 rounded-xl border border-teal-300/20 bg-teal-300/[0.05] p-4 text-sm leading-6 text-[#e2e2ef]">
                                        Only an account owner can change the workspace plan. Open Billing settings while signed in with the owner role.
                                    </p>
                                    <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-white/[0.07] p-3">
                                            <dt className="text-xs text-[#737391]">Supporting source</dt>
                                            <dd className="mt-1 text-sm font-medium text-white">Billing policy, section 4</dd>
                                        </div>
                                        <div className="rounded-xl border border-white/[0.07] p-3">
                                            <dt className="text-xs text-[#737391]">Applicability</dt>
                                            <dd className="mt-1 text-sm font-medium text-white">Starter · Account owner</dd>
                                        </div>
                                    </dl>
                                </>
                            )}

                            {stageIndex === 2 && (
                                <>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                                        <LuAlertTriangle aria-hidden />
                                        No approved evidence
                                    </div>
                                    <h2 className="mt-4 text-2xl font-semibold text-white">“Can I pause my subscription for two months?”</h2>
                                    <p className="mt-4 text-sm leading-6 text-[#a6a6c1]">
                                        Related billing content exists, but none of it approves a pause policy for this plan. AnswerLattice does not convert a plausible inference into official guidance.
                                    </p>
                                    <div className="mt-6 rounded-xl border border-amber-300/20 bg-amber-200/[0.05] p-4 text-sm leading-6 text-[#e2e2ef]">
                                        Coverage status: missing. Required next step: clarification or configured support fallback.
                                    </div>
                                </>
                            )}

                            {stageIndex === 3 && (
                                <>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                                        <LuTicket aria-hidden />
                                        Safe fallback
                                    </div>
                                    <h2 className="mt-4 text-2xl font-semibold text-white">The user gets a path without receiving an invented policy.</h2>
                                    <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-200/[0.05] p-4 text-sm leading-6 text-[#e2e2ef]">
                                        We do not have an approved answer for subscription pauses. Send this question to support for a confirmed answer.
                                    </p>
                                    <p className="mt-4 text-sm leading-6 text-[#a6a6c1]">
                                        The handoff can include the question, safe product context, and the answer path already attempted.
                                    </p>
                                </>
                            )}

                            {stageIndex === 4 && (
                                <>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                                        <LuShieldCheck aria-hidden />
                                        Founder review
                                    </div>
                                    <h2 className="mt-4 text-2xl font-semibold text-white">One repeated gap becomes controlled review work.</h2>
                                    <div className="mt-5 space-y-3">
                                        {[
                                            'Three related questions are linked to the same missing policy.',
                                            'A candidate answer stays in draft until the founder reviews the source.',
                                            'The founder can edit, approve, or reject the draft answer.',
                                        ].map((item) => (
                                            <div key={item} className="flex gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-3 text-sm leading-6 text-[#d6d6ef]">
                                                <LuCheck className="mt-1 shrink-0 text-teal-300" aria-hidden />
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {stageIndex === 5 && (
                                <>
                                    <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                                        <LuShieldCheck aria-hidden />
                                        Approved and tested
                                    </div>
                                    <h2 className="mt-4 text-2xl font-semibold text-white">The next user receives reviewed guidance.</h2>
                                    <p className="mt-4 rounded-xl border border-teal-300/20 bg-teal-300/[0.05] p-4 text-sm leading-6 text-[#e2e2ef]">
                                        Subscription pauses are not available on the Starter plan. Contact support before cancelling if you need help preserving your workspace.
                                    </p>
                                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                                        {['Founder approved', 'Answer Test passed', 'Widget and hosted help ready'].map((item) => (
                                            <div key={item} className="rounded-xl border border-white/[0.07] p-3 text-center text-xs font-semibold text-[#d6d6ef]">
                                                {item}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </section>

                        <aside className="self-start rounded-2xl border border-white/[0.08] bg-[#101026] p-5" aria-label="Support-loop trace">
                            <p className="text-sm font-semibold text-white">Support-loop trace</p>
                            <dl className="mt-5 space-y-4 text-sm">
                                <div className="border-b border-white/[0.07] pb-4">
                                    <dt className="text-xs text-[#737391]">Current stage</dt>
                                    <dd className="mt-1 font-semibold text-white">{stage.label}</dd>
                                </div>
                                {CONTEXT_ROWS.map(([label, value]) => (
                                    <div key={label} className="border-b border-white/[0.07] pb-4 last:border-0">
                                        <dt className="text-xs text-[#737391]">{label}</dt>
                                        <dd className="mt-1 text-[#d2d2e3]">{value}</dd>
                                    </div>
                                ))}
                            </dl>

                            <button
                                type="button"
                                onClick={advance}
                                data-answerlattice-event="demo_support_loop_step_advanced"
                                data-answerlattice-label={stage.key}
                                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-600 active:scale-[0.98] motion-reduce:transition-none"
                            >
                                {stage.action}
                                {isFinal ? <LuRotateCcw aria-hidden /> : <LuArrowRight aria-hidden />}
                            </button>
                            <p className="mt-3 text-center text-xs leading-5 text-[#6f6f8c]">
                                Sample content only. No Firebase or AI provider call is made in this public demo.
                            </p>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}
