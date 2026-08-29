import { LuArrowRight } from 'react-icons/lu';
import { getAnswerlatticePlans } from '@data/answerlattice/plans';
import AnswerlatticeLink from './AnswerlatticeLink';
import SectionHeader from './SectionHeader';

const PLAN_FIT: Record<string, string> = {
    answerlattice_launch: 'For one product building its first reviewed support answers.',
    answerlattice_growth: 'For a growing product with more questions and review work.',
    answerlattice_studio: 'For studios supporting several products from separate workspaces.',
};

const formatPrice = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;

export default function PricingPreviewSection({ basePath = '' }: { basePath?: string }) {
    const plans = getAnswerlatticePlans()
        .filter((plan) => plan.billingInterval === 'MONTH')
        .sort((left, right) => left.priceINR.price - right.priceINR.price);

    return (
        <section className="al-pricing-preview">
            <div className="mx-auto max-w-6xl">
                <SectionHeader
                    eyebrow="Pricing preview"
                    title="Start with one product. Grow only when support grows."
                    description="Choose by the number of products and the amount of support work—not by technical features you do not need yet."
                />
                <div className="al-pricing-preview__grid">
                    {plans.map((plan) => (
                        <article
                            key={plan.planId}
                            className={`al-pricing-preview__card ${plan.isRecommended ? 'al-pricing-preview__card--recommended' : ''}`}
                            data-answerlattice-reveal-item
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3>{plan.name}</h3>
                                    <p>{PLAN_FIT[plan.planId]}</p>
                                </div>
                                {plan.isRecommended && (
                                    <span className="al-pricing-preview__badge">
                                        Popular
                                    </span>
                                )}
                            </div>
                            <div className="al-pricing-preview__price">{formatPrice(plan.priceINR.price)}</div>
                            <p className="al-pricing-preview__credits">{plan.priceINR.monthlyCredits} support credits / month</p>
                        </article>
                    ))}
                </div>
                <div className="al-pricing-preview__actions">
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/pricing"
                        data-answerlattice-event="homepage_pricing_clicked"
                        data-answerlattice-label="view_pricing"
                        className="al-pricing-preview__button al-pricing-preview__button--secondary"
                    >
                        View pricing
                        <LuArrowRight aria-hidden size={15} />
                    </AnswerlatticeLink>
                    <AnswerlatticeLink
                        basePath={basePath}
                        href="/early-access"
                        data-answerlattice-event="homepage_pricing_clicked"
                        data-answerlattice-label="build_first_10_from_pricing_preview"
                        className="al-pricing-preview__button al-pricing-preview__button--primary"
                    >
                        Request early access
                        <LuArrowRight aria-hidden size={15} />
                    </AnswerlatticeLink>
                </div>
            </div>
        </section>
    );
}
