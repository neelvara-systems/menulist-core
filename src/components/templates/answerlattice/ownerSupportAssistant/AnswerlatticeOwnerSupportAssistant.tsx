'use client';

import { FEATURE_FLAGS } from '@config/features';
import {
    ANSWERLATTICE_ROUTES,
} from '@constant/answerlattice/routes';
import {
    type AnswerlatticeOwnerAssistantAnswer,
    type AnswerlatticeOwnerAssistantBrief,
    type AnswerlatticeOwnerAssistantStatus,
    type AnswerlatticeFounderDailyAction,
    type AnswerlatticeFounderDailyActionSeverity,
    isAnswerlatticeOwnerAssistantBriefResponse,
    isAnswerlatticeOwnerAssistantQueryResponse,
} from '@lib/answerlattice/ownerSupportAssistantContracts';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { useAnswerlatticeAccess } from '@providers/answerlatticeAccessProvider';
import { formatDateTime, type IntlFormatter } from '@util/dateTime';
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
import { useFormatter } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    LuArrowRight,
    LuAlertCircle,
    LuCheckCircle,
    LuFilePlus2,
    LuGauge,
    LuListChecks,
    LuRefreshCw,
    LuRocket,
    LuSearch,
    LuShieldCheck,
} from 'react-icons/lu';

const { Paragraph, Text, Title } = Typography;
const RESPONSE_MAX_BYTES = 128 * 1024;
const SUPPORT_BRIEF_LOAD_FAILED = 'Could not load the support brief.';
const SUPPORT_QUESTION_FAILED = 'Could not answer that support question.';

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

const formatOwnerSupportDateTime = (
    value: string | null | undefined,
    formatter: IntlFormatter,
    fallback: string,
): string => {
    const label = formatDateTime(value, 'datetime', formatter);
    return label === 'N/A' ? fallback : label;
};

export default function AnswerlatticeOwnerSupportAssistant() {
    const screens = Grid.useBreakpoint();
    const { token } = theme.useToken();
    const formatter = useFormatter();
    const router = useRouter();
    const { access } = useAnswerlatticeAccess();
    const scopeKey = access ? `${access.scope.tenantId}:${access.scope.storeId}` : null;
    const isMobile = screens.md !== true;
    const [brief, setBrief] = useState<AnswerlatticeOwnerAssistantBrief | null>(null);
    const [answer, setAnswer] = useState<AnswerlatticeOwnerAssistantAnswer | null>(null);
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [asking, setAsking] = useState(false);
    const [briefError, setBriefError] = useState<string | null>(null);
    const [answerError, setAnswerError] = useState<string | null>(null);
    const mountedRef = useRef(false);
    const briefRequestRef = useRef(0);
    const answerRequestRef = useRef(0);
    const briefAbortRef = useRef<AbortController | null>(null);
    const answerAbortRef = useRef<AbortController | null>(null);

    const loadBrief = useCallback(async () => {
        if (!scopeKey) {
            setBrief(null);
            setLoading(false);
            return;
        }
        const requestId = ++briefRequestRef.current;
        briefAbortRef.current?.abort();
        const controller = new AbortController();
        briefAbortRef.current = controller;
        setLoading(true);
        setBriefError(null);
        try {
            const response = await fetch('/api/answerlattice/support-assistant/brief', {
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                signal: controller.signal,
            });
            const payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_MAX_BYTES);
            if (!response.ok || !isAnswerlatticeOwnerAssistantBriefResponse(payload)) {
                throw new Error('answerlattice_owner_assistant_brief_response_invalid');
            }
            if (!mountedRef.current || requestId !== briefRequestRef.current) return;
            setBrief(payload.brief);
        } catch {
            if (controller.signal.aborted || !mountedRef.current || requestId !== briefRequestRef.current) return;
            setBrief(null);
            setBriefError(SUPPORT_BRIEF_LOAD_FAILED);
            message.error(SUPPORT_BRIEF_LOAD_FAILED);
        } finally {
            if (mountedRef.current && requestId === briefRequestRef.current) {
                setLoading(false);
            }
        }
    }, [scopeKey]);

    useEffect(() => {
        mountedRef.current = true;
        setBrief(null);
        setAnswer(null);
        setBriefError(null);
        setAnswerError(null);
        if (FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT && scopeKey) void loadBrief();
        return () => {
            mountedRef.current = false;
            briefRequestRef.current += 1;
            answerRequestRef.current += 1;
            briefAbortRef.current?.abort();
            answerAbortRef.current?.abort();
        };
    }, [loadBrief, scopeKey]);

    const ask = useCallback(async (nextQuestion?: string) => {
        if (!scopeKey) return;
        const query = String(nextQuestion || question).trim();
        if (query.length < 3) return;
        const requestId = ++answerRequestRef.current;
        answerAbortRef.current?.abort();
        const controller = new AbortController();
        answerAbortRef.current = controller;
        setQuestion(query);
        setAnswer(null);
        setAsking(true);
        setAnswerError(null);
        try {
            const response = await fetch('/api/answerlattice/support-assistant/query', {
                method: 'POST',
                cache: 'no-store',
                credentials: 'same-origin',
                redirect: 'manual',
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: query }),
            });
            const payload = await readJsonResponseWithLimit<unknown>(response, RESPONSE_MAX_BYTES);
            if (!response.ok || !isAnswerlatticeOwnerAssistantQueryResponse(payload)) {
                throw new Error('answerlattice_owner_assistant_query_response_invalid');
            }
            if (!mountedRef.current || requestId !== answerRequestRef.current) return;
            setAnswer(payload.answer);
        } catch {
            if (controller.signal.aborted || !mountedRef.current || requestId !== answerRequestRef.current) return;
            setAnswerError(SUPPORT_QUESTION_FAILED);
            message.error(SUPPORT_QUESTION_FAILED);
        } finally {
            if (mountedRef.current && requestId === answerRequestRef.current) {
                setAsking(false);
            }
        }
    }, [question, scopeKey]);

    const prepareReviewCard = useCallback((action: NonNullable<AnswerlatticeOwnerAssistantBrief['dailyBrief']>['actions'][number]) => {
        if (
            !action.preparedReviewCard
            || !brief?.capabilities.canPrepareReviewCard
            || !FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_ACTIONS
        ) return;
        const params = new URLSearchParams({
            create: '1',
            title: action.preparedReviewCard.title.slice(0, 140),
            description: action.preparedReviewCard.description.slice(0, 1200),
            priority: action.preparedReviewCard.priority,
            tags: action.preparedReviewCard.tags.slice(0, 8).join(','),
        });
        router.push(`${ANSWERLATTICE_ROUTES.SUPPORT_BOARD}?${params.toString()}`);
    }, [brief?.capabilities.canPrepareReviewCard, router]);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT) return null;

    const statusMeta = STATUS_META[brief?.status || 'insufficient_data'];
    const renderDailyAction = (action: AnswerlatticeFounderDailyAction, primary: boolean) => {
        const actionMeta = ACTION_SEVERITY_META[action.severity];
        return (
            <div
                key={action.id}
                style={{
                    border: `1px solid ${primary ? token.colorPrimaryBorder : token.colorBorderSecondary}`,
                    borderRadius: 8,
                    padding: isMobile ? 12 : 14,
                    background: primary ? token.colorPrimaryBg : token.colorBgContainer,
                }}
            >
                <Flex justify="space-between" align={isMobile ? 'stretch' : 'start'} vertical={isMobile} gap={12}>
                    <Flex vertical gap={6} style={{ minWidth: 0 }}>
                        <Space size={[6, 6]} wrap>
                            {primary ? <Tag color="blue">Start here</Tag> : null}
                            <Tag color={actionMeta.color}>{actionMeta.label}</Tag>
                            <Text type="secondary">{action.source}</Text>
                        </Space>
                        <Title level={5} style={{ margin: 0 }}>{action.title}</Title>
                        <Paragraph style={{ margin: 0 }}>{action.description}</Paragraph>
                        <Text type="secondary">{action.reason}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{action.aiAssist}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{action.costImpact}</Text>
                    </Flex>
                    <Flex vertical gap={8} style={{ minWidth: isMobile ? '100%' : 170 }}>
                        <Button
                            type={primary || action.severity === 'critical' || action.severity === 'high' ? 'primary' : 'default'}
                            onClick={() => router.push(action.href)}
                            style={{ minHeight: 44, width: '100%' }}
                        >
                            {action.cta}
                        </Button>
                        {FEATURE_FLAGS.ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_ACTIONS
                            && brief?.capabilities.canPrepareReviewCard
                            && action.preparedReviewCard ? (
                            <Button
                                icon={<LuFilePlus2 />}
                                onClick={() => prepareReviewCard(action)}
                                style={{ minHeight: 44, width: '100%' }}
                            >
                                Prepare review card
                            </Button>
                        ) : null}
                    </Flex>
                </Flex>
            </div>
        );
    };

    return (
        <Flex vertical gap={20} style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: isMobile ? 12 : 24 }}>
            <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
                <div>
                    <Space>
                        <LuListChecks size={22} color={token.colorPrimary} />
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0 }}>Daily Support Brief</Title>
                    </Space>
                    <Paragraph type="secondary" style={{ margin: '6px 0 0', maxWidth: 760 }}>
                        Start with today&apos;s plan. Ask what needs review, where customers are stuck, or whether support is ready. Every recommendation links to the screen where you can verify and act.
                    </Paragraph>
                </div>
                <Space wrap>
                    {brief?.capabilities.canRecordProductChange ? (
                        <Button
                            icon={<LuRocket />}
                            onClick={() => router.push(`${ANSWERLATTICE_ROUTES.CHANGELOG}?create=1`)}
                            style={{ minHeight: 44 }}
                        >
                            I shipped a change
                        </Button>
                    ) : null}
                    <Button icon={<LuRefreshCw />} onClick={loadBrief} loading={loading} style={{ minHeight: 44 }}>Refresh brief</Button>
                </Space>
            </Flex>

            <Alert
                type="info"
                showIcon
                message="Read-only operational guidance"
                description="The assistant does not store a transcript, read raw customer conversations, publish answers, close tickets, or change widget settings."
            />

            {brief ? (
                <>
                    {!brief.summaryHealth.complete ? (
                        <Alert
                            type="warning"
                            showIcon
                            message="Support evidence is partial"
                            description={[
                                brief.summaryHealth.unavailableSources.length
                                    ? `Unavailable: ${brief.summaryHealth.unavailableSources.join(', ')}.`
                                    : '',
                                brief.summaryHealth.staleSources.length
                                    ? `Needs refresh: ${brief.summaryHealth.staleSources.join(', ')}.`
                                    : '',
                                `Using ${brief.summaryHealth.currentCount}/${brief.summaryHealth.expectedCount} current summaries.`,
                            ].filter(Boolean).join(' ')}
                            action={<Button onClick={loadBrief} loading={loading}>Retry</Button>}
                        />
                    ) : null}
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

                                {brief.capabilities.canViewLaunchVerification ? (
                                    <div
                                        style={{
                                            border: `1px solid ${brief.launchVerification.ready ? token.colorSuccessBorder : token.colorBorderSecondary}`,
                                            borderRadius: 8,
                                            padding: isMobile ? 12 : 14,
                                            background: brief.launchVerification.ready ? token.colorSuccessBg : token.colorFillAlter,
                                        }}
                                    >
                                        <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
                                            <Flex vertical gap={4}>
                                                <Space wrap>
                                                    <Text strong>Launch verification</Text>
                                                    <Tag color={brief.launchVerification.ready ? 'green' : brief.launchVerification.available ? 'orange' : 'default'}>
                                                        {brief.launchVerification.ready ? 'Ready' : brief.launchVerification.available ? 'Incomplete' : 'Not verified'}
                                                    </Tag>
                                                    {brief.launchVerification.available ? (
                                                        <Text type="secondary">
                                                            {brief.launchVerification.completeCount}/{brief.launchVerification.totalCount} checks complete
                                                        </Text>
                                                    ) : null}
                                                </Space>
                                                <Text type="secondary">
                                                    {brief.launchVerification.ready
                                                        ? `Verified ${formatOwnerSupportDateTime(
                                                            brief.launchVerification.verifiedAt,
                                                            formatter,
                                                            'from the latest activation snapshot',
                                                        )}.`
                                                        : brief.launchVerification.blockers[0] || 'Finish Get Live to complete the remaining setup checks.'}
                                                </Text>
                                            </Flex>
                                            {!brief.launchVerification.ready ? (
                                                <Button
                                                    onClick={() => router.push(brief.launchVerification.nextActionRoute)}
                                                    style={{ minHeight: 44 }}
                                                >
                                                    {brief.launchVerification.nextActionLabel || 'Open Get Live'}
                                                </Button>
                                            ) : null}
                                        </Flex>
                                    </div>
                                ) : null}

                                <Flex vertical gap={10}>
                                    {brief.dailyBrief.actions.length === 0
                                        && brief.status === 'healthy'
                                        && brief.summaryHealth.complete ? (
                                        <div
                                            style={{
                                                border: `1px solid ${token.colorSuccessBorder}`,
                                                borderRadius: 8,
                                                padding: isMobile ? 12 : 14,
                                                background: token.colorSuccessBg,
                                            }}
                                        >
                                            <Flex align="start" gap={10}>
                                                <LuCheckCircle size={20} color={token.colorSuccess} />
                                                <Flex vertical gap={3}>
                                                    <Text strong>Nothing needs your decision right now</Text>
                                                    <Text type="secondary">
                                                        No current answer risk, qualified support gap, or launch blocker is visible in the latest summaries.
                                                    </Text>
                                                </Flex>
                                            </Flex>
                                        </div>
                                    ) : (
                                        <>
                                            {brief.dailyBrief.actions[0] ? renderDailyAction(brief.dailyBrief.actions[0], true) : null}
                                            {brief.dailyBrief.actions.length > 1 ? <Text strong>Also review</Text> : null}
                                            {brief.dailyBrief.actions.slice(1).map(action => renderDailyAction(action, false))}
                                        </>
                                    )}
                                </Flex>

                                <Flex vertical gap={2}>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{brief.dailyBrief.costNote}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{brief.dailyBrief.sourceNote}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>
                                        Summary updated {formatOwnerSupportDateTime(
                                            brief.updatedAt,
                                            formatter,
                                            'after the next available summary run',
                                        )}.
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
                                </Space>
                                <Title level={4} style={{ margin: 0 }}>{brief.headline}</Title>
                                <Text type="secondary">
                                    Updated {formatOwnerSupportDateTime(
                                        brief.updatedAt,
                                        formatter,
                                        'after the next available summary run',
                                    )}
                                </Text>
                            </Flex>
                            <Statistic title="Items needing attention" value={brief.attentionCount} valueStyle={{ color: brief.attentionCount ? token.colorWarning : token.colorSuccess }} />
                        </Flex>
                    </Card>

                    <Flex gap={12} wrap="wrap">
                        <Card size="small" style={{ flex: '1 1 170px' }}><Statistic title="Coverage" value={brief.metrics.coverageRate ?? 'Not available'} suffix={brief.metrics.coverageRate === null ? undefined : '%'} prefix={<LuShieldCheck size={16} />} /></Card>
                        <Card size="small" style={{ flex: '1 1 170px' }}><Statistic title="Confirmed resolved" value={brief.metrics.confirmedResolutionRate ?? 'Not available'} suffix={brief.metrics.confirmedResolutionRate === null ? undefined : '%'} prefix={<LuGauge size={16} />} /></Card>
                        <Card size="small" style={{ flex: '1 1 170px' }}><Statistic title="No escalation" value={brief.metrics.noEscalationRate ?? 'Not available'} suffix={brief.metrics.noEscalationRate === null ? undefined : '%'} prefix={<LuGauge size={16} />} /></Card>
                        <Card size="small" style={{ flex: '1 1 170px' }}><Statistic title="Answers to recheck" value={brief.metrics.driftedAnswers} prefix={<LuAlertCircle size={16} />} /></Card>
                        <Card size="small" style={{ flex: '1 1 170px' }}><Statistic title="Review items" value={brief.metrics.reviewItems + brief.metrics.needsAnswerCards} prefix={<LuListChecks size={16} />} /></Card>
                    </Flex>
                    {brief.metrics.recontactEligible > 0 ? (
                        <Text type="secondary">
                            Same-session recontact: {brief.metrics.recontactedSameSession}/{brief.metrics.recontactEligible} trackable solved outcomes. This is shown separately from no-escalation rate.
                        </Text>
                    ) : null}

                    <Card title="Ask about support operations">
                        <Flex vertical gap={14}>
                            {answerError ? (
                                <Alert
                                    type="error"
                                    showIcon
                                    message={answerError}
                                    closable
                                    onClose={() => setAnswerError(null)}
                                />
                            ) : null}
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
                briefError ? (
                    <Alert
                        type="error"
                        showIcon
                        message={briefError}
                        action={<Button onClick={loadBrief} loading={loading}>Retry</Button>}
                    />
                ) : (
                    <Card loading={loading}><Empty description="Support brief is not available." /></Card>
                )
            )}

            {answer && (
                <Card title="Answer" extra={<Tag color={STATUS_META[answer.status].color}>{STATUS_META[answer.status].label}</Tag>}>
                    <Flex vertical gap={16}>
                        {!answer.summaryHealth.complete ? (
                            <Alert
                                type="warning"
                                showIcon
                                message="This answer uses partial support evidence"
                                description="Review the listed limits and owning screens before making a support decision."
                            />
                        ) : null}
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
