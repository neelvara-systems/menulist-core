'use client'

import { AIEnhancementPack, Currency, Plan } from '@data/common';
import { aiEnhancementPacksList, getB2CPlansList } from '@data/PlatformPlansList';
import { getActiveSubscriptionForStore } from '@database/subscriptions';
import { getBillingHistoryForStore } from '@database/subscriptions/paymentTransactions';
import usePaymentHandler from '@hook/usePaymentHandler';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { formatCurrency } from '@util/formatters';
import { getGracePeriodInfo, hasValidSubscriptionAccess } from '@util/razorpay';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useContext, useState } from 'react';
import { LuChevronRight, LuCreditCard, LuExternalLink, LuMessageCircle, LuPause, LuPlay, LuReceipt, LuXCircle, LuZap } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, List, NavBar, Popup, Tag, Text, Title, Toast } from '../antd';
import MobileScreenIntro from '../components/MobileScreenIntro';

interface MobileBillingScreenProps {
    onBack: () => void;
}

export default function MobileBillingScreen({ onBack }: MobileBillingScreenProps) {
    const t = useTranslations('Billing');
    const { activeSubscription, setActiveSubscription, storeDetails } = useContext(PlatformGlobalDataContext);
    const { data: session } = useSession();
    const [billingHistory, setBillingHistory] = useState<any[]>([]);
    const [showPlans, setShowPlans] = useState(false);
    const [showCredits, setShowCredits] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const noopDispatcher = (_action: any) => undefined;
    const { onUpgradePlan, onClickPaymentCard, handleTopupPurchase, onCancelSubscription, onPauseSubscription, onResumeSubscription } = usePaymentHandler(noopDispatcher);

    const currency: Currency = (storeDetails?.currencyCode as Currency) || 'INR';

    if (!storeDetails) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <NavBar onBack={onBack} />
                <Flex align="center" justify="center" style={{ flex: 1 }}>
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    const sub = activeSubscription;
    const monthlyCredits = sub?.monthlyCredits || 0;
    const topUpCredits = sub?.topUpCredits || 0;
    const totalCredits = monthlyCredits + topUpCredits;

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
        } catch {
            return 'N/A';
        }
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

    const handleUpgrade = async (plan: Plan) => {
        setShowPlans(false);
        setIsLoading(true);
        try {
            if (sub) {
                await onUpgradePlan(sub, plan, currency);
            } else {
                await onClickPaymentCard(plan, currency, () => undefined);
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

    const plans = getB2CPlansList().filter((plan) => plan.billingInterval === 'MONTH');

    return (
        <Flex style={{ height: '100%' }} vertical>
            <NavBar onBack={onBack} />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                <MobileScreenIntro
                    subtitle={t('subtitle')}
                    title={t('title')}
                />
                {isLoading ? (
                    <Card>
                        <Flex align="center" gap={8} justify="center">
                            <DotLoading color="primary" />
                            <Text type="secondary">{t('processing')}</Text>
                        </Flex>
                    </Card>
                ) : null}

                {sub ? (
                    <Card>
                        <Flex gap={12} vertical>
                            <Flex align="center" justify="space-between">
                                <Flex gap={4} vertical>
                                    <Title level={4} style={{ margin: 0, textTransform: 'capitalize' }}>
                                        {sub.planName || `${sub.planId} Plan`}
                                    </Title>
                                    <Text type="secondary">
                                        {formatCurrency(sub.amount * (sub.quantity || 1), sub.currency)} / {sub.planType === 'YEAR' ? 'year' : 'month'}
                                    </Text>
                                </Flex>
                                <Tag color={getStatusColor(sub.status)}>
                                    {getStatusLabel(sub.status)}
                                </Tag>
                            </Flex>

                            <Card size="small">
                                <List>
                                    <List.Item
                                        title={<Text>{t('billingCycle')}</Text>}
                                        extra={<Text>{`${formatDate(sub.cycleStartDate)} - ${formatDate(sub.cycleEndDate)}`}</Text>}
                                    />
                                    <List.Item
                                        title={<Text>{sub.status === 'active' ? t('renews') : t('expires')}</Text>}
                                        extra={<Text>{formatDate(sub.renewsOn || sub.cycleEndDate)}</Text>}
                                    />
                                    <List.Item
                                        title={<Text>AI capacity remaining</Text>}
                                        extra={<Tag color={totalCredits > 0 ? 'success' : 'warning'}>{totalCredits}</Tag>}
                                    />
                                </List>
                            </Card>

                            {sub.status === 'past_due' ? (
                                <Card size="small" style={{ backgroundColor: '#fefce8' }}>
                                    <Flex gap={6} vertical>
                                        <Text>{`${t('paymentFailed')}`}</Text>
                                        <Text type="secondary">
                                            {(() => {
                                                const { remainingDays } = getGracePeriodInfo(sub.pastDueSinceAt);
                                                return `${remainingDays} days grace period remaining.`;
                                            })()}
                                        </Text>
                                        {sub.shortUrl ? (
                                            <Button color="warning" onClick={() => window.open(sub.shortUrl, '_blank')} size="small">
                                                {t('retryPayment')}
                                            </Button>
                                        ) : null}
                                    </Flex>
                                </Card>
                            ) : null}

                            {sub.status === 'paused' ? (
                                <Card size="small" style={{ backgroundColor: '#fff7ed' }}>
                                    <Text>
                                        {!hasValidSubscriptionAccess(sub) ? t('pausedCycleEnded') : t('pausedAccessAvailable')}
                                    </Text>
                                </Card>
                            ) : null}

                            <Flex gap={8} wrap>
                                {sub.status === 'active' ? (
                                    <>
                                        {sub.planId !== 'premium' ? (
                                            <Button color="primary" onClick={() => setShowPlans(true)} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuZap size={14} />
                                                    <Text>{t('upgrade')}</Text>
                                                </Flex>
                                            </Button>
                                        ) : null}
                                        <Button fill="outline" onClick={handlePause} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuPause size={14} />
                                                <Text>{t('pause')}</Text>
                                            </Flex>
                                        </Button>
                                        <Button color="danger" fill="outline" onClick={handleCancel} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuXCircle size={14} />
                                                <Text>{t('cancel')}</Text>
                                            </Flex>
                                        </Button>
                                        <Button fill="outline" onClick={fetchHistory} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuReceipt size={14} />
                                                <Text>{t('billingHistory')}</Text>
                                            </Flex>
                                        </Button>
                                    </>
                                ) : null}
                                {sub.status === 'paused' ? (
                                    <>
                                        <Button color="primary" onClick={handleResume} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuPlay size={14} />
                                                <Text>{t('resume')}</Text>
                                            </Flex>
                                        </Button>
                                        <Button color="danger" fill="outline" onClick={handleCancel} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuXCircle size={14} />
                                                <Text>{t('cancel')}</Text>
                                            </Flex>
                                        </Button>
                                    </>
                                ) : null}
                                {(sub.status === 'cancelled' || sub.status === 'expired') ? (
                                    <Button color="primary" onClick={() => setShowPlans(true)} size="small">
                                        {t('chooseNewPlan')}
                                    </Button>
                                ) : null}
                            </Flex>
                        </Flex>
                    </Card>
                ) : (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuCreditCard color="#d1d5db" size={36} />
                            <Text type="secondary">{t('noActiveSubscription2')}</Text>
                            <Button color="primary" onClick={() => setShowPlans(true)} size="large">
                                <Flex align="center" gap={6}>
                                    <LuZap size={14} />
                                    <Text>{t('chooseAPlan')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Card>
                )}

                {sub ? (
                    <Card>
                        <Flex gap={12} vertical>
                            <Flex align="center" justify="space-between">
                                <Flex align="center" gap={8}>
                                    <LuZap color="#f59e0b" size={16} />
                                    <Text strong>{t('aiFeatures')}</Text>
                                </Flex>
                                <Tag color={totalCredits > 0 ? 'success' : 'warning'}>
                                    {totalCredits > 0 ? t('statusActive') : t('exhausted')}
                                </Tag>
                            </Flex>
                            <Text type="secondary">{t('aiIncludesDesc')}</Text>
                            <Button block color="primary" fill="outline" onClick={() => setShowCredits(true)} size="large">
                                <Flex align="center" gap={6} justify="center">
                                    <LuZap size={14} />
                                    <Text>{totalCredits > 0 ? t('getAiEnhancements') : t('getMoreAiEnhancements')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Card>
                ) : null}

                <Card onClick={fetchHistory}>
                    <Flex align="center" justify="space-between">
                        <Flex align="center" gap={8}>
                            <LuReceipt color="#3b82f6" size={18} />
                            <Text strong>{t('billingHistory')}</Text>
                        </Flex>
                        <LuChevronRight color="#9ca3af" size={16} />
                    </Flex>
                </Card>

                <Card onClick={() => window.open('https://wa.me/919876543210', '_blank')}>
                    <Flex align="center" gap={12}>
                        <LuMessageCircle color="#22c55e" size={20} />
                        <Flex gap={2} vertical>
                            <Text strong>{t('needBillingHelp')}</Text>
                            <Text type="secondary">{t('chatWhatsApp')}</Text>
                        </Flex>
                    </Flex>
                </Card>
            </Flex>

            <Popup bodyStyle={{ maxHeight: '85vh', overflow: 'hidden', padding: 0 }} onMaskClick={() => setShowPlans(false)} position="bottom" visible={showPlans}>
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setShowPlans(false)}>
                        {t('chooseAPlan')}
                    </NavBar>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Flex gap={12} vertical>
                            {plans.filter((plan) => plan.planId !== sub?.planId).map((plan) => {
                                const price = (plan as any)[`price${currency}`]?.price;
                                const credits = (plan as any)[`price${currency}`]?.monthlyCredits;
                                return (
                                    <Card key={plan.planId} onClick={() => handleUpgrade(plan)}>
                                        <Flex align="center" justify="space-between">
                                            <Flex gap={4} vertical>
                                                <Text strong>{`${plan.planId} Plan`}</Text>
                                                <Text type="secondary">{`${credits} credits/mo · ${plan.description}`}</Text>
                                            </Flex>
                                            <Flex gap={2} vertical>
                                                <Text>{price ? formatCurrency(price, currency) : t('contactUs')}</Text>
                                                <Text type="secondary">{t('perMonth')}</Text>
                                            </Flex>
                                        </Flex>
                                    </Card>
                                );
                            })}
                        </Flex>
                        <Text type="secondary" style={{ textAlign: 'center' }}>
                            {t('yearlyAvailable')}
                        </Text>
                    </Flex>
                </Flex>
            </Popup>

            <Popup bodyStyle={{ maxHeight: '70vh', overflow: 'hidden', padding: 0 }} onMaskClick={() => setShowCredits(false)} position="bottom" visible={showCredits}>
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setShowCredits(false)}>
                        {t('getMoreAiEnhancements')}
                    </NavBar>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Text type="secondary">{t('moreAiDesc')}</Text>
                        <Flex gap={12} vertical>
                            {aiEnhancementPacksList.map((pack: AIEnhancementPack) => {
                                const price = (pack as any)[`price${currency}`]?.price;
                                return (
                                    <Card key={pack.packId} onClick={() => handleBuyCredits(pack.packId)}>
                                        <Flex align="center" justify="space-between">
                                            <Flex gap={4} vertical>
                                                <Text strong>{pack.name}</Text>
                                                <Text type="secondary">{pack.description || 'AI Enhancement Pack'}</Text>
                                            </Flex>
                                            <Text>{price ? formatCurrency(price, currency) : 'N/A'}</Text>
                                        </Flex>
                                    </Card>
                                );
                            })}
                        </Flex>
                    </Flex>
                </Flex>
            </Popup>

            <Popup bodyStyle={{ maxHeight: '80vh', overflow: 'hidden', padding: 0 }} onMaskClick={() => setShowHistory(false)} position="bottom" visible={showHistory}>
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setShowHistory(false)}>
                        {t('billingHistory')}
                    </NavBar>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        {billingHistory.length === 0 ? (
                            <Text type="secondary" style={{ textAlign: 'center' }}>
                                {t('noBillingHistoryYet')}
                            </Text>
                        ) : (
                            <List>
                                {billingHistory.map((item: any, index: number) => (
                                    <List.Item
                                        key={item.id || index}
                                        extra={
                                            <Flex align="center" gap={8}>
                                                <Text>{formatCurrency(item.amount, item.currency)}</Text>
                                                {item.invoiceUrl ? (
                                                    <Button onClick={() => window.open(item.invoiceUrl, '_blank')} size="small">
                                                        <LuExternalLink size={16} color="#3b82f6" />
                                                    </Button>
                                                ) : null}
                                            </Flex>
                                        }
                                        title={<Text>{item.type}</Text>}
                                        description={
                                            <Text type="secondary">
                                                {new Date(item.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </Text>
                                        }
                                    />
                                ))}
                            </List>
                        )}
                    </Flex>
                </Flex>
            </Popup>
        </Flex>
    );
}
