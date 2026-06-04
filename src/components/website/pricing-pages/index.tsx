"use client";

import { BillingInterval, Currency, Plan, PlanType, PurchaseIntent } from '@data/common';
import PlatformFeaturesList from '@data/PlatformFeaturesList';
import { CustomePlanForB2B, getB2BPlansList, getB2CPlansList } from '@data/PlatformPlansList';
import usePaymentHandler from '@hook/usePaymentHandler';
import { Switch } from '@shadcncomponents/switch';
import { useToast } from '@shadcnhooks/use-toast';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { LuCheck, LuFileText, LuSparkles } from 'react-icons/lu';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import WebsiteFeatureCard from '../shared/WebsiteFeatureCard';
import WebsiteHeadline from '../shared/WebsiteHeadline';
import AnimateOnScroll, { AnimateStaggerChild } from '../shared/AnimateOnScroll';
import CurrencySwitcher from './CurrencySwitcher';
import './main.css';
import PlanCard from './PlanCard';
import PricingFaq from './PricingFaq';
import CreditPacksCtaSection from './shared/CreditPacksCtaSection';
import EnterpriseCtaSection from './shared/EnterpriseCtaSection';
import Loader from './shared/Loader';
import WelcomeBackBanner from './WelcomeBackBanner';
import { buildCurrentWebsiteSignInPath } from '@/lib/website/signInLinks';

const FeatureComparisonTable = dynamic(() => import('./FeatureComparisonTable'), { ssr: false });
const OnboardingModal = dynamic(() => import('./OnboardingModal'), { ssr: false });
const SubscriptionPayementSuccessModal = dynamic(() => import('./SubscriptionPayementSuccessModal'), { ssr: false });

export const formatCurrencyOnPricingPage = (amount: number, currency: Currency) => {
    if (!currency) return '';
    const amountInCents = amount / 100;
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN', {
        style: 'currency',
        currency: currency.toUpperCase(),
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amountInCents);
};

const PricingPageRenderer: React.FC<{ welcomeTenantName?: string | null, activeSubscription?: FirestoreSubscriptionDoc }> = ({ welcomeTenantName, activeSubscription }) => {
    const t = useTranslations('Website');
    const { toast } = useToast();
    const { data: session, status } = useSession();
    const [activeBusinessType, setActiveBusinessType] = useState<PlanType>('B2C');
    const [billingInterval, setBillingInterval] = useState<BillingInterval>('YEAR');
    const [currency, setCurrency] = useState<Currency>('USD');
    const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<{ active: boolean; purchaseIntent: PurchaseIntent | null; paymentDetails: any | null; }>({
        active: false,
        purchaseIntent: null,
        paymentDetails: null,
    });
    const onboardingInProgress = useRef(false);
    const allPlansList = [...getB2CPlansList(), ...getB2BPlansList()];
    const [isLoading, setIsLoading] = useState(false);
    const [isComparisonOpen, setIsComparisonOpen] = useState(false);
    const pricingDecisionSteps = [
        { icon: LuFileText, title: t('Pricing.decision0Title'), desc: t('Pricing.decision0Desc') },
        { icon: LuCheck, title: t('Pricing.decision1Title'), desc: t('Pricing.decision1Desc') },
        { icon: LuSparkles, title: t('Pricing.decision2Title'), desc: t('Pricing.decision2Desc') },
    ];
    const activePlans = allPlansList.filter(plan => plan.type === activeBusinessType && plan.billingInterval === billingInterval);

    const handleLoader = (action: { type: string }) => {
        setIsLoading(action.type === "loader/startLoader");
    }
    const { onClickPaymentCard, pendingPlan, executePostOnboarding, isScriptLoaded } = usePaymentHandler(handleLoader);

    useEffect(() => {
        try {
            const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (userTimeZone === 'Asia/Kolkata' || userTimeZone === 'Asia/Calcutta') {
                setCurrency('INR');
            }
        } catch (error) {
            console.error("Error detecting user's timezone:", error);
        }
    }, []);

    useEffect(() => {
        if (!isScriptLoaded) return;
        const intentExists = localStorage.getItem('purchaseIntent');
        if (status === 'authenticated' && session?.user) {
            if (onboardingInProgress.current) return;
            if (intentExists) {
                onboardingInProgress.current = true;
                if (session.user.tenantId) {//user is already onboarded and his licen is expired
                    handlePaymentCardClick(JSON.parse(intentExists).plan)
                } else {
                    startPaymentprocessing()
                }
            }
        }
    }, [session, isScriptLoaded]);

    const descardPaymentFlow = () => {
        onboardingInProgress.current = false;
        setIsLoading(false);
        localStorage.removeItem('purchaseIntent');
    }

    const handleOnboardingModalSubmit = (details: { businessName: string; businessIndustry: string; timeZone?: string; businessDayEndTime?: string }) => {
        if (!pendingPlan) {
            console.error("User selection was lost. Cannot proceed.");
            return;
        }

        const purchaseIntent: PurchaseIntent = {
            ...details,//businessName, businessIndustry
            ...pendingPlan,//plan, currency
        };

        localStorage.setItem('purchaseIntent', JSON.stringify(purchaseIntent));
        if (session?.user) {
            startPaymentprocessing()
        } else {
            window.location.assign(buildCurrentWebsiteSignInPath());
        }
    };

    const handlePaymentSuccessResponse = async (paymentResponse: any) => {
        if (Boolean(paymentResponse)) {
            const purchaseIntent = JSON.parse(localStorage.getItem('purchaseIntent') || '{}');
            setIsSuccessModalOpen({ active: true, purchaseIntent: purchaseIntent, paymentDetails: paymentResponse, });
            descardPaymentFlow();
        }
    }

    const startPaymentprocessing = () => {
        setIsLoading(true);
        const purchaseIntent = JSON.parse(localStorage.getItem('purchaseIntent') || '{}');
        executePostOnboarding(purchaseIntent).then((paymentResponse) => {
            handlePaymentSuccessResponse(paymentResponse);
        })
            .catch((error) => {
                descardPaymentFlow()
                console.error('Post-onboarding process failed in startPaymentprocessing', error);
                toast({ variant: 'destructive', title: 'Error', description: 'Payment Processing Failed, If your money gets deducted, please contact support or try again.' });
            });
    }

    const handlePaymentCardClick = (plan: Plan) => {
        try {
            setIsLoading(true);
            onClickPaymentCard(plan, currency, () => setIsOnboardingModalOpen(true)).then((paymentResponse) => {
                handlePaymentSuccessResponse(paymentResponse);
            })
                .catch((error) => {
                    descardPaymentFlow();
                    console.error('Payment flow failed in handlePaymentCardClick', error);
                    toast({ variant: 'destructive', title: 'Error', description: 'Payment Processing Failed, If your money gets deducted, please contact support or try again.' });
                });
        } catch (error) {
            descardPaymentFlow();
            toast({ variant: 'destructive', title: 'Error', description: 'Payment Processing Failed, If your money gets deducted, please contact support or try again.' });
            console.error('Payment flow failed in handlePaymentCardClick', error);
        }
    }

    return (
        <>
            {welcomeTenantName && (
                <SectionWrapper variant="default">
                    <WelcomeBackBanner tenantName={welcomeTenantName} />
                </SectionWrapper>
            )}

            <section style={{ padding: 'var(--ws-space-16) var(--ws-space-6) var(--ws-space-4)', textAlign: 'center' }}>
                {/* LAYER 1 — Core Message */}
                <AnimateOnScroll>
                    <div className="ws-container" style={{ maxWidth: '680px' }}>
                        <WebsiteHeadline
                            as="h1"
                            size="section"
                            text={t('Pricing.heroTitle')}
                            highlightedText={t('Pricing.heroHighlight')}
                        />
                        <p style={{ fontSize: '1rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-3)', lineHeight: 1.6 }}>
                            {t('Pricing.heroSubtitle')}
                        </p>
                        <p style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-4)', lineHeight: 1.5 }}>
                            {t('Pricing.heroSourceLine')}
                        </p>
                    </div>
                </AnimateOnScroll>

                {/* LAYER 2 — Outcome + Pain (merged, 3 items max) */}
                <AnimateOnScroll delay={0.08}>
                    <div className="ws-container" style={{ marginTop: 'var(--ws-space-10)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-10)', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>
                            <span>{t('Pricing.proof0')}</span>
                            <span>{t('Pricing.proof1')}</span>
                            <span>{t('Pricing.proof2')}</span>
                        </div>
                    </div>
                </AnimateOnScroll>

                {/* LAYER 3 — Decision + Controls */}
                <AnimateOnScroll delay={0.12}>
                    <div className="ws-container" style={{ marginTop: 'var(--ws-space-8)' }}>
                        {/* Plan selector pills */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-3)', flexWrap: 'wrap', marginBottom: 'var(--ws-space-6)' }}>
                            {['starter', 'pro', 'premium'].map((planId) => (
                                <button
                                    key={planId}
                                    onClick={() => {
                                        const element = document.getElementById('subscription-plans');
                                        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                    }}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: 'var(--ws-radius-md)',
                                        border: planId === 'pro' ? '2px solid var(--ws-brand-secondary)' : '1px solid var(--ws-border-default)',
                                        background: planId === 'pro' ? 'var(--ws-brand-secondary)' : 'transparent',
                                        color: planId === 'pro' ? '#fff' : 'var(--ws-text-primary)',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all var(--ws-transition-fast)',
                                    }}
                                >
                                    {planId === 'starter' && t('Pricing.planStarter')}
                                    {planId === 'pro' && t('Pricing.planPro')}
                                    {planId === 'premium' && t('Pricing.planPremium')}
                                </button>
                            ))}
                        </div>

                        {/* Grouped toggles: Currency + Billing */}
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--ws-space-6)', flexWrap: 'wrap' }}>
                            <CurrencySwitcher currency={currency} onCurrencyChange={setCurrency} />
                            <div className="flex justify-center items-center gap-3">
                                <span
                                    className="text-sm font-medium"
                                    style={{ color: billingInterval === 'MONTH' ? 'var(--ws-text-primary)' : 'var(--ws-text-muted)' }}
                                >
                                    {t('Pricing.monthly')}
                                </span>
                                <Switch
                                    checked={billingInterval === 'YEAR'}
                                    onCheckedChange={(checked) => setBillingInterval(checked ? 'YEAR' : 'MONTH')}
                                    aria-label={t('Pricing.billingToggleLabel')}
                                />
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-sm font-medium"
                                        style={{ color: billingInterval === 'YEAR' ? 'var(--ws-text-primary)' : 'var(--ws-text-muted)' }}
                                    >
                                        {t('Pricing.yearly')}
                                    </span>
                                    <span
                                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: 'var(--ws-bg-success-soft)', color: 'var(--ws-success-text)' }}
                                    >
                                        {t('Pricing.saveYearly')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-3)' }}>
                            {t('Pricing.locationNote')}
                        </p>
                        <div
                            style={{
                                maxWidth: 760,
                                margin: 'var(--ws-space-6) auto 0',
                                padding: 'var(--ws-space-5)',
                                border: '1px solid var(--ws-border-default)',
                                borderRadius: 'var(--ws-radius-md)',
                                background: 'var(--ws-bg-subtle)',
                                textAlign: 'left',
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    color: 'var(--ws-brand-secondary)',
                                    fontSize: '0.75rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {t('Pricing.setupStateEyebrow')}
                            </p>
                            <h2 style={{ margin: 'var(--ws-space-2) 0 0', color: 'var(--ws-text-primary)', fontSize: '1.25rem', fontWeight: 800 }}>
                                {t('Pricing.setupStateTitle')}
                            </h2>
                            <p className="ws-caption" style={{ marginTop: 'var(--ws-space-2)' }}>
                                {t('Pricing.setupStateBody')}
                            </p>
                        </div>
                    </div>
                </AnimateOnScroll>
            </section>

            <section style={{ padding: '0 var(--ws-space-6) var(--ws-space-16)' }}>
                <div className="ws-container">
                    <AnimateOnScroll>
                        <div id="subscription-plans" style={{ paddingTop: 'var(--ws-space-6)' }}>
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'minmax(0, 0.72fr) minmax(0, 1.28fr)',
                                    gap: 'var(--ws-space-6)',
                                    alignItems: 'stretch',
                                    marginBottom: 'var(--ws-space-8)',
                                }}
                            >
                                <div
                                    className="ws-card"
                                    style={{
                                        background: 'var(--ws-bg-subtle)',
                                        borderColor: 'var(--ws-border-default)',
                                    }}
                                >
                                    <p
                                        style={{
                                            margin: 0,
                                            color: 'var(--ws-brand-secondary)',
                                            fontSize: '0.75rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {t('Pricing.decisionEyebrow')}
                                    </p>
                                    <h2
                                        style={{
                                            margin: 'var(--ws-space-3) 0 0',
                                            color: 'var(--ws-text-primary)',
                                            fontSize: '1.5rem',
                                            lineHeight: 1.2,
                                            fontWeight: 800,
                                        }}
                                    >
                                        {t('Pricing.decisionTitle')}
                                    </h2>
                                    <p className="ws-caption" style={{ marginTop: 'var(--ws-space-3)' }}>
                                        {t('Pricing.decisionSubtitle')}
                                    </p>
                                </div>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                                        gap: 'var(--ws-space-4)',
                                    }}
                                >
                                    {pricingDecisionSteps.map((step, index) => {
                                        const Icon = step.icon;
                                        return (
                                            <AnimateStaggerChild key={step.title} index={index}>
                                                <WebsiteFeatureCard
                                                    icon={Icon}
                                                    title={step.title}
                                                    description={step.desc}
                                                    compact
                                                />
                                            </AnimateStaggerChild>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mb-20">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                                    {activePlans.map((plan, index) => (
                                        <AnimateStaggerChild key={`${plan.planId}-${plan.billingInterval}`} index={index}>
                                            <PlanCard
                                                plan={plan}
                                                currency={currency}
                                                onPurchase={(plan) => handlePaymentCardClick(plan)}
                                            />
                                        </AnimateStaggerChild>
                                    ))}
                                    {activeBusinessType === 'B2B' && (
                                        <AnimateStaggerChild index={activePlans.length}>
                                            <PlanCard
                                                plan={CustomePlanForB2B}
                                                currency={currency}
                                                onPurchase={(plan) => handlePaymentCardClick(plan)}
                                            />
                                        </AnimateStaggerChild>
                                    )}
                                </div>
                            </div>
                        </div>
                    </AnimateOnScroll>

                    {/* Pro reinforcement */}
                    <AnimateOnScroll delay={0.08}>
                        <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-6)' }}>
                            <strong style={{ color: 'var(--ws-text-primary)' }}>{t('Pricing.proReinforcementStrong')}</strong> {t('Pricing.proReinforcementBody')}<br />
                            {t('Pricing.proReinforcementAdvice')}
                        </p>
                    </AnimateOnScroll>
                </div>
            </section>

            <SectionWrapper variant="subtle">
                <AnimateOnScroll>
                    <CreditPacksCtaSection currency={currency} activeSubscription={activeSubscription} />
                </AnimateOnScroll>
            </SectionWrapper>

            {/* Time-to-value path */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                        <SectionHeading
                            title={t('Pricing.setupTitle')}
                            highlightedText={t('Pricing.setupHighlight')}
                            centered
                        />
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-8)', flexWrap: 'wrap', marginTop: 'var(--ws-space-8)' }}>
                            {[
                                { title: t('Pricing.setupStep0Title'), desc: t('Pricing.setupStep0Desc') },
                                { title: t('Pricing.setupStep1Title'), desc: t('Pricing.setupStep1Desc') },
                                { title: t('Pricing.setupStep2Title'), desc: t('Pricing.setupStep2Desc') },
                            ].map((step, index) => (
                                <AnimateStaggerChild key={step.title} index={index}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ws-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--ws-space-3)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ws-brand-secondary)' }}>{index + 1}</div>
                                        <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>{step.title}</p>
                                        <p style={{ fontSize: '0.8125rem', color: 'var(--ws-text-secondary)', marginTop: '4px' }}>{step.desc}</p>
                                    </div>
                                </AnimateStaggerChild>
                            ))}
                        </div>
                    </div>
                </AnimateOnScroll>
            </SectionWrapper>

            {/* Collapsible comparison table */}
            <div style={{ padding: 'var(--ws-space-10) var(--ws-space-6)', textAlign: 'center' }}>
                <div className="ws-container">
                    <AnimateOnScroll>
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={() => setIsComparisonOpen(!isComparisonOpen)}
                                style={{
                                    background: 'none',
                                    border: '1px solid var(--ws-border-default)',
                                    borderRadius: 'var(--ws-radius-md)',
                                    padding: '10px 24px',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    color: 'var(--ws-text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all var(--ws-transition-fast)',
                                }}
                            >
                                {isComparisonOpen ? t('Pricing.hideComparison') : t('Pricing.showComparison')}
                            </button>
                        </div>
                    </AnimateOnScroll>

                    <AnimateOnScroll delay={0.08}>
                        {isComparisonOpen && (
                            <div style={{ marginTop: 'var(--ws-space-10)' }}>
                                <FeatureComparisonTable
                                    allFeaturesList={activeBusinessType === 'B2C' ? PlatformFeaturesList.B2C : PlatformFeaturesList.B2B}
                                    plans={activePlans}
                                    planType={activeBusinessType}
                                />
                            </div>
                        )}
                    </AnimateOnScroll>
                </div>
            </div>

            <AnimateOnScroll>
                <EnterpriseCtaSection />
            </AnimateOnScroll>

            <OnboardingModal
                isOpen={isOnboardingModalOpen}
                onClose={() => {
                    setIsOnboardingModalOpen(false)
                    localStorage.removeItem('purchaseIntent');
                    setIsLoading(false);
                }}
                onSubmit={handleOnboardingModalSubmit}
                businessType={activeBusinessType}
            />

            <SubscriptionPayementSuccessModal
                isOpen={isSuccessModalOpen.active}
                onClose={() => setIsSuccessModalOpen({ active: false, purchaseIntent: null, paymentDetails: null })}
                purchaseIntent={isSuccessModalOpen.purchaseIntent}
                paymentDetails={isSuccessModalOpen.paymentDetails}
            />

            {isLoading && <Loader />}
        </>
    );
};

const PricingPage: React.FC<{ welcomeTenantName?: string, activeSubscription?: FirestoreSubscriptionDoc }> = ({ welcomeTenantName, activeSubscription }) => {
    const t = useTranslations('Website');
    return (
        <div id="pricing" className="ws-page">
            <PricingPageRenderer welcomeTenantName={welcomeTenantName} activeSubscription={activeSubscription} />
            <AnimateOnScroll>
                <PricingFaq />
            </AnimateOnScroll>

            {/* Final CTA */}
            <SectionWrapper variant="default">
                <AnimateOnScroll>
                    <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
                        <WebsiteHeadline as="h2" size="compact" text={t('Pricing.finalTitle')} />
                        <a
                            href="#subscription-plans"
                            style={{
                                display: 'inline-block',
                                padding: '14px 28px',
                                backgroundColor: 'var(--ws-brand-secondary)',
                                color: '#fff',
                                borderRadius: 'var(--ws-radius-md)',
                                fontSize: '0.875rem',
                                fontWeight: 600,
                                textDecoration: 'none',
                                transition: 'background-color var(--ws-transition-fast)',
                                whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--ws-brand-primary)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--ws-brand-secondary)'; }}
                        >
                            {t('Pricing.finalCta')}
                        </a>
                    </div>
                </AnimateOnScroll>
            </SectionWrapper>
        </div>
    );
}

export default PricingPage;
