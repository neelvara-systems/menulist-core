"use client";

import { Currency, Plan } from '@data/common';

import React from 'react';
import { useTranslations } from 'next-intl';
import { LuBuilding2, LuCheck, LuStore, LuZap } from 'react-icons/lu';
import { formatCurrencyOnPricingPage } from '.';
import { getMenuListPlanMinimumQuantity } from '@lib/billing/menulistPricingPolicy';
import './main.css';

type PlanCardProps = {
    plan: Plan;
    currency: Currency;
    onPurchase: (plan: Plan) => void;
};

const PlanCard: React.FC<PlanCardProps> = ({ plan, currency, onPurchase }) => {
    const t = useTranslations('Website');

    const unitPrice = plan[`price${currency}`].price;
    const normalizedPlanId = ['starter', 'pro', 'premium'].includes(plan.planId) ? plan.planId : 'custom';
    const planCopy = {
        audience: t(`Pricing.${normalizedPlanId}Audience`),
        surfaces: [
            t(`Pricing.${normalizedPlanId}Surface0`),
            t(`Pricing.${normalizedPlanId}Surface1`),
        ],
        controls: [
            t(`Pricing.${normalizedPlanId}Control0`),
            t(`Pricing.${normalizedPlanId}Control1`),
            t(`Pricing.${normalizedPlanId}Control2`),
        ],
        notIncluded: t(`Pricing.${normalizedPlanId}NotIncluded`),
        buttonText: t(`Pricing.${normalizedPlanId}Cta`),
    };
    const planStyles = {
        starter: {
            icon: <LuStore className="w-full h-full text-blue-500" />,
        },
        pro: {
            icon: <LuBuilding2 className="w-full h-full text-blue-500" />,
        },
        premium: {
            icon: <LuZap className="w-full h-full text-blue-500" />,
        },
        custom: {
            icon: <LuZap className="w-full h-full text-blue-500" />,
        },
    };

    const currentStyle = planStyles[normalizedPlanId as keyof typeof planStyles];

    const intervalLabel = plan.billingInterval === 'MONTH' ? t('Pricing.planMonthlyShort') : t('Pricing.planYearlyShort');
    const planName = plan.name.replace(` (Yearly)`, '').replace(` (Monthly)`, '');
    const minimumQuantity = getMenuListPlanMinimumQuantity(plan);
    const isMultiLocationPlan = plan.type === 'B2C' && plan.planId === 'premium';
    const displayedPrice = unitPrice === null ? null : unitPrice * minimumQuantity;

    return (
        <article style={planCardStyle(plan.isRecommended)}>
            {plan.isRecommended ? (
                <div style={recommendedBadgeStyle}>{t('Pricing.planRecommendedBadge')}</div>
            ) : null}

            <div style={planHeaderStyle}>
                <div style={planIconStyle}>{currentStyle.icon}</div>
                <div style={{ minWidth: 0 }}>
                    <h3 style={planNameStyle}>{planName}</h3>
                    {normalizedPlanId !== 'custom' ? (
                        <div style={planPriceRowStyle}>
                            <span style={planPriceStyle}>{displayedPrice !== null ? formatCurrencyOnPricingPage(displayedPrice, currency) : t('Pricing.planPriceUnavailable')}</span>
                            <span style={planIntervalStyle}>/ {intervalLabel}</span>
                        </div>
                    ) : null}
                    {isMultiLocationPlan && unitPrice !== null ? (
                        <p style={planPriceDetailStyle}>
                            {t('Pricing.planPerLocationDetail', {
                                count: minimumQuantity,
                                price: formatCurrencyOnPricingPage(unitPrice, currency),
                            })}
                        </p>
                    ) : null}
                </div>
            </div>

            <div style={planAudienceStyle}>
                <span style={planSectionLabelStyle}>{t('Pricing.planAudienceLabel')}</span>
                <p style={planAudienceCopyStyle}>{planCopy.audience}</p>
            </div>

            <div style={planSectionStyle}>
                <span style={planSectionLabelStyle}>{t('Pricing.planSurfacesLabel')}</span>
                <ul style={planListStyle}>
                    {planCopy.surfaces.map((item) => (
                        <li key={item} style={planListItemStyle}>
                            <LuCheck style={planCheckIconStyle} aria-hidden="true" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div style={planSectionStyle}>
                <span style={planSectionLabelStyle}>{t('Pricing.planControlsLabel')}</span>
                <ul style={planListStyle}>
                    {planCopy.controls.map((item) => (
                        <li key={item} style={planListItemStyle}>
                            <LuCheck style={planCheckIconStyle} aria-hidden="true" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div style={planNotIncludedStyle}>
                <span style={planSectionLabelStyle}>{t('Pricing.planNotIncludedLabel')}</span>
                <p style={planNotIncludedCopyStyle}>{planCopy.notIncluded}</p>
            </div>

            <button
                onClick={() => onPurchase(plan)}
                style={planButtonStyle}
            >
                {planCopy.buttonText}
            </button>
        </article>
    );
};

const planCardStyle = (isRecommended?: boolean): React.CSSProperties => ({
    background: isRecommended ? 'linear-gradient(180deg, color-mix(in srgb, var(--ws-brand-secondary) 8%, var(--ws-bg-surface)), var(--ws-bg-surface) 34%)' : 'var(--ws-bg-surface)',
    border: isRecommended ? '2px solid var(--ws-brand-secondary)' : '1px solid var(--ws-border-default)',
    borderRadius: 'var(--ws-radius-lg)',
    boxShadow: isRecommended ? '0 18px 44px color-mix(in srgb, var(--ws-brand-secondary) 14%, transparent)' : 'var(--ws-shadow-sm)',
    color: 'var(--ws-text-primary)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    padding: 'var(--ws-space-7)',
    position: 'relative',
});

const recommendedBadgeStyle: React.CSSProperties = {
    alignSelf: 'flex-start',
    backgroundColor: 'var(--ws-brand-secondary)',
    borderRadius: '999px',
    color: '#fff',
    fontSize: '0.8125rem',
    fontWeight: 800,
    lineHeight: 1,
    marginBottom: 'var(--ws-space-4)',
    padding: '8px 12px',
};

const planHeaderStyle: React.CSSProperties = {
    alignItems: 'center',
    display: 'grid',
    gap: 'var(--ws-space-4)',
    gridTemplateColumns: '48px minmax(0, 1fr)',
};

const planIconStyle: React.CSSProperties = {
    alignItems: 'center',
    backgroundColor: 'var(--ws-bg-accent)',
    border: '1px solid var(--ws-border-subtle)',
    borderRadius: 'var(--ws-radius-lg)',
    display: 'flex',
    height: '48px',
    justifyContent: 'center',
    padding: '12px',
    width: '48px',
};

const planNameStyle: React.CSSProperties = {
    color: 'var(--ws-text-primary)',
    fontSize: '1.25rem',
    fontWeight: 800,
    lineHeight: 1.2,
    margin: 0,
};

const planPriceRowStyle: React.CSSProperties = {
    alignItems: 'baseline',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '6px',
};

const planPriceStyle: React.CSSProperties = {
    color: 'var(--ws-text-primary)',
    fontSize: '2rem',
    fontWeight: 850,
    lineHeight: 1.05,
};

const planIntervalStyle: React.CSSProperties = {
    color: 'var(--ws-text-secondary)',
    fontSize: '0.9375rem',
    fontWeight: 650,
};

const planPriceDetailStyle: React.CSSProperties = {
    color: 'var(--ws-text-secondary)',
    fontSize: '0.8125rem',
    lineHeight: 1.35,
    margin: '6px 0 0',
};

const planAudienceStyle: React.CSSProperties = {
    borderBottom: '1px solid var(--ws-border-subtle)',
    marginTop: 'var(--ws-space-5)',
    paddingBottom: 'var(--ws-space-5)',
};

const planAudienceCopyStyle: React.CSSProperties = {
    color: 'var(--ws-text-secondary)',
    fontSize: '0.9375rem',
    lineHeight: 1.55,
    margin: '6px 0 0',
};

const planSectionStyle: React.CSSProperties = {
    marginTop: 'var(--ws-space-5)',
};

const planSectionLabelStyle: React.CSSProperties = {
    color: 'var(--ws-brand-secondary)',
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 850,
    lineHeight: 1.2,
    textTransform: 'uppercase',
};

const planListStyle: React.CSSProperties = {
    display: 'grid',
    gap: '10px',
    listStyle: 'none',
    margin: 'var(--ws-space-3) 0 0',
    padding: 0,
};

const planListItemStyle: React.CSSProperties = {
    alignItems: 'flex-start',
    color: 'var(--ws-text-secondary)',
    display: 'grid',
    fontSize: '0.9375rem',
    gap: '10px',
    gridTemplateColumns: '18px minmax(0, 1fr)',
    lineHeight: 1.45,
};

const planCheckIconStyle: React.CSSProperties = {
    color: 'var(--ws-success)',
    height: '18px',
    marginTop: '2px',
    width: '18px',
};

const planNotIncludedStyle: React.CSSProperties = {
    backgroundColor: 'var(--ws-bg-subtle)',
    border: '1px solid var(--ws-border-subtle)',
    borderRadius: 'var(--ws-radius-md)',
    marginTop: 'var(--ws-space-5)',
    padding: 'var(--ws-space-4)',
};

const planNotIncludedCopyStyle: React.CSSProperties = {
    color: 'var(--ws-text-secondary)',
    fontSize: '0.875rem',
    lineHeight: 1.5,
    margin: '6px 0 0',
};

const planButtonStyle: React.CSSProperties = {
    alignItems: 'center',
    backgroundColor: 'var(--ws-cta-default)',
    border: 'none',
    borderRadius: 'var(--ws-radius-md)',
    color: '#fff',
    cursor: 'pointer',
    display: 'inline-flex',
    fontSize: '0.9375rem',
    fontWeight: 800,
    justifyContent: 'center',
    marginTop: 'auto',
    minHeight: '48px',
    padding: '12px 18px',
    width: '100%',
};

export default PlanCard;
