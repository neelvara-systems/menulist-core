
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
import { Alert, Button, Card, Empty, Flex, Spin, Typography, message } from 'antd';
import { Timestamp } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { useFormatter, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useContext, useEffect, useState } from 'react';
import { FaBoltLightning } from 'react-icons/fa6';
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
    const { activeSubscription, setActiveSubscription } = useContext<PlatformGlobalDataProviderType>(PlatformGlobalDataContext)
    const userId = session?.user?.id;
    const dispatch = useAppDispatch();
    const formatter = useFormatter();
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<{ active: boolean; paymentDetails: any | null; }>({ active: false, paymentDetails: null });
    const [isPricingModalOpen, setIsPricingModalOpen] = useState<{ action: "upgrade" | "new"; active: boolean }>({ action: "upgrade", active: false });
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const { onUpgradePlan, onClickPaymentCard, handleTopupPurchase } = usePaymentHandler(dispatch);
    const [isSubscriptionFetching, setIsSubscriptionFetching] = useState(false)
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (!sessionId && userId) {
            setIsSubscriptionFetching(true)
            refetchActiveSubscription();
        }
    }, [sessionId, userId]);

    const fetchBillingHistory = async () => {
        if (!userId) return;

        // 2. Fetch the raw transaction logs from our Unified Ledger
        const rawHistory = await getBillingHistoryForStore(Number(session?.user?.tenantId), Number(session?.user?.storeId));
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
                        type: "AI Enhancement Pack",
                        date: event.created_at * 1000,
                        description: entity.description || `${orderNotes?.packName || 'AI Enhancement Pack'}`,
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
        if (!userId) return;
        try {
            dispatch(startLoader("Fetching subscription data"));
            const subscription = await getActiveSubscriptionForStore(session?.user?.tenantId, session?.user?.storeId);
            console.log("subscription", subscription);
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
            const res = await handleTopupPurchase(pack, activeSubscription.currency);
            message.success(t('enhancementsReady'));
            setTimeout(() => setShowConfetti(true), 500);
            setTimeout(() => setShowConfetti(false), 10000);
            setActiveSubscription({ ...activeSubscription, topUpCredits: activeSubscription.topUpCredits + pack.creditAmount });
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
            ) : (
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
            )}

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