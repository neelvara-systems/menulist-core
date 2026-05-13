//////add handling for past_due statuses to show your payment failed 
//////add handling for cancelled statuses to show your subscription has been cancelled
//////add handling for expired statuses to show your subscription has expired


'use client'

import { useAppDispatch } from '@hook/useAppDispatch';
import { CANONICA_ROUTES } from '@constant/canonica/navigations';
import usePaymentHandler from '@hook/usePaymentHandler';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { formatDateTime } from '@util/dateTime';
import { getGracePeriodInfo, hasValidSubscriptionAccess } from '@util/razorpay';
import { Button, Card, Col, Divider, Flex, message, Progress, Row, Space, Statistic, Tag, theme, Tooltip, Typography } from 'antd';
import { useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaBolt, FaCreditCard } from 'react-icons/fa';
import { LuHeartCrack, LuHeartOff, LuHeartPulse, LuHistory, LuPause, LuPlay, LuXCircle } from 'react-icons/lu';
import { RiMastercardFill } from 'react-icons/ri';
import { TbBrandVisa } from 'react-icons/tb';
import { formatCurrency } from '../../../../utils/formatters';
import CancellationModal from './CancellationModal';
const { Title, Text, Paragraph } = Typography;

const PaymentMethodIcon = ({ brand }: { brand?: string }) => {
    const lowerBrand = brand?.toLowerCase();
    if (lowerBrand === "visa") return <TbBrandVisa />;
    if (lowerBrand === "mastercard" || lowerBrand === "mc") return <RiMastercardFill />;
    return <FaCreditCard />;
};

interface ActiveSubscriptionCardProps {
    activeSubscription: FirestoreSubscriptionDoc,
    refetchActiveSubscription: () => void,
    setIsPricingModalOpen: (value: { action: "upgrade" | "new"; active: boolean }) => void,
    setIsCreditsModalOpen: (value: boolean) => void
}
function ActiveSubscriptionCard({ activeSubscription, refetchActiveSubscription, setIsPricingModalOpen, setIsCreditsModalOpen }: ActiveSubscriptionCardProps) {
    const { token } = theme.useToken();
    const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false);
    const dispatch = useAppDispatch();
    const router = useRouter();
    const formatter = useFormatter();
    const { onCancelSubscription, onPauseSubscription, onResumeSubscription } = usePaymentHandler(dispatch);
    const monthlyCredits = Number(activeSubscription.monthlyCredits || 0);
    const topUpCredits = Number(activeSubscription.topUpCredits || 0);
    const monthlyCreditsAllowance = Number(activeSubscription.monthlyCreditsAllowance || 0);
    const totalCredits = monthlyCredits + topUpCredits;
    const monthlyCreditUsage = monthlyCreditsAllowance > 0 ? (monthlyCredits / monthlyCreditsAllowance) * 100 : 0;
    const monthlyCreditsUsed = Math.max(0, monthlyCreditsAllowance - monthlyCredits);

    const cardStyle = {
        borderRadius: '16px',
        border: 'none',
        background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`,
    };

    const creditCardStyle = {
        ...cardStyle,
        background: `linear-gradient(135deg, ${totalCredits > 50 ? token.colorSuccessBg : token.colorErrorBg} 0%, ${token.colorBgContainer} 100%)`,
    }

    const handleConfirmCancellation = async (reason: string, otherReason: string | undefined, consent: boolean) => {
        dispatch(startLoader("Cancelling subscription"));
        try {
            await onCancelSubscription({ reason, otherReason, consent });
            message.success('Your subscription has been cancelled successfully.');
            refetchActiveSubscription();
        } catch (error: any) {
            console.error('Cancellation failed:', error);
            message.error(error.message || 'An unexpected error occurred.');
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
            console.error('Pause failed:', error);
            message.error(error.message || 'Failed to pause subscription.');
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
            console.error('Resume failed:', error);
            message.error(error.message || 'Failed to resume subscription.');
        } finally {
            dispatch(stopLoader("Resuming subscription"));
        }
    };


    // --- SMART BUTTON RENDERING LOGIC ---
    const renderActionButtons = () => {
        const isFinalCycle = Math.abs(activeSubscription.renewsOn.seconds - activeSubscription.subscriptionEndDate.seconds) <= 86400;
        if (activeSubscription.status === 'active') {
            return (
                <Space>
                    {isFinalCycle ? <Button type="primary" onClick={() => setIsPricingModalOpen({ action: "new", active: true })}>Change Plan</Button> :
                        <Button icon={<LuXCircle />} danger onClick={() => setIsCancellationModalOpen(true)}>Cancel Subscription</Button>}
                    {/* <Button icon={<LuPause />} onClick={handlePauseSubscription}>Pause</Button> */}
                    {activeSubscription.planId !== 'premium' && <Button icon={<FaBolt />} type="primary" onClick={() => setIsPricingModalOpen({ action: "upgrade", active: true })}>Upgrade Plan</Button>}
                </Space>
            );
        }

        if (activeSubscription.status === 'paused') {
            return (
                <Space>
                    <Button icon={<LuPlay />} type="primary" onClick={handleResumeSubscription}>Resume Subscription</Button>
                    <Button icon={<LuXCircle />} danger onClick={() => setIsCancellationModalOpen(true)}>Cancel Subscription</Button>
                </Space>
            );
        }

        if (activeSubscription.status === 'cancelled' || activeSubscription.status === 'expired') {
            return <Button type="primary" onClick={() => setIsPricingModalOpen({ action: "new", active: true })}>Choose a New Plan</Button>
        }

        if (activeSubscription.status === 'past_due') {
            return <Space>
                {!isFinalCycle && <Button icon={<LuXCircle />} danger onClick={() => setIsCancellationModalOpen(true)}>Cancel Subscription</Button>}
                {activeSubscription.shortUrl ? (
                    <Button type="primary" icon={<FaCreditCard />} href={activeSubscription.shortUrl} target="_blank">
                        Retry Payment
                    </Button>
                ) : (
                    <Button type="primary" onClick={() => router.push(CANONICA_ROUTES.SUPPORT)}>
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
        if (activeSubscription.status === 'expired') {
            return <Tag style={styles} icon={<LuHeartOff />} color="default">Expired</Tag>;
        }
        return null;
    };

    const renderAccessUntillDate = () => {

        const isFinalCycle = Math.abs(activeSubscription.renewsOn.seconds - activeSubscription.subscriptionEndDate.seconds) <= 86400;

        if (activeSubscription.status === 'cancelled') {
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title="Access Good Until"
                value={formatDateTime(activeSubscription.cycleEndDate, "date", formatter)}
            />
        }
        if (activeSubscription.status === 'past_due') {
            const { remainingDays, graceEndsTimestamp } = getGracePeriodInfo(activeSubscription.pastDueSinceAt);
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title={`Grace period (${remainingDays} day${remainingDays > 1 ? 's' : ''} left)`}
                value={formatDateTime(graceEndsTimestamp, "date", formatter)}
            />
        }
        if (activeSubscription.status === 'active') {
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title={isFinalCycle ? "Expires On" : "Renews On"}
                value={formatDateTime(activeSubscription.renewsOn, "date", formatter)}
            />
        }
        if (activeSubscription.status === 'paused') {
            return <Statistic
                valueStyle={{ fontSize: 14 }}
                title="Paused Since"
                value={formatDateTime(activeSubscription.statuses[activeSubscription.statuses.length - 1]?.timestamp, "date", formatter)}
            />
        }
        return null;
    }

    const renderGracePeriodInfo = () => {
        const { remainingDays } = getGracePeriodInfo(activeSubscription.pastDueSinceAt);
        return <Text type="warning">
            ⚠️ Your last payment attempt failed.
            Your subscription is currently in a grace period. Please update your payment method within {remainingDays} day{remainingDays > 1 ? 's' : ''} to avoid service interruption.
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
                                        value={formatCurrency(activeSubscription.amount * (activeSubscription.quantity || 1), activeSubscription.currency)}
                                        suffix={<Text type="secondary">/ {activeSubscription.planType === 'YEAR' ? 'Year' : 'Month'}</Text>}
                                    />
                                    {(activeSubscription.quantity || 1) > 1 && (
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {activeSubscription.quantity} stores × {formatCurrency(activeSubscription.amount, activeSubscription.currency)} each
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
                                        title="Current Billing Cycle"
                                        value={`${formatDateTime(activeSubscription.cycleStartDate, "date", formatter)} - ${formatDateTime(activeSubscription.cycleEndDate, "date", formatter)}`}
                                    />
                                </Col>
                                <Col xs={24} sm={8}>
                                    {renderAccessUntillDate()}
                                </Col>
                                <Col xs={24} sm={8}>
                                    <Statistic
                                        valueStyle={{ fontSize: 14 }}
                                        title="Subscription End Date"
                                        value={formatDateTime(activeSubscription.subscriptionEndDate, "date", formatter)}
                                    />
                                </Col>
                            </Row>

                            <Divider style={{ margin: '8px 0' }} />

                            {activeSubscription.status === 'past_due' && <Row>
                                {renderGracePeriodInfo()}
                            </Row>}

                            {activeSubscription.status === 'paused' && <Row>
                                <Text type="warning">
                                    {!hasValidSubscriptionAccess(activeSubscription)
                                        ? '⏸️ Your subscription is paused and your billing cycle has ended. Resume your subscription to continue accessing all features.'
                                        : '⏸️ Your subscription is currently paused. Your credits and access remain available until the current billing cycle ends. Resume anytime to continue receiving renewals.'
                                    }
                                </Text>
                            </Row>}

                            <Row justify="space-between" align="middle">
                                <Col>
                                    <Space align="center" style={{ display: 'flex' }}>
                                        Payment Method:
                                        {activeSubscription.paymentMethod?.type == 'card' && <>
                                            <PaymentMethodIcon brand={activeSubscription.paymentMethod?.brand} />
                                            <Tag color="processing">
                                                {activeSubscription.paymentMethod?.brand ?
                                                    `${activeSubscription.paymentMethod.brand.charAt(0).toUpperCase() + activeSubscription.paymentMethod.brand.slice(1)} ending in **** ${activeSubscription.paymentMethod.last4}` :
                                                    ''}
                                            </Tag>
                                        </>}
                                        {activeSubscription.paymentMethod?.type == 'upi' && <>
                                            <Tooltip title={activeSubscription.paymentMethod?.upiTransactionId}>
                                                <Flex gap={8}>
                                                    <Text strong>UPI</Text>
                                                    <Tag color="processing">{activeSubscription.paymentMethod?.upiId}</Tag>
                                                </Flex>
                                            </Tooltip>
                                        </>}
                                        {!activeSubscription.paymentMethod?.type && <Tag>N/A</Tag>}
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

                <Col xs={24} lg={8}>
                    <Card style={creditCardStyle}>
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                            <Flex justify="space-between" align="center" gap={16} style={{ width: '100%' }} >
                                <Title level={5}>Content Features</Title>
                                <Tag color={totalCredits > 0 ? 'success' : 'warning'}>
                                    {totalCredits > 0 ? 'Active' : 'Exhausted'}
                                </Tag>
                            </Flex>

                            <Text type="secondary">
                                Your plan includes enhancements for images, descriptions, and translations.
                            </Text>

                            <Statistic
                                title="Enhancements left"
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

                            {totalCredits <= Math.max(10, monthlyCreditsAllowance * 0.2) ? (
                                <Text type="warning">
                                    Running low. Add a pack before generation pauses.
                                </Text>
                            ) : null}

                            <Flex align='end' style={{ width: '100%' }} gap={16}>
                                <Button block icon={<LuHistory />} onClick={() => router.push('/transactions')}>View Usage</Button>
                                <Button type="primary" ghost block icon={<FaBolt />} onClick={() => setIsCreditsModalOpen(true)}>
                                    {totalCredits > 0 ? 'Get Enhancements' : 'Get More Enhancements'}
                                </Button>
                            </Flex>
                        </Space>
                    </Card>
                </Col>
            </Row>
            <CancellationModal
                isOpen={isCancellationModalOpen}
                onClose={() => setIsCancellationModalOpen(false)}
                onConfirm={handleConfirmCancellation}
                subscriptionEndDate={activeSubscription.cycleEndDate}
            />
        </>
    );
};

export default ActiveSubscriptionCard;
