"use client";

import { BillingInterval, Currency, Plan, PlanType, PurchaseIntent } from '@data/common';
import PlatformFeaturesList from '@data/PlatformFeaturesList';
import { CustomePlanForB2B, getB2BPlansList, getB2CPlansList } from '@data/PlatformPlansList';
import usePaymentHandler from '@hook/usePaymentHandler';
import SectionHeading from '@shadcncomponents/SectionHeading';
import { Switch } from '@shadcncomponents/switch';
import { Tabs, TabsList, TabsTrigger } from '@shadcncomponents/tabs';
import { useToast } from '@shadcnhooks/use-toast';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { signIn, useSession } from 'next-auth/react';
import React, { useEffect, useRef, useState } from 'react';
import { LuCode, LuStore } from 'react-icons/lu';
import CurrencySwitcher from './CurrencySwitcher';
import FeatureComparisonTable from './FeatureComparisonTable';
import './main.css';
import OnboardingModal from './OnboardingModal';
import PlanCard from './PlanCard';
import PricingFaq from './PricingFaq';
import CreditPacksCtaSection from './shared/CreditPacksCtaSection';
import EnterpriseCtaSection from './shared/EnterpriseCtaSection';
import Loader from './shared/Loader';
import SubscriptionPayementSuccessModal from './SubscriptionPayementSuccessModal';
import WelcomeBackBanner from './WelcomeBackBanner';

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
        <div className="container mx-auto px-4 py-20">
            {welcomeTenantName && <WelcomeBackBanner tenantName={welcomeTenantName} />}

            <SectionHeading
                text="Simple, transparent pricing."
                highlightedText="transparent pricing."
                subheading='Choose the plan that matches your business size. Every plan includes the complete official menu system.'
            />

            <CurrencySwitcher currency={currency} onCurrencyChange={setCurrency} />

            <div id="subscription-plans">
                <div className="flex justify-center items-center mb-6">
                    <Tabs value={activeBusinessType} onValueChange={(value) => setActiveBusinessType(value as PlanType)} className="w-full max-w-md mx-auto">
                        <TabsList className="grid w-full grid-cols-2 p-1 h-auto rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            <TabsTrigger value="B2C" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                <div className="flex items-center justify-center gap-3">
                                    <LuStore className="h-6 w-6" />
                                    Business Owners
                                </div>
                            </TabsTrigger>
                            <TabsTrigger value="B2B" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-sm">
                                <div className="flex items-center justify-center gap-3">
                                    <LuCode className="h-6 w-6" />
                                    Developers
                                </div>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                <div className="flex justify-center items-center gap-4 my-10">
                    <span className={`font-medium ${billingInterval === 'MONTH' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Monthly</span>
                    <Switch
                        checked={billingInterval === 'YEAR'}
                        onCheckedChange={(checked) => setBillingInterval(checked ? 'YEAR' : 'MONTH')}
                        aria-label="Switch between monthly and yearly billing"
                    />
                    <div className="flex items-center gap-2">
                        <span className={`font-medium ${billingInterval === 'YEAR' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>Yearly</span>
                        <span className="text-xs font-semibold text-green-600 bg-green-100 dark:bg-green-900/50 dark:text-green-400 px-2 py-1 rounded-full">SAVE 17%</span>
                    </div>
                </div>

                <div className="mb-20">
                    {activeBusinessType === 'B2C' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                            {allPlansList.filter(plan => plan.type === 'B2C' && plan.billingInterval === billingInterval).map(plan => (
                                <PlanCard
                                    allFeaturesList={PlatformFeaturesList.B2C}
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
                                    allFeaturesList={PlatformFeaturesList.B2B}
                                    key={`${plan.planId}-${plan.billingInterval}`}
                                    plan={plan}
                                    currency={currency}
                                    onPurchase={(plan) => handlePaymentCardClick(plan)}
                                />
                            ))}
                            <PlanCard
                                allFeaturesList={PlatformFeaturesList.B2B}
                                key={CustomePlanForB2B.planId}
                                plan={CustomePlanForB2B}
                                currency={currency}
                                onPurchase={(plan) => handlePaymentCardClick(plan)}
                            />
                        </div>
                    )}
                </div>
            </div>

            <CreditPacksCtaSection currency={currency} activeSubscription={activeSubscription} />

            <div className="my-20">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold">Plan comparison</h2>
                </div>
                {activeBusinessType === 'B2C' ? (
                    <FeatureComparisonTable allFeaturesList={PlatformFeaturesList.B2C} plans={allPlansList.filter(plan => plan.type === 'B2C' && plan.billingInterval === billingInterval)} planType={'B2C'} />
                ) : (
                    <FeatureComparisonTable allFeaturesList={PlatformFeaturesList.B2B} plans={allPlansList.filter(plan => plan.type === 'B2B' && plan.billingInterval === billingInterval)} planType={'B2B'} />
                )}
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
        </div>
    );
};

const PricingPage: React.FC<{ welcomeTenantName?: string, activeSubscription?: FirestoreSubscriptionDoc }> = ({ welcomeTenantName, activeSubscription }) => {
    return (
        <div id="pricing" className="flex flex-col min-h-screen antialiased" style={{ backgroundColor: 'var(--ws-bg-primary)', color: 'var(--ws-text-primary)' }}>
            <main className="relative flex-grow overflow-hidden">
                <PricingPageRenderer welcomeTenantName={welcomeTenantName} activeSubscription={activeSubscription} />
                <PricingFaq />
            </main>
        </div>
    );
}

export default PricingPage;
