"use client";

import { BillingInterval, Currency, Plan, PlanType, PurchaseIntent } from '@data/common';
import PlatformFeaturesList from '@data/PlatformFeaturesList';
import { CustomePlanForB2B, getB2BPlansList, getB2CPlansList } from '@data/PlatformPlansList';
import usePaymentHandler from '@hook/usePaymentHandler';
import { Switch } from '@shadcncomponents/switch';
import { useToast } from '@shadcnhooks/use-toast';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { signIn, useSession } from 'next-auth/react';
import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';
import SectionHeading from '../shared/SectionHeading';
import SectionWrapper from '../shared/SectionWrapper';
import CurrencySwitcher from './CurrencySwitcher';
import './main.css';
import PlanCard from './PlanCard';
import PricingFaq from './PricingFaq';
import CreditPacksCtaSection from './shared/CreditPacksCtaSection';
import EnterpriseCtaSection from './shared/EnterpriseCtaSection';
import Loader from './shared/Loader';
import WelcomeBackBanner from './WelcomeBackBanner';

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

    const handleOnboardingModalSubmit = (details: { businessName: string; businessIndustry: string }) => {
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
            signIn('google', { callbackUrl: window.location.href });
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
                <div className="ws-container" style={{ maxWidth: '680px' }}>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', fontWeight: 700, lineHeight: 1.25, color: 'var(--ws-text-primary)', letterSpacing: '-0.01em' }}>
                        Everything your customers see. <span style={{ color: 'var(--ws-brand-secondary)' }}>One system.</span>
                    </h1>
                    <p style={{ fontSize: '1rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-3)', lineHeight: 1.6 }}>
                        Menu, pricing, availability, and presentation — always accurate, always live.<br />
                        <strong style={{ color: 'var(--ws-text-primary)' }}>No design or technical setup required.</strong>
                    </p>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-4)', lineHeight: 1.5 }}>
                        Your menu becomes your single source of truth across all customer touchpoints.
                    </p>
                </div>

                {/* LAYER 2 — Outcome + Pain (merged, 3 items max) */}
                <div className="ws-container" style={{ marginTop: 'var(--ws-space-10)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-10)', flexWrap: 'wrap', fontSize: '0.875rem', color: 'var(--ws-text-secondary)' }}>
                        <span>Look premium instantly</span>
                        <span>Update your menu in seconds</span>
                        <span>No more outdated PDFs</span>
                    </div>
                    <p style={{ textAlign: 'center', fontSize: '0.9375rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-4)' }}>
                        Make your menu easier to read, easier to update, and better for customers.
                    </p>
                </div>

                {/* Spacer to plans */}
                <div style={{ marginTop: 'var(--ws-space-12)' }} />
            </section>

            <section style={{ padding: '0 var(--ws-space-6) var(--ws-space-16)' }}>
                <div className="ws-container">
                    <div id="subscription-plans" style={{ paddingTop: 'var(--ws-space-6)' }}>
                        <div className="mb-20">
                            {activeBusinessType === 'B2C' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                                    {allPlansList.filter(plan => plan.type === 'B2C' && plan.billingInterval === billingInterval).map(plan => (
                                        <PlanCard
                                            key={`${plan.planId}-${plan.billingInterval}`}
                                            plan={plan}
                                            currency={currency}
                                            onPurchase={(plan) => handlePaymentCardClick(plan)}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                                    {allPlansList.filter(plan => plan.type === 'B2B' && plan.billingInterval === billingInterval).map(plan => (
                                        <PlanCard
                                            key={`${plan.planId}-${plan.billingInterval}`}
                                            plan={plan}
                                            currency={currency}
                                            onPurchase={(plan) => handlePaymentCardClick(plan)}
                                        />
                                    ))}
                                    <PlanCard
                                        key={CustomePlanForB2B.planId}
                                        plan={CustomePlanForB2B}
                                        currency={currency}
                                        onPurchase={(plan) => handlePaymentCardClick(plan)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pro reinforcement */}
                <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-6)' }}>
                    <strong style={{ color: 'var(--ws-text-primary)' }}>Most restaurants choose Pro</strong> for the best balance of presentation and automation.<br />
                    If you&apos;re unsure, start with Pro.
                </p>

                {/* Toggles below pricing cards */}
                <div className="ws-container" style={{ marginTop: 'var(--ws-space-10)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--ws-space-8)', flexWrap: 'wrap' }}>
                        <div style={{ opacity: 0.8 }}>
                            <CurrencySwitcher currency={currency} onCurrencyChange={setCurrency} />
                        </div>
                        <div className="flex justify-center items-center gap-2">
                            <span className={`text-sm ${billingInterval === 'MONTH' ? 'text-slate-700 dark:text-gray-300' : 'text-slate-400 dark:text-gray-500'}`}>Monthly</span>
                            <Switch
                                checked={billingInterval === 'YEAR'}
                                onCheckedChange={(checked) => setBillingInterval(checked ? 'YEAR' : 'MONTH')}
                                aria-label="Switch between monthly and yearly billing"
                            />
                            <div className="flex items-center gap-1">
                                <span className={`text-sm ${billingInterval === 'YEAR' ? 'text-slate-700 dark:text-gray-300' : 'text-slate-400 dark:text-gray-500'}`}>Yearly</span>
                                <span className="text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded">-17%</span>
                            </div>
                        </div>
                    </div>
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--ws-text-secondary)', marginTop: 'var(--ws-space-3)' }}>
                        Pricing shown based on your location
                    </p>
                </div>
            </section>

            <SectionWrapper variant="subtle">
                <CreditPacksCtaSection currency={currency} activeSubscription={activeSubscription} />
            </SectionWrapper>

            {/* "Go live in minutes" — time-to-value */}
            <SectionWrapper variant="default">
                <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
                    <SectionHeading
                        title="Go live in minutes"
                        highlightedText="minutes"
                        centered
                    />
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-8)', flexWrap: 'wrap', marginTop: 'var(--ws-space-8)' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ws-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--ws-space-3)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ws-brand-secondary)' }}>1</div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>Upload your menu</p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--ws-text-secondary)', marginTop: '4px' }}>Image, PDF, or link</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ws-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--ws-space-3)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ws-brand-secondary)' }}>2</div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>Review and adjust</p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--ws-text-secondary)', marginTop: '4px' }}>AI structures everything</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ws-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--ws-space-3)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--ws-brand-secondary)' }}>3</div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)' }}>Publish and share</p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--ws-text-secondary)', marginTop: '4px' }}>QR, link, screens — instantly</p>
                        </div>
                    </div>
                </div>
            </SectionWrapper>

            {/* Infrastructure layer */}
            <SectionWrapper variant="subtle">
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ws-text-primary)', marginBottom: 'var(--ws-space-6)' }}>Your menu stays consistent everywhere your customers see it</p>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--ws-space-8)', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--ws-text-secondary)' }}>
                        <span>QR codes</span>
                        <span>Direct links</span>
                        <span>Screens and shared menus</span>
                        <span>Real-time updates included</span>
                    </div>
                </div>
            </SectionWrapper>

            {/* Collapsible comparison table */}
            <div style={{ padding: 'var(--ws-space-10) var(--ws-space-6)', textAlign: 'center' }}>
                <div className="ws-container">
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
                            {isComparisonOpen ? 'Hide full comparison' : 'View full comparison'}
                        </button>
                    </div>
                    {isComparisonOpen && (
                        <div style={{ marginTop: 'var(--ws-space-10)' }}>
                            {activeBusinessType === 'B2C' ? (
                                <FeatureComparisonTable allFeaturesList={PlatformFeaturesList.B2C} plans={allPlansList.filter(plan => plan.type === 'B2C' && plan.billingInterval === billingInterval)} planType={'B2C'} />
                            ) : (
                                <FeatureComparisonTable allFeaturesList={PlatformFeaturesList.B2B} plans={allPlansList.filter(plan => plan.type === 'B2B' && plan.billingInterval === billingInterval)} planType={'B2B'} />
                            )}
                        </div>
                    )}
                </div>
            </div>

            <EnterpriseCtaSection />

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
    return (
        <div id="pricing" className="ws-page">
            <PricingPageRenderer welcomeTenantName={welcomeTenantName} activeSubscription={activeSubscription} />
            <PricingFaq />

            {/* Final CTA */}
            <SectionWrapper variant="default">
                <div style={{ textAlign: 'center', maxWidth: '520px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ws-text-primary)', marginBottom: 'var(--ws-space-4)' }}>
                        Start with Pro — run your entire menu from one place
                    </h2>
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
                        Start with Pro
                    </a>
                </div>
            </SectionWrapper>
        </div>
    );
}

export default PricingPage;
