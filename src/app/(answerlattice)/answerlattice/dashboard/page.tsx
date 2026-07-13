'use client';

/**
 * Answerlattice Dashboard — Readiness Metrics
 *
 * This landing page intentionally reads the compact activation summary instead
 * of full entity/answer collections. Deep governance tables stay in
 * /answerlattice/governance where the extra reads are explicitly user-requested.
 */

import {
    ANSWERLATTICE_GOVERNANCE_TABS,
    ANSWERLATTICE_ROUTES,
    getAnswerlatticeGovernanceRoute,
    toAnswerlatticeDashboardRoute,
} from '@constant/answerlattice/navigations';
import {
    ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
    isAnswerlatticeActivationSummaryResponse,
    readAnswerlatticeActivationDashboardResponse,
} from '@lib/answerlattice/activationDashboardResponseClient';
import AnswerlatticeContentWorkbench from '@template/answerlattice/content/AnswerlatticeContentWorkbench';
import AnswerlatticeCustomerFlowChecklist from '@template/answerlattice/content/AnswerlatticeCustomerFlowChecklist';
import AnswerlatticeSurfaceReadinessMatrix from '@template/answerlattice/content/AnswerlatticeSurfaceReadinessMatrix';
import type { AnswerlatticeActivationStep, AnswerlatticeActivationSummary } from '@type/answerlattice';
import {
    Alert,
    Button,
    Card,
    Col,
    Empty,
    Flex,
    Grid,
    List,
    Progress,
    Row,
    Skeleton,
    Space,
    Statistic,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuAlertTriangle,
    LuBookOpen,
    LuCheckCircle2,
    LuExternalLink,
    LuLayers,
    LuListChecks,
    LuRefreshCw,
    LuShieldCheck,
    LuTicket,
    LuZap,
} from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;
const ANSWERLATTICE_READINESS_METRICS_LOAD_FAILED = 'Could not load readiness metrics';

const STATUS_META = {
    complete: { color: 'success', label: 'Done', icon: LuCheckCircle2 },
    attention: { color: 'warning', label: 'Needs review', icon: LuAlertTriangle },
    pending: { color: 'default', label: 'Pending', icon: LuZap },
    optional: { color: 'processing', label: 'Optional', icon: LuZap },
} as const;

const getStepMeta = (step: AnswerlatticeActivationStep) => STATUS_META[step.status] || STATUS_META.pending;

export default function AnswerlatticeDashboardPage() {
    const screens = Grid.useBreakpoint();
    const router = useRouter();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [summary, setSummary] = useState<AnswerlatticeActivationSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;

    const loadSummary = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await fetch('/api/answerlattice/activation/summary', {
                ...ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readAnswerlatticeActivationDashboardResponse(
                response,
                'readiness_metrics_load',
                isAnswerlatticeActivationSummaryResponse,
                ANSWERLATTICE_READINESS_METRICS_LOAD_FAILED,
            );
            setSummary(data.summary);
        } catch {
            message.error(ANSWERLATTICE_READINESS_METRICS_LOAD_FAILED);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const requiredSteps = useMemo(() => summary?.steps.filter(step => step.required) || [], [summary]);
    const attentionSteps = useMemo(() => summary?.steps.filter(step => step.status === 'attention') || [], [summary]);
    const nextSteps = useMemo(
        () => summary?.steps.filter(step => step.required && step.status !== 'complete').slice(0, 5) || [],
        [summary],
    );

    const openRoute = useCallback((route?: string) => {
        if (!route) return;
        router.push(toAnswerlatticeDashboardRoute(route, currentHostname));
    }, [currentHostname, router]);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    if (!summary) {
        return (
            <Alert
                type="warning"
                showIcon
                message="Readiness metrics are unavailable"
                description="Refresh after this Answerlattice workspace is fully connected."
                action={<Button onClick={() => loadSummary(true)}>Retry</Button>}
            />
        );
    }

    const coverageRate = summary.governance.canonicalCoverageRate;
    const trustScore = summary.governance.trustScore;
    const activeAnswersStep = summary.steps.find(step => step.key === 'canonical-answers');
    const activeAnswerCount = activeAnswersStep?.description.match(/^\d+/)?.[0] || '0';

    return (
        <Flex vertical gap={isMobile ? 14 : 20} style={{ paddingBottom: isMobile ? 'calc(76px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Readiness Metrics</Title>
                    <Text type="secondary">
                        Summary-based support health for {summary.workspace.productName || summary.workspace.companyName || 'this workspace'}.
                    </Text>
                </div>
                <Space wrap>
                    <Button icon={<LuRefreshCw />} loading={refreshing} onClick={() => loadSummary(true)}>
                        Refresh
                    </Button>
                    <Button icon={<LuListChecks />} onClick={() => openRoute(ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT)}>
                        Today&apos;s Brief
                    </Button>
                    <Button type="primary" icon={<LuExternalLink />} onClick={() => openRoute(ANSWERLATTICE_ROUTES.ACTIVATION)}>
                        Open Launch Setup
                    </Button>
                </Space>
            </Flex>

            <Alert
                type={attentionSteps.length ? 'warning' : summary.readinessScore >= 85 ? 'success' : 'info'}
                showIcon
                message={summary.readinessScore >= 85 ? 'Support readiness is launch-ready' : 'Support readiness is still building'}
                description={`${summary.readinessScore}% ready from ${requiredSteps.length} required setup checks.`}
            />

            <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                    <Card>
                        <Flex align="center" gap={16}>
                            <Progress
                                type="circle"
                                percent={summary.readinessScore}
                                size={isMobile ? 84 : 104}
                                strokeColor={summary.readinessScore >= 85 ? token.colorSuccess : token.colorPrimary}
                            />
                            <div>
                                <Text type="secondary">Launch readiness</Text>
                                <Title level={4} style={{ margin: '4px 0' }}>
                                    {requiredSteps.filter(step => step.status === 'complete').length}/{requiredSteps.length}
                                </Title>
                                <Text>{summary.stage}</Text>
                            </div>
                        </Flex>
                    </Card>
                </Col>
                <Col xs={12} md={4}>
                    <Card>
                        <Statistic title="Surfaces" value={summary.content.surfaceCount} prefix={<LuLayers />} />
                    </Card>
                </Col>
                <Col xs={12} md={4}>
                    <Card>
                        <Statistic title="Articles" value={summary.content.articleCount} prefix={<LuBookOpen />} />
                    </Card>
                </Col>
                <Col xs={12} md={4}>
                    <Card>
                        <Statistic
                            title="Coverage"
                            value={typeof coverageRate === 'number' ? coverageRate : 0}
                            suffix="%"
                            prefix={<LuShieldCheck />}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={4}>
                    <Card>
                        <Statistic title="Tickets" value={summary.content.ticketCount} prefix={<LuTicket />} />
                    </Card>
                </Col>
                <Col xs={12} md={4}>
                    <Card>
                        <Statistic
                            title="Trust"
                            value={typeof trustScore === 'number' ? trustScore : 0}
                            suffix={typeof trustScore === 'number' ? '%' : ''}
                            prefix={<LuShieldCheck />}
                        />
                    </Card>
                </Col>
            </Row>

            <AnswerlatticeContentWorkbench
                summary={summary}
                isMobile={isMobile}
                onOpen={openRoute}
            />

            <AnswerlatticeSurfaceReadinessMatrix
                summary={summary}
                isMobile={isMobile}
                onOpen={openRoute}
            />

            <AnswerlatticeCustomerFlowChecklist
                summary={summary}
                isMobile={isMobile}
                onOpen={openRoute}
            />

            <Row gutter={[12, 12]}>
                <Col xs={24} lg={14}>
                    <Card title="Next Actions">
                        {nextSteps.length ? (
                            <List
                                dataSource={nextSteps}
                                renderItem={(step) => {
                                    const meta = getStepMeta(step);
                                    const Icon = meta.icon;
                                    return (
                                        <List.Item
                                            actions={[
                                                step.route ? (
                                                    <Button key="open" size="small" onClick={() => openRoute(step.route)}>
                                                        {step.actionLabel || 'Open'}
                                                    </Button>
                                                ) : null,
                                            ].filter(Boolean)}
                                        >
                                            <List.Item.Meta
                                                avatar={<Icon style={{ marginTop: 4 }} />}
                                                title={<Flex align="center" gap={8} wrap="wrap"><Text strong>{step.title}</Text><Tag color={meta.color}>{meta.label}</Tag></Flex>}
                                                description={<Text type="secondary">{step.description}</Text>}
                                            />
                                        </List.Item>
                                    );
                                }}
                            />
                        ) : (
                            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No required setup actions are open." />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={10}>
                    <Card title="Knowledge Health">
                        <Flex vertical gap={12}>
                            <Flex justify="space-between" gap={12}>
                                <Text type="secondary">Canonical answers</Text>
                                <Text strong>{activeAnswerCount}</Text>
                            </Flex>
                            <Flex justify="space-between" gap={12}>
                                <Text type="secondary">Coverage sample</Text>
                                <Text strong>{summary.governance.canonicalCoverageTotal ?? 0}</Text>
                            </Flex>
                            <Flex justify="space-between" gap={12}>
                                <Text type="secondary">Widget key</Text>
                                <Tag color={summary.widget.hasWidgetKey ? 'success' : 'default'}>
                                    {summary.widget.hasWidgetKey ? 'Ready' : 'Missing'}
                                </Tag>
                            </Flex>
                            <Flex justify="space-between" gap={12}>
                                <Text type="secondary">Allowed origins</Text>
                                <Text strong>{summary.widget.allowedOriginCount}</Text>
                            </Flex>
                            <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                Open governance when you need answer-level review, drift checks, or signal-to-knowledge decisions.
                            </Paragraph>
                            <Button onClick={() => openRoute(getAnswerlatticeGovernanceRoute(ANSWERLATTICE_GOVERNANCE_TABS.ANSWERS))}>
                                Open Governance
                            </Button>
                        </Flex>
                    </Card>
                </Col>
            </Row>
        </Flex>
    );
}
