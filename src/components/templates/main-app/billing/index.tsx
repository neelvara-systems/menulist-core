
'use client'

import Confetti from '@atoms/Confetti';
import { helpCenterTabRouting } from '@constant/navigations';
import { MENULIST_B2C_PLAN_IDS } from '@constant/menulistPlans';
import { AIEnhancementPack, Plan } from '@data/common';
import { aiEnhancementPacksList, getB2BPlansList, getB2CPlansList } from '@data/PlatformPlansList';
import { getActiveSubscriptionForStore } from '@database/subscriptions';
import { getBillingHistoryForStore } from '@database/subscriptions/paymentTransactions';
import { getBoundedPaymentStringContext, logPaymentFailure } from '@hook/paymentDiagnostics';
import { useAppDispatch } from '@hook/useAppDispatch';
import usePaymentHandler, { isPaymentCheckoutDismissedError } from '@hook/usePaymentHandler';
import { AUTH_ACCOUNT_REQUEST_POLICY, readAuthAccountResponse } from '@lib/auth/accountClientResponses';
import { refreshFirebaseAuthClaims } from '@lib/auth/firebaseAuthSync';
import { formatBillingHistoryEvents } from '@lib/billing/billingHistoryFormatter';
import {
    fetchMenuListBillingDocumentSummaries,
    mergeMenuListBillingDocumentsIntoHistory,
} from '@lib/billing/billingDocumentsClient';
import {
    claimStoreSwitchAttempt,
    getAccessibleStoreSummaries,
    getStoreSummaryId,
    releaseStoreSwitchAttempt,
} from '@lib/multiOutlet/storeSwitchAccess';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { BillingHistoryItem, Currency } from '@type/razorpay';
import { formatDateTime } from '@util/dateTime';
import { Alert, Button, Card, Empty, Flex, Select, Spin, Typography, message } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LuBuilding2, LuHelpCircle, LuMapPin, LuPlusCircle, LuStore, LuZap } from 'react-icons/lu';
import ActiveSubscriptionCard from './ActiveSubscriptionCard';
import BillingHistory from './BillingHistory';
import CreditsPackModal from './CreditsPackModal';
import PricingPlansModal from './PricingPlansModal';
import UpgradeSubscriptionPayementSuccessModal from './UpgradeSubscriptionPayementSuccessModal';

const { Title, Text } = Typography;

function BillingPage() {
    const t = useTranslations('Billing');
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams?.get('session_id');
    const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
    const { data: session } = useSession();
    const {
        activeSubscription,
        activeSubscriptionLoading,
        activeStoreContext,
        setActiveStoreContext,
        setActiveSubscription,
        storeDetails,
        tenantDetails,
        userPermissions,
    } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const userId = session?.user?.id;
    const dispatch = useAppDispatch();
    const formatter = useFormatter();
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<{ active: boolean; paymentDetails: any | null; }>({ active: false, paymentDetails: null });
    const [isPricingModalOpen, setIsPricingModalOpen] = useState<{ action: "upgrade" | "new"; active: boolean }>({ action: "upgrade", active: false });
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const { onUpgradePlan, handleTopupPurchase } = usePaymentHandler(dispatch);
    const buildBillingPaymentLogContext = (flow: string, metadata: Record<string, unknown> = {}) => ({
        surface: 'desktop_billing',
        flow,
        hasActiveSubscription: Boolean(activeSubscription),
        billingStoreIdPresent: Boolean(billingStoreId),
        ...getBoundedPaymentStringContext('subscriptionId', activeSubscription?.providerSubscriptionId),
        ...metadata,
    });
    const [isSubscriptionFetching, setIsSubscriptionFetching] = useState(false)
    const [isAddingPaidLocation, setIsAddingPaidLocation] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const tenantStoresList = tenantDetails?.storesList || [];
    const accessibleBillingStores = useMemo(
        () => getAccessibleStoreSummaries({ sessionUser: session?.user as any, tenantDetails }),
        [session?.user, tenantDetails],
    );
    const loginStoreId = Number(session?.user?.storeId || 0);
    const billingStoreId = Number(activeStoreContext || storeDetails?.storeId || session?.user?.storeId || 0);
    const billingScopeKey = userId && session?.user?.tenantId && billingStoreId
        ? `${userId}:${session.user.tenantId}:${billingStoreId}`
        : null;
    const billingScopeKeyRef = useRef<string | null>(billingScopeKey);
    const billingHistoryRequestSequenceRef = useRef(0);
    const subscriptionRequestSequenceRef = useRef(0);
    billingScopeKeyRef.current = billingScopeKey;
    const effectiveHistoryStoreId = Number(activeSubscription?.storeId || billingStoreId || session?.user?.storeId || 0);
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
    const isManualBilling = activeSubscription?.billingMode === 'manual';
    const activeStoreCount = tenantStoresList.filter((store: any) => store?.active !== false).length || 1;
    const paidLocationCount = Math.max(1, Number(activeSubscription?.quantity || 1));
    const isMultiLocationPlan = activeSubscription?.planId === MENULIST_B2C_PLAN_IDS.MULTI_LOCATION;
    const nextPaidLocationCount = Math.max(paidLocationCount + 1, activeStoreCount + 1);
    const currentSubscriptionPlan = useMemo(() => {
        if (!activeSubscription) return null;
        const plans = activeSubscription.userType === 'B2B' ? getB2BPlansList() : getB2CPlansList();
        return plans.find((plan) => (
            plan.planId === activeSubscription.planId
            && plan.billingInterval === activeSubscription.planType
        )) || null;
    }, [activeSubscription?.planId, activeSubscription?.planType, activeSubscription?.userType]);

    useEffect(() => {
        setIsSubscriptionFetching(Boolean(!sessionId && userId && activeSubscriptionLoading));
    }, [activeSubscriptionLoading, sessionId, userId]);

    const fetchBillingHistory = async () => {
        if (!userId || !effectiveHistoryStoreId) return;
        const requestSequence = ++billingHistoryRequestSequenceRef.current;
        const requestScopeKey = billingScopeKey;

        // 2. Fetch transaction logs from the unified ledger. New rows are lean v2 audit summaries.
        const [rawHistory, billingDocuments] = await Promise.all([
            getBillingHistoryForStore(session?.user?.tenantId, effectiveHistoryStoreId),
            fetchMenuListBillingDocumentSummaries().catch(() => []),
        ]);
        if (
            billingHistoryRequestSequenceRef.current !== requestSequence
            || billingScopeKeyRef.current !== requestScopeKey
        ) return;
        // 3. Transform lean webhook audit rows and legacy raw payload rows into a clean UI model.
        const formattedHistory = formatBillingHistoryEvents(rawHistory, {
            formatBillingCycle: (startSeconds, endSeconds) => {
                if (!startSeconds || !endSeconds) return undefined;
                const startDate = formatDateTime(new Date(startSeconds * 1000), "date", formatter);
                const endDate = formatDateTime(new Date(endSeconds * 1000), "date", formatter);
                return `${startDate}-${endDate}`;
            },
        });
        setBillingHistory(mergeMenuListBillingDocumentsIntoHistory(formattedHistory, billingDocuments));
    };

    const refetchActiveSubscription = async () => {
        if (!userId || !billingStoreId) return;
        const requestSequence = ++subscriptionRequestSequenceRef.current;
        const requestScopeKey = billingScopeKey;
        try {
            dispatch(startLoader("Fetching subscription data"));
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
            setBillingHistory([]);
        } catch (error) {
            if (
                subscriptionRequestSequenceRef.current !== requestSequence
                || billingScopeKeyRef.current !== requestScopeKey
            ) return;
            logPaymentFailure('payment_desktop_billing_subscription_refetch_failed', error, buildBillingPaymentLogContext('subscription_refetch', {
                ...getBoundedPaymentStringContext('billingStoreId', billingStoreId),
                ...getBoundedPaymentStringContext('historyStoreId', effectiveHistoryStoreId),
            }));
            message.error(t('failedToLoadSubscription'));
        } finally {
            dispatch(stopLoader("Fetching subscription data"));
            if (
                subscriptionRequestSequenceRef.current === requestSequence
                && billingScopeKeyRef.current === requestScopeKey
            ) {
                setIsSubscriptionFetching(false)
            }
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
                setActiveStoreContext(null);
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
            setActiveStoreContext(targetStoreId);
        } catch (error) {
            if (billingScopeKeyRef.current !== initiatingScopeKey) return;
            logPaymentFailure('payment_desktop_billing_store_switch_failed', error, buildBillingPaymentLogContext('store_switch', {
                returningToLoginStore: targetStoreId === loginStoreId,
                ...getBoundedPaymentStringContext('targetStoreId', targetStoreId),
                ...getBoundedPaymentStringContext('loginStoreId', loginStoreId),
            }));
            message.error('Store switch failed');
        } finally {
            releaseStoreSwitchAttempt(attemptToken);
        }
    };

    const handleConfirmUpgrade = async (newPlan: Plan, currency: Currency) => {
        if (!canManageSelectedSubscription) {
            message.info(`Return to ${loginStore?.name || 'your signed-in store'} to change a subscription.`);
            return;
        }
        if (!activeSubscription) {
            setIsPricingModalOpen({ active: false, action: 'upgrade' });
            router.push('/pricing');
            return;
        }
        try {
            dispatch(startLoader("Upgrading Plan"));
            const paymentResponse = await onUpgradePlan(activeSubscription, newPlan, currency);
            if (paymentResponse?.activationStatus === 'processing') {
                message.info('Payment received. Subscription activation is being confirmed.');
                await refetchActiveSubscription();
                return;
            }
            message.success(t('upgradeSuccess'));
            refetchActiveSubscription();
            setIsSuccessModalOpen({ active: true, paymentDetails: { paymentResponse, ...newPlan } });
        } catch (error) {
            if (isPaymentCheckoutDismissedError(error)) {
                await refetchActiveSubscription();
                return;
            }
            message.error(t('paymentFailed'));
            logPaymentFailure('payment_desktop_billing_upgrade_failed', error, buildBillingPaymentLogContext('confirm_upgrade', {
                ...getBoundedPaymentStringContext('planId', newPlan.planId),
            }));
        } finally {
            setIsPricingModalOpen({ active: false, action: "upgrade" });
            dispatch(stopLoader("Upgrading Plan"));
        }
    };

    const handleAddPaidLocation = async () => {
        if (!canManageSelectedSubscription) {
            message.info(`Return to ${loginStore?.name || 'your signed-in store'} to change paid locations.`);
            return;
        }
        if (!activeSubscription || !currentSubscriptionPlan) {
            message.error('Current plan details are not available.');
            return;
        }
        if (!isMultiLocationPlan) {
            message.info('Choose the Multi-location plan before adding locations.');
            setIsPricingModalOpen({ active: true, action: 'upgrade' });
            return;
        }
        if (isManualBilling) {
            message.info('Ask your reseller to add prepaid location capacity.');
            return;
        }

        setIsAddingPaidLocation(true);
        try {
            dispatch(startLoader("Adding paid location"));
            const paymentResponse = await onUpgradePlan(
                activeSubscription,
                currentSubscriptionPlan,
                activeSubscription.currency,
                nextPaidLocationCount,
            );
            if (paymentResponse.activationStatus === 'processing') {
                message.info('Payment received. The paid location update is being confirmed.');
            } else {
                message.success(`Paid locations updated to ${nextPaidLocationCount}.`);
            }
            await refetchActiveSubscription();
        } catch (error) {
            if (isPaymentCheckoutDismissedError(error)) return;
            message.error(t('paymentFailed'));
            logPaymentFailure('payment_desktop_billing_paid_location_failed', error, buildBillingPaymentLogContext('add_paid_location', {
                ...getBoundedPaymentStringContext('planId', currentSubscriptionPlan.planId),
                quantity: nextPaidLocationCount,
            }));
        } finally {
            dispatch(stopLoader("Adding paid location"));
            setIsAddingPaidLocation(false);
        }
    };

    const handleCreditsPurchase = async (packId: string) => {
        if (!canBuyEnhancementPacks) {
            message.info(`Return to ${loginStore?.name || 'your signed-in store'} to buy an enhancement pack.`);
            return;
        }
        try {
            const pack = aiEnhancementPacksList.find((pack: AIEnhancementPack) => pack.packId === packId);
            if (!pack) throw new Error('Enhancement pack not found');
            const paymentResult: any = await handleTopupPurchase(pack, activeSubscription?.currency || (storeDetails?.currencyCode as Currency) || 'INR');
            message.success(t('enhancementsReady'));
            setTimeout(() => setShowConfetti(true), 500);
            setTimeout(() => setShowConfetti(false), 10000);
            setActiveSubscription((previous: any) => previous
                ? {
                    ...previous,
                    topUpCredits: typeof paymentResult?.newCreditBalance === 'number'
                        ? paymentResult.newCreditBalance
                        : (previous.topUpCredits || 0) + pack.creditAmount,
                }
                : previous);
        } catch (error) {
            if (isPaymentCheckoutDismissedError(error)) return;
            message.error(t('enhancementsFailed'));
            logPaymentFailure('payment_desktop_billing_credit_pack_failed', error, buildBillingPaymentLogContext('credit_pack_purchase', {
                ...getBoundedPaymentStringContext('packId', packId),
            }));
        } finally {
            setIsCreditsModalOpen(false);
        }
    }

    return (
        <div className="billing-page" style={{ width: '100%' }}>
            <Title level={2}>{t('title')}</Title>
            <Text type="secondary" style={{ marginBottom: '24px', display: 'block' }}>
                {t('subtitle')}
            </Text>

            <Card style={{ marginBottom: 16 }}>
                <Flex align="center" justify="space-between" gap={16} wrap>
                    <Flex align="center" gap={10}>
                        <LuHelpCircle size={20} />
                        <Flex vertical>
                            <Text strong>Billing help</Text>
                            <Text type="secondary">Questions about plans, invoices, payment retries, or credits.</Text>
                        </Flex>
                    </Flex>
                    <Button onClick={() => router.push(helpCenterTabRouting('ticket'))}>
                        Contact support
                    </Button>
                </Flex>
            </Card>

            {canSwitchBillingStore ? (
                <Card style={{ marginBottom: 16 }}>
                    <Flex align="center" justify="space-between" gap={16} wrap>
                        <Flex align="center" gap={10}>
                            {selectedStore?.isMaster ? <LuBuilding2 size={18} /> : <LuStore size={18} />}
                            <Flex vertical>
                                <Text strong>Billing store</Text>
                                <Text type="secondary">
                                    {isInheritedBilling
                                        ? `${selectedStore?.name || 'Selected outlet'} uses ${subscriptionStore?.name || 'HQ'} billing.`
                                        : 'Choose which store billing view to check.'}
                                </Text>
                            </Flex>
                        </Flex>
                        <Select
                            value={billingStoreId || undefined}
                            onChange={handleBillingStoreChange}
                            options={accessibleBillingStores.map((store: any) => ({
                                value: Number(store.storeId),
                                label: `${store.name || `Store ${store.storeId}`}${store.isMaster ? ' (HQ)' : ''}`,
                            }))}
                            style={{ minWidth: 240 }}
                        />
                    </Flex>
                </Card>
            ) : null}

            {isSwitchedBillingContext ? (
                <Alert
                    message="This billing view is read-only."
                    description={`Return to ${loginStore?.name || 'your signed-in store'} before changing a plan, adding paid locations, or buying an enhancement pack.`}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            ) : isInheritedBilling ? (
                <Alert
                    message="This outlet uses the HQ subscription."
                    description={`Plan controls stay with ${subscriptionStore?.name || 'the HQ store'}. Enhancement packs bought here are added to that shared HQ balance.`}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            ) : null}

            {activeSubscription && isSignedInBillingContext && !hasEnhancementPackBillingTerms ? (
                <Alert
                    message="Billing details are required for enhancement packs."
                    description="Your current subscription does not include the tax details needed for a separate pack payment. Contact billing support before buying a pack."
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
            ) : null}

            {activeSubscription?.status === 'active' && canManageSelectedSubscription && !isManualBilling && !isInheritedBilling ? (
                <Card style={{ marginBottom: 16 }}>
                    <Flex align="center" justify="space-between" gap={16} wrap>
                        <Flex align="center" gap={10}>
                            <LuMapPin size={20} />
                            <Flex vertical>
                                <Text strong>{isMultiLocationPlan ? 'Paid locations' : 'Multi-location plan'}</Text>
                                <Text type="secondary">
                                    {isMultiLocationPlan
                                        ? `${paidLocationCount} paid, ${activeStoreCount} active. Add one paid location before creating the next outlet.`
                                        : 'Choose Multi-location to manage two or more active locations from one approved source.'}
                                </Text>
                            </Flex>
                        </Flex>
                        <Button
                            disabled={!currentSubscriptionPlan}
                            icon={isMultiLocationPlan ? <LuPlusCircle /> : <LuBuilding2 />}
                            loading={isAddingPaidLocation}
                            onClick={() => void handleAddPaidLocation()}
                            type="primary"
                        >
                            {isMultiLocationPlan ? 'Add paid location' : 'View plans'}
                        </Button>
                    </Flex>
                </Card>
            ) : null}

            {isSubscriptionFetching && (
                <Card style={{ marginTop: '24px', textAlign: 'center' }} >
                    <Flex vertical style={{ justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
                        <Alert
                            message={t('fetchingSubscription')}
                            description={t('fetchingSubscriptionDesc')}
                            type="info"
                            showIcon
                            icon={<Spin />}
                            style={{ marginBottom: '10px' }}
                        />
                    </Flex>
                </Card>
            )}

            {activeSubscription ? (
                <>
                    <ActiveSubscriptionCard
                        activeSubscription={activeSubscription}
                        allowCreditPackPurchase={canBuyEnhancementPacks}
                        allowSubscriptionSelfService={canManageSelectedSubscription}
                        refetchActiveSubscription={refetchActiveSubscription}
                        setIsCreditsModalOpen={setIsCreditsModalOpen}
                        setIsPricingModalOpen={setIsPricingModalOpen}
                    />
                    <BillingHistory
                        billingHistory={billingHistory}
                        diagnosticContext={buildBillingPaymentLogContext('billing_history_invoice_open', {
                            ...getBoundedPaymentStringContext('historyStoreId', effectiveHistoryStoreId),
                        })}
                        fetchBillingHistory={fetchBillingHistory}
                    />
                </>
            ) : !isSubscriptionFetching ? (
                <Flex vertical style={{ justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
                    <Alert
                        message={t('noActiveSubscription')}
                        description={t('noActiveSubscriptionDesc')}
                        type="error"
                        showIcon
                        style={{ marginBottom: '10px' }}
                    />
                    <Card style={{ marginTop: '24px', textAlign: 'center' }} >
                        <Empty
                            image={Empty.PRESENTED_IMAGE_DEFAULT}
                            description={<Text type="secondary">{t('noSubscriptionFound')}</Text>}
                        >
                            <Flex justify="center" style={{ marginTop: '24px', width: '100%' }}>
                                {canManageSelectedSubscription ? (
                                    <Button type="primary" onClick={() => router.push('/pricing')} icon={<LuZap />}>
                                        {t('viewPlans')}
                                    </Button>
                                ) : null}
                            </Flex>
                        </Empty>
                    </Card>
                </Flex>
            ) : null}

            <PricingPlansModal
                action={isPricingModalOpen.action}
                handleConfirmUpgrade={handleConfirmUpgrade}
                activeSubscription={activeSubscription ?? undefined}
                isOpen={isPricingModalOpen.active}
                onClose={() => setIsPricingModalOpen({ action: "upgrade", active: false })}
            />

            <UpgradeSubscriptionPayementSuccessModal
                isOpen={isSuccessModalOpen.active}
                onClose={() => setIsSuccessModalOpen({ active: false, paymentDetails: null })}
                paymentDetails={isSuccessModalOpen.paymentDetails}
            />

            <CreditsPackModal
                isOpen={isCreditsModalOpen}
                activeSubscription={activeSubscription ?? undefined}
                handleCreditsPurchase={handleCreditsPurchase}
                onClose={() => setIsCreditsModalOpen(false)}
            />

            {showConfetti && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 50 }}>
                    <Confetti totalHeight={window.innerHeight} totalWidth={window.innerWidth} />
                    <Confetti totalHeight={window.innerHeight} totalWidth={window.innerWidth} />
                </div>
            )}
        </div>
    );
}

export default BillingPage;
