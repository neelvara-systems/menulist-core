import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaPageStructuredData from '../components/PageStructuredData';

export const metadata: Metadata = {
    title: 'Developer Quickstarts',
    description: 'Canonica widget quickstarts for env-backed Next.js App Router, React SPA, Vue/Nuxt, vanilla script installs, safe context, and user-initiated screenshot support.',
    alternates: { canonical: '/quickstarts' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const QUICKSTARTS = [
    {
        title: 'Next.js App Router',
        description: 'Load the widget once in your app shell and send route context from a small client component.',
        code: [
            "'use client';",
            "import { useEffect } from 'react';",
            "import { usePathname } from 'next/navigation';",
            "import { createCanonicaWebClient } from '@canonica/web';",
            '',
            'export function CanonicaRouteContext() {',
            '  const pathname = usePathname();',
            '  useEffect(() => {',
            '    const widgetKey = process.env.NEXT_PUBLIC_CANONICA_WIDGET_KEY;',
            '    if (!widgetKey) return;',
            '    const canonica = createCanonicaWebClient({',
            '      apiKey: widgetKey,',
            '      scriptSrc: process.env.NEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC,',
            '    });',
            '    const contextKey = pathname.replace(/^\\//, "").replace(/\\//g, "_") || "home";',
            '    canonica.init({ context: { contextKey, feature: pathname.split("/")[1] || "app", page: contextKey } });',
            '  }, [pathname]);',
            '  return null;',
            '}',
        ].join('\n'),
    },
    {
        title: 'React SPA',
        description: 'Initialize once, then call page() from your router or product screen component.',
        code: [
            "import { useEffect } from 'react';",
            "import { createCanonicaWebClient } from '@canonica/web';",
            '',
            'export function BillingHelpContext() {',
            '  useEffect(() => {',
            '    const widgetKey = import.meta.env.VITE_CANONICA_WIDGET_KEY;',
            '    if (!widgetKey) return;',
            '    const canonica = createCanonicaWebClient({',
            '      apiKey: widgetKey,',
            '      scriptSrc: import.meta.env.VITE_CANONICA_WIDGET_SCRIPT_SRC,',
            '    });',
            '    canonica.init();',
            '    canonica.page({ contextKey: "billing_invoices", feature: "billing", page: "invoices" });',
            '  }, []);',
            '  return null;',
            '}',
        ].join('\n'),
    },
    {
        title: 'Vue / Nuxt',
        description: 'Use the same safe page context from mounted route components.',
        code: [
            '<script setup lang="ts">',
            "import { onMounted } from 'vue';",
            "import { createCanonicaWebClient } from '@canonica/web';",
            '',
            'onMounted(async () => {',
            '  const config = useRuntimeConfig();',
            '  const widgetKey = config.public.canonicaWidgetKey;',
            '  if (!widgetKey) return;',
            '  const canonica = createCanonicaWebClient({',
            '    apiKey: widgetKey,',
            '    scriptSrc: config.public.canonicaWidgetScriptSrc,',
            '  });',
            '  await canonica.init();',
            '  canonica.page({ contextKey: "onboarding_import", feature: "onboarding", page: "import" });',
            '});',
            '</script>',
        ].join('\n'),
    },
    {
        title: 'Vanilla script',
        description: 'Paste the script and call the runtime directly when route context changes.',
        code: [
            '<script src="https://canonica.app/widget/canonica-widget.js" data-api-key="cn_your_widget_key" async></script>',
            '<script>',
            '  window.addEventListener("load", function () {',
            '    window.CanonicaWidget?.page({',
            '      contextKey: "billing_invoices",',
            '      feature: "billing",',
            '      page: "invoices"',
            '    });',
            '  });',
            '</script>',
        ].join('\n'),
    },
];

const ENV_EXAMPLES = [
    ['Next.js / Vercel', 'NEXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key\nNEXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js'],
    ['Vite / React SPA', 'VITE_CANONICA_WIDGET_KEY=cn_your_widget_key\nVITE_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js'],
    ['Nuxt', 'NUXT_PUBLIC_CANONICA_WIDGET_KEY=cn_your_widget_key\nNUXT_PUBLIC_CANONICA_WIDGET_SCRIPT_SRC=https://canonica.app/widget/canonica-widget.js'],
];

const SAFE_CONTEXT = [
    ['Send', 'page, route, feature, workflow, role, plan, state, entity hints'],
    ['Do not send', 'passwords, tokens, payment data, emails, phone numbers, raw customer records'],
    ['Env values', 'public widget key and optional script URL only; never service accounts or private API keys'],
    ['Screenshots', 'user upload or paste only; no automatic page capture or DOM scraping'],
    ['Verify', 'widget loaded, origin allowed, route allowed, context received'],
];

export default function CanonicaQuickstartsPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/quickstarts" />
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Developer quickstarts</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Add page-aware support without building a support stack.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Use one script or the typed web helper, then send safe page context from the app screens where users get stuck.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-5">
                        {SAFE_CONTEXT.map(([label, body]) => (
                            <article key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                                <div className="text-xs font-semibold uppercase tracking-widest text-indigo-300">{label}</div>
                                <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{body}</p>
                            </article>
                        ))}
                    </div>
                    <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-[#6b6b8a]">
                        Private beta workspaces can use the exact dashboard snippet immediately. The typed helper source is maintained for package release and can be handed to developers during setup.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-8 max-w-3xl">
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Environment setup</p>
                            <h2 className="text-3xl font-bold text-white">Keep install values out of committed code.</h2>
                            <p className="mt-4 text-base leading-relaxed text-[#a0a0c0]">
                                Put only the public Canonica widget key and optional script URL in client-safe env variables. Canonica does not need your Firebase credentials, service account, tenant IDs, store IDs, or user data inside the browser app.
                            </p>
                        </div>
                        <div className="grid gap-4 lg:grid-cols-3">
                            {ENV_EXAMPLES.map(([title, code]) => (
                                <article key={title} className="rounded-2xl border border-white/[0.06] bg-[#101028] p-5">
                                    <h3 className="text-base font-semibold text-white">{title}</h3>
                                    <pre className="mt-4 overflow-auto rounded-xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                                        <code>{code}</code>
                                    </pre>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
                        {QUICKSTARTS.map((item) => (
                            <article key={item.title} className="rounded-[1.5rem] border border-white/[0.06] bg-[#101028] p-6">
                                <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                                <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{item.description}</p>
                                <pre className="mt-5 max-h-[28rem] overflow-auto rounded-xl border border-white/[0.06] bg-[#070714] p-4 text-xs leading-relaxed text-[#d6d6ef]">
                                    <code>{item.code}</code>
                                </pre>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16 text-center">
                    <h2 className="text-3xl font-bold text-white">Verify the install from Canonica.</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        The Widget screen checks that the key exists, script loaded, origin is valid, route is allowed, and page context arrived.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <CanonicaLink basePath={basePath} href="/install" className="rounded-xl border border-white/[0.12] px-6 py-3 text-sm font-semibold text-[#d6d6ef] hover:border-white/[0.24]">
                            View install guide
                        </CanonicaLink>
                        <CanonicaLink basePath={basePath} href="/get-started" className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-600">
                            Start free setup
                        </CanonicaLink>
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
