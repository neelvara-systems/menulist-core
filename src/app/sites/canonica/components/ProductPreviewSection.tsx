const LAUNCH_ITEMS = [
    ['Product profile', 'Complete'],
    ['Knowledge import', 'In review'],
    ['Product surfaces', 'Live'],
    ['Widget install', 'Verified'],
];

const GOVERNANCE_ROWS = [
    ['Billing invoices', 'Canonical answer', 'Ready'],
    ['Plan downgrade', 'Drift check', 'Review'],
    ['Webhook errors', 'Signal queue', 'Draft'],
];

export default function ProductPreviewSection() {
    return (
        <section className="border-y border-white/[0.06] bg-white/[0.01] px-6 py-20">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
                <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Product Preview
                    </p>
                    <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                        The dashboard is built around launch, support, and governance.
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                        Canonica gives owners the parts that matter: launch readiness, page-aware widget context, and a queue for answers that need review.
                    </p>
                    <div className="mt-6 grid gap-3 text-sm text-[#808099] sm:grid-cols-2">
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                            <div className="font-semibold text-white">No collection scans for readiness</div>
                            <p className="mt-1">Activation and governance cards read compact summary docs.</p>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                            <div className="font-semibold text-white">Owner approval stays central</div>
                            <p className="mt-1">Generated drafts remain review work, not automatic publishing.</p>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-4 shadow-2xl shadow-black/20">
                        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <span className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Activation</span>
                            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300">78% ready</span>
                        </div>
                        <div className="space-y-3">
                            {LAUNCH_ITEMS.map(([label, state]) => (
                                <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                                    <span className="text-sm text-[#d6d6ef]">{label}</span>
                                    <span className="text-xs text-[#808099]">{state}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-4 shadow-2xl shadow-black/20">
                        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <span className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Widget</span>
                            <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold text-indigo-300">billing_invoices</span>
                        </div>
                        <div className="rounded-xl border border-white/[0.06] bg-[#0b0b1e] p-4">
                            <div className="text-sm font-semibold text-white">Need help with this invoice?</div>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">
                                Canonica found an approved billing answer and two related release notes for this page.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-[#a0a0c0]">Canonical</span>
                                <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-xs text-[#a0a0c0]">Plan scope</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-4 shadow-2xl shadow-black/20 md:col-span-2">
                        <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                            <span className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Governance Queue</span>
                            <span className="text-xs text-[#808099]">3 items</span>
                        </div>
                        <div className="grid gap-2">
                            {GOVERNANCE_ROWS.map(([entity, source, state]) => (
                                <div key={entity} className="grid gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm sm:grid-cols-[1fr_1fr_auto]">
                                    <span className="font-medium text-white">{entity}</span>
                                    <span className="text-[#808099]">{source}</span>
                                    <span className="text-indigo-300">{state}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

