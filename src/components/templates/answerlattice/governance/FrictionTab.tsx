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
import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_GOVERNANCE_TABS,
    getAnswerlatticeGovernanceRoute,
} from '@constant/answerlattice/navigations';
import { normalizeAnswerlatticeEntityId } from '@lib/answerlattice/governanceIdBoundary';
import { getAnswerlatticeEntityContextRoute } from '@lib/answerlattice/ownerDecisionNavigation';
import {
    AnswerlatticeFrictionEmergingTopic,
    AnswerlatticeFrictionEntitySummary,
    AnswerlatticeFrictionInsight,
    AnswerlatticeFrictionLevel,
    AnswerlatticeFrictionTrendDirection,
    AnswerlatticeSupportMetricWindow,
} from '@type/answerlattice';
import { Alert, Badge, Button, Card, Empty, Flex, Grid, Skeleton, Space, Table, Tag, Tooltip, Typography, theme } from 'antd';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuAlertTriangle,
    LuArrowDown,
    LuArrowRight,
    LuArrowUp,
    LuFileText,
    LuGitBranch,
    LuRefreshCw,
    LuSparkles,
    LuTrendingUp,
} from 'react-icons/lu';
import FrictionEvidenceBriefDrawer from './FrictionEvidenceBriefDrawer';
import PostChangeSupportEvidenceReview from './PostChangeSupportEvidenceReview';

const { Text, Paragraph, Title } = Typography;
const KNOWLEDGE_MAP_ROUTE = getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.MAP);

interface FrictionTabProps {
    tId: number;
    sId: number;
}

interface FrictionEvidenceBriefSelection {
    entity: AnswerlatticeFrictionEntitySummary;
    metricWindow: AnswerlatticeSupportMetricWindow;
    scopeKey: string;
    sourceLastUpdated?: string;
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
            text={<Text strong style={{ fontSize: 16 }}>Support evidence level: {level}</Text>}
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

function EvidenceMix({ entity }: { entity: AnswerlatticeFrictionEntitySummary }) {
    const evidence = entity.last7d;
    const hasBreakdown = (
        Number.isSafeInteger(evidence.ticketCount)
        && Number.isSafeInteger(evidence.chatNegativeCount)
        && Number.isSafeInteger(evidence.canonicalMissCount)
    );
    if (!hasBreakdown) {
        return <Text type="secondary">Breakdown available after the next nightly refresh.</Text>;
    }

    const explainedCount = (
        Number(evidence.ticketCount)
        + Number(evidence.chatNegativeCount)
        + evidence.escalationCount
        + Number(evidence.canonicalMissCount)
    );
    const otherCount = Math.max(0, evidence.queryCount - explainedCount);

    return (
        <Space size={[4, 4]} wrap>
            <Tag>Tickets {evidence.ticketCount}</Tag>
            <Tag>Negative feedback {evidence.chatNegativeCount}</Tag>
            <Tag>Escalations {evidence.escalationCount}</Tag>
            <Tag>No trusted answer {evidence.canonicalMissCount}</Tag>
            {otherCount > 0 ? <Tag>Other evidence {otherCount}</Tag> : null}
        </Space>
    );
}

function TopFrictionTable({
    entities,
    onPrepareBrief,
}: {
    entities: AnswerlatticeFrictionEntitySummary[];
    onPrepareBrief: (entity: AnswerlatticeFrictionEntitySummary) => void;
}) {
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;

    if (isMobile) {
        return (
            <Flex vertical gap={10}>
                {entities.map(entity => (
                    <div
                        key={entity.entityId}
                        style={{
                            border: `1px solid ${token.colorBorderSecondary}`,
                            borderRadius: 8,
                            padding: 12,
                            background: token.colorBgContainer,
                        }}
                    >
                        <Flex vertical gap={10}>
                            <Flex justify="space-between" align="start" gap={8}>
                                <Flex vertical gap={3} style={{ minWidth: 0 }}>
                                    <Text strong>{entity.entityName}</Text>
                                    <EntityTypeTag type={entity.entityType} />
                                </Flex>
                                <TrendArrow direction={entity.trendDirection} />
                            </Flex>
                            <Flex justify="space-between" gap={12} wrap>
                                <Text>{entity.last7d.queryCount} evidence events</Text>
                                <Tooltip title="Evidence events plus escalation and trusted-answer-miss weighting. This is not an answer-quality or product-health score.">
                                    <Text strong>Support evidence load {Math.round(entity.last7d.frictionScore)}</Text>
                                </Tooltip>
                            </Flex>
                            <EvidenceMix entity={entity} />
                            <Text type="secondary">
                                Previous 7 days: {entity.previous7d.queryCount} evidence events · load {Math.round(entity.previous7d.frictionScore)}
                            </Text>
                            <Flex gap={8} vertical>
                                <Button
                                    block
                                    icon={<LuFileText />}
                                    onClick={() => onPrepareBrief(entity)}
                                    style={{ minHeight: 44 }}
                                >
                                    Prepare evidence brief
                                </Button>
                                {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP ? (
                                    <Link href={getAnswerlatticeEntityContextRoute(KNOWLEDGE_MAP_ROUTE, entity.entityId)}>
                                        <Button block icon={<LuGitBranch />} style={{ minHeight: 44 }}>
                                            Open in Knowledge Map
                                        </Button>
                                    </Link>
                                ) : null}
                            </Flex>
                        </Flex>
                    </div>
                ))}
            </Flex>
        );
    }

    const columns = [
        {
            title: 'Product topic',
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
                <Flex vertical gap={1}>
                    <Text>{record.last7d.queryCount}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                        Previous {record.previous7d.queryCount}
                    </Text>
                </Flex>
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
            title: 'Evidence mix',
            key: 'evidenceMix',
            width: 320,
            render: (_: unknown, record: AnswerlatticeFrictionEntitySummary) => (
                <EvidenceMix entity={record} />
            ),
        },
        {
            title: (
                <Tooltip title="Evidence events plus escalation and trusted-answer-miss weighting. This is not an answer-quality or product-health score.">
                    Support evidence load
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
        {
            title: '',
            key: 'actions',
            width: 104,
            render: (_: unknown, record: AnswerlatticeFrictionEntitySummary) => (
                <Space size={4}>
                    <Tooltip title={`Prepare evidence brief for ${record.entityName}`}>
                        <Button
                            aria-label={`Prepare evidence brief for ${record.entityName}`}
                            icon={<LuFileText />}
                            onClick={() => onPrepareBrief(record)}
                            style={{ minHeight: 44, minWidth: 44 }}
                            type="text"
                        />
                    </Tooltip>
                    {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP ? (
                        <Tooltip title={`Open ${record.entityName} in Knowledge Map`}>
                            <Link href={getAnswerlatticeEntityContextRoute(KNOWLEDGE_MAP_ROUTE, record.entityId)}>
                                <Button
                                    aria-label={`Open ${record.entityName} in Knowledge Map`}
                                    icon={<LuGitBranch />}
                                    style={{ minHeight: 44, minWidth: 44 }}
                                    type="text"
                                />
                            </Link>
                        </Tooltip>
                    ) : null}
                </Space>
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
                            {topic.queryCount} support-evidence events · {Math.round(topic.escalationRate * 100)}% escalation
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

function WeeklySummaryCard({
    summary,
    weekStart,
    weekEnd,
    suggestedActions,
    entityNames,
}: {
    summary: string;
    weekStart: string;
    weekEnd: string;
    suggestedActions: AnswerlatticeFrictionInsight['suggestedActions'];
    entityNames: Map<string, string>;
}) {
    if (!summary) return null;
    const admittedActions = suggestedActions.flatMap((suggestion) => {
        const entityId = normalizeAnswerlatticeEntityId(suggestion.entityId);
        return entityId && entityNames.has(entityId)
            ? [{ ...suggestion, entityId }]
            : [];
    });

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
            {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_KNOWLEDGE_MAP && admittedActions.length > 0 ? (
                <Flex vertical gap={8} style={{ marginTop: 12 }}>
                    {admittedActions.map(suggestion => (
                        <Flex
                            align="center"
                            gap={12}
                            justify="space-between"
                            key={`${suggestion.entityId}:${suggestion.action}`}
                            wrap
                        >
                            <Text>
                                <Text strong>{entityNames.get(suggestion.entityId)}:</Text> {suggestion.action}
                            </Text>
                            <Link href={getAnswerlatticeEntityContextRoute(KNOWLEDGE_MAP_ROUTE, suggestion.entityId)}>
                                <Button icon={<LuGitBranch />} style={{ minHeight: 44 }}>
                                    Review evidence
                                </Button>
                            </Link>
                        </Flex>
                    ))}
                </Flex>
            ) : null}
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
    const searchParams = useSearchParams();
    const [briefSelection, setBriefSelection] = useState<FrictionEvidenceBriefSelection | null>(null);
    const scopeKey = `${tId}:${sId}`;
    const snapshotLastUpdatedDate = snapshot?.lastUpdated?.toDate?.();
    const snapshotLastUpdatedIso = snapshotLastUpdatedDate
        && Number.isFinite(snapshotLastUpdatedDate.getTime())
        ? snapshotLastUpdatedDate.toISOString()
        : undefined;
    const activeBriefSelection = briefSelection?.scopeKey === scopeKey ? briefSelection : null;
    const prepareEvidenceBrief = useCallback((entity: AnswerlatticeFrictionEntitySummary) => {
        if (!snapshot) return;
        setBriefSelection({
            entity,
            metricWindow: snapshot.window,
            scopeKey,
            sourceLastUpdated: snapshotLastUpdatedIso,
        });
    }, [scopeKey, snapshot, snapshotLastUpdatedIso]);
    useEffect(() => {
        setBriefSelection(null);
    }, [scopeKey]);
    const focusedEntityId = normalizeAnswerlatticeEntityId(searchParams?.get('entity')) || '';
    const rankedEntities = useMemo(() => {
        const entities = snapshot?.topFrictionEntities || [];
        if (!focusedEntityId) return entities;
        return [...entities].sort((left, right) => (
            Number(right.entityId === focusedEntityId) - Number(left.entityId === focusedEntityId)
        ));
    }, [focusedEntityId, snapshot?.topFrictionEntities]);
    const focusedEntity = rankedEntities.find(entity => entity.entityId === focusedEntityId);
    const entityNames = useMemo(() => {
        const names = new Map<string, string>();
        for (const entity of snapshot?.topFrictionEntities || []) names.set(entity.entityId, entity.entityName);
        for (const topic of snapshot?.emergingTopics || []) names.set(topic.entityId, topic.entityName);
        return names;
    }, [snapshot?.emergingTopics, snapshot?.topFrictionEntities]);
    const postChangeReview = FEATURE_FLAGS.ENABLE_ANSWERLATTICE_POST_CHANGE_EVIDENCE_REVIEW ? (
        <PostChangeSupportEvidenceReview key={`${tId}:${sId}`} tId={tId} sId={sId} />
    ) : null;

    if (loading) {
        return <Skeleton active paragraph={{ rows: 6 }} />;
    }

    if (error) {
        return (
            <Flex vertical gap={8}>
                <Empty description={`Failed to load friction data: ${error}`} />
                {postChangeReview}
            </Flex>
        );
    }

    if (!snapshot) {
        return (
            <Flex vertical gap={8}>
                <Empty description="No friction data available yet. Data will appear after signals are collected and the nightly aggregation runs." />
                {postChangeReview}
            </Flex>
        );
    }

    if (snapshot.topFrictionEntities.length === 0 && snapshot.emergingTopics.length === 0) {
        return (
            <Flex vertical gap={8}>
                {snapshot.unmappedEvidenceCount > 0 ? (
                    <Empty description={`${snapshot.unmappedEvidenceCount} support-evidence events need product-topic mapping before friction can be ranked.`} />
                ) : (
                    <Empty description="No mapped friction evidence in the latest completed seven-day window." />
                )}
                {postChangeReview}
            </Flex>
        );
    }

    const stale = Boolean(snapshotLastUpdatedDate && Date.now() - snapshotLastUpdatedDate.getTime() > 36 * 60 * 60 * 1000);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <Space size="large" wrap>
                    <FrictionLevelBadge level={snapshot.frictionLevel} />
                    <Text type="secondary">
                        {snapshot.totalSignals7d} support-evidence events · {snapshot.totalEscalations7d} escalations ({snapshot.window.currentStartDate} to {snapshot.window.currentEndDate})
                    </Text>
                </Space>
                <Tooltip title="Reload the latest completed snapshot">
                    <Button type="text" icon={<LuRefreshCw size={14} />} onClick={refresh} aria-label="Refresh friction evidence" />
                </Tooltip>
            </div>

            {focusedEntity ? (
                <Alert
                    message={`Focused on ${focusedEntity.entityName}`}
                    description="Daily Brief linked directly to this current evidence area. The remaining ranked areas stay visible below it."
                    showIcon
                    style={{ marginBottom: 16 }}
                    type="info"
                />
            ) : null}

            <Title level={5} style={{ marginBottom: 12 }}>Top Support-Evidence Areas</Title>
            <TopFrictionTable entities={rankedEntities} onPrepareBrief={prepareEvidenceBrief} />

            <EmergingTopicsCard topics={snapshot.emergingTopics || []} />

            {insight?.summary && (
                <WeeklySummaryCard
                    summary={insight.summary}
                    weekStart={insight.weekStart}
                    weekEnd={insight.weekEnd}
                    suggestedActions={insight.suggestedActions}
                    entityNames={entityNames}
                />
            )}

            {snapshot.lastUpdated && (
                <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12 }}>
                    Last updated: {snapshot.lastUpdated?.toDate?.()
                        ? snapshot.lastUpdated.toDate().toLocaleString()
                        : 'Unknown'}
                    {stale ? ' · stale' : ''}
                    {snapshot.unmappedEvidenceCount > 0 ? ` · ${snapshot.unmappedEvidenceCount} events need topic mapping` : ''}
                    {snapshot.legacyDailyStatCount > 0 ? ` · ${snapshot.legacyDailyStatCount} legacy daily rows included` : ''}
                </Text>
            )}

            {postChangeReview}

            <FrictionEvidenceBriefDrawer
                entity={activeBriefSelection?.entity || null}
                metricWindow={activeBriefSelection?.metricWindow || null}
                onClose={() => setBriefSelection(null)}
                open={Boolean(activeBriefSelection)}
                sourceLastUpdated={activeBriefSelection?.sourceLastUpdated}
            />
        </div>
    );
}
