'use client'

/**
 * Answerlattice — Product Friction Intelligence: GovernanceHub Tab
 * 
 * Displays friction snapshot (nightly) + weekly AI insight.
 * Read-only: 2 Firestore reads per page load.
 * 
 * Design: No charts, no filters, no date pickers.
 * Just a prioritized list + trend arrows + friction level + advisory summary.
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE
 * @see __docs__/answerlattice/product-friction-intelligence/
 */

import { useFrictionInsights } from '@hook/answerlattice/useFrictionInsights';
import {
    AnswerlatticeFrictionEmergingTopic,
    AnswerlatticeFrictionEntitySummary,
    AnswerlatticeFrictionLevel,
    AnswerlatticeFrictionTrendDirection,
} from '@type/answerlattice';
import { Badge, Button, Card, Empty, Skeleton, Space, Table, Tag, Tooltip, Typography, theme } from 'antd';
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
// FRICTION LEVEL BADGE
// ═══════════════════════════════════════════════════════════════

function FrictionLevelBadge({ level }: { level: AnswerlatticeFrictionLevel }) {
    const config: Record<AnswerlatticeFrictionLevel, { status: 'success' | 'warning' | 'error' }> = {
        LOW: { status: 'success' },
        MODERATE: { status: 'warning' },
        HIGH: { status: 'error' },
    };

    const { status } = config[level] || config.LOW;

    return (
        <Badge
            status={status}
            text={<Text strong style={{ fontSize: 16 }}>Friction Level: {level}</Text>}
        />
    );
}

// ═══════════════════════════════════════════════════════════════
// TREND ARROW
// ═══════════════════════════════════════════════════════════════

function TrendArrow({ direction }: { direction: AnswerlatticeFrictionTrendDirection }) {
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

function TopFrictionTable({ entities }: { entities: AnswerlatticeFrictionEntitySummary[] }) {
    const columns = [
        {
            title: 'Entity',
            dataIndex: 'entityName',
            key: 'entityName',
            render: (name: string, record: AnswerlatticeFrictionEntitySummary) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    <EntityTypeTag type={record.entityType} />
                </Space>
            ),
        },
        {
            title: 'Evidence (7d)',
            key: 'signals',
            width: 110,
            render: (_: unknown, record: AnswerlatticeFrictionEntitySummary) => (
                <Text>{record.last7d.queryCount}</Text>
            ),
            sorter: (a: AnswerlatticeFrictionEntitySummary, b: AnswerlatticeFrictionEntitySummary) =>
                a.last7d.queryCount - b.last7d.queryCount,
        },
        {
            title: 'Escalation',
            key: 'escalation',
            width: 100,
            render: (_: unknown, record: AnswerlatticeFrictionEntitySummary) => {
                const rate = record.last7d.queryCount > 0
                    ? Math.round((record.last7d.escalationCount / record.last7d.queryCount) * 100)
                    : 0;
                return <Text type={rate > 25 ? 'danger' : undefined}>{rate}%</Text>;
            },
        },
        {
            title: (
                <Tooltip title="Evidence count weighted by escalation and canonical-fallback rates. It is not an answer-quality score.">
                    Weighted load
                </Tooltip>
            ),
            key: 'score',
            width: 80,
            render: (_: unknown, record: AnswerlatticeFrictionEntitySummary) => (
                <Text strong>{Math.round(record.last7d.frictionScore)}</Text>
            ),
            sorter: (a: AnswerlatticeFrictionEntitySummary, b: AnswerlatticeFrictionEntitySummary) =>
                a.last7d.frictionScore - b.last7d.frictionScore,
        },
        {
            title: 'Trend',
            key: 'trend',
            width: 110,
            render: (_: unknown, record: AnswerlatticeFrictionEntitySummary) => (
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
            scroll={{ x: 'max-content' }}
            locale={{ emptyText: 'No friction data yet. Signals will appear after the nightly run.' }}
        />
    );
}

// ═══════════════════════════════════════════════════════════════
// EMERGING TOPICS CARD
// ═══════════════════════════════════════════════════════════════

function EmergingTopicsCard({ topics }: { topics: AnswerlatticeFrictionEmergingTopic[] }) {
    const { token } = theme.useToken();

    if (!topics || topics.length === 0) return null;

    return (
        <Card
            size="small"
            title={
                <Space>
                    <LuAlertTriangle style={{ color: token.colorWarning }} />
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
                    <Text strong>AI-assisted Review Summary</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>({weekStart} — {weekEnd})</Text>
                </Space>
            }
            style={{ marginTop: 16 }}
        >
            <Paragraph style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{summary}</Paragraph>
            <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                Advisory only. Review the linked evidence before changing product behavior or approved answers.
            </Text>
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

    if (!snapshot) {
        return (
            <Empty description="No friction data available yet. Data will appear after signals are collected and the nightly aggregation runs." />
        );
    }

    if (snapshot.topFrictionEntities.length === 0 && snapshot.emergingTopics.length === 0) {
        return snapshot.unmappedEvidenceCount > 0 ? (
            <Empty description={`${snapshot.unmappedEvidenceCount} support-evidence events need product-entity mapping before friction can be ranked.`} />
        ) : (
            <Empty description="No mapped friction evidence in the latest completed seven-day window." />
        );
    }

    const lastUpdatedDate = snapshot.lastUpdated?.toDate?.();
    const stale = Boolean(lastUpdatedDate && Date.now() - lastUpdatedDate.getTime() > 36 * 60 * 60 * 1000);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Space size="large">
                    <FrictionLevelBadge level={snapshot.frictionLevel} />
                    <Text type="secondary">
                        {snapshot.totalSignals7d} support-evidence events · {snapshot.totalEscalations7d} escalations ({snapshot.window.currentStartDate} to {snapshot.window.currentEndDate})
                    </Text>
                </Space>
                <Tooltip title="Reload the latest completed snapshot">
                    <Button type="text" icon={<LuRefreshCw size={14} />} onClick={refresh} aria-label="Refresh friction evidence" />
                </Tooltip>
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
                    {stale ? ' · stale' : ''}
                    {snapshot.unmappedEvidenceCount > 0 ? ` · ${snapshot.unmappedEvidenceCount} events need entity mapping` : ''}
                    {snapshot.legacyDailyStatCount > 0 ? ` · ${snapshot.legacyDailyStatCount} legacy daily rows included` : ''}
                </Text>
            )}
        </div>
    );
}
