import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaPageStructuredData from '../components/PageStructuredData';

export const metadata: Metadata = {
    title: 'Proof Pack',
    description: 'Example Canonica workloads for AI-built SaaS support: billing, onboarding, releases, errors, and support-gap review.',
    alternates: { canonical: '/proof' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const EXAMPLES = [
    {
        label: 'Solo SaaS launch',
        title: 'Billing and onboarding repeat questions',
        situation: 'A founder ships an AI-built app with no support team. Early users repeat invoice, import, and invite questions.',
        canonica: 'Map billing, onboarding, and team settings surfaces. Import starter FAQs and support macros. Install the widget and verify context.',
        outcome: 'Known questions receive approved answers. Missing answers become review work instead of disappearing into chat history.',
    },
    {
        label: 'Release-heavy product',
        title: 'Usage limit changes after a launch',
        situation: 'A product changes limits and users ask from billing, usage, and release pages why behavior changed.',
        canonica: 'Connect changelog entries to affected surfaces, FAQs, and approved answers. Let drift and repeated misses surface review items.',
        outcome: 'The owner sees where support needs review after the release and can approve updated answers before they become official.',
    },
    {
        label: 'Studio workload',
        title: 'Multiple small apps need the same support pattern',
        situation: 'A studio launches several SaaS apps and needs repeatable install, surface templates, and safety controls.',
        canonica: 'Reuse quickstarts, starter templates, allowed origins, blocked routes, import packs, and the install verifier for each workspace.',
        outcome: 'Each product gets its own scoped support layer without hardcoded client assumptions or shared tenant leakage.',
    },
];

const METRICS = [
    ['First surfaces', 'Billing, onboarding, team, releases, integrations, errors'],
    ['First content', 'Docs, FAQs, changelog, starter answers, support macros'],
    ['First proof', 'Widget loaded, origin valid, route allowed, context arrived'],
    ['First governance', 'Approved answers, missed questions, stale-answer review'],
];

export default function CanonicaProofPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaPageStructuredData path="/proof" />
            <CanonicaHeader basePath={basePath} />
            <main className="cn-page-flow">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-300">Proof pack</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Example workloads for support that improves after launch.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        These are anonymized example workloads, not inflated customer claims. They show how Canonica should be evaluated on day one.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-4">
                        {METRICS.map(([label, value]) => (
                            <article key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
                                <div className="text-xs font-semibold uppercase tracking-widest text-[#6b6b8a]">{label}</div>
                                <p className="mt-3 text-sm leading-relaxed text-[#d6d6ef]">{value}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
                        {EXAMPLES.map((example) => (
                            <article key={example.title} className="rounded-[1.5rem] border border-white/[0.06] bg-[#101028] p-6">
                                <span className="rounded-full border border-teal-300/20 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-100">
                                    {example.label}
                                </span>
                                <h2 className="mt-5 text-xl font-semibold leading-snug text-white">{example.title}</h2>
                                <div className="mt-5 space-y-4">
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b8a]">Situation</div>
                                        <p className="mt-2 text-sm leading-relaxed text-[#a0a0c0]">{example.situation}</p>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-teal-200">Canonica setup</div>
                                        <p className="mt-2 text-sm leading-relaxed text-[#d6d6ef]">{example.canonica}</p>
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300">What improves</div>
                                        <p className="mt-2 text-sm leading-relaxed text-[#d6d6ef]">{example.outcome}</p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16 text-center">
                    <h2 className="text-3xl font-bold text-white">The first proof is operational, not a sales deck.</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        A real Canonica evaluation should prove install, context, first surfaces, first imported knowledge, and first owner-approved answers.
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <CanonicaLink basePath={basePath} href="/demo" className="rounded-xl border border-white/[0.12] px-6 py-3 text-sm font-semibold text-[#d6d6ef] hover:border-white/[0.24]">
                            Try the demo
                        </CanonicaLink>
                        <CanonicaLink basePath={basePath} href="/quickstarts" className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-800">
                            View quickstarts
                        </CanonicaLink>
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
