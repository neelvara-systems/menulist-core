import SectionHeader from './SectionHeader';

const COMPARISON_ROWS = [
    {
        feature: 'Answers user questions',
        chatbot: 'Yes, usually generated',
        helpdesk: 'Agent-led',
        kb: 'Search and articles',
        answerlattice: 'Yes, with approved answers before fallback',
    },
    {
        feature: 'Uses product-page context',
        chatbot: 'Rarely',
        helpdesk: 'No',
        kb: 'No',
        answerlattice: 'Yes: route, workflow, role, plan, and surface context',
    },
    {
        feature: 'Serves approved answers first',
        chatbot: 'Usually no',
        helpdesk: 'Agent-dependent',
        kb: 'Static docs',
        answerlattice: 'Yes: approved answers are authoritative after review',
    },
    {
        feature: 'Detects stale support',
        chatbot: 'No',
        helpdesk: 'Manual',
        kb: 'Manual',
        answerlattice: 'Yes: stale-answer and release-impact review',
    },
    {
        feature: 'Turns misses into knowledge tasks',
        chatbot: 'No',
        helpdesk: 'Manual ticket review',
        kb: 'No',
        answerlattice: 'Yes: fallback, feedback, and tickets become signals',
    },
    {
        feature: 'Tracks support coverage',
        chatbot: 'Conversation metrics',
        helpdesk: 'Ticket metrics',
        kb: 'Article counts',
        answerlattice: 'Coverage, readiness, stale-answer pressure, and failing surfaces',
    },
    {
        feature: 'Human approval before truth',
        chatbot: 'Weak',
        helpdesk: 'Manual by agents',
        kb: 'Manual publishing',
        answerlattice: 'Reviewed drafts and proposals before authority',
    },
    {
        feature: 'Helps after releases',
        chatbot: 'Old answers can remain live',
        helpdesk: 'Tickets increase',
        kb: 'Docs become stale',
        answerlattice: 'Flags stale answers and affected support content',
    },
];

export default function ComparisonSection() {
    return (
        <section className="border-t border-white/[0.06] px-6 py-24">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    className="mb-12"
                    eyebrow="Why AnswerLattice"
                    title="Widget, help center, tickets, and docs should not disagree."
                    description="AnswerLattice turns scattered product knowledge into the standard support knowledge behind your help center, widget, tickets, release notes, and future AI agents."
                />

                {/* Comparison table */}
                <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
                    <div className="min-w-[980px]">
                        {/* Header */}
                        <div className="grid grid-cols-5 border-b border-white/[0.06] bg-white/[0.03]">
                            <div className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                Capability
                            </div>
                            <div className="border-l border-white/[0.06] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                AI chatbot
                            </div>
                            <div className="border-l border-white/[0.06] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                Helpdesk
                            </div>
                            <div className="border-l border-white/[0.06] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-[#6b6b8a]">
                                Knowledge base
                            </div>
                            <div className="border-l border-white/[0.06] bg-teal-500/[0.05] px-6 py-4 text-xs font-semibold uppercase tracking-wider text-teal-300">
                                AnswerLattice
                            </div>
                        </div>

                        {/* Rows */}
                        {COMPARISON_ROWS.map((row, i) => (
                            <div
                                key={i}
                                className="grid grid-cols-5 border-b border-white/[0.04] last:border-b-0"
                            >
                                <div className="px-6 py-4 text-sm font-medium text-white">
                                    {row.feature}
                                </div>
                                <div className="border-l border-white/[0.06] px-6 py-4 text-sm text-[#6b6b8a]">
                                    {row.chatbot}
                                </div>
                                <div className="border-l border-white/[0.06] px-6 py-4 text-sm text-[#6b6b8a]">
                                    {row.helpdesk}
                                </div>
                                <div className="border-l border-white/[0.06] px-6 py-4 text-sm text-[#6b6b8a]">
                                    {row.kb}
                                </div>
                                <div className="border-l border-white/[0.06] bg-teal-500/[0.03] px-6 py-4 text-sm text-[#a0a0c0]">
                                    {row.answerlattice}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
