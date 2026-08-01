'use client'

import { helpCenterTabRouting } from '@constant/navigations';
import { PRODUCT_IDS, type ProductId } from '@constant/product';
import { isFeatureEnabled } from '@config/features';
import { getBoundedPaymentStringContext, logPaymentFailure } from '@hook/paymentDiagnostics';
import { useAppDispatch } from '@hook/useAppDispatch';
import usePaymentHandler from '@hook/usePaymentHandler';
import type { CancellationReasonCode } from '@lib/billing/cancellationReasons';
import { normalizeRazorpaySubscriptionCheckoutUrl } from '@lib/razorpay/checkoutUrl';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { formatDateTime } from '@util/dateTime';
import { getGracePeriodDisplayInfo, hasValidSubscriptionAccess } from '@util/razorpay';
import { Button, Card, Col, Divider, Flex, message, Progress, Row, Space, Statistic, Tag, theme, Tooltip, Typography } from 'antd';
import { useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LuCreditCard, LuHeartCrack, LuHeartOff, LuHeartPulse, LuHistory, LuPause, LuPlay, LuXCircle, LuZap } from 'react-icons/lu';
import { formatCurrency } from '../../../../utils/formatters';
import CancellationModal from './CancellationModal';
const { Title, Text, Paragraph } = Typography;

const PaymentMethodIcon = ({ brand }: { brand?: string }) => {
    const lowerBrand = brand?.toLowerCase();
    return <LuCreditCard aria-label={lowerBrand ? `${lowerBrand} card` : 'card'} />;
};

interface ActiveSubscriptionCardProps {
    activeSubscription: FirestoreSubscriptionDoc,
    refetchActiveSubscription: () => void,
    setIsPricingModalOpen: (value: { action: "upgrade" | "new"; active: boolean }) => void,
    setIsCreditsModalOpen: (value: boolean) => void,
    productId?: ProductId,
    productName?: string,
    supportRoute?: string,
    usageRoute?: string,
    creditTitle?: string,
    creditDescription?: string,
    creditBalanceLabel?: string,
    creditPackButtonLabel?: string,
    canUpgradePlan?: boolean,
    allowCreditPackPurchase?: boolean,
    allowSubscriptionSelfService?: boolean,
}
function ActiveSubscriptionCard({
    activeSubscription,
    refetchActiveSubscription,
    setIsPricingModalOpen,
    setIsCreditsModalOpen,
    productId = PRODUCT_IDS.MENULIST,
    productName = 'MenuList.ai',
    supportRoute = helpCenterTabRouting('ticket'),
    usageRoute = '/transactions',
    creditTitle = 'Content Features',
    creditDescription = 'Your plan includes enhancements for images, descriptions, and translations.',
    creditBalanceLabel = 'Enhancements left',
    creditPackButtonLabel,
    canUpgradePlan,
    allowCreditPackPurchase = true,
    allowSubscriptionSelfService = true,
}: ActiveSubscriptionCardProps) {
    const { token } = theme.useToken();
    const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const formatter = useFormatter();
    const { onCancelSubscription, onPauseSubscription, onResumeSubscription } = usePaymentHandler(dispatch, { productId, productName });
    const buildSubscriptionActionPaymentLogContext = (flow: string, metadata: Record<string, unknown> = {}) => ({
        surface: 'desktop_billing_subscription_card',
        flow,
        status: activeSubscription.status || 'unknown',
        ...getBoundedPaymentStringContext('productId', productId),
        ...getBoundedPaymentStringContext('planId', activeSubscription.planId),
        ...getBoundedPaymentStringContext('subscriptionId', activeSubscription.providerSubscriptionId),
        ...metadata,
    });
    const canPauseSubscriptions = isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE');
    const keepsMonthlyCapacityPrivate = productId === PRODUCT_IDS.MENULIST;
    const monthlyCredits = Number(activeSubscription.monthlyCredits || 0);
    const topUpCredits = Number(activeSubscription.topUpCredits || 0);
    const monthlyCreditsAllowance = Number(activeSubscription.monthlyCreditsAllowance || 0);
    const totalCredits = monthlyCredits + topUpCredits;
    const monthlyCreditUsage = monthlyCreditsAllowance > 0 ? (monthlyCredits / monthlyCreditsAllowance) * 100 : 0;
    const monthlyCreditsUsed = Math.max(0, monthlyCreditsAllowance - monthlyCredits);
    const isManualBilling = activeSubscription.billingMode === 'manual';
    const isPaymentPending = activeSubscription.status === 'pending';
    const renewsOnSeconds = activeSubscription.renewsOn?.seconds;
    const subscriptionEndSeconds = activeSubscription.subscriptionEndDate?.seconds;
    const isFinalCycle = typeof renewsOnSeconds === 'number'
        && typeof subscriptionEndSeconds === 'number'
        && Math.abs(renewsOnSeconds - subscriptionEndSeconds) <= 86400;
    const subscriptionCheckoutUrl = normalizeRazorpaySubscriptionCheckoutUrl(activeSubscription.shortUrl);
    const intervalLabel = activeSubscription.planType === 'YEAR' ? 'Year' : 'Month';
    const amountSuffix = isManualBilling
        ? `one-time prepaid${activeSubscription.commitmentPeriodMonths ? ` / ${activeSubscription.commitmentPeriodMonths} months` : ''}`
        : intervalLabel;
    const displayAmount = isManualBilling
        ? activeSubscription.amount
        : activeSubscription.amount * (activeSubscription.quantity || 1);
    const formatBillingDate = (value: any, fallback = 'N/A') => value ? formatDateTime(value, "date", formatter) : fallback;
    const getPastDueGracePeriodDisplay = () => {
        const gracePeriodDisplay = getGracePeriodDisplayInfo(activeSubscription.pastDueSinceAt);
        return {
            ...gracePeriodDisplay,
            value: gracePeriodDisplay.hasKnownGracePeriod
                ? formatDateTime(gracePeriodDisplay.graceEndsTimestamp, "date", formatter)
                : 'Grace period unavailable',
        };
    };

    const cardStyle = {
        borderRadius: '16px',
        border: 'none',
        background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
    };

    const creditCardStyle = {
        ...cardStyle,
        background: `linear-gradient(135deg, ${totalCredits > 50 ? token.colorSuccessBg : token.colorErrorBg} 0%, ${token.colorBgContainer} 100%)`,
    }

    const handleConfirmCancellation = async (reason: CancellationReasonCode, otherReason: string | undefined, consent: boolean) => {
        dispatch(startLoader("Cancelling subscription"));
        try {
            await onCancelSubscription({ reason, otherReason, consent });
            message.success('Your subscription has been cancelled successfully.');
            refetchActiveSubscription();
        } catch (error: any) {
            logPaymentFailure('payment_desktop_subscription_cancel_failed', error, buildSubscriptionActionPaymentLogContext('cancel_subscription', {
                ...getBoundedPaymentStringContext('reason', reason),
                hasOtherReason: Boolean(otherReason),
                consent: Boolean(consent),
            }));
            message.error('Subscription cancellation failed. Please contact support.');
        } finally {
            dispatch(stopLoader("Cancelling subscription"));
            setIsCancellationModalOpen(false);
        }
    };

    const handlePauseSubscription = async () => {
        dispatch(startLoader("Pausing subscription"));
        try {
            await onPauseSubscription();
            message.success('Your subscription has been paused.');
            refetchActiveSubscription();
        } catch (error: any) {
            logPaymentFailure('payment_desktop_subscription_pause_failed', error, buildSubscriptionActionPaymentLogContext('pause_subscription'));
            message.error('Failed to pause subscription.');
        } finally {
            dispatch(stopLoader("Pausing subscription"));
        }
    };

    const handleResumeSubscription = async () => {
        dispatch(startLoader("Resuming subscription"));
        try {
            await onResumeSubscription();
            message.success('Your subscription has been resumed.');
            refetchActiveSubscription();
        } catch (error: any) {
            logPaymentFailure('payment_desktop_subscription_resume_failed', error, buildSubscriptionActionPaymentLogContext('resume_subscription'));
            message.error('Failed to resume subscription.');
        } finally {
            dispatch(stopLoader("Resuming subscription"));
        }
    };

    const handleOpenPaymentLink = (flow: 'pending_payment' | 'retry_payment') => {
        if (!subscriptionCheckoutUrl) return;
        try {
            const opened = window.open(subscriptionCheckoutUrl, '_blank', 'noopener,noreferrer');
            if (!opened) {
                throw new Error('desktop_subscription_payment_link_open_blocked');
            }
        } catch (error) {
            logPaymentFailure('payment_desktop_subscription_payment_link_open_failed', error, buildSubscriptionActionPaymentLogContext(flow, {
                ...getBoundedPaymentStringContext('shortUrl', subscriptionCheckoutUrl),
            }));
            message.error('Could not open payment link.');
        }
    };
    const openCancellationModal = () => {
        if (!activeSubscription.cycleEndDate) {
            message.error('The billing-cycle end date is unavailable. Contact support before cancelling.');
            return;
        }
        setIsCancellationModalOpen(true);
    };


    // --- SMART BUTTON RENDERING LOGIC ---
    const renderActionButtons = () => {
        if (!allowSubscriptionSelfService) {
            return null;
        }

        if (isPaymentPending) {
            return subscriptionCheckoutUrl ? (
                <Button type="primary" icon={<LuCreditCard />} onClick={() => handleOpenPaymentLink('pending_payment')}>
                    Pay Now
                </Button>
            ) : (
                <Button type="primary" onClick={() => router.push(supportRoute)}>
                    Contact Support
                </Button>
            );
        }
        if (isManualBilling) {
            return null;
        }
        if (activeSubscription.status === 'active') {
            return (
                <Space>
                    {isFinalCycle ? <Button type="primary" onClick={() => setIsPricingModalOpen({ action: "new", active: true })}>Change Plan</Button> :
                        <Button icon={<LuXCircle />} danger onClick={openCancellationModal}>Cancel Subscription</Button>}
                    {canPauseSubscriptions && <Button icon={<LuPause />} onClick={handlePauseSubscription}>Pause</Button>}
                    {(canUpgradePlan ?? activeSubscription.planId !== 'premium') && <Button icon={<LuZap />} type="primary" onClick={() => setIsPricingModalOpen({ action: "upgrade", active: true })}>Upgrade Plan</Button>}
                </Space>
            );
        }

        if (activeSubscription.status === 'paused') {
            return (
                <Space>
                    {canPauseSubscriptions ? (
                        <Button icon={<LuPlay />} type="primary" onClick={handleResumeSubscription}>Resume Subscription</Button>
                    ) : (
                        <Button type="primary" onClick={() => router.push(supportRoute)}>
                            Contact Support
                        </Button>
                    )}
                    <Button icon={<LuXCircle />} danger onClick={openCancellationModal}>Cancel Subscription</Button>
                </Space>
            );
        }

        if (activeSubscription.status === 'cancelled' || activeSubscription.status === 'expired') {
            return <Button type="primary" onClick={() => setIsPricingModalOpen({ action: "new", active: true })}>Choose a New Plan</Button>
        }

        if (activeSubscription.status === 'past_due') {
            return <Space>
                {!isFinalCycle && <Button icon={<LuXCircle />} danger onClick={openCancellationModal}>Cancel Subscription</Button>}
                {subscriptionCheckoutUrl ? (
                    <Button type="primary" icon={<LuCreditCard />} onClick={() => handleOpenPaymentLink('retry_payment')}>
                        Retry Payment
                    </Button>
                ) : (
                    <Button type="primary" onClick={() => router.push(supportRoute)}>
                        Contact Support
                    </Button>
                )}
            </Space>
        }
        return null;
    };

    const renderTag = () => {
        const styles = { fontSize: '14px', padding: '6px 12px', borderRadius: '12px' }
        if (activeSubscription.status === 'active') {
            return <Tag style={styles} icon={<LuHeartPulse />} color="success">Active</Tag>;
        }
        if (activeSubscription.status === 'cancelled') {
            return <Tag style={styles} icon={<LuHeartOff />} color="error">Cancelled</Tag>;
        }
        if (activeSubscription.status === 'paused') {
            return <Tag style={styles} icon={<LuPause />} color="warning">Paused</Tag>;
        }
        if (activeSubscription.status === 'past_due') {
            return <Tag style={styles} icon={<LuHeartCrack />} color="warning">Payment Failed</Tag>;
        }
        if (activeSubscription.status === 'pending') {
            return <Tag style={styles} icon={<LuCreditCard />} color="processing">Payment Pending</Tag>;
        }
        if (activeSubscription.status === 'expired') {
            return <Tag style={styles} icon={<LuHeartOff />} color="default">Expired</Tag>;
        }
        return null;
    };

    const renderAccessUntillDate = () => {

        if (isPaymentPending) {
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title="Payment Status"
                value="Awaiting payment"
            />
        }

        if (isManualBilling) {
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title="Prepaid Until"
                value={formatBillingDate(activeSubscription.validUntil || activeSubscription.cycleEndDate)}
            />
        }

        if (activeSubscription.status === 'cancelled') {
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title="Access Good Until"
                value={formatBillingDate(activeSubscription.cycleEndDate)}
            />
        }
        if (activeSubscription.status === 'past_due') {
            const gracePeriodDisplay = getPastDueGracePeriodDisplay();
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title={gracePeriodDisplay.title}
                value={gracePeriodDisplay.value}
            />
        }
        if (activeSubscription.status === 'active') {
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title={isFinalCycle ? "Expires On" : "Renews On"}
                value={formatBillingDate(activeSubscription.renewsOn)}
            />
        }
        if (activeSubscription.status === 'paused') {
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title="Paused Since"
                value={formatBillingDate(activeSubscription.statuses[activeSubscription.statuses.length - 1]?.timestamp)}
            />
        }
        return null;
    }

    const renderGracePeriodInfo = () => {
        const gracePeriodDisplay = getPastDueGracePeriodDisplay();
        return <Text type="warning">
            ⚠️ Your last payment attempt failed. {gracePeriodDisplay.hasKnownGracePeriod
                ? `Complete the payment update within ${gracePeriodDisplay.dayLabel} to avoid service interruption.`
                : 'Grace-period details are unavailable. Retry the payment or contact support to recover billing.'}
        </Text>
    }

    return (
        <>
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={16}>
                    <Card style={cardStyle}>
                        <Space direction="vertical" style={{ width: '100%' }} size="large">
                            <Row justify="space-between" align="top">
                                <Col>
                                    <Title level={3} style={{ margin: 0, color: token.colorPrimaryTextActive }}>{activeSubscription.planName}</Title>
                                    <Statistic
                                        valueStyle={{ fontSize: 14 }}
                                        title=""
                                        value={formatCurrency(displayAmount, activeSubscription.currency)}
                                        suffix={<Text type="secondary">/ {amountSuffix}</Text>}
                                    />
                                    {(activeSubscription.quantity || 1) > 1 && !isManualBilling && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {activeSubscription.quantity} stores × {formatCurrency(activeSubscription.amount, activeSubscription.currency)} each
                                        </Text>
                                    )}
                                    {isManualBilling && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            Offline payment confirmed by reseller for {activeSubscription.quantity || 1} location{(activeSubscription.quantity || 1) > 1 ? 's' : ''}. This is prepaid access, not lifetime access.
                                        </Text>
                                    )}
                                </Col>
                                <Col>
                                    {renderTag()}
                                </Col>
                            </Row>

                            <Row gutter={[16, 16]} align="middle">
                                <Col xs={24} sm={8}>
                                    <Statistic
                                        valueStyle={{ fontSize: 14 }}
                                        title={isManualBilling ? "Prepaid Period" : "Current Billing Cycle"}
                                        value={isPaymentPending ? "Starts after payment" : `${formatBillingDate(activeSubscription.cycleStartDate)} - ${formatBillingDate(activeSubscription.cycleEndDate)}`}
                                    />
                                </Col>
                                <Col xs={24} sm={8}>
                                    {renderAccessUntillDate()}
                                </Col>
                                <Col xs={24} sm={8}>
                                    <Statistic
                                        valueStyle={{ fontSize: 14 }}
                                        title={isManualBilling ? "Access End Date" : "Subscription End Date"}
                                        value={formatBillingDate(activeSubscription.subscriptionEndDate, isPaymentPending ? "Starts after payment" : "N/A")}
                                    />
                                </Col>
                            </Row>

                            <Divider style={{ margin: '8px 0' }} />

                            {activeSubscription.status === 'past_due' && <Row>
                                {renderGracePeriodInfo()}
                            </Row>}

                            {activeSubscription.status === 'paused' && <Row>
                                <Text type="warning">
                                    {canPauseSubscriptions
                                        ? (!hasValidSubscriptionAccess(activeSubscription)
                                            ? 'Your subscription is paused and your billing cycle has ended. Resume your subscription to continue accessing all features.'
                                            : 'Your subscription is currently paused. Your credits and access remain available until the current billing cycle ends. Resume anytime to continue receiving renewals.')
                                        : (!hasValidSubscriptionAccess(activeSubscription)
                                            ? 'This subscription is paused and the billing cycle has ended. Contact support to update it.'
                                            : 'This subscription is paused. Access remains available until the current billing cycle ends. Contact support to update it.')
                                    }
                                </Text>
                            </Row>}

                            {isPaymentPending && <Row>
                                <Text type="warning">
                                    Payment is pending. Complete the Razorpay checkout to activate this store.
                                </Text>
                            </Row>}

                            <Row justify="space-between" align="middle">
                                <Col>
                                    <Space align="center" style={{ display: 'flex' }}>
                                        Payment Method:
                                        {isManualBilling && <Tag color="processing">Offline one-time prepaid</Tag>}
                                        {isPaymentPending && <Tag color="processing">Razorpay checkout pending</Tag>}
                                        {!isManualBilling && !isPaymentPending && activeSubscription.paymentMethod?.type == 'card' && <>
                                            <PaymentMethodIcon brand={activeSubscription.paymentMethod?.brand} />
                                            <Tag color="processing">
                                                {activeSubscription.paymentMethod?.brand ?
                                                    `${activeSubscription.paymentMethod.brand.charAt(0).toUpperCase() + activeSubscription.paymentMethod.brand.slice(1)} ending in **** ${activeSubscription.paymentMethod.last4}` :
                                                    ''}
                                            </Tag>
                                        </>}
                                        {!isManualBilling && !isPaymentPending && activeSubscription.paymentMethod?.type == 'upi' && <>
                                            <Tooltip title={activeSubscription.paymentMethod?.upiTransactionId}>
                                                <Flex gap={8}>
                                                    <Text strong>UPI</Text>
                                                    <Tag color="processing">{activeSubscription.paymentMethod?.upiId}</Tag>
                                                </Flex>
                                            </Tooltip>
                                        </>}
                                        {!isManualBilling && !isPaymentPending && !activeSubscription.paymentMethod?.type && <Tag>N/A</Tag>}
                                    </Space>
                                </Col>
                                <Col>
                                    <Space>
                                        {renderActionButtons()}
                                    </Space>
                                </Col>
                            </Row>
                        </Space>
                    </Card>
                </Col>

                {!isPaymentPending ? <Col xs={24} lg={8}>
                    <Card style={creditCardStyle}>
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <Flex justify="space-between" align="center" gap={16} style={{ width: '100%' }} >
                                <Title level={5}>{creditTitle}</Title>
                                <Tag color={totalCredits > 0 ? 'success' : 'warning'}>
                                    {totalCredits > 0 ? 'Active' : 'Exhausted'}
                                </Tag>
                            </Flex>

                            <Text type="secondary">
                                {creditDescription}
                            </Text>

                            {keepsMonthlyCapacityPrivate ? (
                                <>
                                    <Statistic
                                        title="Pack balance"
                                        value={topUpCredits}
                                        suffix={<Text type="secondary">credits</Text>}
                                        valueStyle={{ fontSize: 30, fontWeight: 700 }}
                                    />
                                    <Text type="secondary">Your plan enhancements are included automatically.</Text>
                                </>
                            ) : (
                                <>
                                    <Statistic
                                        title={creditBalanceLabel}
                                        value={totalCredits}
                                        valueStyle={{
                                            color: totalCredits > 0 ? token.colorSuccessText : token.colorWarningText,
                                            fontSize: 36,
                                            fontWeight: 700,
                                        }}
                                    />

                                    <Progress
                                        percent={Math.max(0, Math.min(100, monthlyCreditUsage))}
                                        showInfo={false}
                                        status={monthlyCredits > 0 ? 'active' : 'exception'}
                                        strokeColor={monthlyCredits > 0 ? token.colorSuccess : token.colorWarning}
                                    />

                                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                        <Flex justify="space-between">
                                            <Text type="secondary">Plan balance</Text>
                                            <Text strong>{monthlyCredits} of {monthlyCreditsAllowance}</Text>
                                        </Flex>
                                        <Flex justify="space-between">
                                            <Text type="secondary">Used this cycle</Text>
                                            <Text>{monthlyCreditsUsed}</Text>
                                        </Flex>
                                        <Flex justify="space-between">
                                            <Text type="secondary">Pack balance</Text>
                                            <Text>{topUpCredits}</Text>
                                        </Flex>
                                    </Space>
                                </>
                            )}

                            {!keepsMonthlyCapacityPrivate && totalCredits <= Math.max(10, monthlyCreditsAllowance * 0.2) ? (
                                <Text type="warning">
                                    Running low. Add a pack before generation pauses.
                                </Text>
                            ) : null}

                            <Flex align='end' style={{ width: '100%' }} gap={16}>
                                <Button block icon={<LuHistory />} onClick={() => router.push(usageRoute)}>View Usage</Button>
                                {allowCreditPackPurchase ? (
                                    <Button type="primary" ghost block icon={<LuZap />} onClick={() => setIsCreditsModalOpen(true)}>
                                        {creditPackButtonLabel || (totalCredits > 0 ? 'Get Enhancements' : 'Get More Enhancements')}
                                    </Button>
                                ) : null}
                            </Flex>
                        </Space>
                    </Card>
                </Col> : null}
            </Row>
            {activeSubscription.cycleEndDate ? <CancellationModal
                isOpen={isCancellationModalOpen}
                onClose={() => setIsCancellationModalOpen(false)}
                onConfirm={handleConfirmCancellation}
                subscriptionEndDate={activeSubscription.cycleEndDate}
            /> : null}
        </>
    );
};

export default ActiveSubscriptionCard;
