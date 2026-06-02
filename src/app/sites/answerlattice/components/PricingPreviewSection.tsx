import { getAnswerlatticePlans } from '@data/answerlattice/plans';
import AnswerlatticeLink from './AnswerlatticeLink';
import SectionHeader from './SectionHeader';

const PLAN_FIT: Record<string, string> = {
    answerlattice_starter: 'Best for one SaaS app or digital product preparing its first support layer.',
    answerlattice_growth: 'Best for active SaaS apps and digital products that need weekly review and higher capacity.',
    answerlattice_studio: 'Best for studios or agencies launching multiple digital products.',
};

const formatPrice = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

export default function PricingPreviewSection({ basePath = '' }: { basePath?: string }) {
    const plans = getAnswerlatticePlans()
        .filter((plan) => plan.billingInterval === 'MONTH' && plan.planId !== 'answerlattice_beta')
        .sort((left, right) => left.priceINR.price - right.priceINR.price);

    return (
        <section className="border-t border-white/[0.06] px-6 py-20">
            <div className="mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Pricing clarity"
                    title="Check the pricing shape before setup."
                    description="This is the short version for homepage buyers: start with the beta setup, then move to predictable INR capacity when support volume grows. The full pricing page explains plan details, support credits, top-ups, and fit."
                />
                <div className="grid gap-4 lg:grid-cols-3">
                    {plans.map((plan) => (
                        <article
                            key={plan.planId}
                            className={`rounded-2xl border p-5 ${
                                plan.isRecommended
                                    ? 'border-teal-500/35 bg-teal-500/[0.08]'
                                    : 'border-white/[0.06] bg-white/[0.02]'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-semibold text-white">{plan.name}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-[#808099]">{PLAN_FIT[plan.planId]}</p>
                                </div>
                                {plan.isRecommended && (
                                    <span className="rounded-full bg-teal-500/20 px-2.5 py-1 text-[11px] font-semibold text-teal-200">
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
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/pricing"
                        data-answerlattice-event="homepage_pricing_clicked"
                        data-answerlattice-label="view_pricing"
                        className="rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-[#d6d6ef] transition hover:border-white/[0.2] hover:text-white"
                    >
                        View full pricing
                    </AnswerlatticeLink>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/get-started"
                        data-answerlattice-event="homepage_pricing_clicked"
                        data-answerlattice-label="start_beta_from_pricing_preview"
                        className="rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition hover:bg-teal-800"
                    >
                        Start support setup
                    </AnswerlatticeLink>
                </div>
            </div>
        </section>
    );
}
