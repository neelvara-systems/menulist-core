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
import {
    evaluateCanonicalAnswerDrift,
    validateCanonicalAnswerDrift,
} from '@database/answerlattice/canonicalAnswers';
import { AnswerlatticeGovernanceClientError } from '@lib/answerlattice/governanceClient';
import {
    AnswerlatticeCanonicalAnswer,
    ANSWERLATTICE_DRIFT_CLASS,
} from '@type/answerlattice';
import {
    Badge,
    Button,
    Card,
    Checkbox,
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

    const { answers, driftedAnswers, loading, error, refresh } = useCanonicalAnswers(tId, sId);
    const { entities } = useEntities(tId, sId);

    const [reEvalLoading, setReEvalLoading] = useState(false);
    const [selectedDrifted, setSelectedDrifted] = useState<AnswerlatticeCanonicalAnswer | null>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [reviewConfirmed, setReviewConfirmed] = useState(false);
    const [resolveLoading, setResolveLoading] = useState(false);

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
            const result = await evaluateCanonicalAnswerDrift();
            message.success(`Drift re-evaluation complete. ${result.updatedAnswers || 0} of ${result.evaluatedAnswers || 0} answer(s) updated.`);
            await refresh();
        } catch (evaluationError) {
            message.error(
                evaluationError instanceof AnswerlatticeGovernanceClientError
                    ? evaluationError.message
                    : 'Drift re-evaluation failed',
            );
        } finally {
            setReEvalLoading(false);
        }
    }, [refresh]);

    const handleResolve = useCallback(async (answer: AnswerlatticeCanonicalAnswer) => {
        if (!reviewConfirmed) return;
        setResolveLoading(true);
        try {
            await validateCanonicalAnswerDrift(answer.id);
            message.success('Drift resolved and answer revalidated');
            setDetailModalOpen(false);
            setReviewConfirmed(false);
            await refresh();
        } catch (validationError) {
            message.error(
                validationError instanceof AnswerlatticeGovernanceClientError
                    ? validationError.message
                    : 'Failed to resolve drift',
            );
        } finally {
            setResolveLoading(false);
        }
    }, [refresh, reviewConfirmed]);

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
                <Flex
                    justify="space-between"
                    align={isMobile ? 'stretch' : 'center'}
                    vertical={isMobile}
                    gap={isMobile ? 12 : 0}
                    style={{ marginBottom: 16 }}
                >
                    <Space>
                        <Title level={5} style={{ margin: 0 }}>Drift Governance</Title>
                        {error ? (
                            <Tag color="warning" icon={<LuAlertTriangle style={{ verticalAlign: 'middle', marginRight: 2 }} />}>
                                Status unavailable
                            </Tag>
                        ) : driftedCount > 0 ? (
                            <Badge count={`${driftedCount} drifted`} style={{ backgroundColor: token.colorWarning }} />
                        ) : (
                            <Tag color="green" icon={<LuShieldCheck style={{ verticalAlign: 'middle', marginRight: 2 }} />}>
                                All Clean
                            </Tag>
                        )}
                    </Space>
                    <Space wrap>
                        <Tooltip title="Re-evaluate signal, scope-conflict, and deprecated-entity drift. Version drift is evaluated when a release is activated.">
                            <Button
                                icon={<LuRefreshCw />}
                                onClick={handleReEvaluate}
                                loading={reEvalLoading || loading}
                                type="text"
                                style={{ minHeight: 44 }}
                            >
                                Re-evaluate
                            </Button>
                        </Tooltip>
                        <Button icon={<LuRefreshCw />} onClick={refresh} loading={loading} type="text" style={{ minHeight: 44 }}>
                            Refresh
                        </Button>
                    </Space>
                </Flex>

                {error && (
                    <Text type="danger" style={{ display: 'block', marginBottom: 16 }}>
                        {error}. The counts below may be incomplete until refresh succeeds.
                    </Text>
                )}

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
                    locale={{
                        emptyText: (
                            <Empty
                                description={error ? 'Drift status is unavailable' : 'No drifted answers - governance is clean'}
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                            />
                        ),
                    }}
                    renderItem={(answer: AnswerlatticeCanonicalAnswer) => (
                        <List.Item
                            actions={[
                                <Button
                                    key="resolve"
                                    type="text"
                                    icon={<LuCheck />}
                                    onClick={() => {
                                        setSelectedDrifted(answer);
                                        setReviewConfirmed(false);
                                        setDetailModalOpen(true);
                                    }}
                                    style={{ color: token.colorSuccess, minHeight: 44 }}
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
                onCancel={() => {
                    setDetailModalOpen(false);
                    setReviewConfirmed(false);
                }}
                footer={[
                    <Button
                        key="cancel"
                        onClick={() => {
                            setDetailModalOpen(false);
                            setReviewConfirmed(false);
                        }}
                        style={{ minHeight: 44 }}
                    >
                        Close
                    </Button>,
                    <Button
                        key="resolve"
                        type="primary"
                        icon={<LuCheck />}
                        onClick={() => selectedDrifted && handleResolve(selectedDrifted)}
                        disabled={!reviewConfirmed}
                        loading={resolveLoading}
                        style={{ minHeight: 44 }}
                    >
                        Confirm Review & Revalidate
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
                        <Checkbox
                            checked={reviewConfirmed}
                            onChange={event => setReviewConfirmed(event.target.checked)}
                        >
                            I verified the current answer, scope, product version, and supporting evidence.
                        </Checkbox>
                    </Flex>
                )}
            </Modal>
        </>
    );
}
