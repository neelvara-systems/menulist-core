"use client";

import { useClientAuthSession } from "@hook/useClientAuthSession";
import { Separator } from "@radix-ui/react-dropdown-menu";
import SectionHeading from "@shadcncomponents/SectionHeading";
import { Badge } from "@shadcncomponents/badge";
import { Button } from "@shadcncomponents/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@shadcncomponents/card";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { formatDateTime } from "@util/dateTime";
import { getGracePeriodDisplayInfo, hasValidSubscriptionAccess } from "@util/razorpay";
import { getBoundedPaymentStringContext, logPaymentFailure } from "@hook/paymentDiagnostics";
import { normalizeRazorpaySubscriptionCheckoutUrl } from "@lib/razorpay/checkoutUrl";
import { useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import React from "react";
import { LuCreditCard, LuHeartCrack, LuHeartOff, LuHeartPulse, LuLayoutDashboard, LuPause, LuTimer } from 'react-icons/lu';
import { formatCurrencyOnPricingPage } from ".";
import PricingFaq from "./PricingFaq";
import './main.css';
import CreditPacksCtaSection from "./shared/CreditPacksCtaSection";

interface SubscriptionManagementRendererProps {
    activeSubscription: FirestoreSubscriptionDoc;
    refetchActiveSubscription: () => Promise<void>;
}

const PaymentMethodIcon = ({ brand }: { brand?: string }) => {
    return <LuCreditCard className="w-4 h-4 mr-2 text-gray-400" title={brand || 'Card'} />;
};

const SubscriptionManagementRenderer: React.FC<SubscriptionManagementRendererProps> = ({ activeSubscription, refetchActiveSubscription }) => {
    const session = useClientAuthSession()
    const router = useRouter()
    const formatter = useFormatter()
    const pendingCheckoutUrl = activeSubscription.status === 'pending'
        ? normalizeRazorpaySubscriptionCheckoutUrl(activeSubscription.shortUrl)
        : null;

    const handleCompletePendingPayment = () => {
        if (!pendingCheckoutUrl) {
            router.push('/billing');
            return;
        }
        try {
            const opened = window.open(pendingCheckoutUrl, '_blank', 'noopener,noreferrer');
            if (!opened) throw new Error('website_pricing_pending_payment_open_blocked');
        } catch (error) {
            logPaymentFailure('website_pricing_pending_payment_open_failed', error, {
                flow: 'returning_owner_pending_payment',
                surface: 'website_pricing_subscription_management',
                ...getBoundedPaymentStringContext('checkoutUrl', pendingCheckoutUrl),
            });
            router.push('/billing');
        }
    };

    const renderTag = () => {
        const baseStyles = { fontSize: '14px', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }

        if (activeSubscription.status === 'active') {
            return <Badge style={{ ...baseStyles, backgroundColor: 'var(--ws-success)', color: 'var(--ws-text-on-accent)' }}><LuHeartPulse size={14} /> Active</Badge>;
        }
        if (activeSubscription.status === 'cancelled') {
            return <Badge style={{ ...baseStyles, backgroundColor: 'var(--ws-error)', color: 'var(--ws-text-on-accent)' }}><LuHeartOff size={14} /> Cancelled</Badge>;
        }
        if (activeSubscription.status === 'paused') {
            return <Badge style={{ ...baseStyles, backgroundColor: 'var(--ws-warning)', color: 'var(--ws-text-on-accent)' }}><LuPause size={14} /> Paused</Badge>;
        }
        if (activeSubscription.status === 'past_due') {
            return <Badge style={{ ...baseStyles, backgroundColor: 'var(--ws-error)', color: 'var(--ws-text-on-accent)' }}><LuHeartCrack size={14} /> Payment Failed</Badge>;
        }
        if (activeSubscription.status === 'pending') {
            return <Badge style={{ ...baseStyles, backgroundColor: 'var(--ws-warning)', color: 'var(--ws-text-on-accent)' }}><LuTimer size={14} /> Payment pending</Badge>;
        }
        if (activeSubscription.status === 'expired') {
            return <Badge style={{ ...baseStyles, backgroundColor: 'var(--ws-text-muted)', color: 'var(--ws-text-on-accent)' }}><LuHeartOff size={14} /> Expired</Badge>;
        }
        return null;
    };

    const Statistic = ({ title, value }: { title: string, value: any }) => {
        return <div className="flex flex-col gap-1">
            <span className="text-sm" style={{ color: 'var(--ws-text-secondary)' }}>{title}</span>
            <span className="font-medium text-sm" style={{ color: 'var(--ws-text-primary)' }}>{value}</span>
        </div>
    }

    const getPastDueGracePeriodDisplay = () => {
        const gracePeriodDisplay = getGracePeriodDisplayInfo(activeSubscription.pastDueSinceAt);
        return {
            ...gracePeriodDisplay,
            value: gracePeriodDisplay.hasKnownGracePeriod
                ? formatDateTime(gracePeriodDisplay.graceEndsTimestamp, "date", formatter)
                : 'Grace period unavailable',
        };
    };

    const renderAccessUntillDate = () => {
        if (activeSubscription.status === 'cancelled') {
            return <Statistic
                title="Access Good Until"
                value={formatDateTime(activeSubscription.cycleEndDate, "date", formatter)}
            />
        }
        if (activeSubscription.status === 'past_due') {
            const gracePeriodDisplay = getPastDueGracePeriodDisplay();
            return <Statistic
                title={gracePeriodDisplay.title}
                value={gracePeriodDisplay.value}
            />
        }
        if (activeSubscription.status === 'active') {
            return <Statistic
                title="Renews On"
                value={formatDateTime(activeSubscription.renewsOn, "date", formatter)}
            />
        }
        if (activeSubscription.status === 'paused') {
            return <Statistic
                title="Paused Since"
                value={formatDateTime(activeSubscription.statuses[activeSubscription.statuses.length - 1]?.timestamp, "date", formatter)}
            />
        }
        if (activeSubscription.status === 'pending') {
            return <Statistic title="Access Starts" value="After payment" />
        }
        return null;
    }

    const renderGracePeriodInfo = () => {
        const gracePeriodDisplay = getPastDueGracePeriodDisplay();
        return <div style={{ padding: '12px 16px', backgroundColor: 'var(--ws-bg-danger-soft)', border: '1px solid var(--ws-error)', borderRadius: '6px', color: 'var(--ws-error-text)', fontSize: '14px' }}>
            <strong>⚠️ Payment failed.</strong> {gracePeriodDisplay.hasKnownGracePeriod
                ? `Complete the payment update within ${gracePeriodDisplay.dayLabel} to avoid service interruption.`
                : 'Grace-period details are unavailable. Open Billing to recover the subscription.'} <a href="/billing" style={{ color: 'var(--ws-error-text)', textDecoration: 'underline' }}>Go to Billing</a>.
        </div>
    }

    return (
        <div className="container mx-auto py-12 px-4 md:px-6" style={{ maxWidth: '1200px' }}>
            <SectionHeading
                text={`Welcome, ${session?.user?.name}!`}
                highlightedText={`${session?.user?.name}!`}
                subheading="We're honored to be your growth partner. Here's a look at your active plan and tools"
            />

            <div className="grid grid-cols-1 gap-6 mt-8 max-w-3xl mx-auto mb-12">
                {/* Subscription Details Card */}
                <Card style={{ borderRadius: '8px', border: '1px solid var(--ws-border-default)', backgroundColor: 'var(--ws-bg-surface)' }}>
                    <CardHeader className="flex flex-row justify-between items-start" style={{ padding: '24px 24px 0' }}>
                        <div>
                            <CardTitle style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ws-text-primary)', marginBottom: '4px' }}>Current Plan</CardTitle>
                            <CardDescription style={{ fontSize: '14px', color: 'var(--ws-text-secondary)' }}>
                                {activeSubscription.status === 'pending'
                                    ? 'Your workspace is ready. Complete payment to activate this plan.'
                                    : 'Your active subscription details.'}
                            </CardDescription>
                        </div>
                        {renderTag()}
                    </CardHeader>
                    <CardContent className="space-y-6" style={{ padding: '24px' }}>
                        <div className="flex justify-between items-baseline">
                            <p className="text-lg font-semibold" style={{ color: 'var(--ws-text-primary)' }}>{activeSubscription.planName}</p>
                            <p className="text-xl font-bold" style={{ color: 'var(--ws-brand-secondary)' }}>
                                {formatCurrencyOnPricingPage(activeSubscription.amount, activeSubscription.currency)} / {activeSubscription.planType === 'YEAR' ? 'Year' : 'Month'}
                            </p>
                        </div>
                        <Separator style={{ backgroundColor: 'var(--ws-border-default)', margin: '16px 0' }} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                            <Statistic
                                title="Current Billing Cycle"
                                value={activeSubscription.status === 'pending'
                                    ? 'Starts after payment'
                                    : `${formatDateTime(activeSubscription.cycleStartDate, "date", formatter)} - ${formatDateTime(activeSubscription.cycleEndDate, "date", formatter)}`}
                            />
                            {renderAccessUntillDate()}
                            <Statistic
                                title="Payment Method"
                                value={<div className="flex items-center gap-2">
                                    <PaymentMethodIcon brand={activeSubscription.paymentMethod?.brand} />
                                    <span className="font-medium capitalize" style={{ color: 'var(--ws-text-primary)' }}>
                                        {activeSubscription.status === 'pending'
                                            ? 'Selected during payment'
                                            : `${activeSubscription.paymentMethod?.brand ?? "Card"} **** ${activeSubscription.paymentMethod?.last4 ?? "****"}`}
                                    </span>
                                </div>}
                            />
                        </div>
                        <Separator style={{ backgroundColor: 'var(--ws-border-default)', margin: '16px 0' }} />
                        {activeSubscription.status === 'past_due' && <>
                            {renderGracePeriodInfo()}
                        </>}
                        {activeSubscription.status === 'paused' && !hasValidSubscriptionAccess(activeSubscription) && <>
                            <div style={{ padding: '12px 16px', backgroundColor: 'var(--ws-bg-warning-soft)', border: '1px solid var(--ws-warning)', borderRadius: '6px', color: 'var(--ws-warning-text)', fontSize: '14px' }}>
                                Your subscription is paused and the billing cycle has ended. Contact support to update it.
                            </div>
                        </>}
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-end gap-3" style={{ padding: '16px 24px 24px', borderTop: '1px solid var(--ws-border-default)' }}>
                        {activeSubscription.status === 'pending' ? (
                            <Button size="sm" onClick={handleCompletePendingPayment}>
                                <LuCreditCard size={16} style={{ marginRight: '8px' }} />
                                {pendingCheckoutUrl ? 'Complete payment' : 'Open Billing'}
                            </Button>
                        ) : null}
                        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} style={{ borderColor: 'var(--ws-border-default)', color: 'var(--ws-text-primary)' }}>
                            <LuLayoutDashboard size={16} style={{ marginRight: '8px' }} /> Dashboard
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push("/billing")} style={{ borderColor: 'var(--ws-border-default)', color: 'var(--ws-text-primary)' }}>
                            <LuTimer size={16} style={{ marginRight: '8px' }} /> Billing History
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            <CreditPacksCtaSection activeSubscription={activeSubscription} currency={activeSubscription.currency} refetchActiveSubscription={refetchActiveSubscription} />
        </div>
    );
};


interface SubscriptionManagementPageProps {
    activeSubscription: FirestoreSubscriptionDoc | null;
    refetchActiveSubscription: () => Promise<void>;
}

const SubscriptionManagementPage: React.FC<SubscriptionManagementPageProps> = ({ activeSubscription, refetchActiveSubscription }) => {

    return (
        <div className="ws-page" style={{ backgroundColor: 'var(--ws-bg-subtle)', minHeight: '100vh' }}>
            <main className="relative" style={{ padding: 'var(--ws-section-py) 0' }}>
                <SubscriptionManagementRenderer activeSubscription={activeSubscription} refetchActiveSubscription={refetchActiveSubscription} />
                <PricingFaq />
            </main>
        </div>
    );
}

export default SubscriptionManagementPage;
