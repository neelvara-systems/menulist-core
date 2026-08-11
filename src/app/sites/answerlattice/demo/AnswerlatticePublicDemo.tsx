'use client';

import { useState } from 'react';
import {
    LuAlertTriangle,
    LuArrowRight,
    LuCheck,
    LuFileClock,
    LuGitCompare,
    LuHistory,
    LuRotateCcw,
    LuShieldCheck,
} from 'react-icons/lu';

const DEMO_STAGES = [
    {
        key: 'conflict',
        label: 'Source conflict',
        action: 'Prepare draft answer',
    },
    {
        key: 'proposal',
        label: 'Draft awaiting review',
        action: 'Approve sample answer',
    },
    {
        key: 'approved',
        label: 'Approved answer',
        action: 'Introduce release change',
    },
    {
        key: 'release',
        label: 'Release detected',
        action: 'Inspect affected support',
    },
    {
        key: 'fallback',
        label: 'Safe fallback',
        action: 'Approve corrected answer',
    },
    {
        key: 'updated',
        label: 'Answer updated',
        action: 'Run demo again',
    },
] as const;

const SURFACES = ['Billing widget', 'Hosted help', 'Agent context'];

export default function AnswerlatticePublicDemo() {
    const [stageIndex, setStageIndex] = useState(0);
    const stage = DEMO_STAGES[stageIndex];
    const isFinal = stageIndex === DEMO_STAGES.length - 1;
    const sourcePolicy = stageIndex >= 3 ? '5 calendar days' : '7 calendar days';

    const advance = () => {
        setStageIndex(current => isFinal ? 0 : current + 1);
    };

    return (
        <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.09] bg-[#0b0b1c] shadow-2xl shadow-black/30">
            <div className="border-b border-white/[0.07] px-4 py-4 sm:px-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-300">Seeded product simulation</p>
                        <p className="mt-2 text-lg font-semibold text-white">Can a customer request a refund after launch?</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setStageIndex(0)}
                        className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-white/[0.11] bg-white/[0.04] px-4 text-sm font-semibold text-[#c8c8dd] transition hover:border-white/[0.2] hover:text-white active:scale-[0.98] motion-reduce:transition-none lg:self-auto"
                    >
                        <LuRotateCcw aria-hidden="true" />
                        Reset
                    </button>
                </div>
            </div>

            <div className="grid min-w-0 lg:grid-cols-[15rem_minmax(0,1fr)]">
                <nav className="min-w-0 border-b border-white/[0.07] bg-white/[0.018] p-3 lg:border-b-0 lg:border-r lg:p-4" aria-label="Demo stages">
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                        {DEMO_STAGES.map((item, index) => {
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
                                        {complete ? <LuCheck aria-hidden="true" /> : index + 1}
                                    </span>
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </nav>

                <div className="min-w-0 p-4 sm:p-6 lg:p-8">
                    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
                        <div className="space-y-5">
                            <section aria-labelledby="demo-source-title">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <h2 id="demo-source-title" className="text-sm font-semibold text-white">Source evidence</h2>
                                    <span className="text-xs text-[#737391]">Two controlled sources</span>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <article className="rounded-2xl border border-amber-300/20 bg-amber-200/[0.05] p-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-amber-200">
                                            <LuFileClock aria-hidden="true" />
                                            Launch guide
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-[#dddded]">
                                            Refund requests are accepted within 14 calendar days of purchase.
                                        </p>
                                        <p className="mt-3 text-xs text-[#8f8faa]">Last verified for release 2.3</p>
                                    </article>
                                    <article className={`rounded-2xl border p-4 transition-colors motion-reduce:transition-none ${
                                        stageIndex >= 3
                                            ? 'border-rose-300/25 bg-rose-300/[0.06]'
                                            : 'border-teal-300/20 bg-teal-300/[0.05]'
                                    }`}>
                                        <div className={`flex items-center gap-2 text-xs font-semibold ${stageIndex >= 3 ? 'text-rose-200' : 'text-teal-200'}`}>
                                            <LuHistory aria-hidden="true" />
                                            Billing policy
                                        </div>
                                        <p className="mt-3 text-sm leading-6 text-[#dddded]">
                                            Current refund window: {sourcePolicy} from the payment date.
                                        </p>
                                        <p className="mt-3 text-xs text-[#8f8faa]">Bound to release {stageIndex >= 3 ? '2.5' : '2.4'}</p>
                                    </article>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-white/[0.09] bg-white/[0.025] p-5" aria-live="polite">
                                {stageIndex === 0 && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                                            <LuGitCompare aria-hidden="true" />
                                            Conflict blocked
                                        </div>
                                        <h3 className="mt-3 text-2xl font-semibold text-white">No answer is approved while sources disagree.</h3>
                                        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#a6a6c1]">
                                            AnswerLattice preserves both claims as evidence and prepares one draft answer for review. It does not guess which source is correct.
                                        </p>
                                    </>
                                )}

                                {stageIndex === 1 && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                                            <LuFileClock aria-hidden="true" />
                                            Pending human review
                                        </div>
                                        <h3 className="mt-3 text-2xl font-semibold text-white">Draft answer for review</h3>
                                        <p className="mt-3 rounded-xl border border-white/[0.08] bg-black/15 p-4 text-sm leading-6 text-[#e2e2ef]">
                                            Refund requests are accepted within 7 calendar days of purchase. Eligibility is confirmed against the payment record.
                                        </p>
                                        <p className="mt-3 text-xs text-[#8585a2]">Official source: billing policy. The conflicting launch guide remains attached for review.</p>
                                    </>
                                )}

                                {stageIndex === 2 && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                                            <LuShieldCheck aria-hidden="true" />
                                            Approved for release 2.4
                                        </div>
                                        <h3 className="mt-3 text-2xl font-semibold text-white">One reviewed answer now serves the widget, help center, and AI context.</h3>
                                        <p className="mt-3 rounded-xl border border-teal-300/20 bg-teal-300/[0.05] p-4 text-sm leading-6 text-[#e2e2ef]">
                                            Refund requests are accepted within 7 calendar days of purchase. Eligibility is confirmed against the payment record.
                                        </p>
                                        <p className="mt-3 text-xs text-[#8585a2]">Reviewed by product owner. Audit entry and source trace recorded.</p>
                                    </>
                                )}

                                {stageIndex === 3 && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-rose-200">
                                            <LuAlertTriangle aria-hidden="true" />
                                            Release 2.5 changed the policy
                                        </div>
                                        <h3 className="mt-3 text-2xl font-semibold text-white">The approved answer is now marked as drifted.</h3>
                                        <p className="mt-3 text-sm leading-6 text-[#a6a6c1]">
                                            The billing policy changed from 7 days to 5 days. AnswerLattice keeps the old answer visible to reviewers, stops it from acting as current guidance, and identifies every affected support path.
                                        </p>
                                    </>
                                )}

                                {stageIndex === 4 && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                                            <LuShieldCheck aria-hidden="true" />
                                            Safe fallback active
                                        </div>
                                        <h3 className="mt-3 text-2xl font-semibold text-white">The system refuses to repeat stale policy.</h3>
                                        <p className="mt-3 rounded-xl border border-amber-300/20 bg-amber-200/[0.05] p-4 text-sm leading-6 text-[#e2e2ef]">
                                            The refund answer is being reviewed after a policy change. Open Billing Help or create a support ticket for a confirmed answer.
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {SURFACES.map(surface => (
                                                <span key={surface} className="rounded-lg border border-white/[0.09] bg-white/[0.035] px-3 py-2 text-xs font-medium text-[#bdbdd2]">
                                                    {surface}
                                                </span>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {stageIndex === 5 && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm font-semibold text-teal-200">
                                            <LuShieldCheck aria-hidden="true" />
                                            Answer updated for release 2.5
                                        </div>
                                        <h3 className="mt-3 text-2xl font-semibold text-white">The corrected answer is approved and distributed.</h3>
                                        <p className="mt-3 rounded-xl border border-teal-300/20 bg-teal-300/[0.05] p-4 text-sm leading-6 text-[#e2e2ef]">
                                            Refund requests are accepted within 5 calendar days of purchase. Eligibility is confirmed against the payment record.
                                        </p>
                                        <p className="mt-3 text-xs text-[#8585a2]">New validation event recorded. The widget, help center, and AI context can use the current answer again.</p>
                                    </>
                                )}
                            </section>
                        </div>

                        <aside className="rounded-2xl border border-white/[0.08] bg-[#101026] p-5" aria-label="Answer review trace">
                            <p className="text-sm font-semibold text-white">Answer review trace</p>
                            <dl className="mt-5 space-y-4 text-sm">
                                <div className="border-b border-white/[0.07] pb-4">
                                    <dt className="text-xs text-[#737391]">Current state</dt>
                                    <dd className="mt-1 font-semibold text-white">{stage.label}</dd>
                                </div>
                                <div className="border-b border-white/[0.07] pb-4">
                                    <dt className="text-xs text-[#737391]">Official answer source</dt>
                                    <dd className="mt-1 text-[#d2d2e3]">{stageIndex === 0 ? 'No approved answer' : stageIndex >= 3 && stageIndex < 5 ? 'Review required' : 'Billing policy'}</dd>
                                </div>
                                <div className="border-b border-white/[0.07] pb-4">
                                    <dt className="text-xs text-[#737391]">Release binding</dt>
                                    <dd className="mt-1 text-[#d2d2e3]">{stageIndex >= 3 ? '2.5' : '2.4'}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-[#737391]">Audit evidence</dt>
                                    <dd className="mt-1 text-[#d2d2e3]">
                                        {stageIndex === 0
                                            ? 'Conflict preserved'
                                            : stageIndex === 1
                                                ? 'Draft created'
                                                : stageIndex < 3
                                                    ? 'Approval recorded'
                                                    : stageIndex < 5
                                                        ? 'Drift event recorded'
                                                        : 'Validation recorded'}
                                    </dd>
                                </div>
                            </dl>

                            <button
                                type="button"
                                onClick={advance}
                                data-answerlattice-event="demo_governance_step_advanced"
                                data-answerlattice-label={stage.key}
                                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white transition hover:bg-teal-600 active:scale-[0.98] motion-reduce:transition-none"
                            >
                                {stage.action}
                                {isFinal ? <LuRotateCcw aria-hidden="true" /> : <LuArrowRight aria-hidden="true" />}
                            </button>
                            <p className="mt-3 text-center text-xs leading-5 text-[#6f6f8c]">
                                No Firebase or AI provider call is made in this public demo.
                            </p>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}
