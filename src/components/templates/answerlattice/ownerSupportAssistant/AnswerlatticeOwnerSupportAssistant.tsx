'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    type AnswerlatticeOwnerAssistantAnswer,
    type AnswerlatticeOwnerAssistantBrief,
    type AnswerlatticeOwnerAssistantStatus,
    type AnswerlatticeFounderDailyActionSeverity,
} from '@lib/answerlattice/ownerSupportAssistant';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import {
    Alert,
    Button,
    Card,
    Empty,
    Flex,
    Grid,
    Input,
    Space,
    Statistic,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
    LuArrowRight,
    LuAlertCircle,
    LuCheckCircle,
    LuGauge,
    LuListChecks,
    LuRefreshCw,
    LuSearch,
    LuShieldCheck,
} from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;
const RESPONSE_MAX_BYTES = 128 * 1024;

type BriefResponse = { brief?: AnswerlatticeOwnerAssistantBrief; error?: string };
type QueryResponse = { answer?: AnswerlatticeOwnerAssistantAnswer; error?: string };

const STATUS_META: Record<AnswerlatticeOwnerAssistantStatus, { color: string; label: string }> = {
    healthy: { color: 'green', label: 'Stable' },
    needs_review: { color: 'orange', label: 'Needs review' },
    at_risk: { color: 'red', label: 'At risk' },
    insufficient_data: { color: 'default', label: 'More data needed' },
    unsupported: { color: 'default', label: 'Outside assistant scope' },
};

const ACTION_SEVERITY_META: Record<AnswerlatticeFounderDailyActionSeverity, { color: string; label: string }> = {
    critical: { color: 'red', label: 'Critical' },
    high: { color: 'volcano', label: 'High' },
    medium: { color: 'orange', label: 'Review' },
    low: { color: 'blue', label: 'Check' },
    stable: { color: 'green', label: 'Stable' },
};

const DAILY_FOCUS_META: Record<NonNullable<AnswerlatticeOwnerAssistantBrief['dailyBrief']>['focus'], { color: string; label: string }> = {
    review: { color: 'orange', label: 'Review work' },
    stabilize: { color: 'red', label: 'Stabilize first' },
    launch: { color: 'blue', label: 'Launch checks' },
    maintain: { color: 'green', label: 'Maintain' },
};

const getError = (payload: { error?: string } | null, fallback: string) => (
    payload?.error?.trim() || fallback
);

export default function AnswerlatticeOwnerSupportAssistant() {
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const router = useRouter();
    const isMobile = screens.md !== true;
    const [brief, setBrief] = useState<AnswerlatticeOwnerAssistantBrief | null>(null);
    const [answer, setAnswer] = useState<AnswerlatticeOwnerAssistantAnswer | null>(null);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [asking, setAsking] = useState(false);

    const loadBrief = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/answerlattice/support-assistant/brief', {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
            });
            const payload = await readJsonResponseWithLimit<BriefResponse>(response, RESPONSE_MAX_BYTES);
            if (!response.ok || !payload?.brief) throw new Error(getError(payload, 'Could not load the support brief.'));
            setBrief(payload.brief);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not load the support brief.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT) void loadBrief();
    }, [loadBrief]);

    const ask = useCallback(async (nextQuestion?: string) => {
        const query = String(nextQuestion || question).trim();
        if (query.length < 3) return;
        setQuestion(query);
        setAsking(true);
        try {
            const response = await fetch('/api/answerlattice/support-assistant/query', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: query }),
            });
            const payload = await readJsonResponseWithLimit<QueryResponse>(response, RESPONSE_MAX_BYTES);
            if (!response.ok || !payload?.answer) throw new Error(getError(payload, 'Could not answer that support question.'));
            setAnswer(payload.answer);
        } catch (error) {
            message.error(error instanceof Error ? error.message : 'Could not answer that support question.');
        } finally {
            setAsking(false);
        }
    }, [question]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT) return null;

    const statusMeta = STATUS_META[brief?.status || 'insufficient_data'];

    return (
        <Flex vertical gap={20} style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: isMobile ? 12 : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
                <div>
                    <Space>
                        <LuListChecks size={22} color={token.colorPrimary} />
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Daily Support Brief</Title>
                    </Space>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 760 }}>
                        Start with today&apos;s plan, then ask what needs review, where users are stuck, or whether support is ready. Answers come from compact operational summaries and link back to the governed source.
                    </Paragraph>
                </div>
                <Button icon={<LuRefreshCw />} onClick={loadBrief} loading={loading} style={{ minHeight: 44 }}>Refresh brief</Button>
            </Flex>

            <Alert
                type="info"
                showIcon
                message="Read-only operational guidance"
                description="The assistant does not store a transcript, read raw customer conversations, publish answers, close tickets, or change widget settings."
            />

            {brief ? (
                <>
                    {brief.dailyBrief && (
                        <Card>
                            <Flex vertical gap={16}>
                                <Flex justify="space-between" align={isMobile ? 'stretch' : 'start'} vertical={isMobile} gap={12}>
                                    <Flex vertical gap={6}>
                                        <Space wrap>
                                            <LuCheckCircle size={18} color={token.colorPrimary} />
                                            <Text strong>Today&apos;s plan</Text>
                                            <Tag color={STATUS_META[brief.status].color}>{STATUS_META[brief.status].label}</Tag>
                                        </Space>
                                        <Title level={4} style={{ margin: 0 }}>{brief.dailyBrief.headline}</Title>
                                        <Paragraph type="secondary" style={{ margin: 0, maxWidth: 760 }}>
                                            {brief.dailyBrief.summary}
                                        </Paragraph>
                                    </Flex>
                                    <Tag color={DAILY_FOCUS_META[brief.dailyBrief.focus].color}>
                                        {DAILY_FOCUS_META[brief.dailyBrief.focus].label}
                                    </Tag>
                                </Flex>

                                <Flex vertical gap={10}>
                                    {brief.dailyBrief.actions.map(action => {
                                        const actionMeta = ACTION_SEVERITY_META[action.severity];
                                        return (
                                            <div
                                                key={action.id}
                                                style={{
                                                    border: `1px solid ${token.colorBorderSecondary}`,
                                                    borderRadius: 8,
                                                    padding: isMobile ? 12 : 14,
                                                    background: token.colorBgContainer,
                                                }}
                                            >
                                                <Flex justify="space-between" align={isMobile ? 'stretch' : 'start'} vertical={isMobile} gap={12}>
                                                    <Flex vertical gap={6} style={{ minWidth: 0 }}>
                                                        <Space size={[6, 6]} wrap>
                                                            <Tag color={actionMeta.color}>{actionMeta.label}</Tag>
                                                            <Text type="secondary">{action.source}</Text>
                                                        </Space>
                                                        <Title level={5} style={{ margin: 0 }}>{action.title}</Title>
                                                        <Paragraph style={{ margin: 0 }}>{action.description}</Paragraph>
                                                        <Text type="secondary">{action.reason}</Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>{action.aiAssist}</Text>
                                                        <Text type="secondary" style={{ fontSize: 12 }}>{action.costImpact}</Text>
                                                    </Flex>
                                                    <Button
                                                        type={action.severity === 'critical' || action.severity === 'high' ? 'primary' : 'default'}
                                                        onClick={() => router.push(action.href)}
                                                        style={{ minHeight: 44, minWidth: isMobile ? '100%' : 150 }}
                                                    >
                                                        {action.cta}
                                                    </Button>
                                                </Flex>
                                            </div>
                                        );
                                    })}
                                </Flex>

                                <Flex vertical gap={2}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{brief.dailyBrief.costNote}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{brief.dailyBrief.sourceNote}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Summary updated {brief.updatedAt ? new Date(brief.updatedAt).toLocaleString() : 'after the next available summary run'}.
                                    </Text>
                                </Flex>
                            </Flex>
                        </Card>
                    )}

                    <Card>
                        <Flex justify="space-between" align="start" vertical={isMobile} gap={16}>
                            <Flex vertical gap={8}>
                                <Space wrap>
                                    <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                                    <Text type="secondary">{brief.readModel.cacheHit ? 'Cached summary' : `${brief.readModel.firestoreReads} summary reads`}</Text>
                                </Space>
                                <Title level={4} style={{ margin: 0 }}>{brief.headline}</Title>
                                <Text type="secondary">Updated {brief.updatedAt ? new Date(brief.updatedAt).toLocaleString() : 'after the next available summary run'}</Text>
                            </Flex>
                            <Statistic title="Items needing attention" value={brief.attentionCount} valueStyle={{ color: brief.attentionCount ? token.colorWarning : token.colorSuccess }} />
                        </Flex>
                    </Card>

                    <Flex gap={12} wrap="wrap">
                        <Card size="small" style={{ flex: '1 1 170px' }}><Statistic title="Coverage" value={brief.metrics.coverageRate ?? 0} suffix={brief.metrics.coverageRate === null ? '' : '%'} prefix={<LuShieldCheck size={16} />} /></Card>
                        <Card size="small" style={{ flex: '1 1 170px' }}><Statistic title="Resolution" value={brief.metrics.resolutionRate ?? 0} suffix={brief.metrics.resolutionRate === null ? '' : '%'} prefix={<LuGauge size={16} />} /></Card>
                        <Card size="small" style={{ flex: '1 1 170px' }}><Statistic title="Drifted answers" value={brief.metrics.driftedAnswers} prefix={<LuAlertCircle size={16} />} /></Card>
                        <Card size="small" style={{ flex: '1 1 170px' }}><Statistic title="Review items" value={brief.metrics.reviewItems + brief.metrics.needsAnswerCards} prefix={<LuListChecks size={16} />} /></Card>
                    </Flex>

                    <Card title="Ask about support operations">
                        <Flex vertical gap={14}>
                            <Flex gap={8} vertical={isMobile}>
                                <Input
                                    value={question}
                                    onChange={event => setQuestion(event.target.value)}
                                    onPressEnter={() => void ask()}
                                    maxLength={500}
                                    placeholder="What needs my attention today?"
                                    prefix={<LuSearch />}
                                    size="large"
                                    style={{ minHeight: 44 }}
                                />
                                <Button type="primary" size="large" onClick={() => void ask()} loading={asking} disabled={question.trim().length < 3} style={{ minHeight: 44 }}>
                                    Check
                                </Button>
                            </Flex>
                            <Space size={[8, 8]} wrap>
                                {brief.promptChips.map(prompt => (
                                    <Button key={prompt} onClick={() => void ask(prompt)} style={{ minHeight: 44 }}>{prompt}</Button>
                                ))}
                            </Space>
                        </Flex>
                    </Card>
                </>
            ) : (
                <Card loading={loading}><Empty description="Support brief is not available." /></Card>
            )}

            {answer && (
                <Card title="Answer" extra={<Tag color={STATUS_META[answer.status].color}>{STATUS_META[answer.status].label}</Tag>}>
                    <Flex vertical gap={16}>
                        <Title level={4} style={{ margin: 0 }}>{answer.directAnswer}</Title>
                        {answer.evidence.length > 0 && (
                            <Flex vertical gap={8}>
                                <Text strong>Evidence</Text>
                                {answer.evidence.map(item => (
                                    <Button
                                        key={`${item.source}-${item.label}`}
                                        type="text"
                                        onClick={() => router.push(item.href)}
                                        style={{ height: 'auto', minHeight: 44, padding: '8px 10px', textAlign: 'left' }}
                                    >
                                        <Flex justify="space-between" align="center" gap={12} style={{ width: '100%' }}>
                                            <Flex vertical style={{ minWidth: 0 }}>
                                                <Text strong>{item.label}</Text>
                                                <Text type="secondary">{item.source}</Text>
                                            </Flex>
                                            <Space><Text>{item.value}</Text><LuArrowRight /></Space>
                                        </Flex>
                                    </Button>
                                ))}
                            </Flex>
                        )}
                        {answer.nextActions.length > 0 && (
                            <Space wrap>
                                {answer.nextActions.map(action => (
                                    <Button key={action.href} type="primary" ghost onClick={() => router.push(action.href)} style={{ minHeight: 44 }}>
                                        {action.label}
                                    </Button>
                                ))}
                            </Space>
                        )}
                        <Flex vertical gap={3}>
                            {answer.limits.map(limit => <Text key={limit} type="secondary" style={{ fontSize: 12 }}>{limit}</Text>)}
                        </Flex>
                    </Flex>
                </Card>
            )}
        </Flex>
    );
}
