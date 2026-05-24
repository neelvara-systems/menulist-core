import { getCanonicaPlans } from '@data/canonica/plans';
import CanonicaLink from './CanonicaLink';

const PLAN_FIT: Record<string, string> = {
    canonica_starter: 'Best for one AI-built SaaS app with early repeated questions.',
    canonica_growth: 'Best for active SaaS products that need weekly review and higher capacity.',
    canonica_studio: 'Best for studios or agencies launching multiple AI-built products.',
};

const formatPrice = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

export default function PricingPreviewSection({ basePath = '' }: { basePath?: string }) {
    const plans = getCanonicaPlans()
        .filter((plan) => plan.billingInterval === 'MONTH' && plan.planId !== 'canonica_beta')
        .sort((left, right) => left.priceINR.price - right.priceINR.price);

    return (
        <section className="border-t border-white/[0.06] px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <div className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-indigo-400">Pricing clarity</p>
                        <h2 className="text-3xl font-bold leading-tight sm:text-4xl">
                            Start free, then move to predictable INR plans.
                        </h2>
                    </div>
                    <p className="text-base leading-relaxed text-[#a0a0c0]">
                        Support credits are plan capacity for governed answers, chat assistance, and knowledge governance work. Static hosted help pages and widget loading do not consume credits.
                    </p>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <article
                            key={plan.planId}
                            className={`rounded-2xl border p-5 ${
                                plan.isRecommended
                                    ? 'border-indigo-500/35 bg-indigo-500/[0.08]'
                                    : 'border-white/[0.06] bg-white/[0.02]'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#808099]">{PLAN_FIT[plan.planId]}</p>
                                </div>
                                {plan.isRecommended && (
                                    <span className="rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-semibold text-indigo-300">
                                        Popular
                                    </span>
                                )}
                            </div>
                            <div className="mt-5 text-3xl font-bold text-white">{formatPrice(plan.priceINR.price)}</div>
                            <p className="mt-1 text-sm text-[#6b6b8a]">{plan.priceINR.monthlyCredits} support credits / month</p>
                        </article>
                    ))}
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                    <CanonicaLink
                        basePath={basePath}
                        href="/pricing"
                        data-canonica-event="homepage_pricing_clicked"
                        data-canonica-label="view_pricing"
                        className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                    >
                        View pricing
                    </CanonicaLink>
                    <CanonicaLink
                        basePath={basePath}
                        href="/get-started"
                        data-canonica-event="homepage_pricing_clicked"
                        data-canonica-label="start_beta_from_pricing_preview"
                        className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-600"
                    >
                        Start free setup
                    </CanonicaLink>
                </div>
            </div>
        </section>
    );
}
