
'use client'

import Confetti from '@atoms/Confetti';
import { AIEnhancementPack, Plan } from '@data/common';
import { aiEnhancementPacksList } from '@data/PlatformPlansList';
import { getActiveSubscriptionForStore } from '@database/subscriptions';
import { getBillingHistoryForStore } from '@database/subscriptions/paymentTransactions';
import { useAppDispatch } from '@hook/useAppDispatch';
import usePaymentHandler from '@hook/usePaymentHandler';
import { PlatformGlobalDataContext, PlatformGlobalDataProviderType } from '@providers/platformProviders/platformGlobalDataProvider';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { BillingHistoryItem, Currency } from '@type/razorpay';
import { formatDateTime } from '@util/dateTime';
import { Alert, Button, Card, Empty, Flex, Select, Spin, Typography, message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { useFormatter, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useContext, useEffect, useMemo, useState } from 'react';
import { FaBoltLightning } from 'react-icons/fa6';
import { LuBuilding2, LuStore } from 'react-icons/lu';
import ActiveSubscriptionCard from './ActiveSubscriptionCard';
import BillingHistory from './BillingHistory';
import CreditsPackModal from './CreditsPackModal';
import PricingPlansModal from './PricingPlansModal';
import UpgradeSubscriptionPayementSuccessModal from './UpgradeSubscriptionPayementSuccessModal';

const { Title, Text } = Typography;

function BillingPage() {
    const t = useTranslations('Billing');
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
    const { data: session } = useSession();
    const {
        activeSubscription,
        activeSubscriptionLoading,
        activeStoreContext,
        isMasterUser,
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
    const { onUpgradePlan, onClickPaymentCard, handleTopupPurchase } = usePaymentHandler(dispatch);
    const [isSubscriptionFetching, setIsSubscriptionFetching] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false);
    const tenantStoresList = tenantDetails?.storesList || [];
    const billingStoreId = Number(activeStoreContext || storeDetails?.storeId || session?.user?.storeId || 0);
    const effectiveHistoryStoreId = Number(activeSubscription?.storeId || billingStoreId || session?.user?.storeId || 0);
    const canSwitchBillingStore = Boolean(isMasterUser && userPermissions?.canSwitchStores && tenantStoresList.length > 1);
    const selectedStore = useMemo(
        () => tenantStoresList.find((store: any) => Number(store.storeId) === billingStoreId),
        [billingStoreId, tenantStoresList],
    );
    const subscriptionStore = useMemo(
        () => tenantStoresList.find((store: any) => Number(store.storeId) === Number(activeSubscription?.storeId)),
        [activeSubscription?.storeId, tenantStoresList],
    );
    const isInheritedBilling = Boolean(activeSubscription && billingStoreId && Number(activeSubscription.storeId) !== billingStoreId);

    useEffect(() => {
        setIsSubscriptionFetching(Boolean(!sessionId && userId && activeSubscriptionLoading));
    }, [activeSubscriptionLoading, sessionId, userId]);

    const fetchBillingHistory = async () => {
        if (!userId || !effectiveHistoryStoreId) return;

        // 2. Fetch the raw transaction logs from our Unified Ledger
        const rawHistory = await getBillingHistoryForStore(Number(session?.user?.tenantId), effectiveHistoryStoreId);
        // 3. Transform the raw data into a clean, simple format for the UI
        const formattedHistory = rawHistory.map(event => {
            // Handle subscription charges
            if (event.event === 'subscription.charged') {
                const entity = event.payload.payment.entity;
                const { current_start, current_end } = event.payload.subscription.entity;
                const startDate = formatDateTime(Timestamp.fromMillis(current_start * 1000), "date", formatter);
                const endDate = formatDateTime(Timestamp.fromMillis(current_end * 1000), "date", formatter);
                return {
                    id: entity.id,
                    type: "Subscription Payment",
                    date: event.created_at * 1000, // Convert to JS timestamp
                    description: entity.description || 'Subscription Payment',
                    amount: entity.amount,
                    currency: entity.currency,
                    status: entity.status,
                    invoiceId: entity.invoice_id,
                    invoiceUrl: event.invoiceUrl,
                    billingCycle: `${startDate}-${endDate}`,
                };
            }
            // Handle top-up charges
            if (event.event === 'order.paid' && event.transactionType === 'topup') {
                const entity = event.payload.payment.entity;
                const orderNotes = event.payload.order.entity.notes;
                if (!Array.isArray(orderNotes) && orderNotes?.packId) {
                    return {
                        id: entity.id,
                        type: "Enhancement Pack",
                        date: event.created_at * 1000,
                        description: entity.description || `${orderNotes?.packName || 'Enhancement Pack'}`,
                        amount: entity.amount,
                        currency: entity.currency,
                        status: entity.status,
                        invoiceId: entity.invoice_id,
                        invoiceUrl: event.invoiceUrl,
                        creditsRe: orderNotes?.creditAmount
                    };
                }
            }
            return null;
        }).filter(Boolean); // Filter out any null values (like the subscription's initial order.paid)
        setBillingHistory(formattedHistory);
    };

    const refetchActiveSubscription = async () => {
        if (!userId || !billingStoreId) return;
        try {
            dispatch(startLoader("Fetching subscription data"));
            const subscription = await getActiveSubscriptionForStore(
                Number(session?.user?.tenantId),
                billingStoreId,
                tenantStoresList,
            );
            setActiveSubscription(subscription);
            setBillingHistory([]);
        } catch (error) {
            console.error('Error fetching subscription data:', error);
            message.error(t('failedToLoadSubscription'));
        } finally {
            dispatch(stopLoader("Fetching subscription data"));
            setIsSubscriptionFetching(false)
        }
    };

    const handleBillingStoreChange = async (targetStoreId: number) => {
        if (targetStoreId === Number(storeDetails?.storeId || session?.user?.storeId)) {
            setActiveStoreContext(null);
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
                throw new Error(data.error || 'Store switch failed');
            }
            setActiveStoreContext(targetStoreId);
        } catch (error: any) {
            message.error(error?.message || 'Store switch failed');
        }
    };

    const handleConfirmUpgrade = async (newPlan: Plan, currency: Currency) => {
        try {
            dispatch(startLoader("Upgrading Plan"));
            const paymentResponse = Boolean(activeSubscription) ? await onUpgradePlan(activeSubscription, newPlan, currency) : await onClickPaymentCard(newPlan, currency, () => { })
            message.success(t('upgradeSuccess'));
            refetchActiveSubscription();
            setIsSuccessModalOpen({ active: true, paymentDetails: { paymentResponse, ...newPlan } });
        } catch (error) {
            message.error(t('paymentFailed'));
            console.error('Payment flow failed in handleConfirmUpgrade', error);
        } finally {
            setIsPricingModalOpen({ active: false, action: "upgrade" });
            dispatch(stopLoader("Upgrading Plan"));
        }
    };

    const handleCreditsPurchase = async (packId: string) => {
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
            message.error(t('enhancementsFailed'));
            console.error('Enhancement pack purchase failed in handleCreditsPurchase', error);
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
                            options={tenantStoresList.map((store: any) => ({
                                value: Number(store.storeId),
                                label: `${store.name || `Store ${store.storeId}`}${store.isMaster ? ' (HQ)' : ''}`,
                            }))}
                            style={{ minWidth: 240 }}
                        />
                    </Flex>
                </Card>
            ) : null}

            {isInheritedBilling ? (
                <Alert
                    message="This outlet uses the HQ subscription."
                    description={`Plan changes, payment retries, and enhancement packs apply to ${subscriptionStore?.name || 'the HQ store'} because outlet billing is inherited.`}
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                />
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
                    <ActiveSubscriptionCard activeSubscription={activeSubscription} refetchActiveSubscription={refetchActiveSubscription} setIsPricingModalOpen={setIsPricingModalOpen} setIsCreditsModalOpen={setIsCreditsModalOpen} />
                    <BillingHistory billingHistory={billingHistory} fetchBillingHistory={fetchBillingHistory} />
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
                                <Button type="primary" onClick={() => setIsPricingModalOpen({ action: "new", active: true })} icon={<FaBoltLightning />}>
                                    {t('viewPlans')}
                                </Button>
                            </Flex>
                        </Empty>
                    </Card>
                </Flex>
            ) : null}

            <PricingPlansModal
                action={isPricingModalOpen.action}
                handleConfirmUpgrade={handleConfirmUpgrade}
                activeSubscription={activeSubscription}
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
                activeSubscription={activeSubscription}
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
