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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'var(--adm-color-background, #f5f5f5)' }}>
            <NavBar onBack={onBack} style={{ '--height': '48px' } as React.CSSProperties}>
                {t('title')}
            </NavBar>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {isLoading && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Card style={{ borderRadius: '12px', padding: '24px 32px' }}><DotLoading color="primary" /> {t('processing')}</Card>
                    </div>
                )}

                {/* Current Plan Card */}
                {sub ? (
                    <Card style={{ borderRadius: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 700, textTransform: 'capitalize', color: 'var(--adm-color-text, #333)' }}>
                                        {sub.planName || `${sub.planId} Plan`}
                                    </h2>
                                    <p style={{ fontSize: '14px', color: 'var(--adm-color-weak, #999)' }}>
                                        {formatCurrency(sub.amount * (sub.quantity || 1), sub.currency)} / {sub.planType === 'YEAR' ? 'year' : 'month'}
                                    </p>
                                </div>
                                <Tag color={getStatusColor(sub.status)} fill="outline" style={{ fontSize: 13 }}>
                                    {getStatusLabel(sub.status)}
                                </Tag>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)' }}>{t('billingCycle')}</p>
                                    <p style={{ fontWeight: 500, color: 'var(--adm-color-text-secondary, #666)' }}>{formatDate(sub.cycleStartDate)} - {formatDate(sub.cycleEndDate)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)' }}>{sub.status === 'active' ? t('renews') : t('expires')}</p>
                                    <p style={{ fontWeight: 500, color: 'var(--adm-color-text-secondary, #666)' }}>{formatDate(sub.renewsOn || sub.cycleEndDate)}</p>
                                </div>
                            </div>

                            {sub.status === 'past_due' && (
                                <div style={{ backgroundColor: '#fefce8', borderRadius: '8px', padding: '12px', fontSize: '14px', color: '#a16207' }}>
                                    Payment failed. {(() => { const { remainingDays } = getGracePeriodInfo(sub.pastDueSinceAt); return `${remainingDays} days grace period remaining.`; })()}
                                    {sub.shortUrl && (
                                        <Button
                                            size="small"
                                            color="warning"
                                            fill="solid"
                                            onClick={() => { window.open(sub.shortUrl, '_blank'); }}
                                            style={{ marginTop: '8px', minHeight: '36px' }}
                                        >
                                            {t('retryPayment')}
                                        </Button>
                                    )}
                                </div>
                            )}

                            {sub.status === 'paused' && (
                                <div style={{ backgroundColor: '#fff7ed', borderRadius: '8px', padding: '12px', fontSize: '14px', color: '#9a3412' }}>
                                    {!hasValidSubscriptionAccess(sub)
                                        ? t('pausedCycleEnded')
                                        : t('pausedAccessAvailable')}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingTop: '4px' }}>
                                {sub.status === 'active' && (
                                    <>
                                        {sub.planId !== 'premium' && (
                                            <Button size="small" color="primary" fill="solid" onClick={() => setShowPlans(true)} style={{ minHeight: '36px' }}>
                                                <LuZap size={14} style={{ marginRight: '4px', display: 'inline' }} /> {t('upgrade')}
                                            </Button>
                                        )}
                                        <Button size="small" fill="outline" onClick={handlePause} style={{ minHeight: '36px' }}>
                                            <LuPause size={14} style={{ marginRight: '4px', display: 'inline' }} /> {t('pause')}
                                        </Button>
                                        <Button size="small" color="danger" fill="outline" onClick={handleCancel} style={{ minHeight: '36px' }}>
                                            <LuXCircle size={14} style={{ marginRight: '4px', display: 'inline' }} /> {t('cancel')}
                                        </Button>
                                    </>
                                )}
                                {sub.status === 'paused' && (
                                    <>
                                        <Button size="small" color="primary" fill="solid" onClick={handleResume} style={{ minHeight: '36px' }}>
                                            <LuPlay size={14} style={{ marginRight: '4px', display: 'inline' }} /> {t('resume')}
                                        </Button>
                                        <Button size="small" color="danger" fill="outline" onClick={handleCancel} style={{ minHeight: '36px' }}>
                                            <LuXCircle size={14} style={{ marginRight: '4px', display: 'inline' }} /> {t('cancel')}
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
                    <Card style={{ borderRadius: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: '12px' }}>
                            <LuCreditCard size={36} color="#d1d5db" />
                            <p style={{ fontSize: '14px', color: 'var(--adm-color-weak, #999)' }}>{t('noActiveSubscription2')}</p>
                            <Button color="primary" fill="solid" onClick={() => setShowPlans(true)} style={{ minHeight: '44px' }}>
                                <LuZap size={14} style={{ marginRight: '4px', display: 'inline' }} /> {t('chooseAPlan')}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* AI Features */}
                {sub && (
                    <Card style={{ borderRadius: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                    <LuZap size={16} color="#f59e0b" />
                                    {t('aiFeatures')}
                                </h3>
                                <Tag color={totalCredits > 0 ? 'success' : 'warning'} fill="outline" style={{ fontSize: 13 }}>
                                    {totalCredits > 0 ? t('statusActive') : t('exhausted')}
                                </Tag>
                            </div>

                            <p style={{ fontSize: '14px', color: 'var(--adm-color-weak, #999)', margin: 0 }}>
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
                                <LuZap size={14} style={{ marginRight: '4px', display: 'inline' }} /> {totalCredits > 0 ? t('getAiEnhancements') : t('getMoreAiEnhancements')}
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Billing History */}
                <Card style={{ borderRadius: '12px' }} onClick={fetchHistory}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <LuReceipt size={20} color="#3b82f6" />
                            <span style={{ fontSize: '15px', fontWeight: 500 }}>{t('billingHistory')}</span>
                        </div>
                        <LuChevronRight size={18} color="#9ca3af" />
                    </div>
                </Card>

                {/* Support */}
                <Card style={{ borderRadius: '12px' }} onClick={() => window.open('https://wa.me/919876543210', '_blank')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0' }}>
                        <LuMessageCircle size={20} color="#22c55e" />
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 500, margin: 0 }}>{t('needBillingHelp')}</p>
                            <p style={{ fontSize: '13px', color: 'var(--adm-color-weak, #999)', margin: 0 }}>{t('chatWhatsApp')}</p>
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
                <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                        <div style={{ width: '40px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '999px' }} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>{t('chooseAPlan')}</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {plans.filter(p => p.planId !== sub?.planId).map((plan) => {
                            const price = (plan as any)[`price${currency}`]?.price;
                            const credits = (plan as any)[`price${currency}`]?.monthlyCredits;
                            return (
                                <Card
                                    key={plan.planId}
                                    style={{ borderRadius: '12px' }}
                                    onClick={() => handleUpgrade(plan)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <p style={{ fontSize: '15px', fontWeight: 600, textTransform: 'capitalize', margin: 0 }}>{plan.planId} Plan</p>
                                            <p style={{ fontSize: '13px', color: 'var(--adm-color-weak, #999)', margin: 0 }}>{credits} credits/mo · {plan.description}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontWeight: 700, color: '#2563eb', margin: 0 }}>
                                                {price ? formatCurrency(price, currency) : t('contactUs')}
                                            </p>
                                            <p style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)', margin: 0 }}>{t('perMonth')}</p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                    <p style={{ fontSize: '12px', textAlign: 'center', color: 'var(--adm-color-weak, #999)', marginTop: '12px' }}>
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
                <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                        <div style={{ width: '40px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '999px' }} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>{t('getMoreAiEnhancements')}</h2>
                    <p style={{ fontSize: '14px', color: 'var(--adm-color-weak, #999)', marginBottom: '16px' }}>{t('moreAiDesc')}</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {aiEnhancementPacksList.map((pack: AIEnhancementPack) => {
                            const price = (pack as any)[`price${currency}`]?.price;
                            return (
                                <Card
                                    key={pack.packId}
                                    style={{ borderRadius: '12px' }}
                                    onClick={() => handleBuyCredits(pack.packId)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <p style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{pack.name}</p>
                                            <p style={{ fontSize: '13px', color: 'var(--adm-color-weak, #999)', margin: 0 }}>{pack.description || 'AI Enhancement Pack'}</p>
                                        </div>
                                        <p style={{ fontWeight: 700, color: '#10b981', margin: 0 }}>
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
                <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                        <div style={{ width: '40px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '999px' }} />
                    </div>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>{t('billingHistory')}</h2>
                    {billingHistory.length === 0 ? (
                        <p style={{ fontSize: '14px', color: 'var(--adm-color-weak, #999)', textAlign: 'center', padding: '24px 0' }}>{t('noBillingHistoryYet')}</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {billingHistory.map((item: any, idx: number) => (
                                <Card key={idx} style={{ borderRadius: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <p style={{ fontSize: '14px', fontWeight: 500, margin: 0 }}>{item.type}</p>
                                            <p style={{ fontSize: '12px', color: 'var(--adm-color-weak, #999)', margin: 0 }}>
                                                {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontWeight: 600, fontSize: '14px' }}>
                                                {formatCurrency(item.amount, item.currency)}
                                            </span>
                                            {item.invoiceUrl && (
                                                <Button style={{ padding: '8px', minWidth: '36px', minHeight: '36px' }} onClick={() => window.open(item.invoiceUrl, '_blank')}>
                                                    <LuExternalLink size={16} color="#3b82f6" />
                                                </Button>
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
