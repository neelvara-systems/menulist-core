import { Metadata } from 'next';
import { headers } from 'next/headers';
import AnswerlatticeFooter from '../components/Footer';
import AnswerlatticeHeader from '../components/Header';
import AnswerlatticeLink from '../components/AnswerlatticeLink';
import AnswerlatticePageStructuredData from '../components/PageStructuredData';
import PageProofStrip from '../components/PageProofStrip';
import SectionHeader from '../components/SectionHeader';
import { ANSWERLATTICE_FRAMEWORK_SNIPPETS } from '@lib/answerlattice/installContract/contract';

export const metadata: Metadata = {
    title: 'Developer Quickstarts',
    description: 'AnswerLattice widget quickstarts for env-backed Next.js App Router, React SPA, Vue/Nuxt, vanilla script installs, safe context, and user-initiated screenshot support.',
    alternates: { canonical: '/quickstarts' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const aliasBasePath = h.get('x-product-base-path') || '';
        if (aliasBasePath) return aliasBasePath;

        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__answerlattice' : '';
    } catch { return ''; }
}

const QUICKSTARTS = [
    {
        title: 'Next.js App Router',
        description: 'Load the widget once in your app shell and send route context from a small client component.',
        code: ANSWERLATTICE_FRAMEWORK_SNIPPETS.nextjs,
    },
    {
        title: 'React SPA',
        description: 'Initialize once, then call page() from your router or product screen component.',
        code: ANSWERLATTICE_FRAMEWORK_SNIPPETS.react,
    },
    {
        title: 'Vue / Nuxt',
        description: 'Use the same safe page context from mounted route components.',
        code: ANSWERLATTICE_FRAMEWORK_SNIPPETS.vue,
    },
    {
        title: 'Vanilla script',
        description: 'Paste the script and call the runtime directly when route context changes.',
        code: [
            '<script src="https://answerlattice.com/widget/v1/answerlattice-widget.js" data-answerlattice-key="al_your_widget_key" async></script>',
            '<script>',
            '  window.addEventListener("load", function () {',
            '    window.AnswerlatticeWidget?.page({',
            '      path: window.location.pathname,',
            '      title: document.title,',
            '      feature: "billing",',
            '      workflow: "manage_subscription",',
            '      role: "member",',
            '      locale: navigator.language || "en"',
            '    });',
            '  });',
            '</script>',
        ].join('\n'),
    },
];

const ENV_EXAMPLES = [
    ['Next.js / Vercel', 'NEXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY=al_your_widget_key\nNEXT_PUBLIC_ANSWERLATTICE_WIDGET_SCRIPT_SRC=https://answerlattice.com/widget/v1/answerlattice-widget.js'],
    ['Vite / React SPA', 'VITE_ANSWERLATTICE_WIDGET_KEY=al_your_widget_key\nVITE_ANSWERLATTICE_WIDGET_SCRIPT_SRC=https://answerlattice.com/widget/v1/answerlattice-widget.js'],
    ['Nuxt', 'NUXT_PUBLIC_ANSWERLATTICE_WIDGET_KEY=al_your_widget_key\nNUXT_PUBLIC_ANSWERLATTICE_WIDGET_SCRIPT_SRC=https://answerlattice.com/widget/v1/answerlattice-widget.js'],
];

const SAFE_CONTEXT = [
    ['Send', 'path, title, feature, workflow, role, and locale'],
    ['Do not send', 'passwords, tokens, payment data, emails, phone numbers, raw customer records'],
    ['Env values', 'public widget key and optional script URL only; never service accounts or private API keys'],
    ['Screenshots', 'user upload or paste only; no automatic page capture or DOM scraping'],
    ['Verify', 'widget loaded, origin allowed, route allowed, context received'],
];

export default function AnswerlatticeQuickstartsPage() {
    const basePath = getBasePath();

    return (
        <>
            <AnswerlatticePageStructuredData path="/quickstarts" />
            <AnswerlatticeHeader basePath={basePath} />
            <main className="al-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Developer quickstarts</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Add in-app support without building a support stack.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Use the v1 script once, then send safe page context from the app screens where users need help.
                    </p>
                    <PageProofStrip
                        className="mx-auto mt-8 max-w-6xl text-left"
                        items={[
                            { label: 'Install once', value: 'Global script in the app shell, not page-by-page embeds' },
                            { label: 'Context shape', value: 'Path, title, feature, workflow, role, locale' },
                            { label: 'Verification', value: 'Loaded, origin allowed, route allowed, context received' },
                        ]}
                    />
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-5">
                        {SAFE_CONTEXT.map(([label, body]) => (
                            <article key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                                <div className="text-xs font-semibold uppercase tracking-widest text-teal-200">{label}</div>
                                <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">{body}</p>
                            </article>
                        ))}
                    </div>
                    <p className="mx-auto mt-6 max-w-3xl text-center text-sm leading-relaxed text-[#6b6b8a]">
                        Private beta workspaces can use the exact dashboard snippet immediately. AnswerLattice supports the stable v1 script URL and browser global for client installs.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] bg-white/[0.01] px-6 py-16">
                    <div className="mx-auto max-w-6xl">
                        <SectionHeader
                            className="mb-8"
                            eyebrow="Environment setup"
                            title="Keep install values out of committed code."
                            description="Put only the public AnswerLattice widget key and optional script URL in client-safe env variables. AnswerLattice does not need your Firebase credentials, service account, tenant IDs, store IDs, or user data inside the browser app."
                        />
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
                    <h2 className="text-3xl font-bold text-white">Verify the install from AnswerLattice.</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        The Widget screen checks that the key exists, script loaded, origin is valid, route is allowed, and page context arrived.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <AnswerlatticeLink basePath={basePath} href="/install" className="rounded-xl border border-white/[0.12] px-6 py-3 text-sm font-semibold text-[#d6d6ef] hover:border-white/[0.24]">
                            View install guide
                        </AnswerlatticeLink>
                        <AnswerlatticeLink basePath={basePath} href="/get-started" className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800">
                            Create workspace
                        </AnswerlatticeLink>
                    </div>
                </section>
            </main>
            <AnswerlatticeFooter basePath={basePath} />
        </>
    );
}
