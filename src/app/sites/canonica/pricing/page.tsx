import { Metadata } from 'next';
import { headers } from 'next/headers';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';

export const metadata: Metadata = {
    title: 'Pricing',
    description: 'Simple, transparent pricing for Canonica. Start free, scale as you grow.',
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const INCLUDED = [
    'Product Ontology (unlimited entities)',
    'Canonical Answer Engine',
    'Drift Governance (4 drift classes)',
    'Signal Mutation Engine',
    'Nightly automated audits',
    'Coverage KPI tracking',
    'Release version binding',
    'Append-only audit trail',
    'Tenant-isolated data',
    'API access (read + write)',
];

export default function CanonicaPricingPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Pricing</p>
                    <h1 className="text-4xl font-bold sm:text-5xl">Simple, transparent pricing</h1>
                    <p className="mx-auto mt-4 max-w-lg text-lg text-[#a0a0c0]">
                        Canonica is currently in private beta. During beta, all features are included at no cost.
                    </p>
                </section>

                <section className="px-6 pb-24">
                    <div className="mx-auto max-w-lg">
                        {/* Beta card */}
                        <div className="rounded-2xl border border-indigo-500/30 bg-white/[0.03] p-8">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-400">
                                    Beta
                                </span>
                            </div>
                            <div className="mb-1 text-4xl font-bold">$0</div>
                            <p className="mb-6 text-sm text-[#6b6b8a]">Free during private beta. All features included.</p>
                            <CanonicaLink
                                basePath={basePath}
                                href="/get-started"
                                className="mb-8 block w-full rounded-xl bg-indigo-500 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-indigo-600"
                            >
                                Request Early Access
                            </CanonicaLink>

                            <ul className="space-y-3">
                                {INCLUDED.map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-[#a0a0c0]">
                                        <span className="mt-0.5 text-indigo-400">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <p className="mt-8 text-center text-sm text-[#6b6b8a]">
                            Post-beta pricing will be per-tenant, based on canonical answer volume and API usage.
                            Beta partners will receive preferred pricing.
                        </p>
                    </div>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
