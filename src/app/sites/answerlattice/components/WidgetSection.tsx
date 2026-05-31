import AnswerlatticeLink from './AnswerlatticeLink';
import { AnswerlatticeStatusBoard } from './AnswerlatticeProofBlocks';
import SectionHeader from './SectionHeader';

const WIDGET_STATES = [
    {
        status: 'allowed',
        title: 'Widget can appear',
        detail: 'The current domain matches the workspace allowed-origin list.',
        tone: 'good' as const,
        rows: [
            ['origin', 'app.yourapp.com'],
            ['launcher', 'visible'],
        ] as Array<[string, string]>,
    },
    {
        status: 'blocked',
        title: 'Allow only your domains',
        detail: 'Payment forms, auth pages, and private admin routes can hide the launcher.',
        tone: 'neutral' as const,
        rows: [
            ['route', '/billing/cards/*'],
            ['launcher', 'hidden'],
        ] as Array<[string, string]>,
    },
    {
        status: 'published',
        title: 'Publish hosted help',
        detail: 'Reviewed docs, FAQs, and release notes can live on a support domain.',
        tone: 'good' as const,
        rows: [
            ['domain', 'help.yourapp.com'],
            ['public pages', 'docs + FAQ'],
        ] as Array<[string, string]>,
    },
    {
        status: 'context',
        title: 'Pass page context',
        detail: 'Safe route, feature, workflow, role, and plan hints make answers page-aware.',
        tone: 'neutral' as const,
        rows: [
            ['feature', 'billing'],
            ['workflow', 'invoice_review'],
        ] as Array<[string, string]>,
    },
    {
        status: 'configured',
        title: 'Show proactive help carefully',
        detail: 'Configured prompts can appear only when active triggers and approved support summaries exist.',
        tone: 'neutral' as const,
        rows: [
            ['trigger', 'active only'],
            ['prompt', 'approved summary'],
        ] as Array<[string, string]>,
    },
    {
        status: 'visual',
        title: 'Attach screenshots explicitly',
        detail: 'Users can upload or paste a screenshot when visual context helps, without automatic page capture.',
        tone: 'neutral' as const,
        rows: [
            ['input', 'user attached'],
            ['storage', 'not persisted'],
        ] as Array<[string, string]>,
    },
    {
        status: 'review',
        title: 'Review support gaps',
        detail: 'Fallbacks, tickets, safe debugging context, and negative feedback become review work.',
        tone: 'caution' as const,
        rows: [
            ['gap', 'missing answer'],
            ['next step', 'owner review'],
        ] as Array<[string, string]>,
    },
];

const SAMPLE_CONTEXT = `window.AnswerlatticeWidget?.page({
  contextVersion: 1,
  contextKey: 'billing_invoices',
  feature: 'billing',
  page: 'invoices'
});`;

export default function WidgetSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <SectionHeader
                    eyebrow="Page-Aware Widget"
                    title="Put help inside the screen where users are stuck."
                    description="Users ask from inside your app. Answerlattice reads safe page hints, accepts explicit screenshot attachments when needed, finds canonical answers, owner FAQ answers, and related docs, can show configured prompts, and opens ticket fallback only when coverage is missing."
                >
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/install"
                        className="mt-6 inline-block rounded-full border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition-all hover:border-white/[0.2] hover:text-white"
                    >
                        View widget install
                    </AnswerlatticeLink>
                </SectionHeader>

                <div className="grid gap-4 lg:grid-cols-12">
                    <article className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#101028] text-white shadow-2xl shadow-black/25 lg:col-span-8 lg:row-span-2">
                        <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.035] px-5 py-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-widest text-[#8f8faa]">Customer screen</div>
                                <div className="mt-1 text-lg font-bold text-white">Billing / Invoices</div>
                            </div>
                            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                                Widget allowed
                            </span>
                        </div>
                        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_19rem]">
                            <div>
                                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
                                    <h3 className="text-2xl font-bold">Need help with this invoice?</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">
                                        The widget opens inside the client product, detects safe billing context, and prefers approved invoice answers, owner FAQ answers, or configured prompts before fallback.
                                    </p>
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        {['Canonical answer', 'Owner FAQ answer', 'Related article', 'Screenshot context', 'Proactive prompt', 'Ticket fallback'].map((label) => (
                                            <span key={label} className="rounded-xl border border-white/[0.08] bg-[#0f0f23] px-4 py-3 text-sm font-semibold text-[#d6d6ef]">
                                                {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="mt-4 rounded-2xl bg-[#151729] p-5 text-white">
                                    <div className="text-xs font-semibold uppercase tracking-widest text-[#9298b8]">Page-aware answer</div>
                                    <p className="mt-3 text-sm leading-relaxed text-[#d6d6ef]">
                                        Invoice retries happen automatically for 3 days. Update your payment method from Billing, then retry from this invoice page.
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                                <div className="text-xs font-semibold uppercase tracking-widest text-[#8f8faa]">Widget controls</div>
                                <div className="mt-4 space-y-3">
                                    {[
                                        ['Allowed origin', 'app.yourapp.com'],
                                        ['Blocked route', '/billing/cards/*'],
                                        ['Hosted help', 'help.yourapp.com'],
                                        ['Context key', 'billing_invoices'],
                                        ['Image input', 'manual only'],
                                    ].map(([label, value]) => (
                                        <div key={label} className="rounded-xl border border-white/[0.08] bg-[#0f0f23] p-3">
                                            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8f8faa]">{label}</div>
                                            <div className="mt-1 text-sm font-semibold text-[#d6d6ef]">{value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </article>

                    <article className="rounded-[1.75rem] border border-white/[0.08] bg-[#101028] p-5 lg:col-span-4">
                        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-teal-200">Install & context</div>
                        <h3 className="text-xl font-bold text-white">One script, then safe page hints.</h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">
                            Developers install the widget once and pass route, feature, workflow, role, or plan hints only when they are safe.
                        </p>
                        <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                            <code>{SAMPLE_CONTEXT}</code>
                        </pre>
                    </article>

                    <div className="lg:col-span-12">
                        <AnswerlatticeStatusBoard items={WIDGET_STATES} />
                    </div>
                </div>
            </div>
        </section>
    );
}
