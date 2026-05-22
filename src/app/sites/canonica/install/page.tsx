import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';

export const metadata: Metadata = {
    title: 'Widget Install',
    description: 'Install Canonica with one widget script, allowed origins, blocked routes, help.yourapp.com hosted help domains, runtime verification, and safe page context.',
    alternates: { canonical: '/install' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const INSTALL_STEPS = [
    {
        title: 'Create the widget key',
        detail: 'Canonica shows the raw key once, stores only the hash, and keeps future runtime config in the dashboard.',
    },
    {
        title: 'Paste one script',
        detail: 'Add the script to the product shell where customer support should be available.',
    },
    {
        title: 'Restrict where it runs',
        detail: 'Allowed origins and blocked routes decide which domains and product pages can show the launcher.',
    },
    {
        title: 'Publish hosted help',
        detail: 'Add a support domain such as help.yourapp.com so published articles, FAQs, and changelog entries feel native to your product.',
    },
    {
        title: 'Pass safe page context',
        detail: 'Send route, feature, workflow, role, or plan hints. Do not send secrets, tokens, card data, or unrelated personal information.',
    },
    {
        title: 'Verify runtime status',
        detail: 'The dashboard records whether the widget reached Canonica and which context marker was received.',
    },
];

const WIDGET_SNIPPET = `<script
  src="https://canonica.app/widget/canonica-widget.js"
  data-api-key="cn_widget_key"
  data-position="bottom-right"
  async>
</script>`;

const CONTEXT_SNIPPET = `window.CanonicaWidget?.page({
  contextVersion: 1,
  contextKey: 'billing_invoices',
  feature: 'billing',
  page: 'invoices',
  workflow: 'invoice_review'
});`;

const FRAMEWORK_EXAMPLES = [
    ['Plain HTML', 'Paste the script before </body> and add optional page context after route changes.'],
    ['Next.js / React', 'Load the script once in the app shell, then call page context from route-aware components.'],
    ['SPA routers', 'Update CanonicaWidget.page() when route, workflow, plan, or role changes.'],
];

const VERIFICATION_ITEMS = [
    ['Widget key', 'Valid cn_* key prefix and active hashed credential'],
    ['Allowed origin', 'Current product origin matched dashboard config'],
    ['Blocked route', 'Current route allowed or hidden as configured'],
    ['Context marker', 'Last received context key such as billing_invoices'],
    ['Hosted help', 'Domain registry and public route status checked'],
];

export default function CanonicaInstallPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Widget Install</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Add Canonica to the product pages where users ask for help.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        The first integration is the page-aware widget. The same setup also gives you hosted help domains such as help.yourapp.com for docs, FAQ, and changelog when your product needs a public support home.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {INSTALL_STEPS.map((item, index) => (
                            <article key={item.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
                                <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-300">
                                    {String(index + 1).padStart(2, '0')}
                                </div>
                                <h2 className="text-base font-semibold text-white">{item.title}</h2>
                                <p className="mt-3 text-sm leading-relaxed text-[#808099]">{item.detail}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20">
                    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-3">
                        <article className="rounded-2xl border border-white/[0.06] bg-[#101028] p-6">
                            <h2 className="text-xl font-semibold text-white">Install snippet</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">
                                The dashboard generates the key and install snippet for the selected Canonica workspace.
                            </p>
                            <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                                <code>{WIDGET_SNIPPET}</code>
                            </pre>
                        </article>

                        <article className="rounded-2xl border border-white/[0.06] bg-[#101028] p-6">
                            <h2 className="text-xl font-semibold text-white">Page context snippet</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">
                                Context helps Canonica prefer the right articles, changelog items, and approved answers for the current screen.
                            </p>
                            <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                                <code>{CONTEXT_SNIPPET}</code>
                            </pre>
                        </article>

                        <article className="rounded-2xl border border-white/[0.06] bg-[#101028] p-6">
                            <h2 className="text-xl font-semibold text-white">Hosted help domains</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">
                                The Hosted Help tab maps a domain such as help.yourapp.com to published articles, FAQ, changelog, robots, and sitemap output.
                            </p>
                            <div className="mt-5 space-y-2 text-sm text-[#d6d6ef]">
                                {['/docs', '/articles/{slug}', '/faq', '/changelog', '/sitemap.xml'].map((route) => (
                                    <div key={route} className="rounded-lg border border-white/[0.06] bg-[#070714] px-3 py-2">
                                        {route}
                                    </div>
                                ))}
                            </div>
                        </article>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-20">
                    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Developer handoff</p>
                            <h2 className="text-3xl font-bold">Framework setup stays intentionally small.</h2>
                            <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                                The dashboard owns keys, allowed origins, blocked routes, hosted help domains, and runtime checks. The client app only needs the script plus safe page context.
                            </p>
                            <div className="mt-6 grid gap-3">
                                {FRAMEWORK_EXAMPLES.map(([title, detail]) => (
                                    <article key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                        <h3 className="text-sm font-semibold text-white">{title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-[#808099]">{detail}</p>
                                    </article>
                                ))}
                            </div>
                        </div>
                        <div className="rounded-2xl border border-white/[0.08] bg-[#101028] p-5 shadow-2xl shadow-black/20">
                            <div className="mb-5 flex items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                                <div>
                                    <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">Runtime verification</div>
                                    <h3 className="mt-1 text-xl font-semibold text-white">Widget install status</h3>
                                </div>
                                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                                    Ready
                                </span>
                            </div>
                            <div className="space-y-3">
                                {VERIFICATION_ITEMS.map(([label, detail]) => (
                                    <div key={label} className="rounded-xl border border-white/[0.06] bg-[#070714] p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-sm font-semibold text-white">{label}</span>
                                            <span className="text-xs text-emerald-300">Passed</span>
                                        </div>
                                        <p className="mt-2 text-sm leading-relaxed text-[#808099]">{detail}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20">
                    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Owner controls</p>
                            <h2 className="text-3xl font-bold">The product owner controls where support appears.</h2>
                            <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                                Canonica is not a generic floating button forced onto every page. Owners configure appearance, launcher behavior, mobile visibility, allowed origins, blocked routes, branded help domains, and verification from the dashboard.
                            </p>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                            {['Allowed origins', 'Blocked routes', 'Mobile visibility', 'Hosted help DNS', 'Runtime status', 'Appearance'].map((label) => (
                                <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                    <div className="text-sm font-semibold text-white">{label}</div>
                                    <p className="mt-2 text-sm leading-relaxed text-[#808099]">
                                        Configured from the Canonica widget dashboard before launch.
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20 text-center">
                    <h2 className="text-3xl font-bold">Start with a clean widget install.</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-[#a0a0c0]">
                        Create a workspace, map product surfaces, install the widget, publish hosted help if needed, then verify that page context reaches Canonica.
                    </p>
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        data-canonica-event="install_cta_clicked"
                        data-canonica-label="start_free_setup"
                        className="mt-8 inline-block rounded-xl bg-indigo-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
                    >
                        Start free setup
                    </CanonicaLink>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
