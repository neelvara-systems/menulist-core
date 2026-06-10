'use client'

import { AIEnhancementPack, Currency, Plan } from '@data/common';
import { isFeatureEnabled } from '@config/features';
import { aiEnhancementPacksList, getB2BPlansList, getB2CPlansList } from '@data/PlatformPlansList';
import { getActiveSubscriptionForStore } from '@database/subscriptions';
import { getBillingHistoryForStore } from '@database/subscriptions/paymentTransactions';
import usePaymentHandler from '@hook/usePaymentHandler';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import { formatBillingHistoryEvents } from '@lib/billing/billingHistoryFormatter';
import { logger } from '@lib/monitoring/logger';
import { getAccessibleStoreSummaries } from '@lib/multiOutlet/storeSwitchAccess';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { formatDateTime, toDate } from '@util/dateTime';
import { formatCurrency } from '@util/formatters';
import { getGracePeriodInfo, hasValidSubscriptionAccess } from '@util/razorpay';
import { theme } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useContext, useMemo, useState } from 'react';
import { LuBuilding2, LuChevronRight, LuCreditCard, LuExternalLink, LuMapPin, LuMessageCircle, LuPause, LuPlay, LuPlus, LuReceipt, LuStore, LuX, LuXCircle, LuZap } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, List, NavBar, Popup, Tag, Text, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileBillingScreenProps {
    onBack: () => void;
}

export default function MobileBillingScreen({ onBack }: MobileBillingScreenProps) {
    const t = useTranslations('Billing');
    const formatter = useFormatter();
    const { token } = theme.useToken();
    const {
        activeSubscription,
        activeSubscriptionLoading,
        activeStoreContext,
        setActiveStoreContext,
        setActiveSubscription,
        storeDetails,
        tenantDetails,
        userPermissions,
    } = useContext(PlatformGlobalDataContext);
    const router = useRouter();
    const { data: session } = useSession();
    const [billingHistory, setBillingHistory] = useState<any[]>([]);
    const [showPlans, setShowPlans] = useState(false);
    const [showCredits, setShowCredits] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showStorePicker, setShowStorePicker] = useState(false);
    const [billingInterval, setBillingInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
    const [isLoading, setIsLoading] = useState(false);

    const noopDispatcher = (_action: any) => undefined;
    const { onUpgradePlan, onClickPaymentCard, handleTopupPurchase, onCancelSubscription, onPauseSubscription, onResumeSubscription } = usePaymentHandler(noopDispatcher);

    const tenantStoresList = tenantDetails?.storesList || [];
    const accessibleBillingStores = useMemo(
        () => getAccessibleStoreSummaries({ sessionUser: session?.user as any, tenantDetails }),
        [session?.user, tenantDetails],
    );
    const loginStoreId = Number(session?.user?.storeId || 0);
    const billingStoreId = Number(activeStoreContext || storeDetails?.storeId || session?.user?.storeId || 0);
    const canSwitchBillingStore = Boolean(userPermissions?.canSwitchStores && accessibleBillingStores.length > 1);
    const selectedStore = useMemo(
        () => tenantStoresList.find((store: any) => Number(store.storeId) === billingStoreId),
        [billingStoreId, tenantStoresList],
    );
    const subscriptionStore = useMemo(
        () => tenantStoresList.find((store: any) => Number(store.storeId) === Number(activeSubscription?.storeId)),
        [activeSubscription?.storeId, tenantStoresList],
    );
    const isInheritedBilling = Boolean(activeSubscription && billingStoreId && Number(activeSubscription.storeId) !== billingStoreId);

    const currency: Currency = activeSubscription?.currency || (storeDetails?.currencyCode as Currency) || 'INR';

    const sub = activeSubscription;
    const isManualBilling = sub?.billingMode === 'manual';
    const isPaymentPending = sub?.status === 'pending';
    const activeStoreCount = tenantStoresList.filter((store: any) => store?.active !== false).length || 1;
    const paidLocationCount = Math.max(1, Number(sub?.quantity || 1));
    const nextPaidLocationCount = Math.max(paidLocationCount + 1, activeStoreCount + 1);
    const monthlyCredits = sub?.monthlyCredits || 0;
    const monthlyCreditsAllowance = sub?.monthlyCreditsAllowance || 0;
    const monthlyCreditsUsed = Math.max(0, monthlyCreditsAllowance - monthlyCredits);
    const topUpCredits = sub?.topUpCredits || 0;
    const totalCredits = monthlyCredits + topUpCredits;
    const isLowOnEnhancements = Boolean(sub && totalCredits <= Math.max(10, monthlyCreditsAllowance * 0.2));
    const canPauseSubscriptions = isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE');
    const currentSubscriptionPlan = useMemo(() => {
        if (!sub) return null;
        const sourcePlans = sub.userType === 'B2B' ? getB2BPlansList() : getB2CPlansList();
        return sourcePlans.find((plan) => (
            plan.planId === sub.planId
            && plan.billingInterval === sub.planType
        )) || null;
    }, [sub?.planId, sub?.planType, sub?.userType]);

    const refetchSubscription = async () => {
        try {
            if (!billingStoreId) return;
            const subscription = await getActiveSubscriptionForStore(
                Number(session?.user?.tenantId),
                billingStoreId,
                tenantStoresList,
            );
            setActiveSubscription(subscription);
        } catch (err) {
            logger.error('Failed to refetch subscription', err);
        }
    };

    if (!storeDetails) {
        return (
            <Flex style={{ height: '100%' }} vertical>
                <MobileSettingsScreenHeader
                    description={t('subtitle')}
                    onBack={onBack}
                    title={t('title')}
                />
                <Flex align="center" justify="center" style={{ flex: 1 }}>
                    <DotLoading color="primary" />
                </Flex>
            </Flex>
        );
    }

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'N/A';
        try {
            const date = toDate(timestamp);
            if (isNaN(date.getTime())) return 'N/A';
            return formatDateTime(date, 'date', formatter);
        } catch {
            return 'N/A';
        }
    };

    const getStatusColor = (status: string) => {
        if (status === 'active') return 'success';
        if (status === 'pending') return 'primary';
        if (status === 'paused') return 'warning';
        if (status === 'past_due') return 'warning';
        if (status === 'cancelled' || status === 'expired') return 'default';
        return 'default';
    };

    const getStatusLabel = (status: string) => {
        if (status === 'active') return t('statusActive');
        if (status === 'pending') return 'Payment pending';
        if (status === 'paused') return t('statusPaused');
        if (status === 'past_due') return t('statusPaymentFailed');
        if (status === 'cancelled') return t('statusCancelled');
        if (status === 'expired') return t('statusExpired');
        return status;
    };

    const handleUpgrade = async (plan: Plan) => {
        if (isManualBilling && sub?.status === 'active') {
            Toast.show({ content: 'This client is on a prepaid offline plan. Renew or change it through the reseller flow.', duration: 3000 });
            return;
        }
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
            logger.error('Mobile billing plan update failed', err);
            Toast.show({ content: err?.message || t('paymentFailedRetry'), duration: 3000 });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPaidLocation = async () => {
        if (!sub || !currentSubscriptionPlan) {
            Toast.show({ content: 'Current plan details are not available.', duration: 2200 });
            return;
        }
        if (isManualBilling) {
            Toast.show({ content: 'Ask your reseller to add prepaid location capacity.', duration: 2500 });
            return;
        }

        setIsLoading(true);
        try {
            await onUpgradePlan(sub, currentSubscriptionPlan, currency, nextPaidLocationCount);
            Toast.show({ content: `Paid locations updated to ${nextPaidLocationCount}.`, duration: 2000 });
            await refetchSubscription();
        } catch (err: any) {
            logger.error('Mobile paid location update failed', err);
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
            const paymentResult: any = await handleTopupPurchase(pack, currency);
            Toast.show({ content: t('enhancementsReady'), duration: 2000 });
            setActiveSubscription((previous: any) => previous
                ? {
                    ...previous,
                    topUpCredits: typeof paymentResult?.newCreditBalance === 'number'
                        ? paymentResult.newCreditBalance
                        : (previous.topUpCredits || 0) + pack.creditAmount,
                }
                : previous);
        } catch (err: any) {
            logger.error('Mobile enhancement pack purchase failed', err);
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
                    logger.error('Mobile subscription pause failed', err);
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
            logger.error('Mobile subscription resume failed', err);
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
                    logger.error('Mobile subscription cancellation failed', err);
                    Toast.show({ content: err?.message || t('failedToCancel'), duration: 3000 });
                }
            },
        });
    };

    const fetchHistory = async () => {
        try {
            const historyStoreId = Number(sub?.storeId || billingStoreId || session?.user?.storeId);
            const raw = await getBillingHistoryForStore(Number(session?.user?.tenantId), historyStoreId);
            const formatted = formatBillingHistoryEvents(raw);
            setBillingHistory(formatted);
            setShowHistory(true);
        } catch (err) {
            logger.error('Mobile billing history fetch failed', err);
            Toast.show({ content: t('failedToLoadHistory'), duration: 2000 });
        }
    };

    const handleBillingStoreChange = async (targetStoreId: number) => {
        if (targetStoreId === loginStoreId) {
            if (loginStoreId) await refreshFirebaseAuthClaims(loginStoreId);
            setActiveStoreContext(null);
            setShowStorePicker(false);
            Toast.show({ content: 'Switched store', duration: 1500 });
            return;
        }

        try {
            const res = await fetch('/api/auth/switch-store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStoreId }),
            });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || 'Failed to switch store');
            }
            await refreshFirebaseAuthClaims(targetStoreId);
            setActiveStoreContext(targetStoreId);
            setShowStorePicker(false);
            Toast.show({ content: 'Switched store', duration: 1500 });
        } catch (err: any) {
            logger.error('Mobile billing store switch failed', err);
            Toast.show({ content: err?.message || 'Failed to switch store', duration: 2000 });
        }
    };

    const plans = (sub?.userType === 'B2B' ? getB2BPlansList() : getB2CPlansList()).filter((plan) => plan.billingInterval === billingInterval);
    const amountLabel = sub
        ? isManualBilling
            ? `${formatCurrency(sub.amount, sub.currency)} / one-time prepaid${sub.commitmentPeriodMonths ? ` (${sub.commitmentPeriodMonths} months)` : ''}`
            : `${formatCurrency(sub.amount * (sub.quantity || 1), sub.currency)} / ${sub.planType === 'YEAR' ? 'year' : 'month'}`
        : '';
    const manualBillingTagStyle = {
        backgroundColor: token.colorPrimaryBg,
        borderColor: token.colorPrimaryBorder,
        color: token.colorPrimaryText,
    };

    return (
        <Flex style={{ height: '100%' }} vertical>
            <MobileSettingsScreenHeader
                description={t('subtitle')}
                onBack={onBack}
                title={t('title')}
            />

            <Flex gap={16} style={{ flex: 1, overflowY: 'auto', padding: 16 }} vertical>
                {canSwitchBillingStore ? (
                    <Card onClick={() => setShowStorePicker(true)}>
                        <Flex align="center" justify="space-between">
                            <Flex align="center" gap={10}>
                                {selectedStore?.isMaster ? <LuBuilding2 color={token.colorPrimary} size={18} /> : <LuStore color={token.colorPrimary} size={18} />}
                                <Flex gap={2} vertical>
                                    <Text strong>{selectedStore?.name || t('title')}</Text>
                                    <Text type="secondary">
                                        {isInheritedBilling
                                            ? `${subscriptionStore?.name || 'HQ'} handles billing`
                                            : 'Billing store'}
                                    </Text>
                                </Flex>
                            </Flex>
                            <LuChevronRight color={token.colorTextTertiary} size={16} />
                        </Flex>
                    </Card>
                ) : null}

                {isInheritedBilling ? (
                    <Card>
                        <Text type="secondary">
                            This outlet uses the HQ subscription. Plan changes, payment retries, and enhancement packs apply to {subscriptionStore?.name || 'the HQ store'}.
                        </Text>
                    </Card>
                ) : null}

                {(isLoading || activeSubscriptionLoading) ? (
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
                                        {amountLabel}
                                    </Text>
                                </Flex>
                                <Tag color={getStatusColor(sub.status)}>
                                    {getStatusLabel(sub.status)}
                                </Tag>
                            </Flex>

                            <Card size="small">
                                <List>
                                    <List.Item
                                        title={<Text>{isManualBilling ? 'Prepaid period' : t('billingCycle')}</Text>}
                                        extra={<Text>{isPaymentPending ? 'Starts after payment' : `${formatDate(sub.cycleStartDate)} - ${formatDate(sub.cycleEndDate)}`}</Text>}
                                    />
                                    <List.Item
                                        title={<Text>{isManualBilling ? 'Prepaid until' : sub.status === 'active' ? t('renews') : t('expires')}</Text>}
                                        extra={<Text>{isPaymentPending ? 'After payment' : formatDate(isManualBilling ? (sub.validUntil || sub.cycleEndDate) : (sub.renewsOn || sub.cycleEndDate))}</Text>}
                                    />
                                    <List.Item
                                        title={<Text>Payment type</Text>}
                                        extra={<Tag color={isManualBilling ? undefined : 'processing'} style={isManualBilling ? manualBillingTagStyle : undefined}>{isManualBilling ? 'Offline one-time prepaid' : isPaymentPending ? 'Razorpay pending' : 'Razorpay recurring'}</Tag>}
                                    />
                                    <List.Item
                                        title={<Text>Paid locations</Text>}
                                        extra={<Text>{sub.quantity || 1}</Text>}
                                    />
                                    <List.Item
                                        title={<Text>Enhancement balance remaining</Text>}
                                        extra={<Tag color={totalCredits > 0 ? 'success' : 'warning'}>{totalCredits}</Tag>}
                                    />
                                    <List.Item
                                        title={<Text>Plan balance</Text>}
                                        extra={<Text>{monthlyCredits} of {monthlyCreditsAllowance}</Text>}
                                    />
                                    <List.Item
                                        title={<Text>Used this cycle</Text>}
                                        extra={<Text>{monthlyCreditsUsed}</Text>}
                                    />
                                    <List.Item
                                        title={<Text>Pack balance</Text>}
                                        extra={<Text>{topUpCredits}</Text>}
                                    />
                                </List>
                            </Card>

                            {sub.status === 'active' && !isManualBilling && !isInheritedBilling ? (
                                <Card size="small" style={{ backgroundColor: token.colorFillQuaternary }}>
                                    <Flex gap={8} vertical>
                                        <Flex align="center" gap={8}>
                                            <LuMapPin color={token.colorPrimary} size={16} />
                                            <Text strong>Paid locations</Text>
                                        </Flex>
                                        <Text type="secondary">
                                            {paidLocationCount} paid, {activeStoreCount} active. Add one paid location before creating the next outlet.
                                        </Text>
                                        <Button
                                            block
                                            color="primary"
                                            disabled={!currentSubscriptionPlan}
                                            fill="outline"
                                            onClick={() => void handleAddPaidLocation()}
                                            size="large"
                                        >
                                            <Flex align="center" gap={6} justify="center">
                                                <LuPlus size={14} />
                                                <Text>Add paid location</Text>
                                            </Flex>
                                        </Button>
                                    </Flex>
                                </Card>
                            ) : null}

                            {sub.status === 'past_due' ? (
                                <Card size="small" style={{ backgroundColor: token.colorWarningBg }}>
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

                            {isPaymentPending ? (
                                <Card size="small" style={{ backgroundColor: token.colorPrimaryBg }}>
                                    <Flex gap={8} vertical>
                                        <Text>Payment is pending. Complete the Razorpay checkout to activate this store.</Text>
                                        {sub.shortUrl ? (
                                            <Button color="primary" onClick={() => window.open(sub.shortUrl, '_blank')} size="small">
                                                Pay Now
                                            </Button>
                                        ) : null}
                                    </Flex>
                                </Card>
                            ) : null}

                            {isManualBilling ? (
                                <Card size="small" style={{ backgroundColor: token.colorWarningBg }}>
                                    <Text>
                                        Offline payment was confirmed by the reseller. This is prepaid access for the selected duration, not lifetime access.
                                    </Text>
                                </Card>
                            ) : null}

                            {sub.status === 'paused' ? (
                                <Card size="small" style={{ backgroundColor: token.colorWarningBg }}>
                                    <Text>
                                        {canPauseSubscriptions
                                            ? (!hasValidSubscriptionAccess(sub) ? t('pausedCycleEnded') : t('pausedAccessAvailable'))
                                            : (!hasValidSubscriptionAccess(sub)
                                                ? 'This subscription is paused and the billing cycle has ended. Contact support to update it.'
                                                : 'This subscription is paused. Access remains available until the current billing cycle ends. Contact support to update it.')}
                                    </Text>
                                </Card>
                            ) : null}

                            <Flex gap={8} wrap>
                                {sub.status === 'active' ? (
                                    <>
                                        {!isManualBilling && sub.planId !== 'premium' ? (
                                            <Button color="primary" onClick={() => setShowPlans(true)} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuZap size={14} />
                                                    <Text>{t('upgrade')}</Text>
                                                </Flex>
                                            </Button>
                                        ) : null}
                                        {!isManualBilling ? (
                                            <>
                                                {canPauseSubscriptions ? (
                                                    <Button fill="outline" onClick={handlePause} size="small">
                                                        <Flex align="center" gap={6}>
                                                            <LuPause size={14} />
                                                            <Text>{t('pause')}</Text>
                                                        </Flex>
                                                    </Button>
                                                ) : null}
                                                <Button color="danger" fill="outline" onClick={handleCancel} size="small">
                                                    <Flex align="center" gap={6}>
                                                        <LuXCircle size={14} />
                                                        <Text>{t('cancel')}</Text>
                                                    </Flex>
                                                </Button>
                                            </>
                                        ) : null}
                                        <Button fill="outline" onClick={fetchHistory} size="small">
                                            <Flex align="center" gap={6}>
                                                <LuReceipt size={14} />
                                                <Text>{t('billingHistory')}</Text>
                                            </Flex>
                                        </Button>
                                    </>
                                ) : null}
                                {isPaymentPending && sub.shortUrl ? (
                                    <Button color="primary" onClick={() => window.open(sub.shortUrl, '_blank')} size="small">
                                        Pay Now
                                    </Button>
                                ) : null}
                                {sub.status === 'paused' ? (
                                    <>
                                        {canPauseSubscriptions ? (
                                            <Button color="primary" onClick={handleResume} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuPlay size={14} />
                                                    <Text>{t('resume')}</Text>
                                                </Flex>
                                            </Button>
                                        ) : (
                                            <Button color="primary" onClick={() => router.push('/dashboard#mobile/more/answerlatticeSupport')} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuMessageCircle size={14} />
                                                    <Text>Contact support</Text>
                                                </Flex>
                                            </Button>
                                        )}
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
                ) : !activeSubscriptionLoading ? (
                    <Card>
                        <Flex align="center" gap={12} vertical>
                            <LuCreditCard color={token.colorTextTertiary} size={36} />
                            <Text type="secondary">{t('noActiveSubscription2')}</Text>
                            <Button color="primary" onClick={() => setShowPlans(true)} size="large">
                                <Flex align="center" gap={6}>
                                    <LuZap size={14} />
                                    <Text>{t('chooseAPlan')}</Text>
                                </Flex>
                            </Button>
                        </Flex>
                    </Card>
                ) : null}

                {sub && !isPaymentPending ? (
                    <Card>
                        <Flex gap={12} vertical>
                            <Flex align="center" justify="space-between">
                                <Flex align="center" gap={8}>
                                    <LuZap color={token.colorWarning} size={16} />
                                    <Text strong>{t('aiFeatures')}</Text>
                                </Flex>
                                <Tag color={totalCredits > 0 ? 'success' : 'warning'}>
                                    {totalCredits > 0 ? t('statusActive') : t('exhausted')}
                                </Tag>
                            </Flex>
                            <Text type="secondary">{t('aiIncludesDesc')}</Text>
                            <Card size="small" style={{ backgroundColor: isLowOnEnhancements ? token.colorWarningBg : token.colorFillQuaternary }}>
                                <Flex align="center" justify="space-between">
                                    <Flex gap={2} vertical>
                                        <Text strong>{totalCredits}</Text>
                                        <Text type="secondary">enhancements left</Text>
                                    </Flex>
                                    <Flex gap={2} style={{ textAlign: 'right' }} vertical>
                                        <Text>{monthlyCredits} plan</Text>
                                        <Text type="secondary">{topUpCredits} pack</Text>
                                    </Flex>
                                </Flex>
                                {isLowOnEnhancements ? (
                                    <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                                        Running low. Add a pack before generation pauses.
                                    </Text>
                                ) : null}
                            </Card>
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
                            <LuReceipt color={token.colorPrimary} size={18} />
                            <Text strong>{t('billingHistory')}</Text>
                        </Flex>
                        <LuChevronRight color={token.colorTextTertiary} size={16} />
                    </Flex>
                </Card>

                <Card onClick={() => router.push('/dashboard#mobile/more/answerlatticeSupport')}>
                    <Flex align="center" gap={12}>
                        <LuMessageCircle color={token.colorSuccess} size={20} />
                        <Flex gap={2} vertical>
                            <Text strong>{t('needBillingHelp')}</Text>
                            <Text type="secondary">Open a support ticket in Help Center.</Text>
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
                        <Flex gap={8}>
                            <Button
                                block
                                color={billingInterval === 'MONTH' ? 'primary' : undefined}
                                fill={billingInterval === 'MONTH' ? 'solid' : 'outline'}
                                onClick={() => setBillingInterval('MONTH')}
                            >
                                Monthly
                            </Button>
                            <Button
                                block
                                color={billingInterval === 'YEAR' ? 'primary' : undefined}
                                fill={billingInterval === 'YEAR' ? 'solid' : 'outline'}
                                onClick={() => setBillingInterval('YEAR')}
                            >
                                Yearly
                            </Button>
                        </Flex>
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
                    </Flex>
                </Flex>
            </Popup>

            <Popup bodyStyle={{ maxHeight: '70vh', overflow: 'hidden', padding: 0 }} onMaskClick={() => setShowStorePicker(false)} position="bottom" visible={showStorePicker}>
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setShowStorePicker(false)}>
                        Billing store
                    </NavBar>
                    <Flex style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <List>
                            {accessibleBillingStores.map((store: any) => (
                                <List.Item
                                    extra={
                                        <Flex align="center" gap={6}>
                                            {store.isMaster ? <Tag color="warning">HQ</Tag> : null}
                                            {Number(store.storeId) === billingStoreId ? <Tag color="processing">Current</Tag> : null}
                                        </Flex>
                                    }
                                    key={store.storeId}
                                    onClick={() => handleBillingStoreChange(Number(store.storeId))}
                                    prefix={store.isMaster ? <LuBuilding2 color={token.colorPrimary} size={18} /> : <LuStore color={token.colorPrimary} size={18} />}
                                    title={<Text strong>{store.name || `Store ${store.storeId}`}</Text>}
                                />
                            ))}
                        </List>
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
                                                <Text type="secondary">{pack.description || 'Enhancement Pack'}</Text>
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
                                                        <LuExternalLink size={16} color={token.colorPrimary} />
                                                    </Button>
                                                ) : null}
                                            </Flex>
                                        }
                                        title={<Text>{item.type}</Text>}
                                        description={
                                            <Text type="secondary">
                                                {formatDate(item.date)}
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
