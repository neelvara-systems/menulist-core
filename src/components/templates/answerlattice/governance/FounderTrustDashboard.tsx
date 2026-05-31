'use client'

/**
 * Answerlattice — Founder Trust Dashboard
 * 
 * Displays 4 trust metrics + top failing entities + escalation breakdown.
 * Reads from platformSummary/trustMetrics_{tId}_{sId} (1 Firestore read).
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_TRUST_METRICS
 * 
 * @see __docs__/answerlattice/founder-trust-layer/
 */

import { FEATURE_FLAGS } from '@config/features';
import { getTrustMetrics } from '@database/answerlattice/trustMetrics';
import { AnswerlatticeTrustMetrics } from '@type/answerlattice';
import { Card, Empty, Flex, Progress, Space, Spin, Statistic, Table, Tag, Tooltip, Typography, theme } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import {
    LuActivity,
    LuArrowDown,
    LuArrowRight,
    LuArrowUp,
    LuBarChart3,
    LuHeart,
    LuShieldAlert,
    LuShieldCheck,
    LuTarget,
} from 'react-icons/lu';

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

function getHealthLabel(score: number): string {
    if (score >= 80) return 'Healthy';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Attention';
    return 'Critical';
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function FounderTrustDashboard({ tId, sId }: FounderTrustDashboardProps) {
    const { token } = theme.useToken();
    const [data, setData] = useState<AnswerlatticeTrustMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tId || !sId) {
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const result = await getTrustMetrics(tId, sId);
                setData(result);
            } catch {
                // Silent fail — dashboard is informational only
            } finally {
                setLoading(false);
            }
        })();
    }, [tId, sId]);

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
                description="No trust data yet. Metrics will appear after the next nightly run."
                style={{ padding: 48 }}
            />
        );
    }

    const coverageTrend = getTrend(data.coverage.rate, data.coverage.previousRate, token);
    const resolutionTrend = getTrend(data.resolution.rate, data.resolution.previousRate, token);
    const driftTrend = getTrend(data.drift.rate, data.drift.previousRate, token, true);
    const healthTrend = getTrend(data.entityHealth.avgScore, data.entityHealth.previousAvgScore, token);

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
            title: 'Reliability',
            dataIndex: 'reliabilityScore',
            key: 'reliabilityScore',
            width: 120,
            render: (score: number) => (
                <Progress
                    percent={score}
                    size="small"
                    strokeColor={getMetricColor('standard', score, token)}
                    style={{ width: 80 }}
                    format={pct => `${pct}%`}
                />
            ),
        },
        {
            title: 'Queries',
            dataIndex: 'queryCount',
            key: 'queryCount',
            width: 80,
            render: (count: number) => <Text>{count}</Text>,
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
        { label: 'Entity Mismatch', count: data.escalationBreakdown.entityMismatch, color: token.colorInfo },
        { label: 'Retrieval Failure', count: data.escalationBreakdown.retrievalFailure, color: token.colorError },
        { label: 'User Requested', count: data.escalationBreakdown.userRequested, color: token.colorTextSecondary },
    ].filter(item => item.count > 0) : [];

    return (
        <Flex vertical gap={20}>
            {/* Header */}
            <Flex justify="space-between" align="center">
                <Space>
                    <LuShieldCheck size={20} />
                    <Title level={5} style={{ margin: 0 }}>System Trust</Title>
                </Space>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    Last updated: {data.date}
                </Text>
            </Flex>

            {/* 4 Metric Cards */}
            <Flex gap={16} wrap="wrap">
                {/* Coverage */}
                <Card size="small" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <Statistic
                        title={<Space><LuTarget size={14} /> Coverage</Space>}
                        value={data.coverage.rate}
                        suffix="%"
                        valueStyle={{ fontSize: 28, color: getMetricColor('standard', data.coverage.rate, token) }}
                    />
                    <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        <span style={{ color: coverageTrend.color, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                            {coverageTrend.icon} {coverageTrend.label}
                        </span>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {data.coverage.hits} hits / {data.coverage.total} total
                        </Text>
                    </Flex>
                </Card>

                {/* Resolution */}
                <Card size="small" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <Statistic
                        title={<Space><LuBarChart3 size={14} /> Resolution</Space>}
                        value={data.resolution.rate}
                        suffix="%"
                        valueStyle={{ fontSize: 28, color: getMetricColor('standard', data.resolution.rate, token) }}
                    />
                    <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        <span style={{ color: resolutionTrend.color, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                            {resolutionTrend.icon} {resolutionTrend.label}
                        </span>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {data.resolution.resolved} resolved / {data.resolution.total} total
                        </Text>
                    </Flex>
                </Card>

                {/* Drift */}
                <Card size="small" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <Tooltip title="Lower is better — shows % of answers that may be outdated">
                        <Statistic
                            title={<Space><LuShieldAlert size={14} /> Drift</Space>}
                            value={data.drift.rate}
                            suffix="%"
                            valueStyle={{ fontSize: 28, color: getMetricColor('drift', data.drift.rate, token) }}
                        />
                    </Tooltip>
                    <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        <span style={{ color: driftTrend.color, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                            {driftTrend.icon} {driftTrend.label}
                        </span>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {data.drift.driftedCount} drifted / {data.drift.activeCount} active
                        </Text>
                    </Flex>
                </Card>

                {/* Entity Health */}
                <Card size="small" style={{ flex: '1 1 200px', minWidth: 180 }}>
                    <Statistic
                        title={<Space><LuHeart size={14} /> Entity Health</Space>}
                        value={data.entityHealth.avgScore}
                        suffix={<Text type="secondary" style={{ fontSize: 14 }}>/ 100</Text>}
                        valueStyle={{ fontSize: 28, color: getMetricColor('standard', data.entityHealth.avgScore, token) }}
                    />
                    <Flex align="center" gap={4} style={{ marginTop: 4 }}>
                        <span style={{ color: healthTrend.color, display: 'flex', alignItems: 'center', gap: 2, fontSize: 12 }}>
                            {healthTrend.icon} {healthTrend.label}
                        </span>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                            {getHealthLabel(data.entityHealth.avgScore)} · {data.entityHealth.totalEntities} entities
                        </Text>
                    </Flex>
                </Card>
            </Flex>

            {/* Entity Health Summary */}
            {data.entityHealth.totalEntities > 0 && (
                <Flex gap={12}>
                    <Tag color="success">{data.entityHealth.healthyCount} Healthy</Tag>
                    {data.entityHealth.attentionCount > 0 && (
                        <Tag color="warning">{data.entityHealth.attentionCount} Attention</Tag>
                    )}
                    {data.entityHealth.criticalCount > 0 && (
                        <Tag color="error">{data.entityHealth.criticalCount} Critical</Tag>
                    )}
                </Flex>
            )}

            {/* Top Failing Entities */}
            {data.topFailingEntities && data.topFailingEntities.length > 0 && (
                <Card
                    title={<Space><LuActivity size={16} /> Top Failing Areas</Space>}
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
                </Card>
            )}
        </Flex>
    );
}
