'use client'

import { AIEnhancementPack, Currency, Plan } from '@data/common';
import { MENULIST_B2C_PLAN_IDS } from '@constant/menulistPlans';
import { isFeatureEnabled } from '@config/features';
import { aiEnhancementPacksList, getB2BPlansList, getB2CPlansList } from '@data/PlatformPlansList';
import {
    getContentCreditOutcomeExamples,
    resolveMenuListPromotionalCreditState,
} from '@data/shared/contentCreditPolicy';
import { getActiveSubscriptionForStore } from '@database/subscriptions';
import { getBillingHistoryForStore } from '@database/subscriptions/paymentTransactions';
import { getBoundedPaymentStringContext, logPaymentFailure } from '@hook/paymentDiagnostics';
import usePaymentHandler, { isPaymentCheckoutDismissedError } from '@hook/usePaymentHandler';
import { AUTH_ACCOUNT_REQUEST_POLICY, readAuthAccountResponse } from '@lib/auth/accountClientResponses';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import { formatBillingHistoryEvents } from '@lib/billing/billingHistoryFormatter';
import {
    fetchMenuListBillingDocumentSummaries,
    mergeMenuListBillingDocumentsIntoHistory,
} from '@lib/billing/billingDocumentsClient';
import { hasVerifiedSubscriptionPaymentEvidence } from '@lib/billing/subscriptionPlanEntitlement';
import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';
import {
    CANCELLATION_REASON,
    CANCELLATION_REASON_OPTIONS,
    type CancellationReasonCode,
} from '@lib/billing/cancellationReasons';
import {
    claimStoreSwitchAttempt,
    getAccessibleStoreSummaries,
    getStoreSummaryId,
    releaseStoreSwitchAttempt,
} from '@lib/multiOutlet/storeSwitchAccess';
import { normalizeRazorpaySubscriptionCheckoutUrl } from '@lib/razorpay/checkoutUrl';
import { PlatformGlobalDataContext } from '@providers/platformProviders/platformGlobalDataProvider';
import { formatDateTime, toDate } from '@util/dateTime';
import { formatCurrency } from '@util/formatters';
import { getGracePeriodDisplayInfo, hasValidSubscriptionAccess } from '@util/razorpay';
import { theme } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useContext, useMemo, useRef, useState } from 'react';
import { LuBuilding2, LuCheck, LuChevronRight, LuCreditCard, LuExternalLink, LuMapPin, LuMessageCircle, LuPause, LuPlay, LuPlus, LuReceipt, LuStore, LuX, LuXCircle, LuZap } from 'react-icons/lu';
import { Button, Card, Dialog, DotLoading, Flex, List, NavBar, Popup, Tag, Text, TextArea, Title, Toast } from '../antd';
import MobileSettingsScreenHeader from '../components/MobileSettingsScreenHeader';

interface MobileBillingScreenProps {
    onBack: () => void;
}

type MobileBillingExternalLinkKind = 'retry_payment' | 'invoice';

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
    const [showCancellationReasons, setShowCancellationReasons] = useState(false);
    const [cancellationReason, setCancellationReason] = useState<CancellationReasonCode | null>(null);
    const [cancellationReasonDetail, setCancellationReasonDetail] = useState('');
    const [billingInterval, setBillingInterval] = useState<'MONTH' | 'YEAR'>('MONTH');
    const [isLoading, setIsLoading] = useState(false);

    const noopDispatcher: Parameters<typeof usePaymentHandler>[0] = () => undefined;
    const {
        onUpgradePlan,
        onContinuePendingSubscriptionCheckout,
        handleTopupPurchase,
        onCancelSubscription,
        onPauseSubscription,
        onResumeSubscription,
    } = usePaymentHandler(noopDispatcher);

    const tenantStoresList = tenantDetails?.storesList || [];
    const accessibleBillingStores = useMemo(
        () => getAccessibleStoreSummaries({ sessionUser: session?.user as any, tenantDetails }),
        [session?.user, tenantDetails],
    );
    const loginStoreId = Number(session?.user?.storeId || 0);
    const billingStoreId = Number(activeStoreContext || storeDetails?.storeId || session?.user?.storeId || 0);
    const billingScopeKey = session?.user?.id && session?.user?.tenantId && billingStoreId
        ? `${session.user.id}:${session.user.tenantId}:${billingStoreId}`
        : null;
    const billingScopeKeyRef = useRef<string | null>(billingScopeKey);
    const billingHistoryRequestSequenceRef = useRef(0);
    const subscriptionRequestSequenceRef = useRef(0);
    billingScopeKeyRef.current = billingScopeKey;
    const canSwitchBillingStore = Boolean(userPermissions?.canSwitchStores && accessibleBillingStores.length > 1);
    const selectedStore = useMemo(
        () => tenantStoresList.find((store: any) => Number(store.storeId) === billingStoreId),
        [billingStoreId, tenantStoresList],
    );
    const subscriptionStore = useMemo(
        () => tenantStoresList.find((store: any) => Number(store.storeId) === Number(activeSubscription?.storeId)),
        [activeSubscription?.storeId, tenantStoresList],
    );
    const loginStore = useMemo(
        () => tenantStoresList.find((store: any) => Number(store.storeId) === loginStoreId),
        [loginStoreId, tenantStoresList],
    );
    const isInheritedBilling = Boolean(activeSubscription && billingStoreId && Number(activeSubscription.storeId) !== billingStoreId);
    const isSwitchedBillingContext = Boolean(loginStoreId && billingStoreId && loginStoreId !== billingStoreId);
    const isSignedInBillingContext = Boolean(loginStoreId && billingStoreId && loginStoreId === billingStoreId);
    const canManageSelectedSubscription = isSignedInBillingContext && !isInheritedBilling;
    const hasEnhancementPackBillingTerms = Boolean(activeSubscription?.taxSnapshot);
    const canBuyEnhancementPacks = isSignedInBillingContext && hasEnhancementPackBillingTerms;

    const currency: Currency = activeSubscription?.currency || (storeDetails?.currencyCode as Currency) || 'INR';

    const sub = activeSubscription;
    const subscriptionCheckoutUrl = normalizeRazorpaySubscriptionCheckoutUrl(sub?.shortUrl);
    const isManualBilling = sub?.billingMode === 'manual';
    const isPaymentPending = sub?.status === 'pending'
        || Boolean(
            sub?.status === 'active'
            && !hasVerifiedSubscriptionPaymentEvidence(sub),
        );
    const activeStoreCount = tenantStoresList.filter((store: any) => store?.active !== false).length || 1;
    const paidLocationCount = Math.max(1, Number(sub?.quantity || 1));
    const isMultiLocationPlan = sub?.planId === MENULIST_B2C_PLAN_IDS.MULTI_LOCATION;
    const nextPaidLocationCount = Math.max(paidLocationCount + 1, activeStoreCount + 1);
    const monthlyCredits = sub?.monthlyCredits || 0;
    const promotionalCredits = resolveMenuListPromotionalCreditState({
        credits: sub?.promotionalCredits,
        expiresAt: sub?.promotionalCreditsExpireAt,
    }).credits ?? 0;
    const topUpCredits = sub?.topUpCredits || 0;
    const totalCredits = monthlyCredits + promotionalCredits + topUpCredits;
    const canPauseSubscriptions = isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE');
    const buildMobileBillingPaymentLogContext = (flow: string, metadata: Record<string, unknown> = {}) => ({
        surface: 'mobile_billing',
        flow,
        hasActiveSubscription: Boolean(sub),
        status: sub?.status || 'unknown',
        billingStoreIdPresent: Boolean(billingStoreId),
        ...getBoundedPaymentStringContext('planId', sub?.planId),
        ...getBoundedPaymentStringContext('subscriptionId', sub?.providerSubscriptionId),
        ...metadata,
    });
    const currentSubscriptionPlan = useMemo(() => {
        if (!sub) return null;
        const sourcePlans = sub.userType === 'B2B' ? getB2BPlansList() : getB2CPlansList();
        return sourcePlans.find((plan) => (
            plan.planId === sub.planId
            && plan.billingInterval === sub.planType
        )) || null;
    }, [sub?.planId, sub?.planType, sub?.userType]);

    const refetchSubscription = async () => {
        const requestSequence = ++subscriptionRequestSequenceRef.current;
        const requestScopeKey = billingScopeKey;
        try {
            if (!billingStoreId) return;
            const subscription = await getActiveSubscriptionForStore(
                Number(session?.user?.tenantId),
                billingStoreId,
                tenantStoresList,
            );
            if (
                subscriptionRequestSequenceRef.current !== requestSequence
                || billingScopeKeyRef.current !== requestScopeKey
            ) return;
            setActiveSubscription(subscription);
        } catch (err) {
            if (
                subscriptionRequestSequenceRef.current !== requestSequence
                || billingScopeKeyRef.current !== requestScopeKey
            ) return;
            logPaymentFailure('payment_mobile_billing_subscription_refetch_failed', err, buildMobileBillingPaymentLogContext('subscription_refetch'));
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

    const getPastDueGracePeriodDisplay = () => getGracePeriodDisplayInfo(sub?.pastDueSinceAt);

    const handleUpgrade = async (plan: Plan) => {
        const mutationScopeKey = billingScopeKey;
        if (!canManageSelectedSubscription) {
            Toast.show({ content: `Return to ${loginStore?.name || 'your signed-in store'} to change a subscription.`, duration: 2600 });
            return;
        }
        if (isManualBilling && sub?.status === 'active') {
            Toast.show({ content: 'This client is on a prepaid offline plan. Renew or change it through the reseller flow.', duration: 3000 });
            return;
        }
        if (!sub) {
            setShowPlans(false);
            router.push('/pricing');
            return;
        }
        setShowPlans(false);
        setIsLoading(true);
        try {
            const paymentResponse = await onUpgradePlan(sub, plan, currency);
            if (billingScopeKeyRef.current !== mutationScopeKey) return;
            if (paymentResponse?.activationStatus === 'processing') {
                Toast.show({ content: 'Payment received. Subscription activation is being confirmed.', duration: 3000 });
            } else {
                Toast.show({ content: t('planUpdated'), duration: 2000 });
            }
            await refetchSubscription();
        } catch (err) {
            if (isPaymentCheckoutDismissedError(err)) {
                await refetchSubscription();
                return;
            }
            logPaymentFailure('payment_mobile_billing_plan_update_failed', err, buildMobileBillingPaymentLogContext('plan_update', {
                ...getBoundedPaymentStringContext('targetPlanId', plan.planId),
            }));
            Toast.show({ content: t('paymentFailedRetry'), duration: 3000 });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddPaidLocation = async () => {
        const mutationScopeKey = billingScopeKey;
        if (!canManageSelectedSubscription) {
            Toast.show({ content: `Return to ${loginStore?.name || 'your signed-in store'} to change paid locations.`, duration: 2600 });
            return;
        }
        if (!sub || !currentSubscriptionPlan) {
            Toast.show({ content: 'Current plan details are not available.', duration: 2200 });
            return;
        }
        if (!isMultiLocationPlan) {
            Toast.show({ content: 'Choose the Multi-location plan before adding locations.', duration: 2600 });
            setShowPlans(true);
            return;
        }
        if (isManualBilling) {
            Toast.show({ content: 'Ask your reseller to add prepaid location capacity.', duration: 2500 });
            return;
        }

        setIsLoading(true);
        try {
            const paymentResponse = await onUpgradePlan(
                sub,
                currentSubscriptionPlan,
                currency,
                nextPaidLocationCount,
            );
            if (billingScopeKeyRef.current !== mutationScopeKey) return;
            Toast.show({
                content: paymentResponse.activationStatus === 'processing'
                    ? 'Payment received. The paid location update is being confirmed.'
                    : `Paid locations updated to ${nextPaidLocationCount}.`,
                duration: paymentResponse.activationStatus === 'processing' ? 3000 : 2000,
            });
            await refetchSubscription();
        } catch (err) {
            if (isPaymentCheckoutDismissedError(err)) return;
            logPaymentFailure('payment_mobile_billing_paid_location_failed', err, buildMobileBillingPaymentLogContext('add_paid_location', {
                ...getBoundedPaymentStringContext('targetPlanId', currentSubscriptionPlan.planId),
                quantity: nextPaidLocationCount,
            }));
            Toast.show({ content: t('paymentFailedRetry'), duration: 3000 });
        } finally {
            setIsLoading(false);
        }
    };

    const handleContinuePendingCheckout = async () => {
        const mutationScopeKey = billingScopeKey;
        if (!sub || !canManageSelectedSubscription) {
            Toast.show({ content: `Return to ${loginStore?.name || 'your signed-in store'} to continue checkout.`, duration: 2600 });
            return;
        }

        setIsLoading(true);
        try {
            const result = await onContinuePendingSubscriptionCheckout(sub);
            if (billingScopeKeyRef.current !== mutationScopeKey) return;
            Toast.show({
                content: result.activationStatus === 'processing'
                    ? 'Razorpay is still confirming this payment. No new checkout was opened.'
                    : 'Payment confirmed. Your subscription is active.',
                duration: result.activationStatus === 'processing' ? 3200 : 2000,
            });
            await refetchSubscription();
        } catch (error) {
            if (isPaymentCheckoutDismissedError(error)) {
                await refetchSubscription();
                return;
            }
            logPaymentFailure('payment_mobile_pending_subscription_continue_failed', error, buildMobileBillingPaymentLogContext('pending_payment'));
            Toast.show({ content: 'Could not continue checkout. Refresh Billing and try again.', duration: 2600 });
        } finally {
            setIsLoading(false);
        }
    };

    const handleBuyCredits = async (packId: string) => {
        const mutationScopeKey = billingScopeKey;
        if (!canBuyEnhancementPacks) {
            Toast.show({ content: `Return to ${loginStore?.name || 'your signed-in store'} to buy an enhancement pack.`, duration: 2600 });
            return;
        }
        setShowCredits(false);
        setIsLoading(true);
        try {
            const pack = aiEnhancementPacksList.find((p: AIEnhancementPack) => p.packId === packId);
            if (!pack) return;
            const paymentResult: any = await handleTopupPurchase(pack, currency);
            if (billingScopeKeyRef.current !== mutationScopeKey) return;
            Toast.show({ content: t('enhancementsReady'), duration: 2000 });
            setActiveSubscription((previous: any) => previous
                ? {
                    ...previous,
                    topUpCredits: typeof paymentResult?.newCreditBalance === 'number'
                        ? paymentResult.newCreditBalance
                        : (previous.topUpCredits || 0) + pack.creditAmount,
                }
                : previous);
        } catch (err) {
            if (isPaymentCheckoutDismissedError(err)) return;
            logPaymentFailure('payment_mobile_billing_credit_pack_failed', err, buildMobileBillingPaymentLogContext('credit_pack_purchase', {
                ...getBoundedPaymentStringContext('packId', packId),
            }));
            Toast.show({ content: t('purchaseFailed'), duration: 3000 });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePause = () => {
        const mutationScopeKey = billingScopeKey;
        Dialog.confirm({
            title: t('pauseSubscription'),
            content: t('pauseSubscriptionDesc'),
            confirmText: t('pause'),
            cancelText: t('cancel'),
            onConfirm: async () => {
                if (billingScopeKeyRef.current !== mutationScopeKey) return;
                try {
                    await onPauseSubscription();
                    if (billingScopeKeyRef.current !== mutationScopeKey) return;
                    Toast.show({ content: t('subscriptionPaused'), duration: 2000 });
                    await refetchSubscription();
                } catch (err: any) {
                    logPaymentFailure('payment_mobile_subscription_pause_failed', err, buildMobileBillingPaymentLogContext('pause_subscription'));
                    Toast.show({ content: t('failedToPause'), duration: 3000 });
                }
            },
        });
    };

    const handleResume = async () => {
        const mutationScopeKey = billingScopeKey;
        try {
            await onResumeSubscription();
            if (billingScopeKeyRef.current !== mutationScopeKey) return;
            Toast.show({ content: t('subscriptionResumed'), duration: 2000 });
            await refetchSubscription();
        } catch (err: any) {
            logPaymentFailure('payment_mobile_subscription_resume_failed', err, buildMobileBillingPaymentLogContext('resume_subscription'));
            Toast.show({ content: t('failedToResume'), duration: 3000 });
        }
    };

    const handleCancel = () => {
        setShowCancellationReasons(true);
    };

    const confirmCancellationReason = () => {
        if (!cancellationReason) {
            Toast.show({ content: t('cancellationReasonRequired'), duration: 2000 });
            return;
        }
        if (cancellationReason === CANCELLATION_REASON.OTHER && !cancellationReasonDetail.trim()) {
            Toast.show({ content: t('cancellationOtherReasonRequired'), duration: 2000 });
            return;
        }

        const mutationScopeKey = billingScopeKey;
        setShowCancellationReasons(false);
        Dialog.confirm({
            title: t('cancelSubscription'),
            content: t('cancelSubscriptionDesc'),
            confirmText: t('cancelSubscriptionBtn'),
            cancelText: t('keepSubscription'),
            onConfirm: async () => {
                if (billingScopeKeyRef.current !== mutationScopeKey) return;
                try {
                    await onCancelSubscription({
                        reason: cancellationReason,
                        otherReason: cancellationReason === CANCELLATION_REASON.OTHER
                            ? cancellationReasonDetail.trim()
                            : undefined,
                        consent: true,
                    });
                    if (billingScopeKeyRef.current !== mutationScopeKey) return;
                    Toast.show({ content: t('subscriptionCancelled'), duration: 2000 });
                    setCancellationReason(null);
                    setCancellationReasonDetail('');
                    await refetchSubscription();
                } catch (err: any) {
                    logPaymentFailure('payment_mobile_subscription_cancel_failed', err, buildMobileBillingPaymentLogContext('cancel_subscription'));
                    Toast.show({ content: t('failedToCancel'), duration: 3000 });
                }
            },
        });
    };

    const fetchHistory = async () => {
        const requestSequence = ++billingHistoryRequestSequenceRef.current;
        const requestScopeKey = billingScopeKey;
        try {
            const historyStoreId = Number(sub?.storeId || billingStoreId || session?.user?.storeId);
            const [raw, billingDocuments] = await Promise.all([
                getBillingHistoryForStore(session?.user?.tenantId, historyStoreId),
                fetchMenuListBillingDocumentSummaries().catch(() => []),
            ]);
            if (
                billingHistoryRequestSequenceRef.current !== requestSequence
                || billingScopeKeyRef.current !== requestScopeKey
            ) return;
            const formatted = formatBillingHistoryEvents(raw);
            setBillingHistory(mergeMenuListBillingDocumentsIntoHistory(formatted, billingDocuments));
            setShowHistory(true);
        } catch (err) {
            if (
                billingHistoryRequestSequenceRef.current !== requestSequence
                || billingScopeKeyRef.current !== requestScopeKey
            ) return;
            logPaymentFailure('payment_mobile_billing_history_load_failed', err, buildMobileBillingPaymentLogContext('history_load'));
            Toast.show({ content: t('failedToLoadHistory'), duration: 2000 });
        }
    };

    const handleBillingStoreChange = async (targetStoreId: number) => {
        if (
            targetStoreId === billingStoreId
            || !accessibleBillingStores.some((store) => getStoreSummaryId(store) === targetStoreId)
        ) return;
        const attemptToken = claimStoreSwitchAttempt();
        if (attemptToken === null) return;
        const initiatingScopeKey = billingScopeKey;

        try {
            if (targetStoreId === loginStoreId) {
                if (loginStoreId) await refreshFirebaseAuthClaims(loginStoreId);
                if (billingScopeKeyRef.current !== initiatingScopeKey) return;
                subscriptionRequestSequenceRef.current += 1;
                billingHistoryRequestSequenceRef.current += 1;
                setActiveSubscription(null);
                setBillingHistory([]);
                setShowHistory(false);
                setActiveStoreContext(null);
                setShowStorePicker(false);
                Toast.show({ content: 'Switched store', duration: 1500 });
                return;
            }

            const res = await fetch('/api/auth/switch-store', {
                ...AUTH_ACCOUNT_REQUEST_POLICY,
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetStoreId }),
            });
            await readAuthAccountResponse(res, 'switch_store');
            if (billingScopeKeyRef.current !== initiatingScopeKey) return;
            await refreshFirebaseAuthClaims(targetStoreId);
            if (billingScopeKeyRef.current !== initiatingScopeKey) return;
            subscriptionRequestSequenceRef.current += 1;
            billingHistoryRequestSequenceRef.current += 1;
            setActiveSubscription(null);
            setBillingHistory([]);
            setShowHistory(false);
            setActiveStoreContext(targetStoreId);
            setShowStorePicker(false);
            Toast.show({ content: 'Switched store', duration: 1500 });
        } catch (err) {
            if (billingScopeKeyRef.current !== initiatingScopeKey) return;
            logPaymentFailure('payment_mobile_billing_store_switch_failed', err, buildMobileBillingPaymentLogContext('store_switch', {
                returningToLoginStore: targetStoreId === loginStoreId,
                ...getBoundedPaymentStringContext('targetStoreId', targetStoreId),
                ...getBoundedPaymentStringContext('loginStoreId', loginStoreId),
            }));
            Toast.show({ content: 'Failed to switch store', duration: 2000 });
        } finally {
            releaseStoreSwitchAttempt(attemptToken);
        }
    };

    const handleOpenExternalBillingLink = (
        url: string | undefined,
        linkKind: MobileBillingExternalLinkKind,
        metadata: Record<string, unknown> = {},
    ) => {
        if (!url) return;
        try {
            openIsolatedBrowserUrl(url);
        } catch (error) {
            logPaymentFailure('payment_mobile_billing_external_link_open_failed', error, buildMobileBillingPaymentLogContext('external_link_open', {
                linkKind,
                ...getBoundedPaymentStringContext('externalUrl', url),
                ...metadata,
            }));
            Toast.show({ content: linkKind === 'invoice' ? 'Could not open invoice' : 'Could not open payment link', duration: 2200 });
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

                {isSwitchedBillingContext ? (
                    <Card>
                        <Text type="secondary">
                            This billing view is read-only. Return to {loginStore?.name || 'your signed-in store'} before changing a plan, adding paid locations, or buying an enhancement pack.
                        </Text>
                    </Card>
                ) : isInheritedBilling ? (
                    <Card>
                        <Text type="secondary">
                            This outlet uses the HQ subscription. Plan controls stay with {subscriptionStore?.name || 'the HQ store'}, and enhancement packs are added to that shared balance.
                        </Text>
                    </Card>
                ) : null}

                {sub && isSignedInBillingContext && !hasEnhancementPackBillingTerms ? (
                    <Card>
                        <Flex gap={6} vertical>
                            <Text strong>Billing details are required for enhancement packs.</Text>
                            <Text type="secondary">
                                Your current subscription does not include the tax details needed for a separate pack payment. Contact billing support before buying a pack.
                            </Text>
                        </Flex>
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
                                        title={<Text>Enhancement access</Text>}
                                        extra={isPaymentPending
                                            ? <Tag color="primary">Starts after payment</Tag>
                                            : <Tag color={totalCredits > 0 ? 'success' : 'warning'}>{totalCredits > 0 ? 'Available' : 'Paused'}</Tag>}
                                    />
                                    <List.Item
                                        title={<Text>Plan balance</Text>}
                                        extra={<Text>{monthlyCredits}</Text>}
                                    />
                                    {promotionalCredits > 0 ? (
                                        <List.Item
                                            title={<Text>Promotional balance</Text>}
                                            extra={<Text>{promotionalCredits}</Text>}
                                        />
                                    ) : null}
                                    <List.Item title={<Text>Pack balance</Text>} extra={<Text>{topUpCredits}</Text>} />
                                </List>
                            </Card>

                            {sub.status === 'active' && canManageSelectedSubscription && !isManualBilling && !isInheritedBilling ? (
                                <Card size="small" style={{ backgroundColor: token.colorFillQuaternary }}>
                                    <Flex gap={8} vertical>
                                        <Flex align="center" gap={8}>
                                            <LuMapPin color={token.colorPrimary} size={16} />
                                            <Text strong>{isMultiLocationPlan ? 'Paid locations' : 'Multi-location plan'}</Text>
                                        </Flex>
                                        <Text type="secondary">
                                            {isMultiLocationPlan
                                                ? `${paidLocationCount} paid, ${activeStoreCount} active. Add one paid location before creating the next outlet.`
                                                : 'Choose Multi-location to manage two or more active locations from one approved source.'}
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
                                                {isMultiLocationPlan ? <LuPlus size={14} /> : <LuBuilding2 size={14} />}
                                                <Text>{isMultiLocationPlan ? 'Add paid location' : 'View plans'}</Text>
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
                                            {getPastDueGracePeriodDisplay().summary}
                                        </Text>
                                        {subscriptionCheckoutUrl ? (
                                            <Button color="warning" onClick={() => handleOpenExternalBillingLink(subscriptionCheckoutUrl, 'retry_payment')} size="small">
                                                {t('retryPayment')}
                                            </Button>
                                        ) : null}
                                    </Flex>
                                </Card>
                            ) : null}

                            {isPaymentPending ? (
                                <Card size="small" style={{ backgroundColor: token.colorPrimaryBg }}>
                                    <Flex gap={8} vertical>
                                        <Text>Payment is pending. Continue checkout to activate this store.</Text>
                                        {canManageSelectedSubscription ? (
                                            <Button color="primary" loading={isLoading} onClick={() => void handleContinuePendingCheckout()} size="small">
                                                Continue Checkout
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
                                        {canManageSelectedSubscription && !isManualBilling && sub.planId !== MENULIST_B2C_PLAN_IDS.MULTI_LOCATION ? (
                                            <Button color="primary" onClick={() => setShowPlans(true)} size="small">
                                                <Flex align="center" gap={6}>
                                                    <LuZap size={14} />
                                                    <Text>{t('upgrade')}</Text>
                                                </Flex>
                                            </Button>
                                        ) : null}
                                        {canManageSelectedSubscription && !isManualBilling ? (
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
                                {canManageSelectedSubscription && sub.status === 'paused' ? (
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
                                {canManageSelectedSubscription && (sub.status === 'cancelled' || sub.status === 'expired') ? (
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
                            {canManageSelectedSubscription ? (
                                <Button color="primary" onClick={() => router.push('/pricing')} size="large">
                                    <Flex align="center" gap={6}>
                                        <LuZap size={14} />
                                        <Text>{t('chooseAPlan')}</Text>
                                    </Flex>
                                </Button>
                            ) : null}
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
                            <Card size="small" style={{ backgroundColor: token.colorFillQuaternary }}>
                                <Flex align="center" justify="space-between">
                                    <Text type="secondary">Plan balance</Text>
                                    <Text strong>{monthlyCredits} credits</Text>
                                </Flex>
                                {promotionalCredits > 0 ? (
                                    <Flex align="center" justify="space-between" style={{ marginTop: 8 }}>
                                        <Text type="secondary">Promotional balance</Text>
                                        <Text strong>{promotionalCredits} credits</Text>
                                    </Flex>
                                ) : null}
                                <Flex align="center" justify="space-between" style={{ marginTop: 8 }}>
                                    <Text type="secondary">Pack balance</Text>
                                    <Text strong>{topUpCredits} credits</Text>
                                </Flex>
                            </Card>
                            {canBuyEnhancementPacks ? (
                                <Button block color="primary" fill="outline" onClick={() => setShowCredits(true)} size="large">
                                    <Flex align="center" gap={6} justify="center">
                                        <LuZap size={14} />
                                        <Text>{totalCredits > 0 ? t('getAiEnhancements') : t('getMoreAiEnhancements')}</Text>
                                    </Flex>
                                </Button>
                            ) : null}
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

            <Popup bodyStyle={{ maxHeight: '80vh', overflow: 'hidden', padding: 0 }} onMaskClick={() => setShowCancellationReasons(false)} position="bottom" visible={showCancellationReasons}>
                <Flex style={{ height: '100%' }} vertical>
                    <NavBar backIcon={<LuX size={20} />} onBack={() => setShowCancellationReasons(false)}>
                        {t('cancellationReasonTitle')}
                    </NavBar>
                    <Flex gap={12} style={{ overflowY: 'auto', padding: 12 }} vertical>
                        <Text type="secondary">{t('cancellationReasonPrompt')}</Text>
                        <List>
                            {CANCELLATION_REASON_OPTIONS.map((option) => (
                                <List.Item
                                    extra={cancellationReason === option.code ? <LuCheck color={token.colorSuccess} size={18} /> : null}
                                    key={option.code}
                                    onClick={() => setCancellationReason(option.code)}
                                    style={{ minHeight: 48 }}
                                    title={(
                                        <Text strong={cancellationReason === option.code}>
                                            {t(`cancellationReasons.${option.code}`)}
                                        </Text>
                                    )}
                                />
                            ))}
                        </List>
                        {cancellationReason === CANCELLATION_REASON.OTHER ? (
                            <TextArea
                                maxLength={300}
                                onChange={setCancellationReasonDetail}
                                placeholder={t('cancellationOtherReasonPlaceholder')}
                                rows={3}
                                showCount
                                value={cancellationReasonDetail}
                            />
                        ) : null}
                        <Button
                            block
                            color="danger"
                            disabled={!cancellationReason || (cancellationReason === CANCELLATION_REASON.OTHER && !cancellationReasonDetail.trim())}
                            fill="solid"
                            onClick={confirmCancellationReason}
                            size="large"
                        >
                            {t('continueCancellation')}
                        </Button>
                    </Flex>
                </Flex>
            </Popup>

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
                                return (
                                    <Card key={plan.planId} onClick={() => handleUpgrade(plan)}>
                                        <Flex align="center" justify="space-between">
                                            <Flex gap={4} vertical>
                                                <Text strong>{`${plan.planId} Plan`}</Text>
                                                <Text type="secondary">{plan.description}</Text>
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
                                const examples = getContentCreditOutcomeExamples(pack.creditAmount);
                                return (
                                    <Card key={pack.packId} onClick={() => handleBuyCredits(pack.packId)}>
                                        <Flex align="flex-start" gap={12} justify="space-between">
                                            <Flex gap={3} style={{ flex: '1 1 0', minWidth: 0 }} vertical>
                                                <Text strong>{pack.name}</Text>
                                                <Text type="secondary">{pack.description || 'Enhancement Pack'}</Text>
                                                <Text strong>{t('creditPackAmount', { credits: pack.creditAmount })}</Text>
                                                <Text type="secondary">
                                                    {t('creditPackExample', {
                                                        descriptions: examples.descriptionRewrites,
                                                        images: examples.generatedMenuImages,
                                                    })}
                                                </Text>
                                            </Flex>
                                            <Text style={{ flexShrink: 0 }}>{price ? formatCurrency(price, currency) : 'N/A'}</Text>
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
                                                <Text>
                                                    {item.type === 'Referral reward'
                                                        ? `+${item.credits || 0} credits`
                                                        : formatCurrency(item.amount, item.currency)}
                                                </Text>
                                                {item.billingDocumentUrl || item.invoiceUrl ? (
                                                    <Button
                                                        onClick={() => handleOpenExternalBillingLink(item.billingDocumentUrl || item.invoiceUrl, 'invoice', {
                                                            ...getBoundedPaymentStringContext('billingHistoryItemId', item.id),
                                                            ...getBoundedPaymentStringContext('billingHistoryItemType', item.type),
                                                            ...getBoundedPaymentStringContext('invoiceStatus', item.status),
                                                        })}
                                                        size="small"
                                                    >
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
