import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getCanonicaPlans } from '@data/canonica/plans';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';

export const metadata: Metadata = {
    title: 'Pricing',
    description: 'Founder-friendly INR pricing for Canonica support knowledge infrastructure.',
    alternates: { canonical: '/pricing' },
};

function getBasePath(): string {
    try {
        const h = headers();
        const host = h.get('host') || '';
        return (h.get('x-product-id') && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) ? '/__canonica' : '';
    } catch { return ''; }
}

const PLAN_BULLETS: Record<string, string[]> = {
    canonica_starter: [
        'One SaaS product workspace',
        'Widget and help center',
        'Basic canonical coverage tracking',
        'Product surfaces for page-aware support',
    ],
    canonica_growth: [
        'Signal-to-knowledge queue',
        'Release-aware answer review',
        'Weekly governance digest',
        'Higher signal and surface limits',
    ],
    canonica_studio: [
        'Up to 5 client workspaces',
        'Reusable install and setup patterns',
        'Higher signal and content limits',
        'Built for agencies and dev studios',
    ],
};

const formatPrice = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

const publicPlans = getCanonicaPlans()
    .filter((plan) => plan.billingInterval === 'MONTH' && plan.planId !== 'canonica_beta')
    .sort((left, right) => left.priceINR.price - right.priceINR.price);

const SHARED_INCLUDED = [
    'Canonical answers before fallback',
    'Page-aware widget context',
    'Product surface mapping',
    'Human-approved governance queue',
];

export default function CanonicaPricingPage() {
    const basePath = getBasePath();

    return (
        <>
            <CanonicaHeader basePath={basePath} />
            <main className="pt-16">
                <section className="px-6 py-24 text-center">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Pricing</p>
                    <h1 className="text-4xl font-bold sm:text-5xl">Predictable pricing for small SaaS teams</h1>
                    <p className="mx-auto mt-4 max-w-lg text-lg text-[#a0a0c0]">
                        Start with one product, grow into governance, or manage several launches from a Studio workspace.
                    </p>
                </section>

                <section className="px-6 pb-24">
                    <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
                        {publicPlans.map((plan) => (
                            <div
                                key={plan.planId}
                                className={`rounded-2xl border p-6 ${
                                    plan.isRecommended
                                        ? 'border-indigo-500/40 bg-indigo-500/[0.08]'
                                        : 'border-white/[0.06] bg-white/[0.03]'
                                }`}
                            >
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <div className="text-2xl font-bold text-white">{plan.name}</div>
                                        <p className="mt-1 text-sm leading-relaxed text-[#808099]">{plan.description}</p>
                                    </div>
                                    {plan.isRecommended && (
                                        <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                                            Recommended
                                        </span>
                                    )}
                                </div>
                                <div className="mb-1 text-4xl font-bold">{formatPrice(plan.priceINR.price)}</div>
                                <p className="mb-6 text-sm text-[#6b6b8a]">per month, billed in INR</p>
                                <CanonicaLink
                                    basePath={basePath}
                                    href="/get-started"
                                    className={`mb-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                                        plan.isRecommended
                                            ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                                            : 'border border-white/[0.12] bg-white/[0.03] text-[#d6d6ef] hover:border-white/[0.24]'
                                    }`}
                                >
                                    Start Free
                                </CanonicaLink>

                                <ul className="space-y-3">
                                    {[...(PLAN_BULLETS[plan.planId] || []), ...SHARED_INCLUDED].map((item) => (
                                        <li key={item} className="flex items-start gap-3 text-sm text-[#a0a0c0]">
                                            <span className="mt-0.5 text-indigo-400">✓</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-[#6b6b8a]">
                        Beta access can still start free while payments are being finalized. Public pricing is kept predictable so founders do not pay per resolved question.
                    </p>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
