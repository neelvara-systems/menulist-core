'use client'

/**
 * Answerlattice — Drift Dashboard
 * 
 * Visual dashboard showing drifted answers by class with drill-down and resolve actions.
 * Reads from existing canonical answers collection (governance.driftFlag field).
 * 
 * Feature-flagged: ENABLE_ANSWERLATTICE_GOVERNANCE_UI
 * 
 * @see __docs__/answerlattice/doctrine/01-core-doctrine.md (Pillar 3)
 */

import { FEATURE_FLAGS } from '@config/features';
import { useCanonicalAnswers } from '@hook/answerlattice/useCanonicalAnswers';
import { useEntities } from '@hook/answerlattice/useEntities';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { validateCanonicalAnswerDrift } from '@database/answerlattice/canonicalAnswers';
import { evaluateDriftForTenant } from '@lib/answerlattice/driftDetection';
import {
    AnswerlatticeCanonicalAnswer,
    ANSWERLATTICE_DRIFT_CLASS,
} from '@type/answerlattice';
import {
    Badge,
    Button,
    Card,
    Descriptions,
    Empty,
    Flex,
    Grid,
    List,
    Modal,
    Space,
    Statistic,
    Tag,
    Tooltip,
    Typography,
    message,
    theme,
} from 'antd';
import { useCallback, useMemo, useState } from 'react';
import {
    LuAlertTriangle,
    LuCheck,
    LuGitBranch,
    LuLayers,
    LuRefreshCw,
    LuShieldAlert,
    LuShieldCheck,
    LuTrash2,
    LuZap,
} from 'react-icons/lu';

const { Text, Title, Paragraph } = Typography;

const getDriftClassConfig = (token: ReturnType<typeof theme.useToken>['token']): Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> => ({
    version_mismatch: {
        label: 'Version Drift',
        color: token.colorWarning,
        icon: <LuGitBranch />,
        description: 'Entity changed in release but answer not revalidated',
    },
    signal_anomaly: {
        label: 'Signal Drift',
        color: token.colorError,
        icon: <LuZap />,
        description: 'Negative feedback or ticket spike above threshold',
    },
    scope_conflict: {
        label: 'Scope Conflict',
        color: token.colorPrimary,
        icon: <LuLayers />,
        description: 'Multiple active answers overlap on same entity+scope',
    },
    deprecated_entity: {
        label: 'Orphan Drift',
        color: token.colorError,
        icon: <LuTrash2 />,
        description: 'Deprecated entity still bound to active answer',
    },
});

interface DriftClassBreakdown {
    driftClass: string;
    count: number;
    answerIds: string[];
}

export default function DriftDashboard() {
    const session = useClientAuthSession();
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const tId = session?.tId || 0;
    const sId = session?.sId || 0;

    const { answers, driftedAnswers, loading, refresh } = useCanonicalAnswers(tId, sId);
    const { entities } = useEntities(tId, sId);

    const [reEvalLoading, setReEvalLoading] = useState(false);
    const [selectedDrifted, setSelectedDrifted] = useState<AnswerlatticeCanonicalAnswer | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    const entityMap = useMemo(() => {
        const map = new Map<string, string>();
        (entities || []).forEach(e => map.set(e.id, e.name));
        return map;
    }, [entities]);

    // Parse drift reasons into class breakdown
    const driftBreakdown = useMemo((): DriftClassBreakdown[] => {
        const classMap = new Map<string, string[]>();

        driftedAnswers.forEach(answer => {
            const reason = answer.governance.driftReason || '';
            // Parse drift classes from reason format: [class_name] reason; [class_name] reason
            const classes = new Set<string>();
            Object.keys(ANSWERLATTICE_DRIFT_CLASS).forEach(key => {
                const classValue = (ANSWERLATTICE_DRIFT_CLASS as Record<string, string>)[key];
                if (reason.includes(`[${classValue}]`)) {
                    classes.add(classValue);
                }
            });

            // If no class detected from reason, count as unknown
            if (classes.size === 0 && answer.governance.driftFlag) {
                classes.add('unknown');
            }

            classes.forEach(cls => {
                if (!classMap.has(cls)) classMap.set(cls, []);
                classMap.get(cls)!.push(answer.id);
            });
        });

        return Array.from(classMap.entries()).map(([driftClass, answerIds]) => ({
            driftClass,
            count: answerIds.length,
            answerIds,
        }));
    }, [driftedAnswers]);

    const handleReEvaluate = useCallback(async () => {
        setReEvalLoading(true);
        try {
            const results = await evaluateDriftForTenant(tId, sId);
            const changed = results.filter(r => r.changed).length;
            message.success(`Drift re-evaluation complete. ${changed} answer(s) updated.`);
            await refresh();
        } catch (err) {
            message.error('Drift re-evaluation failed');
        } finally {
            setReEvalLoading(false);
        }
    }, [tId, sId, refresh]);

    const handleResolve = useCallback(async (answer: AnswerlatticeCanonicalAnswer) => {
        try {
            await validateCanonicalAnswerDrift(answer.id);
            message.success('Drift resolved and answer revalidated');
            setDetailModalOpen(false);
            await refresh();
        } catch (err) {
            message.error('Failed to resolve drift');
        }
    }, [refresh]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_GOVERNANCE_UI) return null;

    const totalAnswers = answers.length;
    const driftedCount = driftedAnswers.length;
    const cleanCount = totalAnswers - driftedCount;
    const healthPercent = totalAnswers > 0 ? Math.round((cleanCount / totalAnswers) * 100) : 100;
    const healthColor = healthPercent >= 80 ? token.colorSuccess : healthPercent >= 50 ? token.colorWarning : token.colorError;
    const driftClassConfig = getDriftClassConfig(token);

    return (
        <>
            <Card>
                <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
                    <Space>
                        <Title level={5} style={{ margin: 0 }}>Drift Governance</Title>
                        {driftedCount > 0 ? (
                            <Badge count={`${driftedCount} drifted`} style={{ backgroundColor: token.colorWarning }} />
                        ) : (
                            <Tag color="green" icon={<LuShieldCheck style={{ verticalAlign: 'middle', marginRight: 2 }} />}>
                                All Clean
                            </Tag>
                        )}
                    </Space>
                    <Space>
                        <Tooltip title="Re-evaluate all drift classes for all answers">
                            <Button
                                icon={<LuRefreshCw />}
                                onClick={handleReEvaluate}
                                loading={reEvalLoading || loading}
                                type="text"
                            >
                                Re-evaluate
                            </Button>
                        </Tooltip>
                        <Button icon={<LuRefreshCw />} onClick={refresh} loading={loading} type="text">
                            Refresh
                        </Button>
                    </Space>
                </Flex>

                {/* Summary Stats */}
                <Flex gap={16} wrap="wrap" style={{ marginBottom: 24 }}>
                    <Card size="small" style={{ minWidth: 140 }}>
                        <Statistic title="Total Answers" value={totalAnswers} valueStyle={{ fontSize: 24 }} />
                    </Card>
                    <Card size="small" style={{ minWidth: 140 }}>
                        <Statistic
                            title="Clean"
                            value={cleanCount}
                            valueStyle={{ fontSize: 24, color: token.colorSuccess }}
                            prefix={<LuShieldCheck />}
                        />
                    </Card>
                    <Card size="small" style={{ minWidth: 140 }}>
                        <Statistic
                            title="Drifted"
                            value={driftedCount}
                            valueStyle={{ fontSize: 24, color: driftedCount > 0 ? token.colorWarning : token.colorSuccess }}
                            prefix={<LuShieldAlert />}
                        />
                    </Card>
                    <Card size="small" style={{ minWidth: 140 }}>
                        <Statistic
                            title="Health"
                            value={healthPercent}
                            suffix="%"
                            valueStyle={{ fontSize: 24, color: healthColor }}
                        />
                    </Card>
                </Flex>

                {/* Drift Class Breakdown */}
                {driftBreakdown.length > 0 && (
                    <Card size="small" title="Drift Class Breakdown" style={{ marginBottom: 16 }}>
                        <Flex gap={12} wrap="wrap">
                            {driftBreakdown.map(item => {
                                const config = driftClassConfig[item.driftClass];
                                return (
                                    <Card
                                        key={item.driftClass}
                                        size="small"
                                        style={{
                                            minWidth: 180,
                                            borderLeft: `3px solid ${config?.color || token.colorBorder}`,
                                        }}
                                    >
                                        <Flex align="center" gap={8}>
                                            <span style={{ color: config?.color || token.colorTextSecondary }}>{config?.icon || <LuAlertTriangle />}</span>
                                            <div>
                                                <Text strong style={{ fontSize: 14 }}>
                                                    {config?.label || item.driftClass}
                                                </Text>
                                                <br />
                                                <Text type="secondary" style={{ fontSize: 12 }}>
                                                    {item.count} answer{item.count !== 1 ? 's' : ''}
                                                </Text>
                                            </div>
                                        </Flex>
                                    </Card>
                                );
                            })}
                        </Flex>
                    </Card>
                )}

                {/* Drifted Answers List */}
                <List
                    dataSource={driftedAnswers}
                    loading={loading}
                    locale={{ emptyText: <Empty description="No drifted answers — governance is clean" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                    renderItem={(answer: AnswerlatticeCanonicalAnswer) => (
                        <List.Item
                            actions={[
                                <Button
                                    key="resolve"
                                    type="text"
                                    icon={<LuCheck />}
                                    style={{ color: token.colorSuccess }}
                                    onClick={() => { setSelectedDrifted(answer); setDetailModalOpen(true); }}
                                >
                                    Review
                                </Button>,
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<LuAlertTriangle style={{ color: token.colorWarning, fontSize: 20, marginTop: 4 }} />}
                                title={<Text strong>{answer.title}</Text>}
                                description={
                                    <Flex vertical gap={4}>
                                        <Space wrap>
                                            {answer.scope.entityIds.slice(0, 3).map(id => (
                                                <Tag key={id} color="blue">{entityMap.get(id) || id.slice(0, 8)}</Tag>
                                            ))}
                                        </Space>
                                        <Text type="secondary" style={{ fontSize: 12 }}>
                                            {answer.governance.driftReason || 'Unknown drift reason'}
                                        </Text>
                                    </Flex>
                                }
                            />
                        </List.Item>
                    )}
                />
            </Card>

            {/* Drift Detail + Resolve Modal */}
            <Modal
                title="Review Drifted Answer"
                open={detailModalOpen}
                onCancel={() => setDetailModalOpen(false)}
                footer={[
                    <Button key="cancel" onClick={() => setDetailModalOpen(false)}>Close</Button>,
                    <Button
                        key="resolve"
                        type="primary"
                        icon={<LuCheck />}
                        onClick={() => selectedDrifted && handleResolve(selectedDrifted)}
                    >
                        Resolve & Revalidate
                    </Button>,
                ]}
                width={isMobile ? 'calc(100vw - 24px)' : 600}
            >
                {selectedDrifted && (
                    <Flex vertical gap={16}>
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="Title">{selectedDrifted.title}</Descriptions.Item>
                            <Descriptions.Item label="Entities">
                                <Space wrap>
                                    {selectedDrifted.scope.entityIds.map(id => (
                                        <Tag key={id} color="blue">{entityMap.get(id) || id}</Tag>
                                    ))}
                                </Space>
                            </Descriptions.Item>
                            <Descriptions.Item label="Drift Reason">
                                <Text type="warning" style={{ fontSize: 12 }}>
                                    {selectedDrifted.governance.driftReason || 'Unknown'}
                                </Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Confidence">
                                {Math.round((selectedDrifted.validation?.confidenceScore || 0) * 100)}%
                            </Descriptions.Item>
                        </Descriptions>

                        <Card size="small" title="Current Summary">
                            <Paragraph style={{ fontSize: 13 }}>
                                {selectedDrifted.content.structuredSummary}
                            </Paragraph>
                        </Card>

                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Resolving will clear the drift flag, mark the answer as revalidated at the current timestamp,
                            and log an audit event. Only resolve after verifying the answer content is still accurate.
                        </Text>
                    </Flex>
                )}
            </Modal>
        </>
    );
}
