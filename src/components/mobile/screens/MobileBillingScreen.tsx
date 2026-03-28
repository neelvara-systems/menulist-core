'use client'

import { AIEnhancementPack, Currency, Plan } from '@data/common';
import { aiEnhancementPacksList, getB2CPlansList } from '@data/PlatformPlansList';
import { getActiveSubscriptionForStore } from '@database/subscriptions';
import { getBillingHistoryForStore } from '@database/subscriptions/paymentTransactions';
import usePaymentHandler from '@hook/usePaymentHandler';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { formatCurrency } from '@util/formatters';
import { getGracePeriodInfo, hasValidSubscriptionAccess } from '@util/razorpay';
import { Button, Card, Dialog, DotLoading, NavBar, Popup, Tag, Toast } from 'antd-mobile';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuChevronRight, LuCreditCard, LuExternalLink, LuMessageCircle, LuPause, LuPlay, LuReceipt, LuXCircle, LuZap } from 'react-icons/lu';

interface MobileBillingScreenProps {
    onBack: () => void;
}

/**
 * Full Mobile Billing Screen — zero desktop dependency
 * 
 * Supports: view plan, AI credits, upgrade/change plan, buy credit packs,
 * pause/resume/cancel, billing history. Uses same DAL + usePaymentHandler as desktop.
 */
export default function MobileBillingScreen({ onBack }: MobileBillingScreenProps) {
    const t = useTranslations('Billing');
    const { activeSubscription, setActiveSubscription, storeDetails } = useContext(PlatformGlobalDataContext);
    const { data: session } = useSession();
    const [billingHistory, setBillingHistory] = useState<any[]>([]);
    const [showPlans, setShowPlans] = useState(false);
    const [showCredits, setShowCredits] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Dummy dispatcher for usePaymentHandler (mobile doesn't use redux loaders)
    const noopDispatcher = (action: any) => { };
    const { onUpgradePlan, onClickPaymentCard, handleTopupPurchase, onCancelSubscription, onPauseSubscription, onResumeSubscription } = usePaymentHandler(noopDispatcher);

    const currency: Currency = (storeDetails?.currencyCode as Currency) || 'INR';

    if (!storeDetails) {
        return (
            <div className="flex items-center justify-center h-full">
                <DotLoading color="primary" />
            </div>
        );
    }

    const sub = activeSubscription;
    const monthlyCredits = sub?.monthlyCredits || 0;
    const topUpCredits = sub?.topUpCredits || 0;
    const totalCredits = monthlyCredits + topUpCredits;
    const monthlyAllowance = sub?.monthlyCreditsAllowance || 1;
    const creditUsagePercent = monthlyAllowance > 0 ? Math.round((monthlyCredits / monthlyAllowance) * 100) : 0;

    const refetchSubscription = async () => {
        try {
            const subscription = await getActiveSubscriptionForStore(session?.user?.tenantId, session?.user?.storeId);
            setActiveSubscription(subscription);
        } catch (err) {
            console.error('Failed to refetch subscription:', err);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
            return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch { return 'N/A'; }
    };

    const getStatusColor = (status: string) => {
        if (status === 'active') return 'success';
        if (status === 'paused') return 'warning';
        if (status === 'past_due') return 'warning';
        if (status === 'cancelled' || status === 'expired') return 'default';
        return 'default';
    };

    const getStatusLabel = (status: string) => {
        if (status === 'active') return t('statusActive');
        if (status === 'paused') return t('statusPaused');
        if (status === 'past_due') return t('statusPaymentFailed');
        if (status === 'cancelled') return t('statusCancelled');
        if (status === 'expired') return t('statusExpired');
        return status;
    };

    // --- Plan Actions ---
    const handleUpgrade = async (plan: Plan) => {
        setShowPlans(false);
        setIsLoading(true);
        try {
            if (sub) {
                await onUpgradePlan(sub, plan, currency);
            } else {
                await onClickPaymentCard(plan, currency, () => { });
            }
            Toast.show({ content: t('planUpdated'), duration: 2000 });
            await refetchSubscription();
        } catch (err: any) {
            Toast.show({ content: err?.message || t('paymentFailedRetry'), duration: 3000 });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBuyCredits = async (packId: string) => {
        setShowCredits(false);
        setIsLoading(true);
        try {
            const pack = aiEnhancementPacksList.find((p: AIEnhancementPack) => p.packId === packId);
            if (!pack) return;
            await handleTopupPurchase(pack, currency);
            Toast.show({ content: t('enhancementsReady'), duration: 2000 });
            setActiveSubscription({ ...sub, topUpCredits: (sub?.topUpCredits || 0) + pack.creditAmount });
        } catch (err: any) {
            Toast.show({ content: err?.message || t('purchaseFailed'), duration: 3000 });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePause = () => {
        Dialog.confirm({
            title: t('pauseSubscription'),
            content: t('pauseSubscriptionDesc'),
            confirmText: t('pause'),
            cancelText: t('cancel'),
            onConfirm: async () => {
                try {
                    await onPauseSubscription();
                    Toast.show({ content: t('subscriptionPaused'), duration: 2000 });
                    await refetchSubscription();
                } catch (err: any) {
                    Toast.show({ content: err?.message || t('failedToPause'), duration: 3000 });
                }
            },
        });
    };

    const handleResume = async () => {
        try {
            await onResumeSubscription();
            Toast.show({ content: t('subscriptionResumed'), duration: 2000 });
            await refetchSubscription();
        } catch (err: any) {
            Toast.show({ content: err?.message || t('failedToResume'), duration: 3000 });
        }
    };

    const handleCancel = () => {
        Dialog.confirm({
            title: t('cancelSubscription'),
            content: t('cancelSubscriptionDesc'),
            confirmText: t('cancelSubscriptionBtn'),
            cancelText: t('keepSubscription'),
            onConfirm: async () => {
                try {
                    await onCancelSubscription({ reason: 'mobile_cancellation', otherReason: '', consent: true });
                    Toast.show({ content: t('subscriptionCancelled'), duration: 2000 });
                    await refetchSubscription();
                } catch (err: any) {
                    Toast.show({ content: err?.message || t('failedToCancel'), duration: 3000 });
                }
            },
        });
    };

    const fetchHistory = async () => {
        try {
            const raw = await getBillingHistoryForStore(Number(session?.user?.tenantId), Number(session?.user?.storeId));
            const formatted = raw.map((event: any) => {
                if (event.event === 'subscription.charged') {
                    const entity = event.payload?.payment?.entity;
                    return {
                        id: entity?.id,
                        type: 'Subscription',
                        date: (event.created_at || 0) * 1000,
                        amount: entity?.amount || 0,
                        currency: entity?.currency || 'INR',
                        status: entity?.status,
                        invoiceUrl: event.invoiceUrl,
                    };
                }
                if (event.event === 'order.paid' && event.transactionType === 'topup') {
                    const entity = event.payload?.payment?.entity;
                    return {
                        id: entity?.id,
                        type: 'AI Enhancement Pack',
                        date: (event.created_at || 0) * 1000,
                        amount: entity?.amount || 0,
                        currency: entity?.currency || 'INR',
                        status: entity?.status,
                        invoiceUrl: event.invoiceUrl,
                    };
                }
                return null;
            }).filter(Boolean);
            setBillingHistory(formatted);
            setShowHistory(true);
        } catch {
            Toast.show({ content: t('failedToLoadHistory'), duration: 2000 });
        }
    };

    // Plans data
    const plans = getB2CPlansList().filter(p => p.billingInterval === 'MONTH');

    return (
        <div className="flex flex-col h-full">
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>

            <div className="flex-1 overflow-y-auto px-4 pt-3 pb-4 space-y-4">
                {isLoading && (
                    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                        <Card className="rounded-xl px-8 py-6"><DotLoading color="primary" /> {t('processing')}</Card>
                    </div>
                )}

                {/* Current Plan Card */}
                {sub ? (
                    <Card className="rounded-xl">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 capitalize">
                                        {sub.planName || `${sub.planId} Plan`}
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        {formatCurrency(sub.amount * (sub.quantity || 1), sub.currency)} / {sub.planType === 'YEAR' ? 'year' : 'month'}
                                    </p>
                                </div>
                                <Tag color={getStatusColor(sub.status)} fill="outline" style={{ fontSize: 13 }}>
                                    {getStatusLabel(sub.status)}
                                </Tag>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-gray-400">{t('billingCycle')}</p>
                                    <p className="font-medium text-gray-700 dark:text-gray-300">{formatDate(sub.cycleStartDate)} - {formatDate(sub.cycleEndDate)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400">{sub.status === 'active' ? t('renews') : t('expires')}</p>
                                    <p className="font-medium text-gray-700 dark:text-gray-300">{formatDate(sub.renewsOn || sub.cycleEndDate)}</p>
                                </div>
                            </div>

                            {sub.status === 'past_due' && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-sm text-yellow-700 dark:text-yellow-300">
                                    Payment failed. {(() => { const { remainingDays } = getGracePeriodInfo(sub.pastDueSinceAt); return `${remainingDays} days grace period remaining.`; })()}
                                    {sub.shortUrl && (
                                        <Button
                                            size="small"
                                            color="warning"
                                            fill="solid"
                                            onClick={() => { window.open(sub.shortUrl, '_blank'); }}
                                            className="mt-2"
                                            style={{ minHeight: '36px' }}
                                        >
                                            {t('retryPayment')}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {sub.status === 'paused' && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-sm text-orange-700 dark:text-orange-300">
                                    {!hasValidSubscriptionAccess(sub)
                                        ? t('pausedCycleEnded')
                                        : t('pausedAccessAvailable')}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-1">
                                {sub.status === 'active' && (
                                    <>
                                        {sub.planId !== 'premium' && (
                                            <Button size="small" color="primary" fill="solid" onClick={() => setShowPlans(true)} style={{ minHeight: '36px' }}>
                                                <LuZap size={14} className="inline mr-1" /> {t('upgrade')}
                                            </Button>
                                        )}
                                        <Button size="small" fill="outline" onClick={handlePause} style={{ minHeight: '36px' }}>
                                            <LuPause size={14} className="inline mr-1" /> {t('pause')}
                                        </Button>
                                        <Button size="small" color="danger" fill="outline" onClick={handleCancel} style={{ minHeight: '36px' }}>
                                            <LuXCircle size={14} className="inline mr-1" /> {t('cancel')}
                                        </Button>
                                    </>
                                )}
                                {sub.status === 'paused' && (
                                    <>
                                        <Button size="small" color="primary" fill="solid" onClick={handleResume} style={{ minHeight: '36px' }}>
                                            <LuPlay size={14} className="inline mr-1" /> {t('resume')}
                                        </Button>
                                        <Button size="small" color="danger" fill="outline" onClick={handleCancel} style={{ minHeight: '36px' }}>
                                            <LuXCircle size={14} className="inline mr-1" /> {t('cancel')}
                                        </Button>
                                    </>
                                )}
                                {(sub.status === 'cancelled' || sub.status === 'expired') && (
                                    <Button size="small" color="primary" fill="solid" onClick={() => setShowPlans(true)} style={{ minHeight: '36px' }}>
                                        {t('chooseNewPlan')}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                ) : (
                    <Card className="rounded-xl">
                        <div className="flex flex-col items-center py-6 gap-3">
                            <LuCreditCard size={36} className="text-gray-300" />
                            <p className="text-sm text-gray-500">{t('noActiveSubscription2')}</p>
                            <Button color="primary" fill="solid" onClick={() => setShowPlans(true)} style={{ minHeight: '44px' }}>
                                <LuZap size={14} className="inline mr-1" /> {t('chooseAPlan')}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* AI Features */}
                {sub && (
                    <Card className="rounded-xl">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <LuZap size={16} className="text-yellow-500" />
                                    {t('aiFeatures')}
                                </h3>
                                <Tag color={totalCredits > 0 ? 'success' : 'warning'} fill="outline" style={{ fontSize: 13 }}>
                                    {totalCredits > 0 ? t('statusActive') : t('exhausted')}
                                </Tag>
                            </div>

                            <p className="text-sm text-gray-500">
                                {t('aiIncludesDesc')}
                            </p>

                            <Button
                                block
                                color="primary"
                                fill="outline"
                                size="middle"
                                onClick={() => setShowCredits(true)}
                                style={{ minHeight: '44px' }}
                            >
                                <LuZap size={14} className="inline mr-1" /> {totalCredits > 0 ? t('getAiEnhancements') : t('getMoreAiEnhancements')}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Billing History */}
                <Card className="rounded-xl" onClick={fetchHistory}>
                    <div className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-3">
                            <LuReceipt size={20} className="text-blue-500" />
                            <span className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{t('billingHistory')}</span>
                        </div>
                        <LuChevronRight size={18} className="text-gray-400" />
                    </div>
                </Card>

                {/* Support */}
                <Card className="rounded-xl" onClick={() => window.open('https://wa.me/919876543210', '_blank')}>
                    <div className="flex items-center gap-3 py-1">
                        <LuMessageCircle size={20} className="text-green-500" />
                        <div>
                            <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100">{t('needBillingHelp')}</p>
                            <p className="text-sm text-gray-500">{t('chatWhatsApp')}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Plans Bottom Sheet */}
            <Popup
                visible={showPlans}
                onMaskClick={() => setShowPlans(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '85vh' }}
                destroyOnClose
            >
                <div className="px-4 pt-4 pb-6">
                    <div className="flex justify-center mb-3">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>
                    <h2 className="text-lg font-semibold mb-4">{t('chooseAPlan')}</h2>
                    <div className="space-y-3">
                        {plans.filter(p => p.planId !== sub?.planId).map((plan) => {
                            const price = (plan as any)[`price${currency}`]?.price;
                            const credits = (plan as any)[`price${currency}`]?.monthlyCredits;
                            return (
                                <Card
                                    key={plan.planId}
                                    className="rounded-xl"
                                    onClick={() => handleUpgrade(plan)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[15px] font-semibold capitalize">{plan.planId} Plan</p>
                                            <p className="text-sm text-gray-500">{credits} credits/mo · {plan.description}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-blue-600">
                                                {price ? formatCurrency(price, currency) : t('contactUs')}
                                            </p>
                                            <p className="text-xs text-gray-400">{t('perMonth')}</p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                    <p className="text-xs text-center text-gray-400 mt-3">
                        {t('yearlyAvailable')}
                    </p>
                </div>
            </Popup>

            {/* Credits Bottom Sheet */}
            <Popup
                visible={showCredits}
                onMaskClick={() => setShowCredits(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '70vh' }}
                destroyOnClose
            >
                <div className="px-4 pt-4 pb-6">
                    <div className="flex justify-center mb-3">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>
                    <h2 className="text-lg font-semibold mb-2">{t('getMoreAiEnhancements')}</h2>
                    <p className="text-sm text-gray-500 mb-4">{t('moreAiDesc')}</p>
                    <div className="space-y-3">
                        {aiEnhancementPacksList.map((pack: AIEnhancementPack) => {
                            const price = (pack as any)[`price${currency}`]?.price;
                            return (
                                <Card
                                    key={pack.packId}
                                    className="rounded-xl"
                                    onClick={() => handleBuyCredits(pack.packId)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[15px] font-semibold">{pack.name}</p>
                                            <p className="text-sm text-gray-500">{pack.description || 'AI Enhancement Pack'}</p>
                                        </div>
                                        <p className="font-bold text-green-600">
                                            {price ? formatCurrency(price, currency) : 'N/A'}
                                        </p>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </Popup>

            {/* Billing History Bottom Sheet */}
            <Popup
                visible={showHistory}
                onMaskClick={() => setShowHistory(false)}
                position="bottom"
                bodyStyle={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px', maxHeight: '80vh' }}
                destroyOnClose
            >
                <div className="px-4 pt-4 pb-6">
                    <div className="flex justify-center mb-3">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>
                    <h2 className="text-lg font-semibold mb-4">{t('billingHistory')}</h2>
                    {billingHistory.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">{t('noBillingHistoryYet')}</p>
                    ) : (
                        <div className="space-y-2">
                            {billingHistory.map((item: any, idx: number) => (
                                <Card key={idx} className="rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{item.type}</p>
                                            <p className="text-xs text-gray-400">
                                                {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">
                                                {formatCurrency(item.amount, item.currency)}
                                            </span>
                                            {item.invoiceUrl && (
                                                <button onClick={() => window.open(item.invoiceUrl, '_blank')} className="p-1">
                                                    <LuExternalLink size={14} className="text-blue-500" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </Popup>
        </div>
    );
}
