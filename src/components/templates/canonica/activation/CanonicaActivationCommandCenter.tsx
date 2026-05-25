'use client';

import { CANONICA_GOVERNANCE_TABS, CANONICA_ROUTES, getCanonicaGovernanceRoute, toCanonicaDashboardRoute } from '@constant/canonica/navigations';
import type { CanonicaActivationStep, CanonicaActivationSummary } from '@type/canonica';
import CanonicaCustomerFlowChecklist from '@template/canonica/content/CanonicaCustomerFlowChecklist';
import CanonicaContentWorkbench from '@template/canonica/content/CanonicaContentWorkbench';
import { getCanonicaUiErrorMessage } from '@lib/canonica/uiErrors';
import CanonicaOperationsPanel from './CanonicaOperationsPanel';
import {
    Alert,
    Button,
    Card,
    Col,
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
    LuBoxes,
    LuCheckCircle2,
    LuHelpCircle,
    LuCircle,
    LuCode,
    LuDatabase,
    LuExternalLink,
    LuLayers,
    LuMail,
    LuRadioTower,
    LuRefreshCw,
    LuRocket,
    LuShield,
    LuShieldCheck,
    LuTicket,
} from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

type ActivationSummaryResponse = {
    summary?: CanonicaActivationSummary;
    error?: string;
};

const STATUS_META = {
    complete: { color: 'success', label: 'Done', icon: LuCheckCircle2 },
    attention: { color: 'warning', label: 'Needs review', icon: LuAlertTriangle },
    pending: { color: 'default', label: 'Pending', icon: LuCircle },
    optional: { color: 'processing', label: 'Optional', icon: LuCircle },
} as const;

const stageLabel: Record<string, string> = {
    setup: 'Set up workspace',
    knowledge: 'Add knowledge',
    install: 'Install widget',
    live: 'Ready for launch',
};

const formatDateTime = (value: any): string => {
    if (!value) return 'Not seen yet';
    const date = typeof value?.toDate === 'function'
        ? value.toDate()
        : typeof value?.seconds === 'number'
            ? new Date(value.seconds * 1000)
            : new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not seen yet';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getStepIcon = (step: CanonicaActivationStep) => {
    if (step.key.includes('entities')) return <LuBoxes />;
    if (step.key.includes('canonical')) return <LuShield />;
    if (step.key.includes('knowledge')) return <LuBookOpen />;
    if (step.key.includes('help-center')) return <LuBookOpen />;
    if (step.key.includes('surface') || step.key.includes('context')) return <LuLayers />;
    if (step.key.includes('widget')) return <LuCode />;
    if (step.key.includes('origin')) return <LuShieldCheck />;
    if (step.key.includes('ticket')) return <LuTicket />;
    return <LuCircle />;
};

export default function CanonicaActivationCommandCenter() {
    const screens = Grid.useBreakpoint();
    const router = useRouter();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [summary, setSummary] = useState<ActivationSummaryResponse['summary']>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [testingNotification, setTestingNotification] = useState(false);
    const [rebuildingContext, setRebuildingContext] = useState(false);

    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;

    const loadSummary = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await fetch('/api/canonica/activation/summary', { method: 'GET' });
            const data: ActivationSummaryResponse = await response.json().catch(() => ({}));
            if (!response.ok || !data.summary) {
                throw new Error(data.error || 'Failed to load activation summary');
            }
            setSummary(data.summary);
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not load activation summary'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const requiredSteps = useMemo(() => summary?.steps?.filter(step => step.required) || [], [summary]);
    const completeRequired = requiredSteps.filter(step => step.status === 'complete').length;
    const needsReview = summary?.steps?.filter(step => step.status === 'attention') || [];
    const nextStep = summary?.steps?.find(step => step.required && step.status !== 'complete') || null;
    const modeCards = [
        {
            key: 'launch',
            title: 'Launch Setup',
            description: 'Workspace, knowledge import, product surfaces, widget install, and publish checks.',
            route: CANONICA_ROUTES.ACTIVATION,
            action: 'Open Setup',
            icon: <LuRocket />,
        },
        {
            key: 'support',
            title: 'Support Control',
            description: 'Help center, knowledge base, changelog, tickets, conversations, and widget operations.',
            route: CANONICA_ROUTES.KNOWLEDGE_BASE,
            action: 'Open Knowledge Base',
            icon: <LuTicket />,
        },
        {
            key: 'governance',
            title: 'Knowledge Governance',
            description: 'Coverage, drift, entities, canonical answers, signal queue, and trust metrics.',
            route: getCanonicaGovernanceRoute(CANONICA_GOVERNANCE_TABS.ANSWERS),
            action: 'Open Governance',
            icon: <LuShieldCheck />,
        },
    ];

    const openRoute = useCallback((route?: string) => {
        if (!route) return;
        router.push(toCanonicaDashboardRoute(route, currentHostname));
    }, [currentHostname, router]);

    const testNotifications = useCallback(async () => {
        setTestingNotification(true);
        try {
            const response = await fetch('/api/canonica/notifications/test', { method: 'POST' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok || !data.sent) {
                throw new Error(data.error || 'Notification test failed');
            }
            message.success(`Test email sent to ${data.recipientEmail}`);
            await loadSummary(true);
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not send test notification'));
        } finally {
            setTestingNotification(false);
        }
    }, [loadSummary]);

    const rebuildCompiledContext = useCallback(async () => {
        setRebuildingContext(true);
        try {
            const response = await fetch('/api/canonica/bundles/rebuild', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'activation_manual_rebuild', force: true }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Failed to rebuild compiled context');
            }
            message.success(data.manifest?.status === 'ready'
                ? `Compiled context v${data.manifest.bundleVersion} is ready`
                : 'Compiled context rebuild finished');
            await loadSummary(true);
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not rebuild compiled context'));
        } finally {
            setRebuildingContext(false);
        }
    }, [loadSummary]);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 10 }} />;
    }

    if (!summary) {
        return (
            <Alert
                type="warning"
                message="Activation summary is unavailable"
                description="Refresh the page after Canonica Firebase is configured for this workspace."
                showIcon
                action={<Button onClick={() => loadSummary(true)}>Retry</Button>}
            />
        );
    }

    const bundleStatus = summary.compiledContext?.status || 'empty';
    const bundleStatusColor: Record<string, string> = {
        ready: 'success',
        stale: 'warning',
        building: 'processing',
        failed: 'error',
        superseded: 'warning',
        empty: 'default',
    };

    return (
        <Flex vertical gap={isMobile ? 14 : 20} style={{ paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Launch Support Setup</Title>
                    <Text type="secondary">
                        Launch support in 10 minutes for {summary.workspace.productName || summary.workspace.companyName || 'this product'}.
                    </Text>
                </div>
                <Space wrap>
                    <Button
                        icon={<LuRefreshCw />}
                        loading={refreshing}
                        onClick={() => loadSummary(true)}
                        style={{ minHeight: 44 }}
                    >
                        Refresh
                    </Button>
                    {nextStep?.route && (
                        <Button
                            type="primary"
                            icon={<LuExternalLink />}
                            onClick={() => openRoute(nextStep.route)}
                            style={{ minHeight: 44 }}
                        >
                            {nextStep.actionLabel || 'Continue'}
                        </Button>
                    )}
                </Space>
            </Flex>

            <Alert
                type={needsReview.length ? 'warning' : summary.readinessScore >= 85 ? 'success' : 'info'}
                showIcon
                message={stageLabel[summary.stage] || 'Activation in progress'}
                description={needsReview.length
                    ? `${needsReview.length} launch setting needs review before customer traffic is enabled.`
                    : 'Your launch status is generated from saved setup checkpoints.'}
            />

            <Row gutter={[12, 12]}>
                {modeCards.map((mode) => (
                    <Col xs={24} md={8} key={mode.key}>
                        <Card>
                            <Flex vertical gap={10}>
                                <Flex align="center" gap={8}>
                                    <span style={{ display: 'inline-flex', fontSize: 18 }}>{mode.icon}</span>
                                    <Text strong>{mode.title}</Text>
                                </Flex>
                                <Text type="secondary">{mode.description}</Text>
                                <Button onClick={() => openRoute(mode.route)} style={{ minHeight: 44 }}>
                                    {mode.action}
                                </Button>
                            </Flex>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[12, 12]}>
                <Col xs={24} md={9}>
                    <Card>
                        <Flex align="center" gap={16}>
                            <Progress
                                type="circle"
                                percent={summary.readinessScore}
                                size={isMobile ? 84 : 104}
                                strokeColor={summary.readinessScore >= 85 ? token.colorSuccess : token.colorPrimary}
                            />
                            <div>
                                <Text type="secondary">Required steps</Text>
                                <Title level={4} style={{ margin: '4px 0' }}>{completeRequired}/{requiredSteps.length}</Title>
                                <Text>{stageLabel[summary.stage] || summary.stage}</Text>
                            </div>
                        </Flex>
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="Articles" value={summary.content.articleCount} prefix={<LuBookOpen />} />
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="FAQs" value={summary.content.faqCount || 0} prefix={<LuHelpCircle />} />
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="Surfaces" value={summary.content.surfaceCount} prefix={<LuLayers />} />
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="Releases" value={summary.content.changelogCount} prefix={<LuRadioTower />} />
                    </Card>
                </Col>
                <Col xs={12} md={3}>
                    <Card>
                        <Statistic title="Tickets" value={summary.content.ticketCount} prefix={<LuTicket />} />
                    </Card>
                </Col>
            </Row>

            <CanonicaContentWorkbench
                summary={summary}
                isMobile={isMobile}
                onOpen={openRoute}
            />

            <CanonicaCustomerFlowChecklist
                summary={summary}
                isMobile={isMobile}
                onOpen={openRoute}
            />

            <Row gutter={[12, 12]}>
                <Col xs={24} lg={16}>
                    <Card title="Launch Checklist">
                        <List
                            dataSource={summary.steps}
                            renderItem={(step) => {
                                const meta = STATUS_META[step.status];
                                const StatusIcon = meta.icon;
                                return (
                                    <List.Item
                                        actions={step.route ? [
                                            <Button
                                                key="action"
                                                type={step.status === 'complete' ? 'text' : 'link'}
                                                icon={<LuExternalLink />}
                                                aria-label={step.actionLabel || `Open ${step.title}`}
                                                onClick={() => openRoute(step.route)}
                                            >
                                                {isMobile ? '' : step.actionLabel || 'Open'}
                                            </Button>,
                                        ] : undefined}
                                    >
                                        <List.Item.Meta
                                            avatar={<span style={{ fontSize: 20 }}>{getStepIcon(step)}</span>}
                                            title={(
                                                <Flex align="center" gap={8} wrap="wrap">
                                                    <Text strong>{step.title}</Text>
                                                    <Tag color={meta.color} icon={<StatusIcon />}>{meta.label}</Tag>
                                                    {!step.required && <Tag>Optional</Tag>}
                                                </Flex>
                                            )}
                                            description={(
                                                <Space direction="vertical" size={4}>
                                                    <Text type="secondary">{step.description}</Text>
                                                </Space>
                                            )}
                                        />
                                    </List.Item>
                                );
                            }}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Flex vertical gap={12}>
                        <CanonicaOperationsPanel
                            isMobile={isMobile}
                            onOpenSettings={() => openRoute(CANONICA_ROUTES.SETTINGS)}
                        />
                        <Card title="Widget Runtime">
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Key</Text>
                                    <Tag color={summary.widget.hasWidgetKey ? 'success' : 'default'}>
                                        {summary.widget.hasWidgetKey ? summary.widget.keyPrefix || 'Created' : 'Missing'}
                                    </Tag>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Allowed origins</Text>
                                    <Text>{summary.widget.allowedOriginCount}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Last seen</Text>
                                    <Text style={{ textAlign: 'right' }}>{formatDateTime(summary.widget.runtimeStatus?.lastSeenAt)}</Text>
                                </Flex>
                                {summary.widget.runtimeStatus?.lastPath && (
                                    <Flex justify="space-between" gap={12}>
                                        <Text type="secondary">Route</Text>
                                        <Text code style={{ whiteSpace: 'normal', textAlign: 'right' }}>{summary.widget.runtimeStatus.lastPath}</Text>
                                    </Flex>
                                )}
                            </Space>
                        </Card>
                        <Card title="Compiled Context">
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Status</Text>
                                    <Tag color={bundleStatusColor[bundleStatus] || 'default'}>
                                        {bundleStatus}
                                    </Tag>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Version</Text>
                                    <Text>{summary.compiledContext?.activeVersion || summary.compiledContext?.bundleVersion || 0}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Context size</Text>
                                    <Text>{Math.round((summary.compiledContext?.stats?.bytesTotal || 0) / 1024)} KB</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Routes</Text>
                                    <Text>{summary.compiledContext?.stats?.routes || 0}</Text>
                                </Flex>
                                {summary.compiledContext?.lastBuildError && (
                                    <Text type="danger">{summary.compiledContext.lastBuildError}</Text>
                                )}
                                <Button
                                    block
                                    icon={<LuDatabase />}
                                    loading={rebuildingContext}
                                    onClick={rebuildCompiledContext}
                                >
                                    Rebuild Context
                                </Button>
                            </Space>
                        </Card>
                        <Card title="Ticket Notifications">
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Email events</Text>
                                    <Tag color={summary.notifications.enabled ? 'success' : 'default'}>
                                        {summary.notifications.enabled ? 'Enabled' : 'Off'}
                                    </Tag>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Sender</Text>
                                    <Tag color={summary.notifications.smtpConfigured ? 'success' : 'warning'}>
                                        {summary.notifications.smtpConfigured ? 'Configured' : 'Missing'}
                                    </Tag>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">From</Text>
                                    <Text style={{ textAlign: 'right', wordBreak: 'break-all' }}>
                                        {summary.notifications.fromAddress || 'Not set'}
                                    </Text>
                                </Flex>
                                <Button
                                    block
                                    icon={<LuMail />}
                                    loading={testingNotification}
                                    disabled={!summary.notifications.enabled || !summary.notifications.smtpConfigured || !summary.workspace.supportEmail}
                                    onClick={testNotifications}
                                >
                                    Send Test Email
                                </Button>
                            </Space>
                        </Card>
                        <Card title="License">
                            <Statistic
                                title={summary.subscription?.planName || 'Plan'}
                                value={summary.subscription?.status || 'Not recorded'}
                            />
                            {summary.subscription?.amount !== null && summary.subscription?.amount !== undefined && (
                                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                                    {summary.subscription.currency || 'INR'} {summary.subscription.amount}
                                </Paragraph>
                            )}
                        </Card>
                        <Card title="Workspace Profile">
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Product URL</Text>
                                    <Text style={{ textAlign: 'right', wordBreak: 'break-all' }}>{summary.workspace.productUrl || 'Missing'}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Support email</Text>
                                    <Text style={{ textAlign: 'right', wordBreak: 'break-all' }}>{summary.workspace.supportEmail || 'Missing'}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Billing model</Text>
                                    <Text>{summary.workspace.billingModel || 'Not set'}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Initial surfaces</Text>
                                    <Text>{summary.workspace.primarySurfaceCount || 0}</Text>
                                </Flex>
                            </Space>
                        </Card>
                        <Card title="Knowledge Health">
                            <Space direction="vertical" size={10} style={{ width: '100%' }}>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Canonical coverage</Text>
                                    <Text>
                                        {summary.governance.canonicalCoverageRate !== null && summary.governance.canonicalCoverageRate !== undefined
                                            ? `${summary.governance.canonicalCoverageRate}%`
                                            : 'Pending'}
                                    </Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Covered answers</Text>
                                    <Text>{summary.governance.canonicalCoverageTotal ?? 0}</Text>
                                </Flex>
                                <Flex justify="space-between" gap={12}>
                                    <Text type="secondary">Trust score</Text>
                                    <Text>
                                        {summary.governance.trustScore !== null && summary.governance.trustScore !== undefined
                                            ? `${summary.governance.trustScore}/100`
                                            : 'Pending'}
                                    </Text>
                                </Flex>
                            </Space>
                        </Card>
                    </Flex>
                </Col>
            </Row>

            <Flex justify={isMobile ? 'stretch' : 'end'} gap={8} vertical={isMobile}>
                <Button onClick={() => openRoute(CANONICA_ROUTES.PRODUCT_SURFACES)} style={{ minHeight: 44 }}>
                    Product Surfaces
                </Button>
                <Button onClick={() => openRoute(CANONICA_ROUTES.WIDGET)} style={{ minHeight: 44 }}>
                    Widget Settings
                </Button>
            </Flex>
        </Flex>
    );
}
