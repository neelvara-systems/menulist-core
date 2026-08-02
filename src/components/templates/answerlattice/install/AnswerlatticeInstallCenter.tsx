'use client';

import { openIsolatedBrowserUrl } from '@lib/browser/openIsolatedBrowserUrl';

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
import {
    ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
    isAnswerlatticeActivationSummaryResponse,
    readAnswerlatticeActivationDashboardResponse,
} from '@lib/answerlattice/activationDashboardResponseClient';
import {
    copyAnswerlatticeSupportTextToClipboard,
    hasAnswerlatticeSupportClipboardWrite,
    hasAnswerlatticeSupportCopyFallback,
} from '@lib/answerlattice/supportClipboard';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { useAnswerlatticeCacheScope } from '@hook/answerlattice/useAnswerlatticeCacheScope';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import type { AnswerlatticeActivationSummary } from '@type/answerlattice';
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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    lastSeenAt?: unknown;
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
    summary?: AnswerlatticeActivationSummary;
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

const FULL_WIDGET_KEY_PLACEHOLDER = 'al_full_widget_key_shown_once';
const ANSWERLATTICE_INSTALL_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const ANSWERLATTICE_AGENT_KIT_MAX_BYTES = 2 * 1024 * 1024;
const ANSWERLATTICE_AGENT_KIT_CONTENT_TYPE = 'application/zip';
const ANSWERLATTICE_INSTALL_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};
const ANSWERLATTICE_INSTALL_SETUP_LOAD_FAILED = 'Could not load install setup';
const ANSWERLATTICE_INSTALL_LINK_OPEN_FAILED = 'Could not open install link';
const ANSWERLATTICE_INSTALL_KIT_DOWNLOAD_FAILED = 'Could not download install kit';
const ANSWERLATTICE_INSTALL_COPY_CLIPBOARD_UNAVAILABLE = 'answerlattice_install_copy_clipboard_unavailable';
const ANSWERLATTICE_INSTALL_COPY_FALLBACK_FAILED = 'answerlattice_install_copy_fallback_failed';
const INSTALL_ACTION_STYLE = {
    minHeight: 44,
    height: 'auto',
    whiteSpace: 'normal' as const,
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isStringArray = (value: unknown): value is string[] => (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
);

const isNullableBoundedString = (value: unknown, maxLength: number) => (
    value === undefined
    || value === null
    || (typeof value === 'string' && value.length <= maxLength)
);

const isWidgetRuntimeTimestamp = (value: unknown) => {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.length <= 64 && Number.isFinite(Date.parse(value));
    if (typeof value === 'number') return Number.isFinite(value) && value >= 0;
    if (!isRecord(value)) return false;
    const seconds = value.seconds ?? value._seconds;
    const nanoseconds = value.nanoseconds ?? value._nanoseconds ?? 0;
    return typeof seconds === 'number'
        && Number.isFinite(seconds)
        && seconds >= 0
        && typeof nanoseconds === 'number'
        && Number.isFinite(nanoseconds)
        && nanoseconds >= 0
        && nanoseconds < 1_000_000_000;
};

const isWidgetRuntimeStatus = (value: unknown): value is WidgetRuntimeStatus => {
    if (!isRecord(value)) return false;
    return (
        isWidgetRuntimeTimestamp(value.lastSeenAt)
        && isNullableBoundedString(value.lastOrigin, 180)
        && isNullableBoundedString(value.lastPath, 180)
        && isNullableBoundedString(value.lastContextKey, 120)
        && isNullableBoundedString(value.lastFeature, 120)
        && isNullableBoundedString(value.lastPage, 120)
        && (
            value.seenCount === undefined
            || (
                typeof value.seenCount === 'number'
                && Number.isSafeInteger(value.seenCount)
                && value.seenCount >= 0
            )
        )
    );
};

const isWidgetConfigResponse = (value: unknown): value is WidgetConfigResponse => {
    if (!isRecord(value)) return false;
    const config = value.config;
    return (
        (
            config === undefined
            || (
                isRecord(config)
                && (
                    config.blockedRoutes === undefined
                    || (
                        isStringArray(config.blockedRoutes)
                        && config.blockedRoutes.length <= 50
                        && config.blockedRoutes.every((route) => route.length <= 180)
                    )
                )
            )
        )
        && (
            value.allowedOrigins === undefined
            || (
                isStringArray(value.allowedOrigins)
                && value.allowedOrigins.length <= 25
                && value.allowedOrigins.every((origin) => origin.length <= 300)
            )
        )
        && isNullableBoundedString(value.keyPrefix, 120)
        && (value.hasWidgetKey === undefined || typeof value.hasWidgetKey === 'boolean')
        && (value.runtimeStatus === undefined || value.runtimeStatus === null || isWidgetRuntimeStatus(value.runtimeStatus))
        && isNullableBoundedString(value.error, 256)
    );
};

const getInstallResponseLogContext = (response: Response, responseKind: string) => ({
    surface: 'answerlattice_install_center',
    ...getBoundedRuntimeStringContext('responseKind', responseKind),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readInstallWidgetConfigResponse = async (response: Response): Promise<WidgetConfigResponse> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_INSTALL_RESPONSE_JSON_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure(
            'answerlattice_install_widget_config_response_parse_failed',
            error,
            getInstallResponseLogContext(response, 'widget_config'),
        );
        throw new Error(ANSWERLATTICE_INSTALL_SETUP_LOAD_FAILED);
    }

    if (!response.ok) {
        logRuntimeFailure(
            'answerlattice_install_widget_config_response_rejected',
            undefined,
            getInstallResponseLogContext(response, 'widget_config'),
        );
        throw new Error(ANSWERLATTICE_INSTALL_SETUP_LOAD_FAILED);
    }

    if (!isWidgetConfigResponse(payload)) {
        logRuntimeFailure(
            'answerlattice_install_widget_config_response_invalid',
            undefined,
            getInstallResponseLogContext(response, 'widget_config'),
        );
        throw new Error(ANSWERLATTICE_INSTALL_SETUP_LOAD_FAILED);
    }

    return payload;
};

const formatDateTime = (value: unknown): string => {
    if (!value) return 'Not seen yet';
    const timestamp = isRecord(value)
        ? value.seconds ?? value._seconds
        : null;
    const date = typeof timestamp === 'number'
        ? new Date(timestamp * 1000)
        : new Date(value as string | number);
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
    const cacheScopeKey = useAnswerlatticeCacheScope();
    const screens = Grid.useBreakpoint();
    const router = useRouter();
    const { token } = theme.useToken();
    const isMobile = screens.md !== true;
    const [widgetConfig, setWidgetConfig] = useState<WidgetConfigResponse | null>(null);
    const [activationSummary, setActivationSummary] = useState<ActivationSummaryResponse['summary'] | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [downloadingKit, setDownloadingKit] = useState(false);
    const [loadedScopeKey, setLoadedScopeKey] = useState<string | null>(null);
    const currentScopeKeyRef = useRef(cacheScopeKey);
    const loadRequestRef = useRef(0);
    currentScopeKeyRef.current = cacheScopeKey;
    const scopeIsCurrent = Boolean(cacheScopeKey && loadedScopeKey === cacheScopeKey);

    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;

    const loadInstallState = useCallback(async (silent = false) => {
        const requestScopeKey = cacheScopeKey;
        const requestId = loadRequestRef.current + 1;
        loadRequestRef.current = requestId;
        if (!requestScopeKey) {
            setWidgetConfig(null);
            setActivationSummary(null);
            setLoadedScopeKey(null);
            setLoading(false);
            setRefreshing(false);
            return;
        }
        if (silent) {
            setRefreshing(true);
        } else {
            setLoading(true);
            setWidgetConfig(null);
            setActivationSummary(null);
            setLoadedScopeKey(null);
            setDownloadingKit(false);
        }

        try {
            const widgetResponse = await fetch('/api/answerlattice/widget-config', {
                ...ANSWERLATTICE_INSTALL_REQUEST_POLICY,
                method: 'GET',
            });
            const widgetData = await readInstallWidgetConfigResponse(widgetResponse);
            if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
            setWidgetConfig(widgetData);

            let activationResponse: Response | null = null;
            try {
                activationResponse = await fetch('/api/answerlattice/activation/summary', {
                    ...ANSWERLATTICE_ACTIVATION_DASHBOARD_REQUEST_POLICY,
                    method: 'GET',
                });
            } catch (error) {
                logRuntimeFailure('answerlattice_install_activation_summary_request_failed', error, {
                    surface: 'answerlattice_install_center',
                });
            }

            if (activationResponse) {
                try {
                    const activationData = await readAnswerlatticeActivationDashboardResponse(
                        activationResponse,
                        'activation_summary_load',
                        isAnswerlatticeActivationSummaryResponse,
                        ANSWERLATTICE_INSTALL_SETUP_LOAD_FAILED,
                    );
                    if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
                    setActivationSummary(activationData.summary);
                } catch (error) {
                    if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
                    logRuntimeFailure('answerlattice_install_activation_summary_response_failed', error, {
                        surface: 'answerlattice_install_center',
                    });
                    setActivationSummary(null);
                }
            }
            if (currentScopeKeyRef.current === requestScopeKey && loadRequestRef.current === requestId) {
                setLoadedScopeKey(requestScopeKey);
            }
        } catch (error) {
            if (currentScopeKeyRef.current !== requestScopeKey || loadRequestRef.current !== requestId) return;
            setWidgetConfig(null);
            setActivationSummary(null);
            setLoadedScopeKey(requestScopeKey);
            logRuntimeFailure('answerlattice_install_setup_load_failed', error, {
                surface: 'answerlattice_install_center',
            });
            message.error(ANSWERLATTICE_INSTALL_SETUP_LOAD_FAILED);
        } finally {
            if (currentScopeKeyRef.current === requestScopeKey && loadRequestRef.current === requestId) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [cacheScopeKey]);

    useEffect(() => {
        loadInstallState();
    }, [loadInstallState]);

    const openDashboardRoute = useCallback((route: string) => {
        router.push(toAnswerlatticeDashboardRoute(route, currentHostname));
    }, [currentHostname, router]);

    const copyText = useCallback(async (value: string, successMessage = 'Copied') => {
        try {
            await copyAnswerlatticeSupportTextToClipboard(value, {
                unavailable: ANSWERLATTICE_INSTALL_COPY_CLIPBOARD_UNAVAILABLE,
                fallbackFailed: ANSWERLATTICE_INSTALL_COPY_FALLBACK_FAILED,
            });
            message.success(successMessage);
        } catch (error) {
            logRuntimeFailure('answerlattice_install_copy_failed', error, {
                surface: 'answerlattice_install_center',
                hasClipboardWrite: hasAnswerlatticeSupportClipboardWrite(),
                hasCopyFallback: hasAnswerlatticeSupportCopyFallback(),
                ...getBoundedRuntimeStringContext('copyValue', value),
                ...getBoundedRuntimeStringContext('successMessage', successMessage),
            });
            message.error('Unable to copy');
        }
    }, []);

    const openInstallLink = useCallback((href: string, linkKey: string, linkLabel: string) => {
        try {
            openIsolatedBrowserUrl(href);
        } catch (error) {
            logRuntimeFailure('answerlattice_install_link_open_failed', error, {
                surface: 'answerlattice_install_center',
                ...getBoundedRuntimeStringContext('linkHref', href),
                ...getBoundedRuntimeStringContext('linkKey', linkKey),
                ...getBoundedRuntimeStringContext('linkLabel', linkLabel),
            });
            message.error(ANSWERLATTICE_INSTALL_LINK_OPEN_FAILED);
        }
    }, []);

    const downloadAgentKit = useCallback(async () => {
        const requestScopeKey = cacheScopeKey;
        if (!requestScopeKey || !scopeIsCurrent || downloadingKit) return;
        setDownloadingKit(true);
        try {
            const response = await fetch('/api/answerlattice/widget-agent-kit', {
                ...ANSWERLATTICE_INSTALL_REQUEST_POLICY,
                method: 'GET',
            });
            const contentType = response.headers.get('content-type') || '';
            const declaredLength = Number(response.headers.get('content-length') || 0);
            if (
                !response.ok
                || !contentType.toLowerCase().includes(ANSWERLATTICE_AGENT_KIT_CONTENT_TYPE)
                || !Number.isFinite(declaredLength)
                || declaredLength < 0
                || declaredLength > ANSWERLATTICE_AGENT_KIT_MAX_BYTES
            ) {
                throw new Error('answerlattice_install_kit_response_invalid');
            }

            const blob = await response.blob();
            if (blob.size === 0 || blob.size > ANSWERLATTICE_AGENT_KIT_MAX_BYTES) {
                throw new Error('answerlattice_install_kit_size_invalid');
            }
            if (currentScopeKeyRef.current !== requestScopeKey) return;

            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = objectUrl;
            anchor.download = 'answerlattice-agent-kit.zip';
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
        } catch (error) {
            if (currentScopeKeyRef.current !== requestScopeKey) return;
            logRuntimeFailure('answerlattice_install_kit_download_failed', error, {
                surface: 'answerlattice_install_center',
            });
            message.error(ANSWERLATTICE_INSTALL_KIT_DOWNLOAD_FAILED);
        } finally {
            if (currentScopeKeyRef.current === requestScopeKey) setDownloadingKit(false);
        }
    }, [cacheScopeKey, downloadingKit, scopeIsCurrent]);

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
    const installSnippet = useMemo(() => (
        buildAnswerlatticeWidgetEmbedSnippet(FULL_WIDGET_KEY_PLACEHOLDER, { blockedRoutes: savedBlockedRoutes })
    ), [savedBlockedRoutes]);

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

    if (loading || !scopeIsCurrent) {
        return <Skeleton active paragraph={{ rows: 12 }} />;
    }

    if (!widgetConfig) {
        return (
            <Alert
                type="warning"
                showIcon
                message="Install setup is unavailable"
                description="Refresh after this Answerlattice workspace and widget access are fully connected."
                action={<Button style={INSTALL_ACTION_STYLE} onClick={() => loadInstallState(true)}>Retry</Button>}
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
                    <Button icon={<LuRefreshCw />} loading={refreshing} onClick={() => loadInstallState(true)} style={INSTALL_ACTION_STYLE}>
                        Refresh
                    </Button>
                    <Button icon={<LuExternalLink />} onClick={() => openDashboardRoute(getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.ACCESS))} style={INSTALL_ACTION_STYLE}>
                        Keys & Origins
                    </Button>
                    <Button type="primary" icon={<LuClipboard />} onClick={() => copyText(aiPacket, 'AI install packet copied')} style={INSTALL_ACTION_STYLE}>
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
                                Give this to Codex, Claude Code, Cursor, Windsurf, or another coding agent. It includes the install placeholder, saved-key identifier, dashboard origins, dashboard blocked routes, v1 script URL, safe context rules, and acceptance checks.
                            </Paragraph>
                            {!widgetConfig.hasWidgetKey ? (
                                <Alert
                                    type="warning"
                                    showIcon
                                    message="Widget key required"
                                    description="Create a widget key in Keys & Origins and save the full one-time al_* value before a coding agent completes the install."
                                />
                            ) : null}
                            <Space wrap>
                                <Button style={INSTALL_ACTION_STYLE} icon={<LuClipboard />} onClick={() => copyText(aiPacket, 'AI install packet copied')}>
                                    Copy AI Packet
                                </Button>
                                {AGENT_COPY_BUTTONS.map((item) => (
                                    <Button style={INSTALL_ACTION_STYLE} key={item.key} icon={<LuFileText />} onClick={() => copyText(item.render(), `${item.label} copied`)}>
                                        Copy {item.label}
                                    </Button>
                                ))}
                                <Button
                                    style={INSTALL_ACTION_STYLE}
                                    icon={<LuDownload />}
                                    loading={downloadingKit}
                                    onClick={downloadAgentKit}
                                >
                                    Download Kit
                                </Button>
                            </Space>
                            <Flex vertical gap={8}>
                                <Flex align="center" justify="space-between" gap={12}>
                                    <Text strong>Agent prompt</Text>
                                    <Button style={INSTALL_ACTION_STYLE} icon={<LuClipboard />} onClick={() => copyText(aiPacket, 'Agent prompt copied')}>
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
                            <Descriptions.Item label="Saved key identifier">{widgetConfig.keyPrefix || 'Not created yet'}</Descriptions.Item>
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
                            <Button style={INSTALL_ACTION_STYLE} onClick={() => openDashboardRoute(getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.UI))}>
                                Widget UI
                            </Button>
                            <Button style={INSTALL_ACTION_STYLE} onClick={() => openDashboardRoute(getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.ACCESS))}>
                                Keys & Origins
                            </Button>
                            <Button style={INSTALL_ACTION_STYLE} onClick={() => openDashboardRoute(getAnswerlatticeWidgetRoute(ANSWERLATTICE_WIDGET_TABS.HOSTED_HELP))}>
                                Hosted Help
                            </Button>
                            <Button style={INSTALL_ACTION_STYLE} onClick={() => openDashboardRoute(ANSWERLATTICE_ROUTES.ACTIVATION)}>
                                Activation
                            </Button>
                        </Space>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Install script">
                        <Alert
                            type={widgetConfig.hasWidgetKey ? 'info' : 'warning'}
                            showIcon
                            style={{ marginBottom: 12 }}
                            message={widgetConfig.hasWidgetKey ? 'Snippet uses a placeholder key' : 'Create a widget key before install'}
                            description={widgetConfig.hasWidgetKey
                                ? 'Replace the placeholder with the full al_* value shown immediately after creating a key. The prefix shown in this dashboard is only for identifying the saved key later.'
                                : 'Widget keys are shown once after creation. Create one in Keys & Origins, store it in your app environment, then use this snippet.'}
                        />
                        <Input.TextArea
                            value={installSnippet}
                            readOnly
                            rows={5}
                            style={{ fontFamily: 'monospace', fontSize: 12, background: token.colorFillTertiary, color: token.colorText }}
                        />
                        <Button style={{ ...INSTALL_ACTION_STYLE, marginTop: 12 }} icon={<LuClipboard />} onClick={() => copyText(installSnippet, 'Script snippet copied')}>
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
                        <Button style={{ ...INSTALL_ACTION_STYLE, marginTop: 12 }} icon={<LuClipboard />} onClick={() => copyText(setupSnapshot, 'Setup snapshot copied')}>
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
                                            style={INSTALL_ACTION_STYLE}
                                            icon={<LuExternalLink />}
                                            onClick={() => openInstallLink(item.href, item.label, item.label)}
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
