const LOOP_STEPS = [
    {
        title: 'User asks on a product page',
        detail: 'The widget receives safe page, route, workflow, role, or plan context.',
    },
    {
        title: 'Approved answer is served first',
        detail: 'Canonical support truth wins before fallback or generated assistance.',
    },
    {
        title: 'Fallback only when coverage is missing',
        detail: 'Unknown questions can still help the user, but they are marked as gaps.',
    },
    {
        title: 'Miss becomes a signal',
        detail: 'Repeated fallback, tickets, low confidence, and negative feedback are grouped for review.',
    },
    {
        title: 'Owner approves the fix',
        detail: 'Drafts and proposals stay review work until a human makes them authoritative.',
    },
    {
        title: 'Future users get the canonical answer',
        detail: 'The same scoped product truth is served the next time that page-level question appears.',
    },
];

const APPROVAL_POINTS = [
    ['Drafts are assistive', 'Canonica can prepare answer drafts from recurring gaps, but drafts are not official support truth.'],
    ['Humans approve authority', 'Owners review proposed changes before they become canonical answers.'],
    ['Drift stays visible', 'Release changes and stale-answer risk become review work instead of silent support debt.'],
];

export default function ClosedLoopSection() {
    return (
        <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <div className="mb-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                            Support truth loop
                        </p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                            From support question to better product knowledge.
                        </h2>
                    </div>
                    <p className="text-base leading-relaxed text-[#a0a0c0]">
                        Canonica’s aha moment is not that a widget answers questions. It is that page-aware questions, fallback, tickets, and feedback become a governed loop for improving approved support truth.
                    </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-6">
                    {LOOP_STEPS.map((step, index) => (
                        <article
                            key={step.title}
                            className="relative rounded-2xl border border-white/[0.06] bg-[#101028] p-4"
                        >
                            <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-300">
                                {String(index + 1).padStart(2, '0')}
                            </div>
                            <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                            <p className="mt-2 text-xs leading-relaxed text-[#808099]">{step.detail}</p>
                        </article>
                    ))}
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                    <article className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.06] p-6">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-300">
                            Best demo flow
                        </p>
                        <h3 className="text-2xl font-semibold text-white">Billing page, missing answer, reviewed fix.</h3>
                        <p className="mt-4 text-sm leading-relaxed text-[#d6d6ef]">
                            Open billing, ask why an invoice failed, receive an approved billing answer. Ask something uncovered, and that miss becomes a reviewable signal. Once approved, the future user gets the canonical answer.
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
