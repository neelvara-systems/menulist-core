import CanonicaLink from './CanonicaLink';

const WIDGET_STEPS = [
    {
        title: 'Install one script',
        detail: 'Add the Canonica widget script to your app and keep the raw widget key out of public docs after setup.',
    },
    {
        title: 'Allow only your domains',
        detail: 'Allowed origins and blocked routes decide where the launcher can appear.',
    },
    {
        title: 'Publish hosted help',
        detail: 'Map help, docs, support, or kb domains to the same published articles, FAQs, and release notes.',
    },
    {
        title: 'Pass page context',
        detail: 'Send safe route, feature, workflow, role, and plan hints so help matches the current screen.',
    },
    {
        title: 'Review support gaps',
        detail: 'Fallbacks, tickets, and negative feedback become review work for improving approved answers.',
    },
];

const SAMPLE_CONTEXT = `window.CanonicaWidget?.page({
  contextVersion: 1,
  contextKey: 'billing_invoices',
  feature: 'billing',
  page: 'invoices'
});`;

export default function WidgetSection({ basePath = '' }: { basePath?: string }) {
    return (
        <section className="border-y border-white/[0.06] bg-white/[0.01] px-6 py-20">
            <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Page-Aware Widget
                    </p>
                    <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                        Put support inside the product screen where the question happens.
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                        Canonica is built for new SaaS teams that need support before they need a full support stack. Start with a governed widget, publish a hosted help center, and let tickets exist as fallback and learning signals.
                    </p>
                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        {WIDGET_STEPS.map((item) => (
                            <article key={item.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                                <p className="mt-2 text-sm leading-relaxed text-[#808099]">{item.detail}</p>
                            </article>
                        ))}
                    </div>
                    <CanonicaLink
                        basePath={basePath}
                        href="/install"
                        className="mt-8 inline-block rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition-all hover:border-white/[0.2] hover:text-white"
                    >
                        View Widget Install
                    </CanonicaLink>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5 shadow-2xl shadow-black/20">
                    <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Customer screen</div>
                            <div className="mt-1 text-sm font-semibold text-white">Billing / Invoices</div>
                        </div>
                        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                            Widget allowed
                        </span>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-[#0b0b1e] p-4">
                        <div className="text-sm font-semibold text-white">Need help with this invoice?</div>
                        <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">
                            Canonica uses the current page context to prefer billing articles, invoice release notes, and approved plan-scope answers.
                        </p>
                        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-4">
                            {['Canonical answer', 'Related FAQ', 'Release note', 'Ticket fallback'].map((label) => (
                                <span key={label} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-[#d6d6ef]">
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    <pre className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                        <code>{SAMPLE_CONTEXT}</code>
                    </pre>
                </div>
            </div>
        </section>
    );
}
