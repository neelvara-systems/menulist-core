'use client';

/**
 * ROI Calculator Component
 * 
 * Displays business value metrics from chat analytics:
 * - Cost savings vs manual support
 * - Time savings
 * - Revenue protection
 * - ROI and payback period
 * 
 * Completely standalone - no impact on existing chat management features
 */

import { useAppDispatch } from '@hook/useAppDispatch';
import {
    copyAnswerlatticeSupportTextToClipboard,
    hasAnswerlatticeSupportClipboardWrite,
    hasAnswerlatticeSupportCopyFallback,
} from '@lib/answerlattice/supportClipboard';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { startLoader, stopLoader } from '@reduxSlices/loader';
import { Button, Card, Col, Divider, Flex, Input, message, Modal, Row, Select, Spin, Statistic, theme, Typography } from 'antd';
import { motion } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import {
    LuChevronDown,
    LuChevronUp,
    LuDollarSign,
    LuDownload,
    LuHeart,
    LuRefreshCw,
    LuSettings,
    LuShare2,
    LuTarget,
    LuTrendingUp
} from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;
const ROI_METRICS_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const ROI_METRICS_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};
const ROI_METRICS_FAILED_MESSAGE = 'Failed to calculate ROI metrics. Please try again';
const PLATFORM_ROI_SHARE_COPY_CLIPBOARD_UNAVAILABLE = 'platform_roi_share_copy_clipboard_unavailable';
const PLATFORM_ROI_SHARE_COPY_FALLBACK_FAILED = 'platform_roi_share_copy_fallback_failed';

interface ROIMetrics {
    totalHoursSaved: number;
    monthlyHoursSaved: number;
    totalCostSaved: number;
    monthlyCostSaved: number;
    conversationsHandled: number;
    automationRate: number;
    satisfiedCustomers: number;
    estimatedRevenueProtected: number;
    platformCost: number;
    netSavings: number;
    roi: number;
    paybackPeriod: number | null;
}

interface ROIData {
    metrics: ROIMetrics;
    analyticsData: unknown;
    params: {
        avgSupportAgentHourlyCost: number;
        avgCustomerLifetimeValue: number;
        platformMonthlyCost: number;
    };
    dateRange: {
        start: string;
        end: string;
        days: number;
    };
}

type RoiMetricsApiResponse = {
    success: true;
    data: ROIData;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isFiniteNumber = (value: unknown): value is number => (
    typeof value === 'number' && Number.isFinite(value)
);

const isRoiMetrics = (value: unknown): value is ROIMetrics => {
    if (!isRecord(value)) return false;

    return (
        isFiniteNumber(value.totalHoursSaved)
        && isFiniteNumber(value.monthlyHoursSaved)
        && isFiniteNumber(value.totalCostSaved)
        && isFiniteNumber(value.monthlyCostSaved)
        && isFiniteNumber(value.conversationsHandled)
        && isFiniteNumber(value.automationRate)
        && isFiniteNumber(value.satisfiedCustomers)
        && isFiniteNumber(value.estimatedRevenueProtected)
        && isFiniteNumber(value.platformCost)
        && isFiniteNumber(value.netSavings)
        && isFiniteNumber(value.roi)
        && (value.paybackPeriod === null || isFiniteNumber(value.paybackPeriod))
    );
};

const isRoiData = (value: unknown): value is ROIData => (
    isRecord(value)
    && isRoiMetrics(value.metrics)
    && isRecord(value.analyticsData)
    && isRecord(value.params)
    && isFiniteNumber(value.params.avgSupportAgentHourlyCost)
    && isFiniteNumber(value.params.avgCustomerLifetimeValue)
    && isFiniteNumber(value.params.platformMonthlyCost)
    && isRecord(value.dateRange)
    && typeof value.dateRange.start === 'string'
    && typeof value.dateRange.end === 'string'
    && isFiniteNumber(value.dateRange.days)
);

const isRoiMetricsApiResponse = (value: unknown): value is RoiMetricsApiResponse => (
    isRecord(value)
    && value.success === true
    && isRoiData(value.data)
);

const getRoiMetricsResponseLogContext = (response: Response) => ({
    ...getBoundedRuntimeStringContext('endpoint', '/api/analytics/roi-metrics'),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readRoiMetricsResponse = async (response: Response): Promise<RoiMetricsApiResponse> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, ROI_METRICS_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logRuntimeFailure(
            'platform_roi_metrics_response_parse_failed',
            error,
            getRoiMetricsResponseLogContext(response),
        );
        throw new Error(ROI_METRICS_FAILED_MESSAGE);
    }

    if (!response.ok) {
        logRuntimeFailure(
            'platform_roi_metrics_response_rejected',
            undefined,
            getRoiMetricsResponseLogContext(response),
        );
        throw new Error(ROI_METRICS_FAILED_MESSAGE);
    }

    if (!isRoiMetricsApiResponse(payload)) {
        logRuntimeFailure(
            'platform_roi_metrics_response_invalid',
            undefined,
            getRoiMetricsResponseLogContext(response),
        );
        throw new Error(ROI_METRICS_FAILED_MESSAGE);
    }

    return payload;
};

const copyRoiShareTextToClipboard = async (shareText: string) => {
    await copyAnswerlatticeSupportTextToClipboard(shareText, {
        unavailable: PLATFORM_ROI_SHARE_COPY_CLIPBOARD_UNAVAILABLE,
        fallbackFailed: PLATFORM_ROI_SHARE_COPY_FALLBACK_FAILED,
    });
};

export default function ROICalculator() {
    const { data: session } = useSession();
    const dispatch = useAppDispatch();
    const { token } = theme.useToken();

    // State
    const [roiData, setRoiData] = useState<ROIData | null>(null);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState(30); // days
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [shareModalVisible, setShareModalVisible] = useState(false);

    // Advanced parameters (user-configurable)
    const [hourlyCost, setHourlyCost] = useState(25);
    const [customerLTV, setCustomerLTV] = useState(500);
    const [platformCost, setPlatformCost] = useState(99);

    // Fetch ROI data
    const fetchROIData = async () => {
        try {
            dispatch(startLoader('roi-calculator'));
            setLoading(true);

            const params = new URLSearchParams({
                days: dateRange.toString(),
                hourlyCost: hourlyCost.toString(),
                clv: customerLTV.toString(),
                platformCost: platformCost.toString(),
            });

            const response = await fetch(`/api/analytics/roi-metrics?${params}`, ROI_METRICS_REQUEST_POLICY);

            const result = await readRoiMetricsResponse(response);
            setRoiData(result.data);

        } catch (error) {
            logRuntimeFailure('platform_roi_metrics_load_failed', error);
            message.error(ROI_METRICS_FAILED_MESSAGE);
        } finally {
            setLoading(false);
            dispatch(stopLoader('roi-calculator'));
        }
    };

    // Initial load
    useEffect(() => {
        if (session) {
            fetchROIData();
        }
    }, [session, dateRange]);

    // Refresh on parameter change
    const handleRefresh = () => {
        fetchROIData();
    };

    // Export functionality
    const handleExport = () => {
        if (!roiData) return;

        const exportData = {
            metrics: roiData.metrics,
            dateRange: roiData.dateRange,
            generatedAt: new Date().toISOString(),
            platform: 'MenuListAI Chat Analytics',
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `roi-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        message.success('ROI report downloaded successfully');
    };

    // Share functionality
    const handleShare = () => {
        setShareModalVisible(true);
    };

    const handleCopyShareLink = async () => {
        if (!roiData) return;

        const shareText = `📊 ROI Report (${roiData.dateRange.days} days)

💰 Net Savings: $${roiData.metrics.netSavings.toLocaleString()}
📈 ROI: ${roiData.metrics.roi}%
⏰ Time Saved: ${roiData.metrics.totalHoursSaved} hours
🤖 Conversations: ${roiData.metrics.conversationsHandled}

Generated by MenuListAI Chat Analytics`;

        try {
            await copyRoiShareTextToClipboard(shareText);
            message.success('Share text copied successfully');
            setShareModalVisible(false);
        } catch (error) {
            logRuntimeFailure('platform_roi_share_copy_failed', error, {
                days: roiData.dateRange.days,
                hasClipboardWrite: hasAnswerlatticeSupportClipboardWrite(),
                hasCopyFallback: hasAnswerlatticeSupportCopyFallback(),
                netSavings: roiData.metrics.netSavings,
                shareTextLength: shareText.length,
            });
            message.error('Failed to copy share text');
        }
    };

    // Format currency
    const formatCurrency = (value: number) => `$${Math.round(value).toLocaleString()}`;

    // Format percentage
    const formatPercentage = (value: number) => `${value}%`;

    // Format payback period
    const formatPayback = (months: number | null) => {
        if (months === null || !Number.isFinite(months)) return 'N/A';
        if (months < 1) return '<1 month';
        return `${Math.round(months)} ${months === 1 ? 'month' : 'months'}`;
    };

    if (loading || !roiData) {
        return (
            <div className="flex justify-center items-center" style={{ minHeight: '400px' }}>
                <Spin size="large" tip="Calculating ROI metrics..." />
            </div>
        );
    }

    const { metrics } = roiData;

    return (
        <div className="roi-calculator-container" style={{ padding: '24px' }}>
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                    <Col>
                        <Title level={2} style={{ margin: 0 }}>
                            📊 ROI Calculator
                        </Title>
                        <Text type="secondary">
                            Business value from your AI chat analytics
                        </Text>
                    </Col>
                    <Col>
                        <Flex gap={8}>
                            <Button icon={<LuDownload />} onClick={handleExport}>Export</Button>
                            <Button icon={<LuShare2 />} onClick={handleShare} type="primary"> Share</Button>
                        </Flex>
                    </Col>
                </Row>
            </motion.div>

            {/* Controls Section */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <Card style={{ marginBottom: '24px' }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} sm={12} md={8}>
                            <Select
                                value={dateRange}
                                onChange={setDateRange}
                                style={{ width: '100%', marginTop: '8px' }}
                                options={[
                                    { value: 7, label: 'Last 7 days' },
                                    { value: 30, label: 'Last 30 days' },
                                    { value: 90, label: 'Last 90 days' },
                                ]}
                            />
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Button
                                icon={showAdvanced ? <LuChevronUp /> : <LuChevronDown />}
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                block
                            >
                                <LuSettings style={{ marginRight: '8px' }} />
                                Advanced Settings
                            </Button>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Button
                                icon={<LuRefreshCw />}
                                onClick={handleRefresh}
                                loading={loading}
                                block
                            >
                                Refresh
                            </Button>
                        </Col>
                    </Row>

                    {/* Advanced Settings Panel */}
                    {showAdvanced && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            transition={{ duration: 0.3 }}
                            style={{ marginTop: '16px' }}
                        >
                            <Divider />
                            <Row gutter={[16, 16]}>
                                <Col xs={24} md={8}>
                                    <Text strong>Hourly Support Cost ($):</Text>
                                    <Input
                                        type="number"
                                        value={hourlyCost}
                                        onChange={(e) => setHourlyCost(Number(e.target.value))}
                                        prefix={<LuDollarSign />}
                                        style={{ marginTop: '8px' }}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text strong>Customer Lifetime Value ($):</Text>
                                    <Input
                                        type="number"
                                        value={customerLTV}
                                        onChange={(e) => setCustomerLTV(Number(e.target.value))}
                                        prefix={<LuDollarSign />}
                                        style={{ marginTop: '8px' }}
                                    />
                                </Col>
                                <Col xs={24} md={8}>
                                    <Text strong>Platform Cost/Month ($):</Text>
                                    <Input
                                        type="number"
                                        value={platformCost}
                                        onChange={(e) => setPlatformCost(Number(e.target.value))}
                                        prefix={<LuDollarSign />}
                                        style={{ marginTop: '8px' }}
                                    />
                                </Col>
                            </Row>
                        </motion.div>
                    )}
                </Card>
            </motion.div>

            {/* Metrics Grid */}
            <Row gutter={[16, 16]}>
                {/* Cost Saved */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                    >
                        <Card
                            hoverable
                            style={{
                                height: '100%',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white'
                            }}
                        >
                            <Statistic
                                title={<Text style={{ color: 'rgba(255,255,255,0.9)' }}>💰 Cost Saved</Text>}
                                value={metrics.totalCostSaved}
                                prefix="$"
                                valueStyle={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}
                            />
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                                ${metrics.monthlyCostSaved.toLocaleString()}/month average
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* Time Saved */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.25 }}
                    >
                        <Card
                            hoverable
                            style={{
                                height: '100%',
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                color: 'white'
                            }}
                        >
                            <Statistic
                                title={<Text style={{ color: 'rgba(255,255,255,0.9)' }}>⏰ Time Saved</Text>}
                                value={metrics.totalHoursSaved}
                                suffix="hrs"
                                valueStyle={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}
                            />
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                                {metrics.monthlyHoursSaved} hrs/month average
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* Conversations Handled */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                    >
                        <Card
                            hoverable
                            style={{
                                height: '100%',
                                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                color: 'white'
                            }}
                        >
                            <Statistic
                                title={<Text style={{ color: 'rgba(255,255,255,0.9)' }}>🤖 Conversations</Text>}
                                value={metrics.conversationsHandled}
                                valueStyle={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}
                            />
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                                Handled automatically
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* ROI */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.35 }}
                    >
                        <Card
                            hoverable
                            style={{
                                height: '100%',
                                background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                                color: 'white'
                            }}
                        >
                            <Statistic
                                title={<Text style={{ color: 'rgba(255,255,255,0.9)' }}>📈 ROI</Text>}
                                value={metrics.roi}
                                suffix="%"
                                valueStyle={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}
                            />
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                                Return on investment
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* Satisfied Customers */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                    >
                        <Card hoverable style={{ height: '100%' }}>
                            <Statistic
                                title="😊 Happy Customers"
                                value={metrics.satisfiedCustomers}
                                valueStyle={{ color: '#52c41a' }}
                                prefix={<LuHeart style={{ color: '#52c41a' }} />}
                            />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Positive feedback received
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* Revenue Protected */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.45 }}
                    >
                        <Card hoverable style={{ height: '100%' }}>
                            <Statistic
                                title="💵 Revenue Protected"
                                value={metrics.estimatedRevenueProtected}
                                prefix="$"
                                valueStyle={{ color: '#1890ff' }}
                            />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Estimated churn reduction
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* Automation Rate */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.5 }}
                    >
                        <Card hoverable style={{ height: '100%' }}>
                            <Statistic
                                title="🎯 Automation Rate"
                                value={metrics.automationRate}
                                suffix="%"
                                valueStyle={{ color: '#722ed1' }}
                                prefix={<LuTarget style={{ color: '#722ed1' }} />}
                            />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Successfully resolved
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* Payback Period */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.55 }}
                    >
                        <Card hoverable style={{ height: '100%' }}>
                            <div>
                                <Text type="secondary" style={{ fontSize: '14px' }}>⚡ Payback Period</Text>
                                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#faad14', marginTop: '8px' }}>
                                    {formatPayback(metrics.paybackPeriod)}
                                </div>
                            </div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Time to break even
                            </Text>
                        </Card>
                    </motion.div>
                </Col>
            </Row>

            {/* Summary Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                style={{ marginTop: '24px' }}
            >
                <Card
                    title={
                        <span>
                            <LuTrendingUp style={{ marginRight: '8px' }} />
                            Executive Summary
                        </span>
                    }
                    style={{ backgroundColor: token.colorBgContainer }}
                >
                    <Paragraph>
                        Over the last <strong>{roiData.dateRange.days} days</strong>, your AI chat system has:
                    </Paragraph>
                    <ul style={{ fontSize: '16px', lineHeight: '2' }}>
                        <li>
                            Saved <strong>${metrics.totalCostSaved.toLocaleString()}</strong> in support costs
                        </li>
                        <li>
                            Freed up <strong>{metrics.totalHoursSaved} hours</strong> of staff time
                        </li>
                        <li>
                            Handled <strong>{metrics.conversationsHandled} conversations</strong> automatically
                        </li>
                        <li>
                            Protected an estimated <strong>${metrics.estimatedRevenueProtected.toLocaleString()}</strong> in revenue
                        </li>
                        <li>
                            Achieved a <strong>{metrics.roi}% ROI</strong> with a payback period of <strong>{formatPayback(metrics.paybackPeriod)}</strong>
                        </li>
                    </ul>
                    <Paragraph type="secondary" style={{ marginTop: '16px', fontSize: '12px' }}>
                        * Calculations based on average support agent hourly cost of ${roiData.params.avgSupportAgentHourlyCost}/hr,
                        customer lifetime value of ${roiData.params.avgCustomerLifetimeValue}, and platform cost of ${roiData.params.platformMonthlyCost}/month.
                    </Paragraph>
                </Card>
            </motion.div>

            {/* Share Modal */}
            <Modal
                title="Share ROI Report"
                open={shareModalVisible}
                onCancel={() => setShareModalVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setShareModalVisible(false)}>
                        Cancel
                    </Button>,
                    <Button key="copy" type="primary" onClick={handleCopyShareLink}>
                        Copy to Clipboard
                    </Button>,
                ]}
            >
                <Paragraph>
                    Share this ROI report with your team or include it in presentations:
                </Paragraph>
                <pre style={{
                    background: token.colorBgLayout,
                    padding: '16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'pre-wrap',
                    color: token.colorText
                }}>
                    {`📊 ROI Report (${roiData.dateRange.days} days)

💰 Net Savings: $${metrics.netSavings.toLocaleString()}
📈 ROI: ${metrics.roi}%
⏰ Time Saved: ${metrics.totalHoursSaved} hours
🤖 Conversations: ${metrics.conversationsHandled}

Generated by MenuListAI Chat Analytics`}
                </pre>
            </Modal>
        </div>
    );
}
