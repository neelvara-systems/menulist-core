'use client'

/**
 * Answerlattice — Founder Trust Dashboard
 * 
 * Displays trust metrics + top failing entities + escalation breakdown.
 * Reads from platformSummary/trustMetrics_{tId}_{sId} (1 Firestore read).
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_TRUST_METRICS
 * 
 * @see __docs__/answerlattice/founder-trust-layer/
 */

import { FEATURE_FLAGS } from '@config/features';
import ContextualStateIllustration from '@atoms/contextualStateIllustration';
import { getTrustMetrics } from '@database/answerlattice/trustMetrics';
import { loadRecentAnswerlatticeAnswerTraces } from '@lib/answerlattice/answerTraceClient';
import type { AnswerlatticeAnswerTrace } from '@lib/answerlattice/answerTraceContracts';
import { AnswerlatticeTrustMetrics } from '@type/answerlattice';
import { Alert, Button, Card, Empty, Flex, Space, Spin, Statistic, Table, Tag, Tooltip, Typography, theme } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    LuActivity,
    LuArrowDown,
    LuArrowRight,
    LuArrowUp,
    LuBarChart3,
    LuListChecks,
    LuRefreshCw,
    LuRouter,
    LuShieldAlert,
    LuShieldCheck,
    LuTarget,
} from 'react-icons/lu';
import AnswerTraceDrawer from './AnswerTraceDrawer';

const { Text, Title } = Typography;

interface FounderTrustDashboardProps {
    tId: number;
    sId: number;
}

// ═══════════════════════════════════════════════════════════════
// COLOR + TREND HELPERS
// ═══════════════════════════════════════════════════════════════

function getMetricColor(metric: string, value: number, token: ReturnType<typeof theme.useToken>['token']): string {
    if (metric === 'drift') {
        if (value <= 5) return token.colorSuccess;
        if (value <= 15) return token.colorWarning;
        return token.colorError;
    }
    if (value >= 80) return token.colorSuccess;
    if (value >= 60) return token.colorWarning;
    return token.colorError;
}

function getTrend(current: number, previous: number, token: ReturnType<typeof theme.useToken>['token'], inverted?: boolean): { icon: React.ReactNode; color: string; label: string } {
    const delta = current - previous;
    if (Math.abs(delta) < 2) return { icon: <LuArrowRight />, color: token.colorTextSecondary, label: 'Stable' };
    if (inverted) {
        return delta > 0
            ? { icon: <LuArrowUp />, color: token.colorError, label: `+${delta}%` }
            : { icon: <LuArrowDown />, color: token.colorSuccess, label: `${delta}%` };
    }
    return delta > 0
        ? { icon: <LuArrowUp />, color: token.colorSuccess, label: `+${delta}%` }
        : { icon: <LuArrowDown />, color: token.colorError, label: `${delta}%` };
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function FounderTrustDashboard({ tId, sId }: FounderTrustDashboardProps) {
    const { token } = theme.useToken();
    const [data, setData] = useState<AnswerlatticeTrustMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [answerTraces, setAnswerTraces] = useState<AnswerlatticeAnswerTrace[]>([]);
    const [answerTracesLoaded, setAnswerTracesLoaded] = useState(false);
    const [answerTracesLoading, setAnswerTracesLoading] = useState(false);
    const [answerTraceError, setAnswerTraceError] = useState<string | null>(null);
    const [answerTraceWindowLimited, setAnswerTraceWindowLimited] = useState(false);
    const [selectedAnswerTrace, setSelectedAnswerTrace] = useState<AnswerlatticeAnswerTrace | null>(null);
    const answerTraceRequestRef = useRef(0);
    const answerTraceInFlightRef = useRef(false);

    useEffect(() => {
        if (!tId || !sId) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                setLoadFailed(false);
                const result = await getTrustMetrics(tId, sId);
                setData(result);
            } catch {
                setLoadFailed(true);
            } finally {
                setLoading(false);
            }
        })();
    }, [tId, sId]);

    useEffect(() => {
        answerTraceRequestRef.current += 1;
        setAnswerTraces([]);
        setAnswerTracesLoaded(false);
        setAnswerTracesLoading(false);
        answerTraceInFlightRef.current = false;
        setAnswerTraceError(null);
        setAnswerTraceWindowLimited(false);
        setSelectedAnswerTrace(null);
        return () => {
            answerTraceRequestRef.current += 1;
            answerTraceInFlightRef.current = false;
        };
    }, [tId, sId]);

    const loadAnswerTraces = async () => {
        if (answerTraceInFlightRef.current) return;
        const requestId = answerTraceRequestRef.current + 1;
        answerTraceRequestRef.current = requestId;
        answerTraceInFlightRef.current = true;
        setAnswerTracesLoading(true);
        setAnswerTraceError(null);
        try {
            const result = await loadRecentAnswerlatticeAnswerTraces();
            if (answerTraceRequestRef.current !== requestId) return;
            setAnswerTraces(result.traces);
            setAnswerTraceWindowLimited(result.windowLimited);
            setAnswerTracesLoaded(true);
        } catch {
            if (answerTraceRequestRef.current !== requestId) return;
            setAnswerTraceError('Could not load the recent answer-trace window.');
        } finally {
            if (answerTraceRequestRef.current === requestId) {
                answerTraceInFlightRef.current = false;
                setAnswerTracesLoading(false);
            }
        }
    };

    const escalationTotal = useMemo(() => {
        if (!data?.escalationBreakdown) return 0;
        return data.escalationBreakdown.total || 0;
    }, [data]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_TRUST_METRICS) return null;

    if (loading) {
        return (
            <Flex justify="center" align="center" style={{ padding: 48 }}>
                <Spin size="large" />
            </Flex>
        );
    }

    if (!data) {
        return (
            <Empty
                description={loadFailed
                    ? 'Could not load answer evidence metrics.'
                    : 'No complete answer-evidence window yet. Metrics will appear after the next nightly run.'}
                image={loadFailed ? (
                    <ContextualStateIllustration
                        color={token.colorTextQuaternary}
                        size={112}
                        variant="warningContext"
                    />
                ) : (
                    <ContextualStateIllustration
                        color={token.colorPrimary}
                        size={128}
                        treatment="softHalo"
                        variant="analyticsContext"
                    />
                )}
                imageStyle={{ height: loadFailed ? 112 : 128 }}
                style={{ padding: 48 }}
            />
        );
    }

    const hasCoverageQuestions = data.coverage.total > 0;
    const hasNonEscalationQuestions = data.nonEscalation.total > 0;
    const hasActiveAnswers = data.drift.activeCount > 0;
    const hasActiveEntities = data.entityAnswerCoverage.totalEntities > 0;
    const coverageTrend = hasCoverageQuestions
        ? getTrend(data.coverage.rate, data.coverage.previousRate, token)
        : null;
    const resolutionTrend = hasNonEscalationQuestions
        ? getTrend(data.nonEscalation.rate, data.nonEscalation.previousRate, token)
        : null;
    const hasConfirmedResolution = Boolean(data.confirmedResolution && data.confirmedResolution.explicitOutcomeTotal > 0);
    const confirmedResolutionTrend = hasConfirmedResolution && data.confirmedResolution
        ? getTrend(data.confirmedResolution.rate, data.confirmedResolution.previousRate, token)
        : null;
    const driftTrend = hasActiveAnswers
        ? getTrend(data.drift.rate, data.drift.previousRate, token, true)
        : null;
    const entityCoverageTrend = hasActiveEntities
        ? getTrend(
            data.entityAnswerCoverage.rate,
            data.entityAnswerCoverage.previousRate,
            token,
        )
        : null;
    const lastUpdatedDate = data.lastUpdated?.toDate?.();
    const stale = Boolean(lastUpdatedDate && Date.now() - lastUpdatedDate.getTime() > 36 * 60 * 60 * 1000);

    const failingColumns = [
        {
            title: 'Entity',
            dataIndex: 'entityName',
            key: 'entityName',
            render: (name: string, record: any) => (
                <Space>
                    <Text strong>{name}</Text>
                    <Tag color={record.entityType === 'feature' ? 'blue' : record.entityType === 'workflow' ? 'purple' : 'default'}>
                        {record.entityType}
                    </Tag>
                </Space>
            ),
        },
        {
            title: 'Evidence',
            dataIndex: 'evidenceCount',
            key: 'evidenceCount',
            width: 90,
            render: (count: number) => <Text>{count}</Text>,
        },
        {
            title: 'Canonical fallbacks',
            dataIndex: 'canonicalMissCount',
            key: 'canonicalMissCount',
            width: 130,
            render: (count: number) => <Text>{count}</Text>,
        },
        {
            title: <Tooltip title="Evidence count weighted by escalation and canonical-fallback rates. It is not an accuracy score.">Weighted load</Tooltip>,
            dataIndex: 'weightedLoad',
            key: 'weightedLoad',
            width: 110,
            render: (value: number) => <Text>{Math.round(value)}</Text>,
        },
        {
            title: 'Escalations',
            dataIndex: 'escalationCount',
            key: 'escalationCount',
            width: 90,
            render: (count: number) => (
                count > 0 ? <Text type="danger">{count}</Text> : <Text type="secondary">0</Text>
            ),
        },
    ];

    const escalationItems = data.escalationBreakdown && escalationTotal > 0 ? [
        { label: 'Knowledge Gap', count: data.escalationBreakdown.knowledgeGap, color: token.colorError },
        { label: 'Low Confidence', count: data.escalationBreakdown.lowConfidence, color: token.colorWarning },
        { label: 'Retrieval Failure', count: data.escalationBreakdown.retrievalFailure, color: token.colorError },
    ].filter(item => item.count > 0) : [];

    return (
        <Flex vertical gap={20}>
            {/* Header */}
            <Flex justify="space-between" align="center">
                <Space>
                    <LuShieldCheck size={20} />
                    <Title level={5} style={{ margin: 0 }}>Answer Evidence</Title>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Complete rolling 24-hour window · updated {data.date}{stale ? ' · stale' : ''}
                </Text>
            </Flex>

            {/* Metric cards */}
            <Flex gap={16} wrap="wrap">
                {/* Coverage */}
                <Card size="small" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <Statistic
                        title={<Space><LuTarget size={14} /> Canonical coverage</Space>}
                        value={hasCoverageQuestions ? data.coverage.rate : 'Not available'}
                        suffix={hasCoverageQuestions ? '%' : undefined}
                        valueStyle={{
                            fontSize: hasCoverageQuestions ? 28 : 18,
                            color: hasCoverageQuestions
                                ? getMetricColor('standard', data.coverage.rate, token)
                                : token.colorTextSecondary,
                        }}
                    />
                    <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        {coverageTrend ? (
                            <span style={{ color: coverageTrend.color, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                                {coverageTrend.icon} {coverageTrend.label}
                            </span>
                        ) : null}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {hasCoverageQuestions
                                ? `${data.coverage.hits} approved serves / ${data.coverage.total} questions`
                                : 'No questions in this window'}
                        </Text>
                    </Flex>
                </Card>

                {/* Confirmed resolution */}
                <Card size="small" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <Tooltip title="Based only on end users explicitly selecting Solved in the widget">
                        <Statistic
                            title={<Space><LuShieldCheck size={14} /> Confirmed resolved</Space>}
                            value={hasConfirmedResolution && data.confirmedResolution ? data.confirmedResolution.rate : 'Not available'}
                            suffix={hasConfirmedResolution ? '%' : undefined}
                            valueStyle={{
                                fontSize: hasConfirmedResolution ? 28 : 18,
                                color: hasConfirmedResolution && data.confirmedResolution
                                    ? getMetricColor('standard', data.confirmedResolution.rate, token)
                                    : token.colorTextSecondary,
                            }}
                        />
                    </Tooltip>
                    <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        {confirmedResolutionTrend ? (
                            <span style={{ color: confirmedResolutionTrend.color, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                                {confirmedResolutionTrend.icon} {confirmedResolutionTrend.label}
                            </span>
                        ) : null}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {hasConfirmedResolution && data.confirmedResolution
                                ? `${data.confirmedResolution.confirmedResolved} solved / ${data.confirmedResolution.explicitOutcomeTotal} outcomes - ${data.confirmedResolution.recontactedSameSession} recontacts`
                                : 'Waiting for explicit widget outcomes'}
                        </Text>
                    </Flex>
                </Card>

                {/* Non-escalation */}
                <Card size="small" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <Statistic
                        title={<Space><LuBarChart3 size={14} /> No escalation</Space>}
                        value={hasNonEscalationQuestions ? data.nonEscalation.rate : 'Not available'}
                        suffix={hasNonEscalationQuestions ? '%' : undefined}
                        valueStyle={{
                            fontSize: hasNonEscalationQuestions ? 28 : 18,
                            color: hasNonEscalationQuestions
                                ? getMetricColor('standard', data.nonEscalation.rate, token)
                                : token.colorTextSecondary,
                        }}
                    />
                    <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        {resolutionTrend ? (
                            <span style={{ color: resolutionTrend.color, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                                {resolutionTrend.icon} {resolutionTrend.label}
                            </span>
                        ) : null}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {hasNonEscalationQuestions
                                ? `${data.nonEscalation.withoutEscalation} without escalation / ${data.nonEscalation.total} questions`
                                : 'No questions in this window'}
                        </Text>
                    </Flex>
                </Card>

                {/* Drift */}
                <Card size="small" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <Tooltip title="Lower is better — shows % of answers that may be outdated">
                        <Statistic
                            title={<Space><LuShieldAlert size={14} /> Drift</Space>}
                            value={hasActiveAnswers ? data.drift.rate : 'Not available'}
                            suffix={hasActiveAnswers ? '%' : undefined}
                            valueStyle={{
                                fontSize: hasActiveAnswers ? 28 : 18,
                                color: hasActiveAnswers
                                    ? getMetricColor('drift', data.drift.rate, token)
                                    : token.colorTextSecondary,
                            }}
                        />
                    </Tooltip>
                    <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        {driftTrend ? (
                            <span style={{ color: driftTrend.color, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                                {driftTrend.icon} {driftTrend.label}
                            </span>
                        ) : null}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {hasActiveAnswers
                                ? `${data.drift.driftedCount} drifted / ${data.drift.activeCount} active`
                                : 'No active canonical answers'}
                        </Text>
                    </Flex>
                </Card>

                {/* Entity answer coverage */}
                <Card size="small" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <Statistic
                        title={<Space><LuListChecks size={14} /> Entity answer coverage</Space>}
                        value={hasActiveEntities ? data.entityAnswerCoverage.rate : 'Not available'}
                        suffix={hasActiveEntities ? '%' : undefined}
                        valueStyle={{
                            fontSize: hasActiveEntities ? 28 : 18,
                            color: hasActiveEntities
                                ? getMetricColor('standard', data.entityAnswerCoverage.rate, token)
                                : token.colorTextSecondary,
                        }}
                    />
                    <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        {entityCoverageTrend ? (
                            <span style={{ color: entityCoverageTrend.color, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                                {entityCoverageTrend.icon} {entityCoverageTrend.label}
                            </span>
                        ) : null}
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {hasActiveEntities
                                ? `${data.entityAnswerCoverage.coveredCount} covered / ${data.entityAnswerCoverage.totalEntities} active entities`
                                : 'No active product entities'}
                        </Text>
                    </Flex>
                </Card>
            </Flex>

            {data.entityAnswerCoverage.totalEntities > 0 && (
                <Flex gap={12}>
                    <Tag color="success">{data.entityAnswerCoverage.coveredCount} Covered</Tag>
                    {data.entityAnswerCoverage.driftedCoveredCount > 0 && (
                        <Tag color="warning">{data.entityAnswerCoverage.driftedCoveredCount} Covered but drifted</Tag>
                    )}
                    {data.entityAnswerCoverage.uncoveredCount > 0 && (
                        <Tag color="error">{data.entityAnswerCoverage.uncoveredCount} Uncovered</Tag>
                    )}
                </Flex>
            )}

            {/* Top Failing Entities */}
            {data.topFailingEntities && data.topFailingEntities.length > 0 && (
                <Card
                    title={<Space><LuActivity size={16} /> Top Review Areas</Space>}
                    size="small"
                >
                    <Table
                        dataSource={data.topFailingEntities}
                        columns={failingColumns}
                        rowKey="entityId"
                        pagination={false}
                        size="small"
                        scroll={{ x: 'max-content' }}
                    />
                </Card>
            )}

            {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_ANSWER_TRACE ? (
                <Card
                    title={<Space><LuRouter size={16} /> Recent Answer Traces</Space>}
                    extra={(
                        <Button
                            icon={answerTracesLoaded ? <LuRefreshCw /> : <LuRouter />}
                            loading={answerTracesLoading}
                            onClick={loadAnswerTraces}
                            style={{ minHeight: 44 }}
                        >
                            {answerTracesLoaded ? 'Refresh traces' : 'Load review traces'}
                        </Button>
                    )}
                    size="small"
                >
                    <Flex vertical gap={12}>
                        <Text type="secondary">
                            Loaded only when requested. The bounded window shows recent retained answers with fallback, feedback, escalation, drift, or confidence evidence.
                        </Text>
                        {answerTraceError ? <Alert message={answerTraceError} showIcon type="error" /> : null}
                        {answerTracesLoaded && answerTraces.length === 0 ? (
                            <Empty
                                description="No review trace was found in the recent retained window."
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        ) : null}
                        {answerTraces.map(trace => (
                            <Flex
                                align="center"
                                gap={12}
                                justify="space-between"
                                key={trace.id}
                                style={{ borderBottom: `1px solid ${token.colorBorderSecondary}`, paddingBottom: 12 }}
                                wrap
                            >
                                <Flex vertical gap={5} style={{ minWidth: 0 }}>
                                    <Text ellipsis={{ tooltip: trace.question }} strong>
                                        {trace.question}
                                    </Text>
                                    <Flex gap={6} wrap>
                                        <Tag color={trace.canonical ? 'success' : 'warning'}>
                                            {trace.canonical ? 'Approved answer' : trace.answerSource}
                                        </Tag>
                                        {trace.reviewSignals.slice(0, 3).map(signal => (
                                            <Tag key={signal}>{signal.replace(/_/g, ' ')}</Tag>
                                        ))}
                                    </Flex>
                                </Flex>
                                <Button
                                    icon={<LuRouter />}
                                    onClick={() => setSelectedAnswerTrace(trace)}
                                    style={{ minHeight: 44 }}
                                >
                                    Inspect trace
                                </Button>
                            </Flex>
                        ))}
                        {answerTracesLoaded && answerTraceWindowLimited ? (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                This is a capped recent window, not a complete historical search.
                            </Text>
                        ) : null}
                    </Flex>
                </Card>
            ) : null}

            {/* Escalation Breakdown */}
            {escalationItems.length > 0 && (
                <Card
                    title={<Space><LuShieldAlert size={16} /> Escalation Breakdown</Space>}
                    size="small"
                >
                    <Flex gap={16} wrap="wrap">
                        {escalationItems.map(item => (
                            <Flex key={item.label} align="center" gap={8}>
                                <div style={{
                                    width: 10, height: 10, borderRadius: '50%',
                                    backgroundColor: item.color,
                                }} />
                                <Text style={{ fontSize: 13 }}>
                                    {item.label}: <Text strong>{item.count}</Text>
                                    <Text type="secondary"> ({escalationTotal > 0 ? Math.round((item.count / escalationTotal) * 100) : 0}%)</Text>
                                </Text>
                            </Flex>
                        ))}
                    </Flex>
                    {data.escalationBreakdown.userRequested > 0 && (
                        <Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
                            Explicit human-help requests: {data.escalationBreakdown.userRequested}. This is a separate signal count, not part of the query escalation denominator.
                        </Text>
                    )}
                </Card>
            )}
            <AnswerTraceDrawer
                onClose={() => setSelectedAnswerTrace(null)}
                open={Boolean(selectedAnswerTrace)}
                trace={selectedAnswerTrace}
            />
        </Flex>
    );
}
