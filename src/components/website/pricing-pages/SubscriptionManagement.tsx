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
import { LuCreditCard, LuHeartCrack, LuHeartOff, LuHeartPulse, LuLayoutDashboard, LuPause, LuReceipt, LuTimer } from 'react-icons/lu';
import { formatCurrencyOnPricingPage } from ".";
import PricingFaq from "./PricingFaq";
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
        const styles = { fontSize: '14px', padding: '6px 12px', borderRadius: '12px' }

        if (activeSubscription.status === 'active') {
            return <Badge style={{ ...styles, backgroundColor: 'green' }} color="success"><LuHeartPulse /> &nbsp; Active</Badge>;
        }
        if (activeSubscription.status === 'cancelled') {
            return <Badge style={{ ...styles, backgroundColor: 'lightcoral' }} color="error"><LuHeartOff /> &nbsp; Cancelled</Badge>;
        }
        if (activeSubscription.status === 'paused') {
            return <Badge style={{ ...styles, backgroundColor: 'orange' }} color="warning"><LuPause /> &nbsp; Paused</Badge>;
        }
        if (activeSubscription.status === 'past_due') {
            return <Badge style={{ ...styles, backgroundColor: 'lightcoral' }} color="warning"><LuHeartCrack /> &nbsp; Payment Failed</Badge>;
        }
        if (activeSubscription.status === 'expired') {
            return <Badge style={{ ...styles, backgroundColor: 'lightgray' }} color="default"><LuHeartOff /> &nbsp; Expired</Badge>;
        }
        return null;
    };

    const Statistic = ({ title, value }: { title: string, value: any }) => {
        return <div>
            <span className="text-muted-foreground">{title}</span>
            <span className="font-medium">{value}</span>
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
        return <div className="text-red-500 text-sm flex items-center">
            ⚠️ Your last payment attempt failed.
            Your subscription is currently in a grace period. Please update your payment method within {remainingDays} day{remainingDays > 1 ? 's' : ''} to avoid service interruption.
            For payment visit Billing.
        </div>
    }

    return (
        <div className="container mx-auto py-12 px-4 md:px-6">
            <SectionHeading
                text={`Welcome, ${session?.user?.name}!`}
                highlightedText={`${session?.user?.name}!`}
                subheading="We're honored to be your growth partner. Here's a look at your active plan and tools"
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Left Column: Subscription Details */}
                <div className="lg:col-span-2">
                    <Card className={`h-full border-primary/20 bg-card/80 backdrop-blur-sm transition-all hover:border-purple/40 bg-gradient-to-b from-purple-500/15 to-transparent`}>
                        <CardHeader className="flex flex-row justify-between items-start">
                            <div>
                                <CardTitle>Current Plan</CardTitle>
                                <CardDescription>Your active subscription details.</CardDescription>
                            </div>
                            {renderTag()}
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex justify-between items-baseline">
                                <p className="text-lg font-semibold">{activeSubscription.planName}</p>
                                <p className="text-xl font-bold">
                                    {formatCurrencyOnPricingPage(activeSubscription.amount, activeSubscription.currency)} / {activeSubscription.planType === 'YEAR' ? 'Year' : 'Month'}
                                </p>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <Statistic
                                    title="Current Billing Cycle"
                                    value={`${formatDateTime(activeSubscription.cycleStartDate, "date", formatter)} - ${formatDateTime(activeSubscription.cycleEndDate, "date", formatter)}`}
                                />
                                {renderAccessUntillDate()}
                                <Statistic
                                    title="Payment Method"
                                    value={<div className="flex items-center">
                                        <PaymentMethodIcon brand={activeSubscription.paymentMethod?.brand} />
                                        <p className="font-medium capitalize">{activeSubscription.paymentMethod?.brand ?? "Card"} **** {activeSubscription.paymentMethod?.last4 ?? "****"}</p>
                                    </div>}
                                />
                            </div>
                            <Separator />
                            {activeSubscription.status === 'past_due' && <>
                                {renderGracePeriodInfo()}
                            </>}
                            {activeSubscription.status === 'paused' && !hasValidSubscriptionAccess(activeSubscription) && <>
                                <div className="text-orange-500 text-sm flex items-center">
                                    ⏸️ Your subscription is paused and your billing cycle has ended. Visit Billing to resume your subscription.
                                </div>
                            </>}
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row justify-end gap-2 py-4 px-6">
                            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}><LuLayoutDashboard /> &nbsp; Dashboard</Button>
                            <Button variant="outline" size="sm" onClick={() => router.push("/transactions")}><LuReceipt /> &nbsp; Transactions</Button>
                            <Button variant="outline" size="sm" onClick={() => router.push("/billing")}><LuTimer /> &nbsp; Billing History</Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* Right Column: Credits */}
                <div className="lg:col-span-1 space-y-8">
                    <Card className={`h-full border-primary/20 bg-card/80 backdrop-blur-sm transition-all hover:border-purple/40 bg-gradient-to-b from-purple-500/15 to-transparent`}>
                        <CardHeader>
                            <CardTitle>AI Features</CardTitle>
                            <CardDescription>Your AI enhancements for images, descriptions, and translations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <p>Status</p>
                                <Badge style={{ backgroundColor: (activeSubscription.monthlyCredits + activeSubscription.topUpCredits) > 0 ? 'green' : 'orange' }}>
                                    {(activeSubscription.monthlyCredits + activeSubscription.topUpCredits) > 0 ? 'Active' : 'Exhausted'}
                                </Badge>
                            </div>
                            <Separator />
                            <div className="text-muted-foreground text-sm mt-4">
                                <p>Your plan includes AI enhancements for images, descriptions, and translations. Enhancement packs are available if you need more.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
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
        <div className="flex flex-col min-h-screen text-foreground antialiased bg-background">
            <main className="relative flex-grow overflow-hidden">
                <SubscriptionManagementRenderer activeSubscription={activeSubscription} refetchActiveSubscription={refetchActiveSubscription} />
                <PricingFaq />
            </main>
        </div>
    );
}

export default SubscriptionManagementPage;
