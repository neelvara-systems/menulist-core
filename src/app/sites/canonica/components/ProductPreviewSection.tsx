const ACTIVATION_ITEMS = [
    ['Product profile', 'Complete', 'Company, product, support email'],
    ['Knowledge import', 'In review', 'Docs, FAQ, release notes'],
    ['Product surfaces', 'Live', 'Billing, onboarding, team settings'],
    ['Widget install', 'Verified', 'Origin, route, context check'],
];

const SURFACE_ROWS = [
    ['billing_invoices', '3 answers', '2 FAQs', '1 release'],
    ['team_settings', '2 answers', '1 FAQ', '0 releases'],
    ['onboarding_checklist', '4 answers', '3 FAQs', '2 releases'],
];

const QUEUE_ROWS = [
    ['Billing downgrade question', 'Signal cluster', 'Draft answer'],
    ['Invoice retry confusion', 'Ticket fallback', 'Needs review'],
    ['Webhook setup guide', 'Article drift', 'Review copy'],
];

const SCREEN_TABS = ['Activation', 'Surfaces', 'Widget', 'Governance'];

export default function ProductPreviewSection() {
    return (
        <section className="relative overflow-hidden border-y border-white/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(30,206,255,0.11),transparent_34%),rgba(255,255,255,0.01)] px-4 py-16 sm:px-6 lg:py-20">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto mb-10 max-w-3xl text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Product proof
                    </p>
                    <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                        One operator view from setup to governed answers.
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-[#a0a0c0] sm:text-lg">
                        Canonica feels like a support cockpit: install readiness, page surfaces, widget behavior, tickets as fallback, and review work stay connected.
                    </p>
                </div>

                <div className="mb-8 flex gap-2 overflow-x-auto pb-2 sm:justify-center">
                    {SCREEN_TABS.map((tab, index) => (
                        <span
                            key={tab}
                            className={`whitespace-nowrap rounded-full border px-5 py-2.5 text-sm font-semibold ${
                                index === 0
                                    ? 'border-white/20 bg-white/[0.13] text-white shadow-lg shadow-indigo-500/10'
                                    : 'border-transparent bg-white/[0.03] text-[#8f8faa]'
                            }`}
                        >
                            {tab}
                        </span>
                    ))}
                </div>

                <div className="rounded-[2rem] border border-white/[0.08] bg-[#09091a] p-2 shadow-2xl shadow-black/35 sm:p-3">
                    <div className="overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#0d0d22]">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] bg-white/[0.025] px-4 py-3">
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]" />
                                <span className="h-2.5 w-2.5 rounded-full bg-[#ffd166]" />
                                <span className="h-2.5 w-2.5 rounded-full bg-[#06d6a0]" />
                            </div>
                            <div className="hidden rounded-full border border-white/[0.08] bg-[#070714] px-4 py-1.5 text-xs text-[#808099] sm:block">
                                app.canonica.app/workspace/activation
                            </div>
                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                                Live preview
                            </span>
                        </div>

                        <div className="grid min-h-[34rem] lg:grid-cols-[15rem_1fr]">
                            <aside className="hidden border-r border-white/[0.06] bg-[#080818] p-4 lg:block">
                                <div className="mb-6 flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-sm font-bold text-white">C</div>
                                    <div>
                                        <div className="text-sm font-semibold text-white">Canonica</div>
                                        <div className="text-xs text-[#6b6b8a]">Workspace</div>
                                    </div>
                                </div>
                                <nav className="space-y-2 text-sm">
                                    {['Activation', 'Product surfaces', 'Knowledge Base', 'Widget', 'Tickets', 'Governance', 'Metrics'].map((label, index) => (
                                        <div
                                            key={label}
                                            className={`rounded-xl px-3 py-2 ${index === 0 ? 'bg-indigo-500/15 text-white' : 'text-[#808099]'}`}
                                        >
                                            {label}
                                        </div>
                                    ))}
                                </nav>
                            </aside>

                            <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.05fr_0.95fr] lg:p-6">
                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Activation Command Center</div>
                                                <h3 className="mt-1 text-2xl font-semibold text-white">78% launch ready</h3>
                                            </div>
                                            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                                                Runtime verified
                                            </span>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {ACTIVATION_ITEMS.map(([title, state, detail]) => (
                                                <div key={title} className="rounded-xl border border-white/[0.06] bg-[#070714] p-4">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="text-sm font-semibold text-white">{title}</span>
                                                        <span className="text-xs text-emerald-300">{state}</span>
                                                    </div>
                                                    <p className="mt-2 text-xs leading-relaxed text-[#808099]">{detail}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Product surfaces</div>
                                                <h3 className="mt-1 text-lg font-semibold text-white">Support mapped by route</h3>
                                            </div>
                                            <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300">3 live</span>
                                        </div>
                                        <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                                            {SURFACE_ROWS.map(([surface, answers, faqs, releases]) => (
                                                <div key={surface} className="grid gap-2 border-b border-white/[0.06] bg-[#070714] px-4 py-3 text-sm last:border-b-0 sm:grid-cols-[1fr_auto_auto_auto]">
                                                    <span className="font-medium text-white">{surface}</span>
                                                    <span className="text-[#808099]">{answers}</span>
                                                    <span className="text-[#808099]">{faqs}</span>
                                                    <span className="text-[#808099]">{releases}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">End-user widget</div>
                                                <h3 className="mt-1 text-lg font-semibold text-white">Billing page support</h3>
                                            </div>
                                            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">billing_invoices</span>
                                        </div>
                                        <div className="rounded-2xl border border-white/[0.06] bg-[#070714] p-4">
                                            <div className="rounded-xl bg-white/[0.04] p-4">
                                                <div className="text-sm font-semibold text-white">Why was I charged today?</div>
                                                <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">
                                                    Canonica found an approved billing answer for this page, then linked the invoice FAQ and latest pricing release note.
                                                </p>
                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {['Owner-approved', 'FAQ linked', 'Release aware'].map((label) => (
                                                        <span key={label} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-[#d6d6ef]">
                                                            {label}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="mt-4 w-full rounded-xl bg-indigo-500 px-4 py-3 text-center text-sm font-semibold text-white">
                                                Ask Canonica
                                            </div>
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Signal-to-knowledge queue</div>
                                                <h3 className="mt-1 text-lg font-semibold text-white">Review what support exposed</h3>
                                            </div>
                                            <span className="text-xs text-[#808099]">{QUEUE_ROWS.length} items</span>
                                        </div>
                                        <div className="space-y-2">
                                            {QUEUE_ROWS.map(([issue, source, status]) => (
                                                <div key={issue} className="rounded-xl border border-white/[0.06] bg-[#070714] p-3">
                                                    <div className="text-sm font-semibold text-white">{issue}</div>
                                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                                        <span className="rounded-full bg-white/[0.04] px-2 py-1 text-[#808099]">{source}</span>
                                                        <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-indigo-300">{status}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid gap-3 text-sm text-[#808099] md:grid-cols-3">
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="font-semibold text-white">Screens are connected by surfaces</div>
                        <p className="mt-2">Articles, FAQs, changelogs, tickets, and widget answers share page and workflow context.</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="font-semibold text-white">Fallback becomes review work</div>
                        <p className="mt-2">Missed questions become signals and draft improvements instead of disappearing into chat history.</p>
                    </div>
                    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                        <div className="font-semibold text-white">Static website, no Firebase browse cost</div>
                        <p className="mt-2">These public product scenes are server-rendered content and do not read Canonica data.</p>
                    </div>
                </div>
            </div>
        </section>
    );
}
