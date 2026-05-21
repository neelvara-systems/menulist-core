const COMPARISON_ROWS = [
    {
        feature: 'Primary job',
        traditional: 'Inbox, article storage, or generated replies',
        canonica: 'Approved support truth that other surfaces use',
    },
    {
        feature: 'Small-team setup',
        traditional: 'Many settings before value appears',
        canonica: 'Product details, import, widget, verify',
    },
    {
        feature: 'Page relevance',
        traditional: 'Same help everywhere',
        canonica: 'Route and product-surface context shapes the answer',
    },
    {
        feature: 'Release changes',
        traditional: 'Docs become stale silently',
        canonica: 'Changelogs and drift checks surface review work',
    },
    {
        feature: 'Answer authority',
        traditional: 'Generation or article search is treated as enough',
        canonica: 'Canonical answers first; fallback is measured',
    },
    {
        feature: 'Support gaps',
        traditional: 'Buried in chat logs or tickets',
        canonica: 'Repeated gaps become a reviewable knowledge queue',
    },
    {
        feature: 'Founder visibility',
        traditional: 'Ticket volume and chat metrics',
        canonica: 'Canonical coverage and surfaces that need answers',
    },
    {
        feature: 'Scope creep',
        traditional: 'Expands into helpdesk or CMS features',
        canonica: 'Knowledge control plane; operations stay secondary',
    },
];

export default function ComparisonSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-4xl">
                <div className="mb-12 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Why Canonica
                    </p>
                    <h2 className="text-3xl font-bold sm:text-4xl">
                        Helpdesks handle conversations. Canonica keeps answers correct.
                    </h2>
                    <p className="mt-4 text-lg text-[#a0a0c0]">
                        It sits behind your help center, widget, tickets, and release notes as the governed knowledge layer.
                    </p>
                </div>

                {/* Comparison table */}
                <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
                    <div className="min-w-[720px]">
                        {/* Header */}
                        <div className="grid grid-cols-3 border-b border-white/[0.06] bg-white/[0.03]">
                            <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                Capability
                            </div>
                            <div className="border-l border-white/[0.06] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                Helpdesk / Chatbot / KB
                            </div>
                            <div className="border-l border-white/[0.06] bg-indigo-500/[0.05] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-indigo-400">
                                Canonica
                            </div>
                        </div>

                        {/* Rows */}
                        {COMPARISON_ROWS.map((row, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-3 border-b border-white/[0.04] last:border-b-0"
                            >
                                <div className="px-6 py-4 text-sm font-medium text-white">
                                    {row.feature}
                                </div>
                                <div className="border-l border-white/[0.06] px-6 py-4 text-sm text-[#6b6b8a]">
                                    {row.traditional}
                                </div>
                                <div className="border-l border-white/[0.06] bg-indigo-500/[0.03] px-6 py-4 text-sm text-[#a0a0c0]">
                                    {row.canonica}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
