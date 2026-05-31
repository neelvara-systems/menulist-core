'use client'

/**
 * Answerlattice — Entity Health Score
 * 
 * Composite score per entity: signal rate + drift status + answer coverage.
 * Quick view of ontology health. All derived from existing data (zero new reads).
 * 
 * Health Score Formula:
 * - Answer Coverage: 40% weight (entity has active canonical answers)
 * - Drift Status: 30% weight (no drifted answers for this entity)
 * - Signal Health: 20% weight (low negative feedback ratio)
 * - Search Indexed: 10% weight (entity is in search index)
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_GOVERNANCE_UI
 * 
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { useCanonicalAnswers } from '@hook/answerlattice/useCanonicalAnswers';
import { useEntities } from '@hook/answerlattice/useEntities';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { AnswerlatticeCanonicalAnswer, AnswerlatticeEntity } from '@type/answerlattice';
import {
    Card,
    Empty,
    Flex,
    Progress,
    Space,
    Statistic,
    Table,
    Tag,
    Tooltip,
    Typography,
    theme,
} from 'antd';
import { useMemo } from 'react';
import {
    LuActivity,
    LuAlertTriangle,
    LuHeart,
    LuShieldCheck,
    LuShieldAlert,
} from 'react-icons/lu';

const { Text, Title } = Typography;

interface EntityHealthRow {
    id: string;
    name: string;
    type: string;
    status: string;
    answerCount: number;
    activeAnswerCount: number;
    driftedAnswerCount: number;
    totalSignals: number;
    negativeSignals: number;
    isIndexed: boolean;
    healthScore: number;       // 0-100
    coverageScore: number;     // 0-100
    driftScore: number;        // 0-100
    signalScore: number;       // 0-100
    indexScore: number;        // 0-100
}

function computeEntityHealth(
    entity: AnswerlatticeEntity,
    answers: AnswerlatticeCanonicalAnswer[],
    isIndexed: boolean
): EntityHealthRow {
    // Filter answers bound to this entity
    const boundAnswers = answers.filter(a => a.scope.entityIds.includes(entity.id));
    const activeAnswers = boundAnswers.filter(a => a.status === 'active');
    const driftedAnswers = activeAnswers.filter(a => a.governance?.driftFlag);

    // Signal aggregation across bound answers
    let totalSignals = 0;
    let negativeSignals = 0;
    activeAnswers.forEach(a => {
        totalSignals += (a.signalMetrics?.linkedTicketCount || 0) + (a.signalMetrics?.linkedChatCount || 0);
        negativeSignals += a.signalMetrics?.negativeFeedbackCount || 0;
    });

    // Score calculations
    // Coverage: 100 if has active answers, 0 if not
    const coverageScore = activeAnswers.length > 0 ? 100 : 0;

    // Drift: 100 if no drifted, scale down with more drifted
    const driftScore = activeAnswers.length === 0
        ? 100
        : Math.round(((activeAnswers.length - driftedAnswers.length) / activeAnswers.length) * 100);

    // Signal: 100 if no negatives or no signals, lower with more negative ratio
    const signalScore = totalSignals === 0
        ? 100
        : Math.max(0, Math.round((1 - (negativeSignals / totalSignals)) * 100));

    // Index: 100 if indexed, 0 if not
    const indexScore = isIndexed ? 100 : 0;

    // Weighted composite
    const healthScore = Math.round(
        coverageScore * 0.4 +
        driftScore * 0.3 +
        signalScore * 0.2 +
        indexScore * 0.1
    );

    return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        status: entity.status,
        answerCount: boundAnswers.length,
        activeAnswerCount: activeAnswers.length,
        driftedAnswerCount: driftedAnswers.length,
        totalSignals,
        negativeSignals,
        isIndexed,
        healthScore,
        coverageScore,
        driftScore,
        signalScore,
        indexScore,
    };
}

function getHealthColor(score: number, token: ReturnType<typeof theme.useToken>['token']): string {
    if (score >= 80) return token.colorSuccess;
    if (score >= 60) return token.colorPrimary;
    if (score >= 40) return token.colorWarning;
    return token.colorError;
}

function getHealthLabel(score: number): string {
    if (score >= 80) return 'Healthy';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Attention';
    return 'Critical';
}

export default function EntityHealthScore() {
    const session = useClientAuthSession();
    const { token } = theme.useToken();
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    const { answers, loading: answersLoading } = useCanonicalAnswers(tId, sId);
    const { entities, searchIndex, loading: entitiesLoading } = useEntities(tId, sId);

    const loading = answersLoading || entitiesLoading;

    // Build indexed set
    const indexedEntityIds = useMemo(() => {
        const set = new Set<string>();
        (searchIndex || []).forEach(s => set.add(s.entityId));
        return set;
    }, [searchIndex]);

    // Compute health for all active entities
    const healthData = useMemo((): EntityHealthRow[] => {
        return (entities || [])
            .filter(e => e.status !== 'deprecated')
            .map(e => computeEntityHealth(e, answers || [], indexedEntityIds.has(e.id)))
            .sort((a, b) => a.healthScore - b.healthScore); // Worst first
    }, [entities, answers, indexedEntityIds]);

    // Aggregated stats
    const aggregated = useMemo(() => {
        if (healthData.length === 0) return { avg: 0, healthy: 0, attention: 0, critical: 0 };
        const avg = Math.round(healthData.reduce((s, h) => s + h.healthScore, 0) / healthData.length);
        const healthy = healthData.filter(h => h.healthScore >= 80).length;
        const attention = healthData.filter(h => h.healthScore >= 40 && h.healthScore < 80).length;
        const critical = healthData.filter(h => h.healthScore < 40).length;
        return { avg, healthy, attention, critical };
    }, [healthData]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI) return null;

    const columns = [
        {
            title: 'Entity',
            dataIndex: 'name',
            key: 'name',
            render: (name: string, record: EntityHealthRow) => (
                <Space>
                    <Text strong>{name}</Text>
                    <Tag color={record.type === 'feature' ? 'blue' : record.type === 'plan' ? 'green' : 'default'}>
                        {record.type}
                    </Tag>
                </Space>
            ),
        },
        {
            title: 'Health',
            dataIndex: 'healthScore',
            key: 'healthScore',
            width: 120,
            sorter: (a: EntityHealthRow, b: EntityHealthRow) => a.healthScore - b.healthScore,
            defaultSortOrder: 'ascend' as const,
            render: (score: number) => (
                <Tooltip title={`${getHealthLabel(score)} (${score}%)`}>
                    <Progress
                        percent={score}
                        size="small"
                        strokeColor={getHealthColor(score, token)}
                        style={{ width: 80 }}
                        format={pct => `${pct}%`}
                    />
                </Tooltip>
            ),
        },
        {
            title: 'Coverage',
            key: 'coverage',
            width: 90,
            render: (_: any, record: EntityHealthRow) => (
                <Tooltip title={`${record.activeAnswerCount} active answer(s)`}>
                    {record.coverageScore === 100 ? (
                        <Tag color="green">{record.activeAnswerCount}</Tag>
                    ) : (
                        <Tag color="red">None</Tag>
                    )}
                </Tooltip>
            ),
        },
        {
            title: 'Drift',
            key: 'drift',
            width: 80,
            render: (_: any, record: EntityHealthRow) => (
                record.driftedAnswerCount > 0 ? (
                    <Tooltip title={`${record.driftedAnswerCount} drifted answer(s)`}>
                        <Tag color="warning" icon={<LuAlertTriangle style={{ verticalAlign: 'middle', marginRight: 2 }} />}>
                            {record.driftedAnswerCount}
                        </Tag>
                    </Tooltip>
                ) : (
                    <Tag color="green" icon={<LuShieldCheck style={{ verticalAlign: 'middle', marginRight: 2 }} />}>
                        Clean
                    </Tag>
                )
            ),
        },
        {
            title: 'Signals',
            key: 'signals',
            width: 90,
            render: (_: any, record: EntityHealthRow) => (
                <Space>
                    <Text>{record.totalSignals}</Text>
                    {record.negativeSignals > 0 && (
                        <Text type="danger" style={{ fontSize: 12 }}>({record.negativeSignals} neg)</Text>
                    )}
                </Space>
            ),
        },
        {
            title: 'Indexed',
            key: 'indexed',
            width: 70,
            render: (_: any, record: EntityHealthRow) => (
                record.isIndexed
                    ? <Tag color="green">Yes</Tag>
                    : <Tag color="default">No</Tag>
            ),
        },
    ];

    return (
        <Flex vertical gap={16}>
            {/* Aggregate Health */}
            <Flex gap={16} wrap="wrap">
                <Card size="small" style={{ minWidth: 150 }}>
                    <Statistic
                        title="Avg Health"
                        value={aggregated.avg}
                        suffix="%"
                        prefix={<LuHeart />}
                        valueStyle={{ fontSize: 22, color: getHealthColor(aggregated.avg, token) }}
                    />
                </Card>
                <Card size="small" style={{ minWidth: 130 }}>
                    <Statistic
                        title="Healthy"
                        value={aggregated.healthy}
                        prefix={<LuShieldCheck />}
                        valueStyle={{ fontSize: 22, color: token.colorSuccess }}
                    />
                </Card>
                <Card size="small" style={{ minWidth: 130 }}>
                    <Statistic
                        title="Attention"
                        value={aggregated.attention}
                        prefix={<LuShieldAlert />}
                        valueStyle={{ fontSize: 22, color: aggregated.attention > 0 ? token.colorWarning : token.colorSuccess }}
                    />
                </Card>
                <Card size="small" style={{ minWidth: 130 }}>
                    <Statistic
                        title="Critical"
                        value={aggregated.critical}
                        prefix={<LuActivity />}
                        valueStyle={{ fontSize: 22, color: aggregated.critical > 0 ? token.colorError : token.colorSuccess }}
                    />
                </Card>
            </Flex>

            {/* Health Table */}
            <Card title={<Space><LuHeart /> Entity Health Scores</Space>}>
                <Table
                    dataSource={healthData}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 20, showSizeChanger: false }}
                    size="small"
                    scroll={{ x: 'max-content' }}
                    locale={{ emptyText: <Empty description="No entities to score" /> }}
                />
            </Card>
        </Flex>
    );
}
