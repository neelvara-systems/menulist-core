'use client';

/**
 * ROI Calculator Component
 * 
 * Displays an assumption-labelled planning estimate from observed chat analytics.
 * 
 * Completely standalone - no impact on existing chat management features
 */

import { useAppDispatch } from '@hook/useAppDispatch';
import {
    getAnswerlatticeChatWorkspaceScopeKey,
} from '@lib/answerlattice/chatAnalyticsContracts';
import {
    parseAnswerlatticeRoiMetricsApiResponse,
    type AnswerlatticeRoiData as ROIData,
    type AnswerlatticeRoiMetricsApiResponse as RoiMetricsApiResponse,
} from '@lib/answerlattice/roiMetricsContracts';
import { resolveAnswerlatticeSessionScope } from '@lib/answerlattice/sessionScope';
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
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LuChevronDown,
    LuChevronUp,
    LuDollarSign,
    LuDownload,
    LuHeart,
    LuRefreshCw,
    LuSettings,
    LuShare2,
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

const getRoiMetricsResponseLogContext = (response: Response) => ({
    ...getBoundedRuntimeStringContext('endpoint', '/api/analytics/roi-metrics'),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readRoiMetricsResponse = async (
    response: Response,
    expectedScope: { tId: number; sId: number },
): Promise<RoiMetricsApiResponse> => {
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

    const parsed = parseAnswerlatticeRoiMetricsApiResponse(payload, expectedScope);
    if (!parsed) {
        logRuntimeFailure(
            'platform_roi_metrics_response_invalid',
            undefined,
            getRoiMetricsResponseLogContext(response),
        );
        throw new Error(ROI_METRICS_FAILED_MESSAGE);
    }

    return parsed;
};

const copyRoiShareTextToClipboard = async (shareText: string) => {
    await copyAnswerlatticeSupportTextToClipboard(shareText, {
        unavailable: PLATFORM_ROI_SHARE_COPY_CLIPBOARD_UNAVAILABLE,
        fallbackFailed: PLATFORM_ROI_SHARE_COPY_FALLBACK_FAILED,
    });
};

export default function ROICalculator() {
    const { data: session } = useSession();
    const resolvedScope = resolveAnswerlatticeSessionScope(session);
    const workspaceScope = resolvedScope
        ? { tId: resolvedScope.tenantId, sId: resolvedScope.storeId }
        : null;
    const scopeKey = getAnswerlatticeChatWorkspaceScopeKey(workspaceScope);
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
    const [minutesSaved, setMinutesSaved] = useState(8);
    const [platformCost, setPlatformCost] = useState(99);
    const mountedRef = useRef(false);
    const scopeKeyRef = useRef(scopeKey);
    scopeKeyRef.current = scopeKey;
    const requestOwnerRef = useRef(0);
    const inFlightScopeRef = useRef<string | null>(null);
    const parameterRef = useRef({ dateRange, hourlyCost, minutesSaved, platformCost });
    parameterRef.current = { dateRange, hourlyCost, minutesSaved, platformCost };

    // Fetch ROI data
    const fetchROIData = useCallback(async () => {
        if (!workspaceScope || !scopeKey || inFlightScopeRef.current === scopeKey) return;
        const requestOwner = ++requestOwnerRef.current;
        const expectedScope = workspaceScope;
        const expectedScopeKey = scopeKey;
        const loaderId = `roi-calculator:${requestOwner}`;
        const requestedParameters = parameterRef.current;
        inFlightScopeRef.current = expectedScopeKey;
        try {
            dispatch(startLoader(loaderId));
            setRoiData(null);
            setLoading(true);

            const params = new URLSearchParams({
                days: requestedParameters.dateRange.toString(),
                hourlyCost: requestedParameters.hourlyCost.toString(),
                minutesSaved: requestedParameters.minutesSaved.toString(),
                platformCost: requestedParameters.platformCost.toString(),
            });

            const response = await fetch(`/api/analytics/roi-metrics?${params}`, ROI_METRICS_REQUEST_POLICY);

            const result = await readRoiMetricsResponse(response, expectedScope);
            if (
                !mountedRef.current
                || requestOwnerRef.current !== requestOwner
                || scopeKeyRef.current !== expectedScopeKey
            ) return;
            setRoiData(result.data);

        } catch (error) {
            if (
                mountedRef.current
                && requestOwnerRef.current === requestOwner
                && scopeKeyRef.current === expectedScopeKey
            ) {
                setRoiData(null);
                logRuntimeFailure('platform_roi_metrics_load_failed', error);
                message.error(ROI_METRICS_FAILED_MESSAGE);
            }
        } finally {
            dispatch(stopLoader(loaderId));
            if (
                requestOwnerRef.current === requestOwner
                && inFlightScopeRef.current === expectedScopeKey
            ) {
                inFlightScopeRef.current = null;
            }
            if (
                mountedRef.current
                && requestOwnerRef.current === requestOwner
                && scopeKeyRef.current === expectedScopeKey
            ) {
                setLoading(false);
            }
        }
    }, [dispatch, scopeKey, workspaceScope?.sId, workspaceScope?.tId]);

    // Initial load
    useEffect(() => {
        mountedRef.current = true;
        setRoiData(null);
        if (scopeKey) void fetchROIData();
        else setLoading(false);
        return () => {
            mountedRef.current = false;
            requestOwnerRef.current += 1;
        };
    }, [dateRange, fetchROIData, scopeKey]);

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
            model: 'Illustrative planning estimate',
            platform: 'Answerlattice Conversation Analytics',
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

💰 Estimated net savings: $${roiData.metrics.estimatedNetSavings.toLocaleString()}
📈 Estimated ROI: ${roiData.metrics.estimatedRoi}%
⏰ Estimated time saved: ${roiData.metrics.estimatedTotalHoursSaved} hours
💬 Conversations observed: ${roiData.metrics.conversationsObserved}

Illustrative scenario generated by Answerlattice Conversation Analytics`;

        try {
            await copyRoiShareTextToClipboard(shareText);
            message.success('Share text copied successfully');
            setShareModalVisible(false);
        } catch (error) {
            logRuntimeFailure('platform_roi_share_copy_failed', error, {
                days: roiData.dateRange.days,
                hasClipboardWrite: hasAnswerlatticeSupportClipboardWrite(),
                hasCopyFallback: hasAnswerlatticeSupportCopyFallback(),
                estimatedNetSavings: roiData.metrics.estimatedNetSavings,
                shareTextLength: shareText.length,
            });
            message.error('Failed to copy share text');
        }
    };

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
                            Illustrative value scenario from observed conversation analytics
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
                                    <Text strong>Assumed Minutes Saved/Conversation:</Text>
                                    <Input
                                        type="number"
                                        min={0}
                                        max={480}
                                        value={minutesSaved}
                                        onChange={(e) => setMinutesSaved(Number(e.target.value))}
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
                                title={<Text style={{ color: 'rgba(255,255,255,0.9)' }}>💰 Estimated Cost Saved</Text>}
                                value={metrics.estimatedTotalCostSaved}
                                prefix="$"
                                valueStyle={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}
                            />
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                                ${metrics.estimatedMonthlyCostSaved.toLocaleString()}/month estimate
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
                                title={<Text style={{ color: 'rgba(255,255,255,0.9)' }}>⏰ Estimated Time Saved</Text>}
                                value={metrics.estimatedTotalHoursSaved}
                                suffix="hrs"
                                valueStyle={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}
                            />
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                                {metrics.estimatedMonthlyHoursSaved} hrs/month estimate
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
                                value={metrics.conversationsObserved}
                                valueStyle={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}
                            />
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                                Observed in this date range
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
                                title={<Text style={{ color: 'rgba(255,255,255,0.9)' }}>📈 Estimated ROI</Text>}
                                value={metrics.estimatedRoi}
                                suffix="%"
                                valueStyle={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}
                            />
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                                Scenario, not measured attribution
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* Positive feedback */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                    >
                        <Card hoverable style={{ height: '100%' }}>
                            <Statistic
                                title="😊 Positive Feedback"
                                value={metrics.positiveFeedbackSignals}
                                valueStyle={{ color: '#52c41a' }}
                                prefix={<LuHeart style={{ color: '#52c41a' }} />}
                            />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Observed feedback signals
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* Conversation mode mix */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.45 }}
                    >
                        <Card hoverable style={{ height: '100%' }}>
                            <Statistic
                                title="Q&A Conversations"
                                value={metrics.qnaConversations}
                                valueStyle={{ color: '#1890ff' }}
                            />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Observed Q&A mode sessions
                            </Text>
                        </Card>
                    </motion.div>
                </Col>

                {/* Assistant conversations */}
                <Col xs={24} sm={12} lg={6}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.5 }}
                    >
                        <Card hoverable style={{ height: '100%' }}>
                            <Statistic
                                title="Assistant Conversations"
                                value={metrics.assistantConversations}
                                valueStyle={{ color: '#722ed1' }}
                            />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Observed assistant mode sessions
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
                                    {formatPayback(metrics.estimatedPaybackPeriod)}
                                </div>
                            </div>
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                Estimated time to break even
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
                            Scenario Summary
                        </span>
                    }
                    style={{ backgroundColor: token.colorBgContainer }}
                >
                    <Paragraph>
                        Over the last <strong>{roiData.dateRange.days} days</strong>, Answerlattice observed:
                    </Paragraph>
                    <ul style={{ fontSize: '16px', lineHeight: '2' }}>
                        <li>
                            <strong>{metrics.conversationsObserved} conversations</strong> in this workspace
                        </li>
                        <li>
                            <strong>{metrics.positiveFeedbackSignals} positive</strong> and <strong>{metrics.negativeFeedbackSignals} negative</strong> feedback signals
                        </li>
                        <li>
                            An estimated <strong>{metrics.estimatedTotalHoursSaved} hours</strong> saved under the selected time assumption
                        </li>
                        <li>
                            An estimated <strong>${metrics.estimatedTotalCostSaved.toLocaleString()}</strong> in support-time value
                        </li>
                        <li>
                            An estimated <strong>{metrics.estimatedRoi}% ROI</strong> with a payback period of <strong>{formatPayback(metrics.estimatedPaybackPeriod)}</strong>
                        </li>
                    </ul>
                    <Paragraph type="secondary" style={{ marginTop: '16px', fontSize: '12px' }}>
                        * Illustrative planning model based on ${roiData.params.avgSupportAgentHourlyCost}/hr,
                        {` ${roiData.params.assumedMinutesSavedPerConversation} assumed minutes saved per conversation, and `}
                        ${roiData.params.platformMonthlyCost}/month platform cost. It does not measure resolution,
                        deflection, retention, revenue protection, or headcount replacement.
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

💰 Estimated net savings: $${metrics.estimatedNetSavings.toLocaleString()}
📈 Estimated ROI: ${metrics.estimatedRoi}%
⏰ Estimated time saved: ${metrics.estimatedTotalHoursSaved} hours
💬 Conversations observed: ${metrics.conversationsObserved}

Illustrative scenario generated by Answerlattice Conversation Analytics`}
                </pre>
            </Modal>
        </div>
    );
}
