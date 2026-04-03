"use client";

import { useClientAuthSession } from "@hook/useClientAuthSession";
import { Separator } from "@radix-ui/react-dropdown-menu";
import SectionHeading from "@shadcncomponents/SectionHeading";
import { Badge } from "@shadcncomponents/badge";
import { Button } from "@shadcncomponents/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@shadcncomponents/card";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { formatDateTime } from "@util/dateTime";
import { getGracePeriodInfo, hasValidSubscriptionAccess } from "@util/razorpay";
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

    const renderTag = () => {
        const baseStyles = { fontSize: '14px', padding: '6px 12px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px' }

        if (activeSubscription.status === 'active') {
            return <Badge style={{ ...baseStyles, backgroundColor: '#059669', color: '#fff' }}><LuHeartPulse size={14} /> Active</Badge>;
        }
        if (activeSubscription.status === 'cancelled') {
            return <Badge style={{ ...baseStyles, backgroundColor: '#dc2626', color: '#fff' }}><LuHeartOff size={14} /> Cancelled</Badge>;
        }
        if (activeSubscription.status === 'paused') {
            return <Badge style={{ ...baseStyles, backgroundColor: '#d97706', color: '#fff' }}><LuPause size={14} /> Paused</Badge>;
        }
        if (activeSubscription.status === 'past_due') {
            return <Badge style={{ ...baseStyles, backgroundColor: '#dc2626', color: '#fff' }}><LuHeartCrack size={14} /> Payment Failed</Badge>;
        }
        if (activeSubscription.status === 'expired') {
            return <Badge style={{ ...baseStyles, backgroundColor: '#94a3b8', color: '#fff' }}><LuHeartOff size={14} /> Expired</Badge>;
        }
        return null;
    };

    const Statistic = ({ title, value }: { title: string, value: any }) => {
        return <div className="flex flex-col gap-1">
            <span className="text-sm" style={{ color: '#64748b' }}>{title}</span>
            <span className="font-medium text-sm" style={{ color: '#0f172a' }}>{value}</span>
        </div>
    }

    const renderAccessUntillDate = () => {
        if (activeSubscription.status === 'cancelled') {
            return <Statistic
                title="Access Good Until"
                value={formatDateTime(activeSubscription.cycleEndDate, "date", formatter)}
            />
        }
        if (activeSubscription.status === 'past_due') {
            const { remainingDays, graceEndsTimestamp } = getGracePeriodInfo(activeSubscription.pastDueSinceAt);
            return <Statistic
                title={`Grace period (${remainingDays} day${remainingDays > 1 ? 's' : ''} left)`}
                value={formatDateTime(graceEndsTimestamp, "date", formatter)}
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
        return null;
    }

    const renderGracePeriodInfo = () => {
        const { remainingDays } = getGracePeriodInfo(activeSubscription.pastDueSinceAt);
        return <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#dc2626', fontSize: '14px' }}>
            <strong>⚠️ Payment failed.</strong> Your subscription is in a grace period. Please update your payment method within {remainingDays} day{remainingDays > 1 ? 's' : ''} to avoid service interruption. <a href="/billing" style={{ color: '#dc2626', textDecoration: 'underline' }}>Go to Billing</a>.
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
                <Card style={{ borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                    <CardHeader className="flex flex-row justify-between items-start" style={{ padding: '24px 24px 0' }}>
                        <div>
                            <CardTitle style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>Current Plan</CardTitle>
                            <CardDescription style={{ fontSize: '14px', color: '#64748b' }}>Your active subscription details.</CardDescription>
                        </div>
                        {renderTag()}
                    </CardHeader>
                    <CardContent className="space-y-6" style={{ padding: '24px' }}>
                        <div className="flex justify-between items-baseline">
                            <p className="text-lg font-semibold" style={{ color: '#0f172a' }}>{activeSubscription.planName}</p>
                            <p className="text-xl font-bold" style={{ color: '#1e40af' }}>
                                {formatCurrencyOnPricingPage(activeSubscription.amount, activeSubscription.currency)} / {activeSubscription.planType === 'YEAR' ? 'Year' : 'Month'}
                            </p>
                        </div>
                        <Separator style={{ backgroundColor: '#e2e8f0', margin: '16px 0' }} />
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
                            <Statistic
                                title="Current Billing Cycle"
                                value={`${formatDateTime(activeSubscription.cycleStartDate, "date", formatter)} - ${formatDateTime(activeSubscription.cycleEndDate, "date", formatter)}`}
                            />
                            {renderAccessUntillDate()}
                            <Statistic
                                title="Payment Method"
                                value={<div className="flex items-center gap-2">
                                    <PaymentMethodIcon brand={activeSubscription.paymentMethod?.brand} />
                                    <span className="font-medium capitalize" style={{ color: '#0f172a' }}>{activeSubscription.paymentMethod?.brand ?? "Card"} **** {activeSubscription.paymentMethod?.last4 ?? "****"}</span>
                                </div>}
                            />
                        </div>
                        <Separator style={{ backgroundColor: '#e2e8f0', margin: '16px 0' }} />
                        {activeSubscription.status === 'past_due' && <>
                            {renderGracePeriodInfo()}
                        </>}
                        {activeSubscription.status === 'paused' && !hasValidSubscriptionAccess(activeSubscription) && <>
                            <div style={{ padding: '12px 16px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', color: '#c2410c', fontSize: '14px' }}>
                                ⏸️ Your subscription is paused and your billing cycle has ended. <a href="/billing" style={{ color: '#c2410c', textDecoration: 'underline' }}>Go to Billing</a> to resume.
                            </div>
                        </>}
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row justify-end gap-3" style={{ padding: '16px 24px 24px', borderTop: '1px solid #e2e8f0' }}>
                        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")} style={{ borderColor: '#e2e8f0', color: '#0f172a' }}>
                            <LuLayoutDashboard size={16} style={{ marginRight: '8px' }} /> Dashboard
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.push("/billing")} style={{ borderColor: '#e2e8f0', color: '#0f172a' }}>
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
        <div className="ws-page" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <main className="relative" style={{ padding: 'var(--ws-section-py) 0' }}>
                <SubscriptionManagementRenderer activeSubscription={activeSubscription} refetchActiveSubscription={refetchActiveSubscription} />
                <PricingFaq />
            </main>
        </div>
    );
}

export default SubscriptionManagementPage;
