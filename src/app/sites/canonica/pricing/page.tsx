import { Metadata } from 'next';
import { headers } from 'next/headers';
import { getCanonicaPlans } from '@data/canonica/plans';
import { CANONICA_CREDIT_PACKS_LIST } from '@lib/billing/productBillingPlans';
import CanonicaLink from '../components/CanonicaLink';
import CanonicaFooter from '../components/Footer';
import CanonicaHeader from '../components/Header';

export const metadata: Metadata = {
    title: 'Pricing',
    description: 'Founder-friendly INR pricing, beta setup, support credits, and paid Canonica plans for small SaaS teams.',
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
    'Hosted help center',
    'Product surface mapping',
    'Human-approved governance queue',
];

const supportCreditPack = CANONICA_CREDIT_PACKS_LIST[0];

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
                        Start setup on beta, then move into a paid plan or add support credits from Canonica Billing when your workspace is ready.
                    </p>
                </section>

                <section className="px-6 pb-10">
                    <div className="mx-auto max-w-6xl rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.07] p-6">
                        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                            <div>
                                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-indigo-300">Beta setup</p>
                                <h2 className="text-2xl font-bold text-white">Create the workspace first. Upgrade when the support layer is ready.</h2>
                                <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">
                                    Public onboarding currently creates the Canonica beta workspace, product account bridge, subscription summary, and one-time widget key. Paid plans and top-ups run through the Canonica Billing screen with product-scoped Razorpay requests.
                                </p>
                            </div>
                            <CanonicaLink
                                basePath={basePath}
                                href="/get-started"
                                className="rounded-xl bg-indigo-500 px-6 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-600"
                            >
                                Start Beta Setup
                            </CanonicaLink>
                        </div>
                    </div>
                </section>

                <section className="px-6 pb-12">
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
                                <p className="mb-1 text-sm text-[#6b6b8a]">per month, billed in INR</p>
                                <p className="mb-6 text-sm text-[#808099]">{plan.priceINR.monthlyCredits} support credits / month</p>
                                <CanonicaLink
                                    basePath={basePath}
                                    href="/get-started"
                                    className={`mb-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                                        plan.isRecommended
                                            ? 'bg-indigo-500 text-white hover:bg-indigo-600'
                                            : 'border border-white/[0.12] bg-white/[0.03] text-[#d6d6ef] hover:border-white/[0.24]'
                                    }`}
                                >
                                    Start Beta Setup
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
                </section>

                <section className="border-y border-white/[0.06] bg-white/[0.01] px-6 py-14">
                    <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Support credits</p>
                            <h2 className="text-2xl font-bold text-white">Top up for launch spikes without changing the plan.</h2>
                            <p className="mt-3 text-sm leading-relaxed text-[#a0a0c0]">
                                Canonica keeps pricing predictable, then lets product owners buy extra support credits when imports, launch weeks, or heavy governance work need more capacity.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6">
                            <div className="text-lg font-semibold text-white">{supportCreditPack.name}</div>
                            <p className="mt-2 text-sm leading-relaxed text-[#808099]">{supportCreditPack.description}</p>
                            <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-white/[0.06] pt-5">
                                <div>
                                    <div className="text-3xl font-bold text-white">{formatPrice(supportCreditPack.priceINR.price)}</div>
                                    <div className="text-sm text-[#6b6b8a]">{supportCreditPack.creditAmount} credits, one-time purchase</div>
                                </div>
                                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs text-[#a0a0c0]">
                                    Bought inside Canonica Billing
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-relaxed text-[#6b6b8a]">
                        Public packaging stays monthly and INR-first. Usage limits protect infrastructure, but Canonica is not priced as a punishment for successful support deflection.
                    </p>
                </section>
            </main>
            <CanonicaFooter basePath={basePath} />
        </>
    );
}
