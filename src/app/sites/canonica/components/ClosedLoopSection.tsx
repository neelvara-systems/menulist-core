import { CanonicaLoopDiagram } from './CanonicaFlowDiagram';
import SectionHeader from './SectionHeader';

const LOOP_STEPS = [
    {
        title: 'User asks from a product page',
        detail: 'The widget receives safe page, route, workflow, role, or plan context.',
    },
    {
        title: 'Canonica checks approved answers',
        detail: 'Reviewed support knowledge wins before fallback or generated assistance.',
    },
    {
        title: 'The user gets the right answer',
        detail: 'If coverage exists, the response is grounded in the current page and approved content.',
    },
    {
        title: 'Ticket fallback opens when missing',
        detail: 'Unknown questions can still help the user, but they are marked as gaps.',
    },
    {
        title: 'Repeated misses become review items',
        detail: 'Fallback, tickets, low confidence, and negative feedback become signal review, board follow-up, or proposals.',
    },
    {
        title: 'You approve the fix',
        detail: 'The next user gets the improved approved answer instead of repeating the same gap.',
    },
];

const APPROVAL_POINTS = [
    ['Drafts are assistive', 'Canonica can prepare answer drafts from recurring gaps, but drafts are not official answers.'],
    ['Humans approve authority', 'Owners review proposed changes before they become approved answers.'],
    ['Drift stays visible', 'Release changes and stale-answer risk become review work instead of silent support debt.'],
];

export default function ClosedLoopSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-20">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    className="mb-12"
                    eyebrow="Learning loop"
                    title="Every missed question becomes a support fix."
                    description="Canonica’s aha moment is not that a widget answers questions. It is that page-aware questions, fallback, tickets, private board notes, and feedback become review work that improves future answers."
                />

                <CanonicaLoopDiagram idPrefix="cn-closed-loop" items={LOOP_STEPS} />

                <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                    <article className="rounded-2xl border border-teal-500/20 bg-teal-500/[0.06] p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-200">
                            Best demo flow
                        </p>
                        <h3 className="text-2xl font-semibold text-white">Billing page, missing answer, reviewed fix.</h3>
                        <p className="mt-4 text-sm leading-relaxed text-[#d6d6ef]">
                            Open billing, ask why an invoice failed, receive an approved billing answer. Ask something uncovered, and that miss can become a review signal or private Support Board card. Once approved, the future user gets the improved answer.
                        </p>
                    </article>
                    <div className="grid gap-3 md:grid-cols-3">
                        {APPROVAL_POINTS.map(([title, detail]) => (
                            <article key={title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                <h3 className="text-base font-semibold text-white">{title}</h3>
                                <p className="mt-3 text-sm leading-relaxed text-[#808099]">{detail}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
