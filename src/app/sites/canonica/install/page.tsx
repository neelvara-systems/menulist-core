import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import { CanonicaHubDiagram, CanonicaSequenceDiagram } from '../components/CanonicaFlowDiagram';
import CanonicaPageStructuredData from '../components/PageStructuredData';

export const metadata: Metadata = {
    title: 'Widget Install',
    description: 'Install Canonica support with env-backed widget keys, one script, allowed origins, blocked routes, hosted help domains, runtime verification, safe page context, and explicit screenshot attachments.',
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
        title: 'Store public values in env',
        detail: 'Use your app environment for the public cn_* widget key and optional script URL instead of committing them directly in source code.',
    },
    {
        title: 'Paste one script',
        detail: 'Add the script to the product shell where customer support should be available.',
    },
    {
        title: 'Allow your production and staging domains',
        detail: 'Allowed origins and blocked routes decide which domains and product pages can show the launcher.',
    },
    {
        title: 'Block sensitive routes',
        detail: 'Hide the widget from billing payment forms, auth screens, admin-only pages, and any route where support should not appear.',
    },
    {
        title: 'Pass safe page context',
        detail: 'Send route, feature, workflow, role, or plan hints. Do not send secrets, tokens, card data, or unrelated personal information.',
    },
    {
        title: 'Keep visual context user-initiated',
        detail: 'Users can attach or paste a screenshot when it helps explain an issue. The widget does not automatically capture the host app screen.',
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

const ENV_SNIPPET = `# Next.js / Vercel
NEXT_PUBLIC_CANONICA_WIDGET_KEY=cn_widget_key
NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js

# Vite / React SPA
VITE_CANONICA_WIDGET_KEY=cn_widget_key
VITE_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js

# Nuxt
NUXT_PUBLIC_CANONICA_WIDGET_KEY=cn_widget_key
NUXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js`;

const CONTEXT_SNIPPET = `window.CanonicaWidget?.page({
  contextVersion: 1,
  contextKey: 'billing_invoices',
  feature: 'billing',
  page: 'invoices',
  workflow: 'invoice_review'
});`;

const SDK_SNIPPET = `import { createCanonicaWebClient } from '@canonica/web';

const widgetKey = process.env.NEXT_PUBLIC_CANONICA_WIDGET_KEY;
if (!widgetKey) throw new Error('Missing NEXT_PUBLIC_CANONICA_WIDGET_KEY');

const canonica = createCanonicaWebClient({
  apiKey: widgetKey,
  scriptSrc: process.env.NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC,
});

await canonica.init();
canonica.page({
  contextKey: 'billing_invoices',
  feature: 'billing',
  page: 'invoices',
  workflow: 'invoice_review',
});`;

const FRAMEWORK_EXAMPLES = [
    ['Typed SDK', 'Use the @canonica/web helper to validate safe context and wrap init, page, setContext, open, and close calls.'],
    ['Env first', 'Store only the public widget key and script URL in client-safe env variables. Keep private credentials out of the browser app.'],
    ['Plain HTML', 'Paste the dashboard script before </body> or inject the key through your build template.'],
    ['Next.js / React', 'Load the script once in the app shell, then call page context from route-aware components using env-backed values.'],
    ['Vue / Nuxt / SPA routers', 'Read public runtime config, then update CanonicaWidget.page() when route, workflow, plan, or role changes.'],
];

const VERIFICATION_ITEMS = [
    ['Widget key', 'Valid cn_* key prefix and active hashed credential'],
    ['Allowed origin', 'Current product origin matched dashboard config'],
    ['Blocked route', 'Current route allowed or hidden as configured'],
    ['Context marker', 'Last received context key such as billing_invoices'],
    ['Image input', 'Optional user attachment only; no automatic capture'],
    ['Hosted help', 'Domain registry and public route status checked'],
];

export default function CanonicaInstallPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/install" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Widget Install</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Install support with one script.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Add Canonica to your app shell, allow the domains where it can run, block sensitive routes, send safe page hints such as feature, workflow, role, or plan, and keep screenshots user-initiated.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-7xl">
                        <div className="mb-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Install flow</p>
                                <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                                    From widget key to verified runtime.
                                </h2>
                            </div>
                            <p className="text-base leading-relaxed text-[#a0a0c0]">
                                The setup starts with one script, passes through the Canonica control layer, and ends with a verified support runtime.
                            </p>
                        </div>
                        <CanonicaSequenceDiagram
                            idPrefix="cn-install-flow"
                            splitAfter={3}
                            items={INSTALL_STEPS.map((item) => ({
                                title: item.title,
                                detail: item.detail,
                            }))}
                        />
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
                            <h2 className="text-xl font-semibold text-white">Environment values</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">
                                Recommended for app repos: put only the public widget key and optional script source in client-safe env variables.
                            </p>
                            <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                                <code>{ENV_SNIPPET}</code>
                            </pre>
                        </article>

                        <article className="rounded-2xl border border-white/[0.06] bg-[#101028] p-6">
                            <h2 className="text-xl font-semibold text-white">Page context snippet</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">
                                Context helps Canonica prefer the right articles, owner FAQ answers, changelog items, and approved answers for the current screen.
                            </p>
                            <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                                <code>{CONTEXT_SNIPPET}</code>
                            </pre>
                        </article>

                        <article className="rounded-2xl border border-white/[0.06] bg-[#101028] p-6">
                            <h2 className="text-xl font-semibold text-white">Typed SDK helper</h2>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">
                                The thin web helper wraps the widget runtime and validates safe context before it reaches the browser widget. Private beta installs can use the dashboard snippet while the package release is prepared.
                            </p>
                            <pre className="mt-5 overflow-x-auto rounded-xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                                <code>{SDK_SNIPPET}</code>
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
                            <h2 className="text-3xl font-bold">What to hand your developer.</h2>
                            <p className="mt-4 text-lg leading-relaxed text-[#a0a0c0]">
                                Give your developer the widget key, env variable names, allowed domains, blocked routes, and the list of important pages where users need help first.
                            </p>
                            <div className="mt-5 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-4 text-sm leading-relaxed text-[#d6d6ef]">
                                Canonica widget installs use a public publishable key. Do not add Firebase service accounts, Canonica admin credentials, private API keys, tenant IDs, store IDs, user IDs, or customer records to client-side env files.
                            </div>
                            <div className="mt-6 grid gap-3">
                                {FRAMEWORK_EXAMPLES.map(([title, detail]) => (
                                    <article key={title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                                        <h3 className="text-sm font-semibold text-white">{title}</h3>
                                        <p className="mt-2 text-sm leading-relaxed text-[#808099]">{detail}</p>
                                    </article>
                                ))}
                            </div>
                            <CanonicaLink
                                basePath={basePath}
                                href="/quickstarts"
                                className="mt-6 inline-block rounded-xl border border-white/[0.12] px-5 py-2.5 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.24]"
                            >
                                Open framework quickstarts
                            </CanonicaLink>
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
                    <div className="mx-auto max-w-7xl">
                        <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                            <div>
                                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Owner controls</p>
                                <h2 className="text-3xl font-bold">The product owner controls where support appears.</h2>
                            </div>
                            <p className="text-lg leading-relaxed text-[#a0a0c0]">
                                Canonica is not a generic floating button forced onto every page. Owners configure appearance, launcher behavior, mobile visibility, allowed origins, blocked routes, branded help domains, and verification from the dashboard.
                            </p>
                        </div>
                        <CanonicaHubDiagram
                            idPrefix="cn-install-controls"
                            inputLabel="Runtime rules"
                            outputLabel="Owner surfaces"
                            inputs={[
                                {
                                    title: 'Allowed origins',
                                    detail: 'Only approved product and staging domains can load the widget configuration.',
                                },
                                {
                                    title: 'Blocked routes',
                                    detail: 'Billing, auth, admin, or sensitive screens can hide support by route.',
                                },
                                {
                                    title: 'Safe page context',
                                    detail: 'Feature, workflow, role, and plan hints guide answers without sending secrets.',
                                },
                                {
                                    title: 'Manual screenshots',
                                    detail: 'Visual context comes from user upload or paste, not automatic runtime capture.',
                                },
                            ]}
                            outputs={[
                                {
                                    title: 'Runtime status',
                                    detail: 'The dashboard confirms the widget reached Canonica with the expected context marker.',
                                },
                                {
                                    title: 'Hosted help DNS',
                                    detail: 'Published docs, FAQ, changelog, robots, and sitemap can live on a support domain.',
                                },
                                {
                                    title: 'Appearance',
                                    detail: 'Launcher behavior, placement, and mobile visibility stay in owner control.',
                                },
                            ]}
                        />
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20 text-center">
                    <h2 className="text-3xl font-bold">Install the widget, then review the first support gaps.</h2>
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
