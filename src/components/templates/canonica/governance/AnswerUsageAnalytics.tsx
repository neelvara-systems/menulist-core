'use client'

/**
 * Canonica — Answer Usage Analytics
 * 
 * Tracks which canonical answers are served most/least/never.
 * Identifies content gaps (entities with no canonical answers).
 * All data derived from existing canonical answer fields (signalMetrics).
 * 
 * Feature-flagged: ENABLE_CANONICA_GOVERNANCE_UI
 * Zero additional Firestore reads — uses data already loaded by useCanonicalAnswers.
 * 
 * @see __docs__/canonica/doctrine/01-core-doctrine.md (Canonical coverage is THE KPI)
 */

import { FEATURE_FLAGS } from '@config/features';
import { useCanonicalAnswers } from '@hook/canonica/useCanonicalAnswers';
import { useEntities } from '@hook/canonica/useEntities';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { CanonicaCanonicalAnswer } from '@type/canonica';
import {
    Card,
    Empty,
    Flex,
    List,
    Progress,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
} from 'antd';
import { useMemo } from 'react';
import {
    LuBarChart3,
    LuFileQuestion,
    LuShieldCheck,
    LuTrendingDown,
    LuTrendingUp,
    LuZap,
} from 'react-icons/lu';

const { Text, Title } = Typography;

interface AnswerUsageRow {
    id: string;
    title: string;
    totalSignals: number;
    tickets: number;
    chatMentions: number;
    negativeFeedback: number;
    confidenceScore: number;
    status: string;
    drifted: boolean;
}

export default function AnswerUsageAnalytics() {
    const session = useClientAuthSession();
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    const { answers, loading } = useCanonicalAnswers(tId, sId);
    const { entities } = useEntities(tId, sId);

    // Transform answers into usage rows
    const usageData = useMemo((): AnswerUsageRow[] => {
        return (answers || []).map(a => ({
            id: a.id,
            title: a.title,
            totalSignals: (a.signalMetrics?.linkedTicketCount || 0) + (a.signalMetrics?.linkedChatCount || 0),
            tickets: a.signalMetrics?.linkedTicketCount || 0,
            chatMentions: a.signalMetrics?.linkedChatCount || 0,
            negativeFeedback: a.signalMetrics?.negativeFeedbackCount || 0,
            confidenceScore: a.validation?.confidenceScore || 0,
            status: a.status,
            drifted: a.governance?.driftFlag || false,
        }));
    }, [answers]);

    // Analytics summaries
    const analytics = useMemo(() => {
        const active = usageData.filter(u => u.status === 'active');
        const totalSignals = active.reduce((sum, u) => sum + u.totalSignals, 0);
        const avgConfidence = active.length > 0
            ? active.reduce((sum, u) => sum + u.confidenceScore, 0) / active.length
            : 0;
        const neverUsed = active.filter(u => u.totalSignals === 0);
        const mostUsed = [...active].sort((a, b) => b.totalSignals - a.totalSignals).slice(0, 5);
        const leastUsed = [...active].filter(u => u.totalSignals > 0).sort((a, b) => a.totalSignals - b.totalSignals).slice(0, 5);
        const highNegative = active.filter(u => u.negativeFeedback > 0).sort((a, b) => b.negativeFeedback - a.negativeFeedback).slice(0, 5);

        return {
            totalActive: active.length,
            totalSignals,
            avgConfidence,
            neverUsedCount: neverUsed.length,
            neverUsed,
            mostUsed,
            leastUsed,
            highNegative,
        };
    }, [usageData]);

    // Content gap detection: entities with zero canonical answers
    const contentGaps = useMemo(() => {
        if (!entities || !answers) return [];
        const coveredEntityIds = new Set<string>();
        answers.forEach(a => {
            if (a.status === 'active') {
                a.scope.entityIds.forEach(id => coveredEntityIds.add(id));
            }
        });
        return (entities || [])
            .filter(e => e.status === 'active' && !coveredEntityIds.has(e.id))
            .map(e => ({ id: e.id, name: e.name, type: e.type }));
    }, [entities, answers]);

    if (!FEATURE_FLAGS.ENABLE_CANONICA_GOVERNANCE_UI) return null;

    const columns = [
        {
            title: 'Answer',
            dataIndex: 'title',
            key: 'title',
            render: (title: string, record: AnswerUsageRow) => (
                <Space>
                    <Text strong>{title}</Text>
                    {record.drifted && <Tag color="warning">Drifted</Tag>}
                </Space>
            ),
        },
        {
            title: 'Total Signals',
            dataIndex: 'totalSignals',
            key: 'totalSignals',
            width: 110,
            sorter: (a: AnswerUsageRow, b: AnswerUsageRow) => a.totalSignals - b.totalSignals,
            defaultSortOrder: 'descend' as const,
            render: (val: number) => <Text strong>{val}</Text>,
        },
        {
            title: 'Tickets',
            dataIndex: 'tickets',
            key: 'tickets',
            width: 80,
            sorter: (a: AnswerUsageRow, b: AnswerUsageRow) => a.tickets - b.tickets,
        },
        {
            title: 'Chat',
            dataIndex: 'chatMentions',
            key: 'chatMentions',
            width: 80,
            sorter: (a: AnswerUsageRow, b: AnswerUsageRow) => a.chatMentions - b.chatMentions,
        },
        {
            title: 'Negative',
            dataIndex: 'negativeFeedback',
            key: 'negativeFeedback',
            width: 90,
            sorter: (a: AnswerUsageRow, b: AnswerUsageRow) => a.negativeFeedback - b.negativeFeedback,
            render: (val: number) => (
                <Text style={{ color: val > 0 ? '#ff4d4f' : '#52c41a' }}>{val}</Text>
            ),
        },
        {
            title: 'Confidence',
            dataIndex: 'confidenceScore',
            key: 'confidenceScore',
            width: 100,
            sorter: (a: AnswerUsageRow, b: AnswerUsageRow) => a.confidenceScore - b.confidenceScore,
            render: (val: number) => {
                const pct = Math.round(val * 100);
                const color = pct >= 80 ? '#52c41a' : pct >= 50 ? '#faad14' : '#ff4d4f';
                return <Progress percent={pct} size="small" strokeColor={color} style={{ width: 80 }} />;
            },
        },
    ];

    return (
        <Flex vertical gap={16}>
            {/* Summary Stats */}
            <Flex gap={16} wrap="wrap">
                <Card size="small" style={{ minWidth: 140 }}>
                    <Statistic title="Active Answers" value={analytics.totalActive} prefix={<LuShieldCheck />} valueStyle={{ fontSize: 22 }} />
                </Card>
                <Card size="small" style={{ minWidth: 140 }}>
                    <Statistic title="Total Signals" value={analytics.totalSignals} prefix={<LuZap />} valueStyle={{ fontSize: 22 }} />
                </Card>
                <Card size="small" style={{ minWidth: 140 }}>
                    <Statistic
                        title="Avg Confidence"
                        value={Math.round(analytics.avgConfidence * 100)}
                        suffix="%"
                        valueStyle={{ fontSize: 22, color: analytics.avgConfidence >= 0.7 ? '#52c41a' : '#faad14' }}
                    />
                </Card>
                <Card size="small" style={{ minWidth: 140 }}>
                    <Statistic
                        title="Never Used"
                        value={analytics.neverUsedCount}
                        prefix={<LuFileQuestion />}
                        valueStyle={{ fontSize: 22, color: analytics.neverUsedCount > 0 ? '#faad14' : '#52c41a' }}
                    />
                </Card>
                {contentGaps.length > 0 && (
                    <Card size="small" style={{ minWidth: 140 }}>
                        <Statistic
                            title="Content Gaps"
                            value={contentGaps.length}
                            valueStyle={{ fontSize: 22, color: '#ff4d4f' }}
                        />
                    </Card>
                )}
            </Flex>

            {/* Top & Bottom Lists */}
            <Flex gap={16} wrap="wrap">
                {analytics.mostUsed.length > 0 && (
                    <Card size="small" title={<Space><LuTrendingUp style={{ color: '#52c41a' }} /> Most Used</Space>} style={{ flex: 1, minWidth: 280 }}>
                        <List
                            size="small"
                            dataSource={analytics.mostUsed}
                            renderItem={(item, idx) => (
                                <List.Item>
                                    <Text type="secondary" style={{ width: 20 }}>{idx + 1}.</Text>
                                    <Text style={{ flex: 1 }}>{item.title}</Text>
                                    <Tag>{item.totalSignals} signals</Tag>
                                </List.Item>
                            )}
                        />
                    </Card>
                )}

                {analytics.neverUsed.length > 0 && (
                    <Card size="small" title={<Space><LuTrendingDown style={{ color: '#faad14' }} /> Never Used</Space>} style={{ flex: 1, minWidth: 280 }}>
                        <List
                            size="small"
                            dataSource={analytics.neverUsed.slice(0, 5)}
                            renderItem={(item) => (
                                <List.Item>
                                    <Text>{item.title}</Text>
                                    <Tag color="default">0 signals</Tag>
                                </List.Item>
                            )}
                        />
                        {analytics.neverUsed.length > 5 && (
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                +{analytics.neverUsed.length - 5} more
                            </Text>
                        )}
                    </Card>
                )}

                {analytics.highNegative.length > 0 && (
                    <Card size="small" title={<Space><LuBarChart3 style={{ color: '#ff4d4f' }} /> High Negative Feedback</Space>} style={{ flex: 1, minWidth: 280 }}>
                        <List
                            size="small"
                            dataSource={analytics.highNegative}
                            renderItem={(item) => (
                                <List.Item>
                                    <Text>{item.title}</Text>
                                    <Tag color="error">{item.negativeFeedback} negative</Tag>
                                </List.Item>
                            )}
                        />
                    </Card>
                )}
            </Flex>

            {/* Content Gaps */}
            {contentGaps.length > 0 && (
                <Card size="small" title="Content Gaps — Entities Without Canonical Answers">
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
                        These active entities have no canonical answer coverage. Consider creating answers for them.
                    </Text>
                    <Flex gap={8} wrap="wrap">
                        {contentGaps.map(gap => (
                            <Tag key={gap.id} color="red">{gap.name} ({gap.type})</Tag>
                        ))}
                    </Flex>
                </Card>
            )}

            {/* Full Answer Usage Table */}
            <Card title={<Space><LuBarChart3 /> Answer Usage Detail</Space>}>
                <Table
                    dataSource={usageData}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 15, showSizeChanger: false }}
                    size="small"
                    locale={{ emptyText: <Empty description="No answer usage data yet" /> }}
                />
            </Card>
        </Flex>
    );
}
