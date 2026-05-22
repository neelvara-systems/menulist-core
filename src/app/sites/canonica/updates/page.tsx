import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';
import CanonicaLink from '../components/CanonicaLink';

export const metadata: Metadata = {
    title: 'Updates',
    description: 'Recent Canonica product updates across launch setup, widget management, public website, governance, and cost-conscious runtime work.',
    alternates: { canonical: '/updates' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const UPDATES = [
    {
        date: 'May 22, 2026',
        title: 'Main website content sharpened for buyer-facing trust',
        items: [
            'Custom help domains such as help.yourapp.com are now presented as a first-class hosted-help benefit.',
            'Ticket debugging context is now described as capped, sanitized support context instead of raw technical logging.',
            'Security, FAQ, privacy, product, install, and homepage copy now explain those benefits without exposing internal tenant or store details.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Hosted help, FAQ, billing, and public-site refresh',
        items: [
            'Hosted Help added for docs, FAQ, changelog, robots, and sitemap on support domains such as help.yourapp.com.',
            'Article-backed FAQ generation and FAQ management are now part of the public product story.',
            'Canonica billing now uses product-scoped plans, support credits, transactions, and Razorpay flows from the Canonica dashboard.',
            'Website copy refreshed around Launch Setup, Support Control, Knowledge Governance, and the cost-conscious runtime layer.',
        ],
    },
    {
        date: 'May 22, 2026',
        title: 'Public runtime cache and security hardening',
        items: [
            'Public KB, FAQ, changelog, and hosted-help content now use cached compact payloads with owner-write invalidation.',
            'Search cache freshness now uses source-version manifests so repeated answers can be fast without serving stale content.',
            'Direct production access to the internal hosted-help rewrite route is blocked; hosted help renders through registered domains.',
        ],
    },
    {
        date: 'May 21, 2026',
        title: 'Canonica system inventory and product website map',
        items: [
            'Codebase-first Canonica system inventory added under docs.',
            'Homepage now shows Launch Setup, Support Control, Knowledge Governance, and Runtime Layer.',
            'Website claims now focus on enabled core flows and keep rollout-only API and adapter work out of buyer copy.',
        ],
    },
    {
        date: 'May 21, 2026',
        title: 'Self-sellable public website',
        items: [
            'Public demo, security, FAQ, privacy, and terms pages added.',
            'Starter, Growth, and Studio pricing copy aligned for small SaaS buyers.',
            'Canonica sitemap, robots, manifest, icons, and structured data added.',
        ],
    },
    {
        date: 'May 21, 2026',
        title: 'Launch and governance control plane',
        items: [
            'Activation Command Center added with summary-backed readiness.',
            'Product surfaces added for route/page/workflow context mapping.',
            'Trust metrics and tenant-summary scheduler discovery wired for lower Firestore cost.',
        ],
    },
    {
        date: 'May 19, 2026',
        title: 'Widget management',
        items: [
            'Widget key generation, allowed origins, blocked routes, appearance, behavior, and install snippets added.',
            'Runtime config endpoint added so installed widgets can read dashboard settings without script edits.',
        ],
    },
];

export default function CanonicaUpdatesPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Updates</p>
                    <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">
                        Canonica product movement, without the noise.
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#a0a0c0]">
                        Recent changes that affect launch readiness, page-aware support, governance, widget operations, and public product clarity.
                    </p>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-16">
                    <div className="mx-auto max-w-4xl">
                        <div className="space-y-6">
                            {UPDATES.map((update) => (
                                <article key={`${update.date}-${update.title}`} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                                    <div className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-300">{update.date}</div>
                                    <h2 className="text-2xl font-semibold text-white">{update.title}</h2>
                                    <ul className="mt-5 space-y-3">
                                        {update.items.map((item) => (
                                            <li key={item} className="flex gap-3 text-sm leading-relaxed text-[#a0a0c0]">
                                                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="border-t border-white/[0.06] px-6 py-20 text-center">
                    <h2 className="text-3xl font-bold">Want to see the product instead?</h2>
                    <p className="mx-auto mt-4 max-w-2xl text-lg text-[#a0a0c0]">
                        The static demo shows how Canonica changes support by product page without using production data.
                    </p>
                    <CanonicaLink
                        basePath={basePath}
                        href="/demo"
                        className="mt-8 inline-block rounded-xl border border-white/[0.1] bg-white/[0.03] px-8 py-3.5 text-sm font-semibold text-[#d6d6ef] transition-all hover:border-white/[0.2] hover:text-white"
                    >
                        Try Demo
                    </CanonicaLink>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
