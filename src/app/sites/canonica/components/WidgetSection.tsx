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
        detail: 'Map help, docs, support, or kb domains like help.yourapp.com to the same published articles, FAQs, and release notes.',
    },
    {
        title: 'Pass page context',
        detail: 'Send safe route, feature, workflow, role, and plan hints so help matches the current screen.',
    },
    {
        title: 'Review support gaps',
        detail: 'Fallbacks, tickets, safe debugging context, and negative feedback become review work for improving approved answers.',
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
        <section className="border-y border-white/[0.06] bg-white/[0.01] px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-7xl">
                <div className="mx-auto mb-10 max-w-3xl text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">
                        Page-Aware Widget
                    </p>
                    <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                        Put support inside the product screen where the question happens.
                    </h2>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#a0a0c0] sm:text-lg">
                        Canonica is built for new SaaS teams that need support before they need a full support stack. Start with a governed widget, publish help on your own domain, and let tickets exist as fallback and learning signals.
                    </p>
                    <CanonicaLink
                        basePath={basePath}
                        href="/install"
                        className="mt-6 inline-block rounded-full border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition-all hover:border-white/[0.2] hover:text-white"
                    >
                        View Widget Install
                    </CanonicaLink>
                </div>

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
                                        The widget opens inside the client product, detects safe billing context, and prefers approved invoice answers before fallback.
                                    </p>
                                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                        {['Canonical answer', 'Related FAQ', 'Release note', 'Ticket fallback'].map((label) => (
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
                        <div className="mb-4 text-xs font-semibold uppercase tracking-widest text-indigo-300">Install & context</div>
                        <h3 className="text-xl font-bold text-white">One script, then safe page hints.</h3>
                        <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">
                            Developers install the widget once and pass route, feature, workflow, role, or plan hints only when they are safe.
                        </p>
                        <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                            <code>{SAMPLE_CONTEXT}</code>
                        </pre>
                    </article>

                    {WIDGET_STEPS.slice(1).map((item) => (
                        <article
                            key={item.title}
                            className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.025] p-5 lg:col-span-4"
                        >
                            <h3 className="text-base font-semibold text-white">{item.title}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-[#8f8faa]">{item.detail}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}
