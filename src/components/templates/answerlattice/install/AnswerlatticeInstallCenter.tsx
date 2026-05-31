'use client';

import {
    ANSWERLATTICE_ROUTES,
    ANSWERLATTICE_WIDGET_TABS,
    getAnswerlatticeWidgetRoute,
    toAnswerlatticeDashboardRoute,
} from '@constant/answerlattice/navigations';
import {
    ANSWERLATTICE_FRAMEWORK_SNIPPETS,
    ANSWERLATTICE_WIDGET_SCRIPT_URL,
    buildAnswerlatticeAgentPacketJson,
    buildAnswerlatticeWidgetEmbedSnippet,
    renderAnswerlatticeAgentPrompt,
    renderAnswerlatticeAgentsMd,
    renderAnswerlatticeClaudeMd,
    renderAnswerlatticeCursorRule,
    renderAnswerlatticeCursorRuleMd,
    renderAnswerlatticeWindsurfRule,
} from '@lib/answerlattice/installContract/contract';
import { getAnswerlatticeUiErrorMessage } from '@lib/answerlattice/uiErrors';
import {
    Alert,
    Button,
    Card,
    Col,
    Collapse,
    Descriptions,
    Flex,
    Grid,
    Input,
    List,
    Row,
    Skeleton,
    Space,
    Tag,
    Typography,
    message,
    theme,
} from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuCheckCircle2,
    LuClipboard,
    LuCode,
    LuDownload,
    LuExternalLink,
    LuFileText,
    LuGlobe,
    LuKey,
    LuRefreshCw,
    LuShield,
    LuTerminalSquare,
} from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

type WidgetRuntimeStatus = {
    lastSeenAt?: any;
    lastOrigin?: string | null;
    lastPath?: string | null;
    lastContextKey?: string | null;
    lastFeature?: string | null;
    lastPage?: string | null;
    seenCount?: number;
};

type WidgetConfigResponse = {
    config?: {
        blockedRoutes?: string[];
    };
    allowedOrigins?: string[];
    keyPrefix?: string | null;
    hasWidgetKey?: boolean;
    runtimeStatus?: WidgetRuntimeStatus | null;
    error?: string;
};

type ActivationSummaryResponse = {
    summary?: {
        readinessScore?: number;
        workspace?: {
            productName?: string | null;
            companyName?: string | null;
        };
    };
    error?: string;
};

const AGENT_COPY_BUTTONS = [
    { key: 'agents', label: 'AGENTS.md', render: renderAnswerlatticeAgentsMd },
    { key: 'claude', label: 'CLAUDE.md', render: renderAnswerlatticeClaudeMd },
    { key: 'cursor-rule-md', label: 'Cursor RULE.md', render: renderAnswerlatticeCursorRuleMd },
    { key: 'cursor-mdc', label: 'Cursor .mdc', render: renderAnswerlatticeCursorRule },
    { key: 'windsurf', label: 'Windsurf rule', render: renderAnswerlatticeWindsurfRule },
];

const PUBLIC_DOC_LINKS = [
    { label: 'AI agent Markdown', href: 'https://answerlattice.com/install/ai-agent.md' },
    { label: 'Widget Contract v1', href: 'https://answerlattice.com/install/contracts.md' },
    { label: 'Next.js guide', href: 'https://answerlattice.com/install/frameworks/nextjs.md' },
    { label: 'React guide', href: 'https://answerlattice.com/install/frameworks/react.md' },
    { label: 'Vue guide', href: 'https://answerlattice.com/install/frameworks/vue.md' },
    { label: 'Plain HTML guide', href: 'https://answerlattice.com/install/frameworks/plain-html.md' },
];

const FRAMEWORK_ITEMS = [
    { key: 'nextjs', label: 'Next.js', snippet: ANSWERLATTICE_FRAMEWORK_SNIPPETS.nextjs },
    { key: 'react', label: 'React', snippet: ANSWERLATTICE_FRAMEWORK_SNIPPETS.react },
    { key: 'vue', label: 'Vue', snippet: ANSWERLATTICE_FRAMEWORK_SNIPPETS.vue },
    { key: 'plain-html', label: 'Plain HTML', snippet: ANSWERLATTICE_FRAMEWORK_SNIPPETS['plain-html'] },
    { key: 'shopify', label: 'Shopify-style', snippet: ANSWERLATTICE_FRAMEWORK_SNIPPETS.shopify },
    { key: 'webflow', label: 'Webflow', snippet: ANSWERLATTICE_FRAMEWORK_SNIPPETS.webflow },
];

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

const tagList = (items: string[], emptyText: string) => {
    if (!items.length) return <Text type="secondary">{emptyText}</Text>;
    return (
        <Space wrap size={[6, 6]}>
            {items.map((item) => <Tag key={item}>{item}</Tag>)}
        </Space>
    );
};

export default function AnswerlatticeInstallCenter() {
    const screens = Grid.useBreakpoint();
    const router = useRouter();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [widgetConfig, setWidgetConfig] = useState<WidgetConfigResponse | null>(null);
    const [activationSummary, setActivationSummary] = useState<ActivationSummaryResponse['summary']>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;

    const loadInstallState = useCallback(async (silent = false) => {
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const widgetResponse = await fetch('/api/answerlattice/widget-config', { method: 'GET' });
            const widgetData: WidgetConfigResponse = await widgetResponse.json().catch(() => ({}));
            if (!widgetResponse.ok) {
                throw new Error(widgetData.error || 'Failed to load install setup');
            }
            setWidgetConfig(widgetData);

            const activationResponse = await fetch('/api/answerlattice/activation/summary', { method: 'GET' }).catch(() => null);
            if (activationResponse?.ok) {
                const activationData: ActivationSummaryResponse = await activationResponse.json().catch(() => ({}));
                setActivationSummary(activationData.summary || null);
            }
        } catch (error) {
            message.error(getAnswerlatticeUiErrorMessage(error, 'Could not load install setup'));
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadInstallState();
    }, [loadInstallState]);

    const openDashboardRoute = useCallback((route: string) => {
        router.push(toAnswerlatticeDashboardRoute(route, currentHostname));
    }, [currentHostname, router]);

    const copyText = useCallback(async (value: string, successMessage = 'Copied') => {
        try {
            await navigator.clipboard.writeText(value);
            message.success(successMessage);
        } catch {
            message.error('Unable to copy');
        }
    }, []);

    const allowedOrigins = widgetConfig?.allowedOrigins || [];
    const savedBlockedRoutes = widgetConfig?.config?.blockedRoutes || [];
    const runtimeStatus = widgetConfig?.runtimeStatus || null;
    const workspaceName = activationSummary?.workspace?.productName
        || activationSummary?.workspace?.companyName
        || 'this workspace';
    const contextMarker = runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage || null;

    const agentInput = useMemo(() => ({
        widgetKeyPrefix: widgetConfig?.keyPrefix || null,
        allowedOrigins,
        blockedRoutes: savedBlockedRoutes,
        framework: 'Next.js / React / Vue / Plain HTML / Shopify / Webflow',
        router: 'App Router / Pages Router / React Router / Vue Router / other',
        supportEntryPoints: ['global widget', 'help button', 'sidebar', 'settings page'],
    }), [allowedOrigins, savedBlockedRoutes, widgetConfig?.keyPrefix]);

    const aiPacket = useMemo(() => renderAnswerlatticeAgentPrompt(agentInput), [agentInput]);
    const setupSnapshot = useMemo(() => JSON.stringify(buildAnswerlatticeAgentPacketJson(agentInput), null, 2), [agentInput]);

    const statusItems = [
        {
            key: 'key',
            title: 'Widget key',
            ok: Boolean(widgetConfig?.hasWidgetKey),
            icon: <LuKey />,
            ready: widgetConfig?.keyPrefix || 'Key exists',
            pending: 'Create a widget key before installing.',
        },
        {
            key: 'origins',
            title: 'Allowed origins',
            ok: allowedOrigins.length > 0,
            icon: <LuGlobe />,
            ready: `${allowedOrigins.length} origin${allowedOrigins.length === 1 ? '' : 's'} saved`,
            pending: 'Add production and staging origins.',
        },
        {
            key: 'routes',
            title: 'Blocked routes',
            ok: savedBlockedRoutes.length > 0,
            icon: <LuShield />,
            ready: `${savedBlockedRoutes.length} route rule${savedBlockedRoutes.length === 1 ? '' : 's'} saved`,
            pending: 'Add auth, billing, checkout, and security routes.',
        },
        {
            key: 'runtime',
            title: 'Runtime seen',
            ok: Boolean(runtimeStatus?.lastSeenAt),
            icon: <LuCheckCircle2 />,
            ready: formatDateTime(runtimeStatus?.lastSeenAt),
            pending: 'Open the installed app after saving settings.',
        },
        {
            key: 'context',
            title: 'Context received',
            ok: Boolean(contextMarker),
            icon: <LuTerminalSquare />,
            ready: contextMarker || 'Context marker saved',
            pending: 'Pass safe page context after route changes.',
        },
    ];

    if (loading) {
        return <Skeleton active paragraph={{ rows: 12 }} />;
    }

    if (!widgetConfig) {
        return (
            <Alert
                type="warning"
                showIcon
                message="Install setup is unavailable"
                description="Refresh after Answerlattice Firebase and widget access are configured for this workspace."
                action={<Button onClick={() => loadInstallState(true)}>Retry</Button>}
            />
        );
    }

    return (
        <Flex vertical gap={isMobile ? 14 : 20} style={{ paddingBottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom))' : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>Install Center</Title>
                    <Text type="secondary">
                        One place to install Answerlattice for {workspaceName}, copy the AI packet, and verify the current runtime setup.
                    </Text>
                </div>
                <Space wrap>
                    <Button icon={<LuRefreshCw />} loading={refreshing} onClick={() => loadInstallState(true)} style={{ minHeight: 44 }}>
                        Refresh
                    </Button>
                    <Button icon={<LuExternalLink />} onClick={() => openDashboardRoute(getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.ACCESS))} style={{ minHeight: 44 }}>
                        Keys & Origins
                    </Button>
                    <Button type="primary" icon={<LuClipboard />} onClick={() => copyText(aiPacket, 'AI install packet copied')} style={{ minHeight: 44 }}>
                        Copy AI Packet
                    </Button>
                </Space>
            </Flex>

            <Alert
                type={runtimeStatus?.lastSeenAt ? 'success' : widgetConfig.hasWidgetKey ? 'info' : 'warning'}
                showIcon
                message={runtimeStatus?.lastSeenAt ? 'Answerlattice has seen this install' : widgetConfig.hasWidgetKey ? 'Ready to hand to a coding agent' : 'Create a widget key first'}
                description={runtimeStatus?.lastSeenAt
                    ? `Last seen from ${runtimeStatus.lastOrigin || 'an allowed origin'} on ${runtimeStatus.lastPath || 'a product route'}.`
                    : 'This route stays available for the workspace owner or manager whenever they need the install packet, current settings, or verification steps.'}
            />

            <Row gutter={[12, 12]}>
                {statusItems.map((item) => (
                    <Col xs={24} md={12} xl={8} key={item.key}>
                        <Card>
                            <Flex gap={12} align="flex-start">
                                <span style={{ color: item.ok ? token.colorSuccess : token.colorWarning, fontSize: 20 }}>{item.icon}</span>
                                <div>
                                    <Text strong>{item.title}</Text>
                                    <Paragraph style={{ margin: '4px 0 0' }} type="secondary">
                                        {item.ok ? item.ready : item.pending}
                                    </Paragraph>
                                </div>
                            </Flex>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} xl={14}>
                    <Card title={<Flex align="center" gap={8}><LuCode /> AI install packet</Flex>}>
                        <Flex vertical gap={12}>
                            <Paragraph type="secondary" style={{ margin: 0 }}>
                                Give this to Codex, Claude Code, Cursor, Windsurf, or another coding agent. It uses the saved key prefix, dashboard origins, dashboard blocked routes, v1 script URL, safe context rules, and acceptance checks.
                            </Paragraph>
                            {!widgetConfig.hasWidgetKey ? (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message="Widget key required"
                                    description="Create or copy the al_* widget key from Keys & Origins before a coding agent can complete the install."
                                />
                            ) : null}
                            <Space wrap>
                                <Button icon={<LuClipboard />} onClick={() => copyText(aiPacket, 'AI install packet copied')}>
                                    Copy AI Packet
                                </Button>
                                {AGENT_COPY_BUTTONS.map((item) => (
                                    <Button key={item.key} icon={<LuFileText />} onClick={() => copyText(item.render(), `${item.label} copied`)}>
                                        Copy {item.label}
                                    </Button>
                                ))}
                                <Button icon={<LuDownload />} onClick={() => window.open('/api/answerlattice/widget-agent-kit', '_blank', 'noopener,noreferrer')}>
                                    Download Kit
                                </Button>
                            </Space>
                            <Flex vertical gap={8}>
                                <Flex align="center" justify="space-between" gap={12}>
                                    <Text strong>Agent prompt</Text>
                                    <Button size="small" icon={<LuClipboard />} onClick={() => copyText(aiPacket, 'Agent prompt copied')}>
                                        Copy Prompt
                                    </Button>
                                </Flex>
                                <Input.TextArea
                                    value={aiPacket}
                                    readOnly
                                    rows={14}
                                    style={{ fontFamily: 'monospace', fontSize: 12, background: token.colorFillTertiary, color: token.colorText }}
                                />
                            </Flex>
                        </Flex>
                    </Card>
                </Col>

                <Col xs={24} xl={10}>
                    <Card title="Current setup">
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="Contract">answerlattice-widget-v1</Descriptions.Item>
                            <Descriptions.Item label="Script URL">{ANSWERLATTICE_WIDGET_SCRIPT_URL}</Descriptions.Item>
                            <Descriptions.Item label="Key prefix">{widgetConfig.keyPrefix || 'Not created yet'}</Descriptions.Item>
                            <Descriptions.Item label="Allowed origins">{tagList(allowedOrigins, 'No origins saved')}</Descriptions.Item>
                            <Descriptions.Item label="Blocked routes">{tagList(savedBlockedRoutes, 'No blocked routes saved')}</Descriptions.Item>
                            <Descriptions.Item label="Last route">{runtimeStatus?.lastPath || 'Not seen yet'}</Descriptions.Item>
                            <Descriptions.Item label="Last origin">{runtimeStatus?.lastOrigin || 'Not seen yet'}</Descriptions.Item>
                            <Descriptions.Item label="Seen count">{runtimeStatus?.seenCount || 0}</Descriptions.Item>
                            {activationSummary?.readinessScore !== undefined ? (
                                <Descriptions.Item label="Launch readiness">{activationSummary.readinessScore}%</Descriptions.Item>
                            ) : null}
                        </Descriptions>
                        <Space wrap style={{ marginTop: 16 }}>
                            <Button onClick={() => openDashboardRoute(getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.UI))}>
                                Widget UI
                            </Button>
                            <Button onClick={() => openDashboardRoute(getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.ACCESS))}>
                                Keys & Origins
                            </Button>
                            <Button onClick={() => openDashboardRoute(getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.HOSTED_HELP))}>
                                Hosted Help
                            </Button>
                            <Button onClick={() => openDashboardRoute(ANSWERLATTICE_ROUTES.ACTIVATION)}>
                                Activation
                            </Button>
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Install script">
                        <Input.TextArea
                            value={buildAnswerlatticeWidgetEmbedSnippet(widgetConfig.keyPrefix ? `${widgetConfig.keyPrefix}...` : 'al_your_widget_key', { blockedRoutes: savedBlockedRoutes })}
                            readOnly
                            rows={5}
                            style={{ fontFamily: 'monospace', fontSize: 12, background: token.colorFillTertiary, color: token.colorText }}
                        />
                        <Button style={{ marginTop: 12 }} icon={<LuClipboard />} onClick={() => copyText(buildAnswerlatticeWidgetEmbedSnippet(widgetConfig.keyPrefix ? `${widgetConfig.keyPrefix}...` : 'al_your_widget_key', { blockedRoutes: savedBlockedRoutes }), 'Script snippet copied')}>
                            Copy Snippet
                        </Button>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Setup snapshot">
                        <Input.TextArea
                            value={setupSnapshot}
                            readOnly
                            rows={5}
                            style={{ fontFamily: 'monospace', fontSize: 12, background: token.colorFillTertiary, color: token.colorText }}
                        />
                        <Button style={{ marginTop: 12 }} icon={<LuClipboard />} onClick={() => copyText(setupSnapshot, 'Setup snapshot copied')}>
                            Copy Snapshot
                        </Button>
                    </Card>
                </Col>
            </Row>

            <Card title="Framework guides">
                <Collapse
                    items={FRAMEWORK_ITEMS.map((item) => ({
                        key: item.key,
                        label: item.label,
                        children: (
                            <Input.TextArea
                                value={item.snippet}
                                readOnly
                                rows={12}
                                style={{ fontFamily: 'monospace', fontSize: 12, background: token.colorFillTertiary, color: token.colorText }}
                            />
                        ),
                    }))}
                />
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Verification checklist">
                        <List
                            dataSource={[
                                `Confirm ${ANSWERLATTICE_WIDGET_SCRIPT_URL} loads once.`,
                                'Confirm the widget key is not committed as a raw secret when env vars are available.',
                                'Confirm allowed production and staging origins are saved in Answerlattice.',
                                'Confirm blocked routes are saved in Answerlattice.',
                                'Navigate between routes and confirm safe context changes.',
                                'Open the dashboard after testing and confirm runtime status updates.',
                            ]}
                            renderItem={(item) => (
                                <List.Item>
                                    <Space align="start">
                                        <LuCheckCircle2 color={token.colorSuccess} />
                                        <Text>{item}</Text>
                                    </Space>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title="Machine-readable docs">
                        <List
                            dataSource={PUBLIC_DOC_LINKS}
                            renderItem={(item) => (
                                <List.Item
                                    actions={[
                                        <Button
                                            key="open"
                                            size="small"
                                            icon={<LuExternalLink />}
                                            onClick={() => window.open(item.href, '_blank', 'noopener,noreferrer')}
                                        >
                                            Open
                                        </Button>,
                                    ]}
                                >
                                    <List.Item.Meta title={item.label} description={item.href} />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>
        </Flex>
    );
}
