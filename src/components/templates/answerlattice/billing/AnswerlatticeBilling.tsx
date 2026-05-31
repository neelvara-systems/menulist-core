'use client';

import { PRODUCT_IDS } from '@constant/product';
import { ANSWERLATTICE_PLAN_TIER_ORDER, getBillingPlansForProduct, getCreditPacksForProduct } from '@lib/billing/productBillingPlans';
import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import { getAnswerlatticeActiveSubscriptionForStore, getAnswerlatticeBillingHistoryForStore } from '@database/answerlattice/billing';
import { useAppDispatch } from '@hook/useAppDispatch';
import usePaymentHandler from '@hook/usePaymentHandler';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
import { formatBillingHistoryEvents } from '@lib/billing/billingHistoryFormatter';
import { logger } from '@lib/monitoring/logger';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import type { Plan } from '@data/common';
import type { BillingHistoryItem, Currency, FirestoreSubscriptionDoc } from '@type/razorpay';
import { Alert, Button, Card, Empty, Flex, Grid, List, Space, Spin, Typography, message, theme } from 'antd';
import { useSession } from 'next-auth/react';
import { useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuCheck, LuCreditCard, LuLifeBuoy, LuReceipt } from 'react-icons/lu';
import ActiveSubscriptionCard from '@/components/templates/main-app/billing/ActiveSubscriptionCard';
import BillingHistory from '@/components/templates/main-app/billing/BillingHistory';
import CreditsPackModal from '@/components/templates/main-app/billing/CreditsPackModal';
import PricingPlansModal from '@/components/templates/main-app/billing/PricingPlansModal';

const { Title, Text } = Typography;

const getCurrentHostname = () => (typeof window === 'undefined' ? undefined : window.location.hostname);

export default function AnswerlatticeBilling() {
    const { data: session, status } = useSession();
    const { token } = theme.useToken();
    const scope = useMemo(() => resolveAnswerlatticeSessionScope(session), [session]);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const dispatch = useAppDispatch();
    const formatter = useFormatter();
    const router = useRouter();
    const [activeSubscription, setActiveSubscription] = useState<FirestoreSubscriptionDoc | null>(null);
    const [billingHistory, setBillingHistory] = useState<BillingHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPricingModalOpen, setIsPricingModalOpen] = useState<{ action: 'upgrade' | 'new'; active: boolean }>({ action: 'upgrade', active: false });
    const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
    const plans = useMemo(() => getBillingPlansForProduct(PRODUCT_IDS.ANSWERLATTICE, 'B2B'), []);
    const packs = useMemo(() => getCreditPacksForProduct(PRODUCT_IDS.ANSWERLATTICE), []);
    const currentHostname = getCurrentHostname();
    const { onClickPaymentCard, onUpgradePlan, handleTopupPurchase } = usePaymentHandler(dispatch, {
        productId: PRODUCT_IDS.ANSWERLATTICE,
        productName: 'Answerlattice',
        subscriptionCheckoutName: 'Answerlattice Subscription',
        topupCheckoutName: 'Answerlattice Support Credit Pack',
    });

    const refetchActiveSubscription = useCallback(async () => {
        if (!scope?.tenantId || !scope?.storeId) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        try {
            const subscription = await getAnswerlatticeActiveSubscriptionForStore(scope.tenantId, scope.storeId);
            setActiveSubscription(subscription);
            setBillingHistory([]);
        } catch (error) {
            logger.error('Failed to load Answerlattice subscription', error);
            message.error('Could not load Answerlattice billing.');
        } finally {
            setIsLoading(false);
        }
    }, [scope?.tenantId, scope?.storeId]);

    useEffect(() => {
        if (status === 'loading') return;
        void refetchActiveSubscription();
    }, [refetchActiveSubscription, status]);

    const fetchBillingHistory = async () => {
        if (!scope?.tenantId || !scope?.storeId) return;
        try {
            const rawHistory = await getAnswerlatticeBillingHistoryForStore(scope.tenantId, scope.storeId);
            setBillingHistory(formatBillingHistoryEvents(rawHistory, {
                formatBillingCycle: (startSeconds, endSeconds) => {
                    if (!startSeconds || !endSeconds) return undefined;
                    const startDate = formatter.dateTime(new Date(startSeconds * 1000), { year: 'numeric', month: 'short', day: 'numeric' });
                    const endDate = formatter.dateTime(new Date(endSeconds * 1000), { year: 'numeric', month: 'short', day: 'numeric' });
                    return `${startDate}-${endDate}`;
                },
            }));
        } catch (error) {
            logger.error('Failed to load Answerlattice billing history', error);
            message.error('Could not load billing history.');
        }
    };

    const handleConfirmUpgrade = async (newPlan: Plan, currency: Currency) => {
        try {
            dispatch(startLoader('Processing Answerlattice payment'));
            const paymentResponse = activeSubscription
                ? await onUpgradePlan(activeSubscription, newPlan, currency)
                : await onClickPaymentCard(newPlan, currency, () => { });
            message.success('Answerlattice subscription updated.');
            await refetchActiveSubscription();
            return paymentResponse;
        } catch (error) {
            logger.error('Answerlattice payment flow failed', error);
            message.error('Payment failed. Please try again.');
        } finally {
            setIsPricingModalOpen({ action: 'upgrade', active: false });
            dispatch(stopLoader('Processing Answerlattice payment'));
        }
    };

    const handleCreditsPurchase = async (packId: string) => {
        try {
            const pack = packs.find((candidate) => candidate.packId === packId);
            if (!pack) throw new Error('Answerlattice credit pack not found');
            const paymentResult = await handleTopupPurchase(pack, activeSubscription?.currency || 'INR');
            setActiveSubscription((previous) => previous
                ? {
                    ...previous,
                    topUpCredits: typeof paymentResult?.newCreditBalance === 'number'
                        ? paymentResult.newCreditBalance
                        : (previous.topUpCredits || 0) + pack.creditAmount,
                }
                : previous);
            message.success('Support credits added.');
        } catch (error) {
            logger.error('Answerlattice credit pack purchase failed', error);
            message.error('Credit purchase failed.');
        } finally {
            setIsCreditsModalOpen(false);
        }
    };

    const currentPlanTier = activeSubscription ? ANSWERLATTICE_PLAN_TIER_ORDER[activeSubscription.planId] || 0 : 0;
    const canUpgradePlan = Boolean(activeSubscription && activeSubscription.status === 'active' && currentPlanTier < ANSWERLATTICE_PLAN_TIER_ORDER.answerlattice_studio);

    return (
        <Flex vertical gap={16} style={{ width: '100%', paddingBottom: isMobile ? 'calc(24px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'flex-start'} justify="space-between" gap={16} vertical={isMobile} wrap={!isMobile}>
                <Flex vertical gap={4}>
                    <Title level={isMobile ? 4 : 2} style={{ margin: 0 }}>Billing</Title>
                    <Text type="secondary">Manage Answerlattice subscription, support credits, invoices, and payment recovery.</Text>
                </Flex>
                <Space wrap style={{ width: isMobile ? '100%' : undefined }}>
                    <Button icon={<LuReceipt />} onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.TRANSACTIONS, currentHostname))}>
                        Transactions
                    </Button>
                    <Button type="primary" icon={<LuCreditCard />} onClick={() => setIsPricingModalOpen({ action: activeSubscription ? 'upgrade' : 'new', active: true })}>
                        {activeSubscription ? 'Change plan' : 'Choose plan'}
                    </Button>
                </Space>
            </Flex>

            <Card>
                <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={16} vertical={isMobile} wrap={!isMobile}>
                    <Flex align="center" gap={10}>
                        <LuLifeBuoy size={20} />
                        <Flex vertical>
                            <Text strong>Billing help</Text>
                            <Text type="secondary">Use tickets for invoice questions, payment retries, plan changes, or credit issues.</Text>
                        </Flex>
                    </Flex>
                    <Button onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.TICKETS, currentHostname))}>
                        Open ticket
                    </Button>
                </Flex>
            </Card>

            {isLoading ? (
                <Card>
                    <Flex align="center" justify="center" gap={12} style={{ minHeight: 160 }}>
                        <Spin />
                        <Text type="secondary">Loading Answerlattice billing...</Text>
                    </Flex>
                </Card>
            ) : activeSubscription ? (
                <>
                    <ActiveSubscriptionCard
                        activeSubscription={activeSubscription}
                        refetchActiveSubscription={refetchActiveSubscription}
                        setIsPricingModalOpen={setIsPricingModalOpen}
                        setIsCreditsModalOpen={setIsCreditsModalOpen}
                        productId={PRODUCT_IDS.ANSWERLATTICE}
                        productName="Answerlattice"
                        supportRoute={toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.TICKETS, currentHostname)}
                        usageRoute={toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.TRANSACTIONS, currentHostname)}
                        creditTitle="Support Credits"
                        creditDescription="Answerlattice credits cover governed answers, chat assistance, and knowledge governance work."
                        creditBalanceLabel="Credits left"
                        creditPackButtonLabel="Get support credits"
                        canUpgradePlan={canUpgradePlan}
                        allowSubscriptionSelfService={activeSubscription.planId !== 'answerlattice_beta'}
                    />
                    <BillingHistory billingHistory={billingHistory} fetchBillingHistory={fetchBillingHistory} />
                </>
            ) : (
                <Card>
                    <Empty
                        description={<Text type="secondary">No Answerlattice subscription found for this workspace.</Text>}
                    >
                        <Button type="primary" icon={<LuCreditCard />} onClick={() => setIsPricingModalOpen({ action: 'new', active: true })}>
                            Choose Answerlattice plan
                        </Button>
                    </Empty>
                </Card>
            )}

            {!scope && !isLoading ? (
                <Alert
                    type="warning"
                    showIcon
                    message="Answerlattice account scope is missing"
                    description="Complete Answerlattice onboarding before using billing."
                />
            ) : null}

            <PricingPlansModal
                action={isPricingModalOpen.action}
                handleConfirmUpgrade={handleConfirmUpgrade}
                activeSubscription={activeSubscription}
                isOpen={isPricingModalOpen.active}
                onClose={() => setIsPricingModalOpen({ action: 'upgrade', active: false })}
                plansOverride={plans}
                currencyOverride={activeSubscription?.currency || 'INR'}
                modalTitle="Choose Answerlattice Plan"
                planTierOrder={ANSWERLATTICE_PLAN_TIER_ORDER}
                yearlyBadgeText="Two months included"
                renderFeatureItems={(plan) => (
                    <>
                        <List.Item style={{ borderBlockEnd: 'none', padding: '6px 0' }}>
                            <LuCheck style={{ color: token.colorSuccess, marginRight: 8 }} />
                            <Text>{plan.priceINR.monthlyCredits} support credits / month</Text>
                        </List.Item>
                        <List.Item style={{ borderBlockEnd: 'none', padding: '6px 0' }}>
                            <LuCheck style={{ color: token.colorSuccess, marginRight: 8 }} />
                            <Text>{plan.featuresList.canonicalAnswers} canonical answers</Text>
                        </List.Item>
                        <List.Item style={{ borderBlockEnd: 'none', padding: '6px 0' }}>
                            <LuCheck style={{ color: token.colorSuccess, marginRight: 8 }} />
                            <Text>{plan.featuresList.kbArticles} knowledge articles</Text>
                        </List.Item>
                        <List.Item style={{ borderBlockEnd: 'none', padding: '6px 0' }}>
                            <LuCheck style={{ color: token.colorSuccess, marginRight: 8 }} />
                            <Text>{plan.featuresList.signalEvents} monthly support signals</Text>
                        </List.Item>
                        <List.Item style={{ borderBlockEnd: 'none', padding: '6px 0' }}>
                            <LuCheck style={{ color: token.colorSuccess, marginRight: 8 }} />
                            <Text>{plan.featuresList.workspaces} workspace{Number(plan.featuresList.workspaces) > 1 ? 's' : ''}</Text>
                        </List.Item>
                    </>
                )}
            />

            <CreditsPackModal
                isOpen={isCreditsModalOpen}
                activeSubscription={activeSubscription}
                handleCreditsPurchase={handleCreditsPurchase}
                onClose={() => setIsCreditsModalOpen(false)}
                packs={packs}
                title="Get More Support Credits"
                description="Use one-time Answerlattice credit packs when launches or support spikes need extra capacity."
            />
        </Flex>
    );
}
