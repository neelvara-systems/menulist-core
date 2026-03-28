'use client'

/**
 * Canonica — Product Friction Intelligence: GovernanceHub Tab
 * 
 * Displays friction snapshot (nightly) + weekly AI insight.
 * Read-only: 2 Firestore reads per page load.
 * 
 * Design: No charts, no filters, no date pickers.
 * Just a prioritized list + trend arrows + health badge + AI summary.
 * 
 * Feature-flagged: ENABLE_CANONICA_FRICTION_INTELLIGENCE
 * @see __docs__/canonica/product-friction-intelligence/
 */

import { useFrictionInsights } from '@hook/canonica/useFrictionInsights';
import {
    CanonicaFrictionEmergingTopic,
    CanonicaFrictionEntitySummary,
    CanonicaFrictionHealth,
    CanonicaFrictionTrendDirection,
} from '@type/canonica';
import { Badge, Card, Empty, Skeleton, Space, Table, Tag, Typography } from 'antd';
import {
    LuAlertTriangle,
    LuArrowDown,
    LuArrowRight,
    LuArrowUp,
    LuRefreshCw,
    LuSparkles,
    LuTrendingUp,
} from 'react-icons/lu';

const { Text, Paragraph, Title } = Typography;

interface FrictionTabProps {
    tId: number;
    sId: number;
}

// ═══════════════════════════════════════════════════════════════
// HEALTH BADGE
// ═══════════════════════════════════════════════════════════════

function HealthBadge({ health }: { health: CanonicaFrictionHealth }) {
    const config: Record<CanonicaFrictionHealth, { color: string; status: 'success' | 'warning' | 'error' }> = {
        LOW: { color: '#52c41a', status: 'success' },
        MODERATE: { color: '#faad14', status: 'warning' },
        HIGH: { color: '#ff4d4f', status: 'error' },
    };

    const { status } = config[health] || config.LOW;

    return (
        <Badge
            status={status}
            text={<Text strong style={{ fontSize: 16 }}>Friction Level: {health}</Text>}
        />
    );
}

// ═══════════════════════════════════════════════════════════════
// TREND ARROW
// ═══════════════════════════════════════════════════════════════

function TrendArrow({ direction }: { direction: CanonicaFrictionTrendDirection }) {
    switch (direction) {
        case 'rising':
            return <Tag color="red" icon={<LuArrowUp />}>Rising</Tag>;
        case 'improving':
            return <Tag color="green" icon={<LuArrowDown />}>Improving</Tag>;
        case 'new':
            return <Tag color="blue" icon={<LuSparkles />}>New</Tag>;
        case 'stable':
        default:
            return <Tag icon={<LuArrowRight />}>Stable</Tag>;
    }
}

// ═══════════════════════════════════════════════════════════════
// ENTITY TYPE TAG
// ═══════════════════════════════════════════════════════════════

function EntityTypeTag({ type }: { type: string }) {
    const colorMap: Record<string, string> = {
        feature: 'blue',
        workflow: 'purple',
        integration: 'cyan',
        error: 'red',
        plan: 'gold',
        role: 'green',
        state: 'orange',
    };
    return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
}

// ═══════════════════════════════════════════════════════════════
// TOP FRICTION TABLE
// ═══════════════════════════════════════════════════════════════

function TopFrictionTable({ entities }: { entities: CanonicaFrictionEntitySummary[] }) {
    const columns = [
        {
            title: 'Entity',
            dataIndex: 'entityName',
            key: 'entityName',
            render: (name: string, record: CanonicaFrictionEntitySummary) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    <EntityTypeTag type={record.entityType} />
                </Space>
            ),
        },
        {
            title: 'Signals (7d)',
            key: 'signals',
            width: 110,
            render: (_: unknown, record: CanonicaFrictionEntitySummary) => (
                <Text>{record.last7d.queryCount}</Text>
            ),
            sorter: (a: CanonicaFrictionEntitySummary, b: CanonicaFrictionEntitySummary) =>
                a.last7d.queryCount - b.last7d.queryCount,
        },
        {
            title: 'Escalation',
            key: 'escalation',
            width: 100,
            render: (_: unknown, record: CanonicaFrictionEntitySummary) => {
                const rate = record.last7d.queryCount > 0
                    ? Math.round((record.last7d.escalationCount / record.last7d.queryCount) * 100)
                    : 0;
                return <Text type={rate > 25 ? 'danger' : undefined}>{rate}%</Text>;
            },
        },
        {
            title: 'Score',
            key: 'score',
            width: 80,
            render: (_: unknown, record: CanonicaFrictionEntitySummary) => (
                <Text strong>{Math.round(record.last7d.frictionScore)}</Text>
            ),
            sorter: (a: CanonicaFrictionEntitySummary, b: CanonicaFrictionEntitySummary) =>
                a.last7d.frictionScore - b.last7d.frictionScore,
        },
        {
            title: 'Trend',
            key: 'trend',
            width: 110,
            render: (_: unknown, record: CanonicaFrictionEntitySummary) => (
                <TrendArrow direction={record.trendDirection} />
            ),
        },
    ];

    return (
        <Table
            dataSource={entities}
            columns={columns}
            rowKey="entityId"
            pagination={false}
            size="small"
            locale={{ emptyText: 'No friction data yet. Signals will appear after the nightly run.' }}
        />
    );
}

// ═══════════════════════════════════════════════════════════════
// EMERGING TOPICS CARD
// ═══════════════════════════════════════════════════════════════

function EmergingTopicsCard({ topics }: { topics: CanonicaFrictionEmergingTopic[] }) {
    if (!topics || topics.length === 0) return null;

    return (
        <Card
            size="small"
            title={
                <Space>
                    <LuAlertTriangle style={{ color: '#faad14' }} />
                    <Text strong>Emerging Topics</Text>
                </Space>
            }
            style={{ marginTop: 16 }}
        >
            {topics.map((topic) => (
                <div key={topic.entityId} style={{ marginBottom: 8 }}>
                    <Space>
                        <Text strong>{topic.entityName}</Text>
                        <EntityTypeTag type={topic.entityType} />
                        <Text type="secondary">
                            {topic.queryCount} questions · {Math.round(topic.escalationRate * 100)}% escalation
                        </Text>
                    </Space>
                </div>
            ))}
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// WEEKLY SUMMARY CARD
// ═══════════════════════════════════════════════════════════════

function WeeklySummaryCard({ summary, weekStart, weekEnd }: { summary: string; weekStart: string; weekEnd: string }) {
    if (!summary) return null;

    return (
        <Card
            size="small"
            title={
                <Space>
                    <LuTrendingUp />
                    <Text strong>Weekly Friction Summary</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>({weekStart} — {weekEnd})</Text>
                </Space>
            }
            style={{ marginTop: 16 }}
        >
            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{summary}</Paragraph>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function FrictionTab({ tId, sId }: FrictionTabProps) {
    const { snapshot, insight, loading, error, refresh } = useFrictionInsights(tId, sId);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 6 }} />;
    }

    if (error) {
        return <Empty description={`Failed to load friction data: ${error}`} />;
    }

    if (!snapshot || (snapshot.topFrictionEntities?.length === 0 && snapshot.emergingTopics?.length === 0)) {
        return (
            <Empty description="No friction data available yet. Data will appear after signals are collected and the nightly aggregation runs." />
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Space size="large">
                    <HealthBadge health={snapshot.overallHealth} />
                    <Text type="secondary">
                        {snapshot.totalSignals7d} signals · {snapshot.totalEscalations7d} escalations (last 7 days)
                    </Text>
                </Space>
                <Text
                    type="secondary"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    onClick={refresh}
                >
                    <LuRefreshCw size={14} /> Refresh
                </Text>
            </div>

            <Title level={5} style={{ marginBottom: 12 }}>Top Friction Areas</Title>
            <TopFrictionTable entities={snapshot.topFrictionEntities || []} />

            <EmergingTopicsCard topics={snapshot.emergingTopics || []} />

            {insight?.summary && (
                <WeeklySummaryCard
                    summary={insight.summary}
                    weekStart={insight.weekStart}
                    weekEnd={insight.weekEnd}
                />
            )}

            {snapshot.lastUpdated && (
                <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
                    Last updated: {snapshot.lastUpdated?.toDate?.()
                        ? snapshot.lastUpdated.toDate().toLocaleString()
                        : 'Unknown'}
                </Text>
            )}
        </div>
    );
}
