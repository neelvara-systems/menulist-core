'use client';

import {
    Alert,
    Button,
    Card,
    Col,
    ColorPicker,
    Flex,
    Grid,
    Input,
    InputNumber,
    message,
    Row,
    Segmented,
    Select,
    Skeleton,
    Tag,
    Tabs,
    Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuClipboard,
    LuCode,
    LuCopy,
    LuGlobe,
    LuKey,
    LuMonitor,
    LuPalette,
    LuRefreshCw,
    LuSave,
    LuSettings,
    LuShield,
    LuSmartphone,
    LuTrash2,
    LuEyeOff,
} from 'react-icons/lu';
import {
    CanonicaWidgetConfig,
    DEFAULT_CANONICA_WIDGET_CONFIG,
    buildCanonicaWidgetEmbedCode,
    buildCanonicaWidgetRouteSnippet,
    normalizeWidgetBlockedRoute,
    normalizeWidgetAllowedOrigin,
    normalizeWidgetAllowedOrigins,
    normalizeWidgetConfig,
} from '@lib/canonica/widgetConfig';
import type { CanonicaWidgetRuntimeStatus } from '@type/canonica';

const { Title, Text, Paragraph } = Typography;

type SnippetType = 'html' | 'spa' | 'next';

type CanonicaWidgetManagementProps = {
    embeddedMobile?: boolean;
};

type WidgetConfigResponse = {
    config?: Partial<CanonicaWidgetConfig>;
    allowedOrigins?: string[];
    keyPrefix?: string | null;
    hasWidgetKey?: boolean;
    runtimeStatus?: CanonicaWidgetRuntimeStatus | null;
};

const CONTROL_LABEL_STYLE = { fontSize: 12 } as const;

const formatRuntimeDate = (value: any): string => {
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

export default function CanonicaWidgetManagement({ embeddedMobile = false }: CanonicaWidgetManagementProps) {
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [generatingKey, setGeneratingKey] = useState(false);
    const [config, setConfig] = useState<CanonicaWidgetConfig>(DEFAULT_CANONICA_WIDGET_CONFIG);
    const [origins, setOrigins] = useState<string[]>([]);
    const [newOrigin, setNewOrigin] = useState('');
    const [newBlockedRoute, setNewBlockedRoute] = useState('');
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [keyPrefix, setKeyPrefix] = useState<string | null>(null);
    const [hasWidgetKey, setHasWidgetKey] = useState(false);
    const [runtimeStatus, setRuntimeStatus] = useState<CanonicaWidgetRuntimeStatus | null>(null);
    const [snippetType, setSnippetType] = useState<SnippetType>('html');
    const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [scriptSrc, setScriptSrc] = useState('https://canonica.app/widget/canonica-widget.js');
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setScriptSrc(`${window.location.origin}/widget/canonica-widget.js`);
        }
    }, []);

    const loadSettings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/canonica/widget-config', { method: 'GET' });
            const data: WidgetConfigResponse = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((data as any).error || 'Failed to load widget settings');
            setConfig(normalizeWidgetConfig(data.config));
            setOrigins(normalizeWidgetAllowedOrigins(data.allowedOrigins));
            setKeyPrefix(data.keyPrefix || null);
            setHasWidgetKey(Boolean(data.hasWidgetKey));
            setRuntimeStatus(data.runtimeStatus || null);
            setDirty(false);
        } catch (error: any) {
            message.error(error?.message || 'Failed to load widget settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const updateConfig = useCallback(<K extends keyof CanonicaWidgetConfig>(
        key: K,
        value: CanonicaWidgetConfig[K],
    ) => {
        setConfig(prev => normalizeWidgetConfig({ ...prev, [key]: value }));
        setDirty(true);
    }, []);

    const handleSave = useCallback(async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/canonica/widget-config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config, allowedOrigins: origins }),
            });
            const data: WidgetConfigResponse = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error((data as any).error || 'Failed to save widget settings');
            setConfig(normalizeWidgetConfig(data.config));
            setOrigins(normalizeWidgetAllowedOrigins(data.allowedOrigins));
            if ('runtimeStatus' in data) {
                setRuntimeStatus(data.runtimeStatus || null);
            }
            setDirty(false);
            message.success('Widget settings saved');
        } catch (error: any) {
            message.error(error?.message || 'Failed to save widget settings');
        } finally {
            setSaving(false);
        }
    }, [config, origins]);

    const handleGenerateKey = useCallback(async () => {
        setGeneratingKey(true);
        try {
            const res = await fetch('/api/canonica/widget-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.apiKey) throw new Error(data.error || 'Failed to create widget key');
            setApiKey(data.apiKey);
            setKeyPrefix(data.keyPrefix || data.apiKey.slice(0, 7));
            setHasWidgetKey(true);
            message.success('Widget key created');
        } catch (error: any) {
            message.error(error?.message || 'Failed to create widget key');
        } finally {
            setGeneratingKey(false);
        }
    }, []);

    const handleRevokeKey = useCallback(async () => {
        try {
            const res = await fetch('/api/canonica/widget-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'Failed to revoke widget key');
            setApiKey(null);
            setKeyPrefix(null);
            setHasWidgetKey(false);
            message.success('Widget key revoked');
        } catch (error: any) {
            message.error(error?.message || 'Failed to revoke widget key');
        }
    }, []);

    const addOrigin = useCallback(() => {
        const normalized = normalizeWidgetAllowedOrigin(newOrigin);
        if (!normalized) {
            message.error('Enter a valid URL');
            return;
        }
        if (origins.includes(normalized)) {
            message.info('Origin already added');
            return;
        }
        setOrigins(prev => [...prev, normalized]);
        setNewOrigin('');
        setDirty(true);
    }, [newOrigin, origins]);

    const removeOrigin = useCallback((origin: string) => {
        setOrigins(prev => prev.filter(item => item !== origin));
        setDirty(true);
    }, []);

    const addBlockedRoute = useCallback(() => {
        const normalized = normalizeWidgetBlockedRoute(newBlockedRoute);
        if (!normalized) {
            message.error('Enter a valid route, for example /help-center or /help-center/*');
            return;
        }
        if (config.blockedRoutes.includes(normalized)) {
            message.info('Route already blocked');
            return;
        }
        updateConfig('blockedRoutes', [...config.blockedRoutes, normalized]);
        setNewBlockedRoute('');
    }, [config.blockedRoutes, newBlockedRoute, updateConfig]);

    const removeBlockedRoute = useCallback((route: string) => {
        updateConfig('blockedRoutes', config.blockedRoutes.filter(item => item !== route));
    }, [config.blockedRoutes, updateConfig]);

    const embedCode = useMemo(() => buildCanonicaWidgetEmbedCode({ apiKey, config, scriptSrc }), [apiKey, config, scriptSrc]);
    const spaSnippet = useMemo(() => buildCanonicaWidgetRouteSnippet(), []);
    const nextSnippet = useMemo(() => [
        "'use client';",
        '',
        "import { useEffect } from 'react';",
        "import { usePathname } from 'next/navigation';",
        '',
        'export function CanonicaRouteContext() {',
        '  const pathname = usePathname();',
        '  useEffect(() => {',
        "    const contextKey = pathname.replace(/^\\//, '').replace(/\\//g, '_') || 'home';",
        '    window.CanonicaWidget?.page({',
        '      contextVersion: 1,',
        '      contextKey,',
        "      feature: pathname.split('/')[1] || 'app',",
        "      page: contextKey,",
        '    });',
        '  }, [pathname]);',
        '  return null;',
        '}',
    ].join('\n'), []);

    const activeSnippet = snippetType === 'html' ? embedCode : snippetType === 'spa' ? spaSnippet : nextSnippet;
    const widgetSeen = Boolean(runtimeStatus?.lastSeenAt);
    const contextSeen = Boolean(runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage);

    const copyText = useCallback(async (value: string, successMessage = 'Copied') => {
        try {
            await navigator.clipboard.writeText(value);
            message.success(successMessage);
        } catch {
            message.error('Unable to copy');
        }
    }, []);

    if (loading) {
        return <Skeleton active paragraph={{ rows: 8 }} />;
    }

    return (
        <Flex vertical gap={isMobile ? 14 : 20} style={{ paddingBottom: isMobile ? (embeddedMobile ? 128 : 76) : 0 }}>
            <Flex align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12} vertical={isMobile}>
                <div>
                    <Title level={4} style={{ margin: 0 }}>Widget Management</Title>
                    <Text type="secondary">Install, configure, and secure the Canonica help widget.</Text>
                </div>
                <Flex gap={8} wrap="wrap">
                    <Button icon={<LuRefreshCw size={14} />} onClick={loadSettings}>
                        Refresh
                    </Button>
                    <Button type="primary" icon={<LuSave size={14} />} loading={saving} onClick={handleSave}>
                        Save
                    </Button>
                </Flex>
            </Flex>

            {dirty && (
                <Alert
                    type="warning"
                    showIcon
                    message="Unsaved widget changes"
                    description="Save before testing the installed widget. Existing installs read the latest dashboard config through the runtime config endpoint."
                />
            )}

            <Tabs
                type={isMobile ? 'line' : 'card'}
                size={isMobile ? 'small' : 'middle'}
                items={[
                    {
                        key: 'ui',
                        label: 'UI Configuration',
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24} lg={14}>
                                    <Card title={<Flex align="center" gap={8}><LuPalette size={16} /> Appearance</Flex>}>
                                        <Row gutter={[14, 14]}>
                                            <Col xs={24} sm={12}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Position</Text>
                                                    <Select
                                                        value={config.position}
                                                        onChange={(value) => updateConfig('position', value)}
                                                        options={[
                                                            { value: 'bottom-right', label: 'Bottom right' },
                                                            { value: 'bottom-left', label: 'Bottom left' },
                                                            { value: 'top-right', label: 'Top right' },
                                                            { value: 'top-left', label: 'Top left' },
                                                        ]}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={12}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Accent Color</Text>
                                                    <ColorPicker
                                                        value={config.accentColor}
                                                        onChange={(_, hex) => updateConfig('accentColor', hex)}
                                                        showText
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={12}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Shape</Text>
                                                    <Segmented
                                                        block
                                                        value={config.shape}
                                                        onChange={(value) => updateConfig('shape', value as CanonicaWidgetConfig['shape'])}
                                                        options={[
                                                            { value: 'rounded', label: 'Circle' },
                                                            { value: 'pill', label: 'Pill' },
                                                        ]}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={12}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Display</Text>
                                                    <Segmented
                                                        block
                                                        value={config.display}
                                                        onChange={(value) => updateConfig('display', value as CanonicaWidgetConfig['display'])}
                                                        options={[
                                                            { value: 'icon', label: 'Icon' },
                                                            { value: 'text', label: 'Text' },
                                                            { value: 'icon-text', label: 'Icon + Text' },
                                                        ]}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={8}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Label</Text>
                                                    <Input
                                                        value={config.label}
                                                        maxLength={24}
                                                        onChange={(event) => updateConfig('label', event.target.value || '?')}
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={24} sm={16}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Greeting</Text>
                                                    <Input
                                                        value={config.greeting}
                                                        maxLength={120}
                                                        onChange={(event) => updateConfig('greeting', event.target.value || DEFAULT_CANONICA_WIDGET_CONFIG.greeting)}
                                                        placeholder="How can we help?"
                                                    />
                                                </Flex>
                                            </Col>
                                            <Col xs={12} sm={8}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Offset X</Text>
                                                    <InputNumber value={config.offsetX} min={0} max={200} style={{ width: '100%' }} onChange={(value) => updateConfig('offsetX', Number(value ?? 20))} />
                                                </Flex>
                                            </Col>
                                            <Col xs={12} sm={8}>
                                                <Flex vertical gap={4}>
                                                    <Text strong style={CONTROL_LABEL_STYLE}>Offset Y</Text>
                                                    <InputNumber value={config.offsetY} min={0} max={200} style={{ width: '100%' }} onChange={(value) => updateConfig('offsetY', Number(value ?? 20))} />
                                                </Flex>
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={10}>
                                    <Card title={<Flex align="center" gap={8}><LuSettings size={16} /> Behavior</Flex>}>
                                        <Flex vertical gap={14}>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>History</Text>
                                                <Segmented
                                                    block
                                                    value={config.historyMode}
                                                    onChange={(value) => updateConfig('historyMode', value as CanonicaWidgetConfig['historyMode'])}
                                                    options={[
                                                        { value: 'session', label: 'Keep on page' },
                                                        { value: 'forget', label: 'Clear on close' },
                                                    ]}
                                                />
                                            </Flex>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Launcher</Text>
                                                <Segmented
                                                    block
                                                    value={config.launcherVisibility}
                                                    onChange={(value) => updateConfig('launcherVisibility', value as CanonicaWidgetConfig['launcherVisibility'])}
                                                    options={[
                                                        { value: 'visible', label: 'Visible' },
                                                        { value: 'manual', label: 'Manual only' },
                                                    ]}
                                                />
                                            </Flex>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Mobile</Text>
                                                <Segmented
                                                    block
                                                    value={config.mobileVisibility}
                                                    onChange={(value) => updateConfig('mobileVisibility', value as CanonicaWidgetConfig['mobileVisibility'])}
                                                    options={[
                                                        { value: 'show', label: 'Show' },
                                                        { value: 'hide', label: 'Hide' },
                                                    ]}
                                                />
                                            </Flex>
                                            <Flex vertical gap={4}>
                                                <Text strong style={CONTROL_LABEL_STYLE}>Z-index</Text>
                                                <InputNumber value={config.zIndex} min={1000} max={2147483646} style={{ width: '100%' }} onChange={(value) => updateConfig('zIndex', Number(value ?? DEFAULT_CANONICA_WIDGET_CONFIG.zIndex))} />
                                            </Flex>
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24}>
                                    <Card
                                        title={<Flex align="center" gap={8}>{previewMode === 'desktop' ? <LuMonitor size={16} /> : <LuSmartphone size={16} />} Preview</Flex>}
                                        extra={(
                                            <Segmented
                                                value={previewMode}
                                                onChange={(value) => setPreviewMode(value as 'desktop' | 'mobile')}
                                                options={[
                                                    { value: 'desktop', label: 'Desktop' },
                                                    { value: 'mobile', label: 'Mobile' },
                                                ]}
                                            />
                                        )}
                                    >
                                        <Flex vertical gap={12}>
                                            <WidgetPreview config={config} mode={previewMode} />
                                            <PageAwarePreview />
                                        </Flex>
                                    </Card>
                                </Col>
                            </Row>
                        ),
                    },
                    {
                        key: 'install',
                        label: 'Install & Embed',
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24}>
                                    <Card
                                        title={<Flex align="center" gap={8}><LuCode size={16} /> Install Code</Flex>}
                                        extra={<Button size="small" icon={<LuClipboard size={14} />} onClick={() => copyText(activeSnippet, 'Install code copied')}>Copy</Button>}
                                    >
                                        <Flex vertical gap={12}>
                                            <Segmented
                                                value={snippetType}
                                                onChange={(value) => setSnippetType(value as SnippetType)}
                                                options={[
                                                    { value: 'html', label: 'HTML' },
                                                    { value: 'spa', label: 'Route Context' },
                                                    { value: 'next', label: 'Next.js' },
                                                ]}
                                            />
                                            <Input.TextArea
                                                value={activeSnippet}
                                                readOnly
                                                rows={snippetType === 'html' ? 8 : 11}
                                                style={{ fontFamily: 'monospace', fontSize: 12, background: '#f9fafb', color: '#111827' }}
                                            />
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                The script reads saved dashboard settings automatically. Script attributes are still supported for per-environment overrides.
                                            </Text>
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24}>
                                    <Card title={<Flex align="center" gap={8}><LuShield size={16} /> Install Verification</Flex>}>
                                        <Row gutter={[12, 12]}>
                                            <Col xs={24} md={8}>
                                                <Alert
                                                    type={widgetSeen ? 'success' : 'warning'}
                                                    showIcon
                                                    message={widgetSeen ? 'Widget loaded recently' : 'Widget not seen yet'}
                                                    description={widgetSeen
                                                        ? `Last seen ${formatRuntimeDate(runtimeStatus?.lastSeenAt)}.`
                                                        : 'Install the script and open your product once to verify the widget loads.'}
                                                />
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Alert
                                                    type={contextSeen ? 'success' : 'info'}
                                                    showIcon
                                                    message={contextSeen ? 'Page context received' : 'Page context not received yet'}
                                                    description={contextSeen
                                                        ? runtimeStatus?.lastContextKey || runtimeStatus?.lastFeature || runtimeStatus?.lastPage || 'Context marker saved.'
                                                        : 'Add the route context snippet so Canonica can answer for the current screen.'}
                                                />
                                            </Col>
                                            <Col xs={24} md={8}>
                                                <Flex vertical gap={6}>
                                                    <Flex justify="space-between" gap={12}>
                                                        <Text type="secondary">Last route</Text>
                                                        <Text strong style={{ wordBreak: 'break-all', textAlign: 'right' }}>{runtimeStatus?.lastPath || 'Not seen yet'}</Text>
                                                    </Flex>
                                                    <Flex justify="space-between" gap={12}>
                                                        <Text type="secondary">Last origin</Text>
                                                        <Text strong style={{ wordBreak: 'break-all', textAlign: 'right' }}>{runtimeStatus?.lastOrigin || 'Not seen yet'}</Text>
                                                    </Flex>
                                                    <Flex justify="space-between" gap={12}>
                                                        <Text type="secondary">Seen count</Text>
                                                        <Text strong>{runtimeStatus?.seenCount || 0}</Text>
                                                    </Flex>
                                                </Flex>
                                            </Col>
                                        </Row>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={12}>
                                    <Card title={<Flex align="center" gap={8}><LuCode size={16} /> Page Context</Flex>}>
                                        <Flex vertical gap={12}>
                                            <Paragraph style={{ margin: 0 }}>
                                                Send a stable contextKey plus page, feature, workflow, and entity hints after route changes. Do not send account IDs, emails, phone numbers, or tenant/store IDs.
                                            </Paragraph>
                                            <Input.TextArea
                                                value={spaSnippet}
                                                readOnly
                                                rows={7}
                                                style={{ fontFamily: 'monospace', fontSize: 12, background: '#f9fafb', color: '#111827' }}
                                            />
                                            <Button icon={<LuCopy size={14} />} onClick={() => copyText(spaSnippet, 'Context snippet copied')} style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
                                                Copy Context Snippet
                                            </Button>
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={12}>
                                    <Card title={<Flex align="center" gap={8}><LuRefreshCw size={16} /> Runtime Updates</Flex>}>
                                        <Alert
                                            type="info"
                                            showIcon
                                            message="Installed widgets update automatically"
                                            description="Changes saved here are picked up by installed widgets through Canonica's runtime config endpoint. Updates can take up to 60 seconds to appear; there is no cache setting for the customer to manage."
                                        />
                                    </Card>
                                </Col>
                            </Row>
                        ),
                    },
                    {
                        key: 'access',
                        label: 'Access & Security',
                        children: (
                            <Row gutter={[16, 16]}>
                                <Col xs={24} lg={10}>
                                    <Card title={<Flex align="center" gap={8}><LuKey size={16} /> Widget Key</Flex>}>
                                        <Flex vertical gap={12}>
                                            <Input.Password
                                                value={apiKey || (keyPrefix ? `${keyPrefix}...stored securely` : '')}
                                                placeholder="No widget key"
                                                readOnly
                                                style={{ fontFamily: 'monospace' }}
                                            />
                                            <Flex gap={8} wrap="wrap">
                                                <Button
                                                    type={hasWidgetKey ? 'default' : 'primary'}
                                                    icon={<LuKey size={14} />}
                                                    loading={generatingKey}
                                                    onClick={handleGenerateKey}
                                                >
                                                    {hasWidgetKey ? 'Regenerate' : 'Create Key'}
                                                </Button>
                                                <Button icon={<LuCopy size={14} />} disabled={!apiKey} onClick={() => copyText(apiKey || '', 'Widget key copied')}>
                                                    Copy
                                                </Button>
                                                <Button danger icon={<LuTrash2 size={14} />} disabled={!hasWidgetKey} onClick={handleRevokeKey}>
                                                    Revoke
                                                </Button>
                                            </Flex>
                                            {!apiKey && hasWidgetKey && (
                                                <Alert
                                                    type="info"
                                                    showIcon
                                                    message="Stored keys are only shown once"
                                                    description="Regenerate when you need a fresh copy. Existing installs keep working until revoked."
                                                />
                                            )}
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24} lg={14}>
                                    <Card title={<Flex align="center" gap={8}><LuShield size={16} /> Allowed Origins</Flex>}>
                                        <Flex vertical gap={12}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Add the exact app origins that may load and call the widget runtime APIs.
                                            </Text>
                                            <Flex gap={8} vertical={isMobile} align={isMobile ? 'stretch' : 'center'}>
                                                <Input
                                                    value={newOrigin}
                                                    onChange={(event) => setNewOrigin(event.target.value)}
                                                    onPressEnter={addOrigin}
                                                    placeholder="https://app.example.com"
                                                />
                                                <Button icon={<LuGlobe size={14} />} onClick={addOrigin}>Add</Button>
                                            </Flex>
                                            {origins.length > 0 ? (
                                                <Flex gap={8} wrap="wrap">
                                                    {origins.map(origin => (
                                                        <Tag key={origin} closable onClose={(event) => { event.preventDefault(); removeOrigin(origin); }}>
                                                            {origin}
                                                        </Tag>
                                                    ))}
                                                </Flex>
                                            ) : (
                                                <Alert type="warning" showIcon message="All origins are allowed until you add at least one origin." />
                                            )}
                                        </Flex>
                                    </Card>
                                </Col>

                                <Col xs={24}>
                                    <Card title={<Flex align="center" gap={8}><LuEyeOff size={16} /> Blocked Routes</Flex>}>
                                        <Flex vertical gap={12}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Hide the widget on routes where your product already has its own help, support, or guided flow.
                                            </Text>
                                            <Flex gap={8} vertical={isMobile} align={isMobile ? 'stretch' : 'center'}>
                                                <Input
                                                    value={newBlockedRoute}
                                                    onChange={(event) => setNewBlockedRoute(event.target.value)}
                                                    onPressEnter={addBlockedRoute}
                                                    placeholder="/help-center or /help-center/*"
                                                />
                                                <Button icon={<LuEyeOff size={14} />} onClick={addBlockedRoute}>Add</Button>
                                            </Flex>
                                            {config.blockedRoutes.length > 0 ? (
                                                <Flex gap={8} wrap="wrap">
                                                    {config.blockedRoutes.map(route => (
                                                        <Tag key={route} closable onClose={(event) => { event.preventDefault(); removeBlockedRoute(route); }}>
                                                            {route}
                                                        </Tag>
                                                    ))}
                                                </Flex>
                                            ) : (
                                                <Alert type="info" showIcon message="The widget is visible on every route unless you add blocked routes." />
                                            )}
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                Use an exact route like /help-center, or include child pages with /help-center/*.
                                            </Text>
                                        </Flex>
                                    </Card>
                                </Col>
                            </Row>
                        ),
                    },
                ]}
            />

            {isMobile && (
                <div style={{
                    position: 'fixed',
                    left: 0,
                    right: 0,
                    bottom: embeddedMobile ? 'calc(env(safe-area-inset-bottom) + 88px)' : 0,
                    zIndex: 20,
                    padding: '10px 12px',
                    background: '#ffffff',
                    borderTop: '1px solid #e5e7eb',
                }}>
                    <Button block type="primary" icon={<LuSave size={14} />} loading={saving} onClick={handleSave}>
                        Save Widget Settings
                    </Button>
                </div>
            )}
        </Flex>
    );
}

function WidgetPreview({ config, mode }: { config: CanonicaWidgetConfig; mode: 'desktop' | 'mobile' }) {
    const isPill = config.shape === 'pill';
    const isMobile = mode === 'mobile';
    const frameWidth = isMobile ? 280 : '100%';
    const frameHeight = isMobile ? 420 : 260;
    const launcherSize = config.size === 'small' ? 42 : config.size === 'large' ? 60 : 52;
    const launcherStyle = isPill
        ? {
            height: config.size === 'small' ? 34 : config.size === 'large' ? 48 : 40,
            minWidth: 86,
            padding: '0 16px',
            borderRadius: 999,
            fontSize: 13,
        }
        : {
            width: launcherSize,
            height: launcherSize,
            borderRadius: '50%',
            fontSize: config.size === 'small' ? 16 : config.size === 'large' ? 22 : 19,
        };

    return (
        <Flex justify="center">
            <div style={{
                width: frameWidth,
                maxWidth: '100%',
                height: frameHeight,
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                borderRadius: isMobile ? 18 : 8,
                background: '#f8fafc',
            }}>
                <div style={{
                    height: 46,
                    borderBottom: '1px solid #e5e7eb',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 14px',
                    gap: 6,
                }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />
                </div>
                <div style={{ padding: 16 }}>
                    <div style={{ width: '48%', height: 12, borderRadius: 6, background: '#e5e7eb', marginBottom: 10 }} />
                    <div style={{ width: '72%', height: 10, borderRadius: 6, background: '#eef2f7', marginBottom: 8 }} />
                    <div style={{ width: '62%', height: 10, borderRadius: 6, background: '#eef2f7' }} />
                </div>
                {config.mobileVisibility === 'hide' && isMobile ? (
                    <Tag style={{ position: 'absolute', bottom: 16, right: 16 }}>Hidden on mobile</Tag>
                ) : (
                    <div style={{
                        position: 'absolute',
                        ...(config.position.includes('bottom') || isMobile ? { bottom: 16 } : { top: 16 }),
                        ...(config.position.includes('right') || isMobile ? { right: 16 } : { left: 16 }),
                        display: config.launcherVisibility === 'manual' ? 'none' : 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: config.accentColor,
                        color: '#fff',
                        fontWeight: 700,
                        boxShadow: '0 8px 24px rgba(15,23,42,0.18)',
                        ...launcherStyle,
                    }}>
                        {config.label}
                    </div>
                )}
                {config.launcherVisibility === 'manual' && (
                    <Tag style={{ position: 'absolute', bottom: 16, left: 16 }}>Manual launcher</Tag>
                )}
            </div>
        </Flex>
    );
}

function PageAwarePreview() {
    return (
        <Card size="small" styles={{ body: { padding: 12 } }}>
            <Flex vertical gap={8}>
                <Flex align="center" justify="space-between" gap={8} wrap="wrap">
                    <Text strong>Page-aware response preview</Text>
                    <Tag color="blue">contextKey: billing_invoices</Tag>
                </Flex>
                <Text type="secondary" style={{ fontSize: 12 }}>
                    When your app sends route context, Canonica boosts linked product surfaces before falling back to general help.
                </Text>
                <Flex gap={6} wrap="wrap">
                    <Tag>Billing</Tag>
                    <Tag>Invoices</Tag>
                    <Tag>Plans</Tag>
                </Flex>
                <div style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: 10,
                    background: '#f8fafc',
                    fontSize: 13,
                    lineHeight: 1.5,
                }}>
                    Users on the billing page see billing articles, latest plan-change release notes, and ticket fallback only when approved answers are missing.
                </div>
            </Flex>
        </Card>
    );
}
