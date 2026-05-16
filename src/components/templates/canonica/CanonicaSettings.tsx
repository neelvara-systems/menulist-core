'use client'

/**
 * Canonica Dashboard — Settings Template
 *
 * Workspace settings, API key management, widget configuration + embed code.
 * Feature-flagged: ENABLE_CANONICA_WIDGET (widget sections only)
 *
 * Separated from page.tsx to follow Canonica template pattern
 * (all other pages use thin page → dynamic import of template).
 *
 * @see __docs__/canonica/help-widget/
 */

import { FEATURE_FLAGS } from '@config/features';
import { updateStore } from '@database/stores';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import {
    Alert,
    Button,
    Card,
    Col,
    ColorPicker,
    Descriptions,
    Flex,
    Grid,
    Input,
    InputNumber,
    message,
    Row,
    Segmented,
    Select,
    Steps,
    Tag,
    Typography
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    LuCheck,
    LuClipboard,
    LuCode,
    LuKey,
    LuPlus,
    LuRocket,
    LuSettings,
    LuShield,
    LuTrash2
} from 'react-icons/lu';

const { Title, Text, Paragraph } = Typography;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface WidgetConfig {
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    accentColor: string;
    shape: 'rounded' | 'pill';
    display: 'icon' | 'text' | 'icon-text';
    label: string;
    size: 'small' | 'medium' | 'large';
    offsetX: number;
    offsetY: number;
}

const DEFAULT_CONFIG: WidgetConfig = {
    position: 'bottom-right',
    accentColor: '#6366f1',
    shape: 'rounded',
    display: 'icon',
    label: '?',
    size: 'medium',
    offsetX: 20,
    offsetY: 20,
};

const normalizeAllowedOrigin = (value: string): string | null => {
    try {
        const parsed = new URL(value.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
        return parsed.origin;
    } catch {
        return null;
    }
};

const normalizeAllowedOrigins = (values: unknown): string[] => {
    if (!Array.isArray(values)) return [];
    return Array.from(new Set(
        values
            .filter((value): value is string => typeof value === 'string')
            .map(normalizeAllowedOrigin)
            .filter((value): value is string => Boolean(value))
    ));
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CanonicaSettings() {
    const session = useClientAuthSession();
    const [storeData, setStoreData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;

    // Widget config state
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [origins, setOrigins] = useState<string[]>([]);
    const [newOrigin, setNewOrigin] = useState('');

    // API key state
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [apiKeyPrefix, setApiKeyPrefix] = useState<string | null>(null);
    const [generatingKey, setGeneratingKey] = useState(false);

    // Load store data
    useEffect(() => {
        if (!session?.sId) return;
        (async () => {
            try {
                const { getStoreById } = await import('@database/stores');
                const store = await getStoreById(session.sId);
                if (store) {
                    setStoreData(store);
                    if (store.widgetConfig) {
                        setConfig({ ...DEFAULT_CONFIG, ...store.widgetConfig });
                    }
                    if (store.widgetAllowedOrigins) {
                        setOrigins(normalizeAllowedOrigins(store.widgetAllowedOrigins));
                    }
                    if (store.publicApi?.apiKey) {
                        setApiKey(store.publicApi.apiKey);
                        setApiKeyPrefix(store.publicApi.apiKey.slice(0, 7));
                    } else if (store.publicApi?.apiKeyHash || store.publicApi?.keyPrefix) {
                        setApiKey(null);
                        setApiKeyPrefix(store.publicApi?.keyPrefix || 'cn_****');
                    }
                }
            } catch { /* fail silently */ }
        })();
    }, [session?.sId]);

    // Save widget config
    const handleSaveConfig = useCallback(async () => {
        if (!session?.sId) return;
        setSaving(true);
        try {
            await updateStore({
                storeId: session.sId,
                widgetConfig: config,
                widgetAllowedOrigins: origins,
            });
            message.success('Widget settings saved');
        } catch {
            message.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    }, [session?.sId, config, origins]);

    // Generate API key
    const handleGenerateKey = async () => {
        setGeneratingKey(true);
        try {
            const res = await fetch('/api/canonica/widget-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.apiKey) {
                throw new Error(data.error || 'Failed to generate widget key');
            }
            setApiKey(data.apiKey);
            setApiKeyPrefix(data.keyPrefix || data.apiKey.slice(0, 7));
            message.success('Widget key generated');
        } catch (error: any) {
            message.error(error?.message || 'Failed to generate widget key');
        } finally {
            setGeneratingKey(false);
        }
    };

    // Revoke API key
    const handleRevokeKey = async () => {
        try {
            const res = await fetch('/api/canonica/widget-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke' }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || 'Failed to revoke widget key');
            }
            setApiKey(null);
            setApiKeyPrefix(null);
            message.success('Widget key revoked');
        } catch (error: any) {
            message.error(error?.message || 'Failed to revoke widget key');
        }
    };

    // Add origin
    const handleAddOrigin = () => {
        const normalized = normalizeAllowedOrigin(newOrigin);
        if (!normalized) {
            message.error('Enter a valid URL (e.g., https://app.example.com)');
            return;
        }
        if (origins.includes(normalized)) {
            message.warning('Origin already added');
            return;
        }
        setOrigins(prev => [...prev, normalized]);
        setNewOrigin('');
    };

    // Build embed code
    const embedCode = buildEmbedCode(apiKey, config);
    const hasWidgetKey = !!apiKey || !!apiKeyPrefix;

    // Copy to clipboard
    const copyApiKey = useCallback(async () => {
        if (!apiKey) {
            message.info('Stored keys are only shown once. Generate a new key to copy it again.');
            return;
        }
        try {
            await navigator.clipboard.writeText(apiKey);
            message.success('Copied');
        } catch {
            message.error('Unable to copy key');
        }
    }, [apiKey]);

    const copyEmbedCode = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(embedCode);
            message.success('Embed code copied');
        } catch {
            message.error('Unable to copy embed code');
        }
    }, [embedCode]);

    // Setup progress for onboarding guide
    const setupProgress = useMemo(() => {
        const steps = [
            { done: hasWidgetKey, label: 'Create widget key' },
            { done: !!storeData?.widgetConfig, label: 'Configure widget' },
            { done: (origins.length > 0), label: 'Add allowed origin' },
        ];
        return steps;
    }, [hasWidgetKey, storeData?.widgetConfig, origins.length]);

    const completedSteps = setupProgress.filter(s => s.done).length;
    const workspaceName = storeData?.storeName || storeData?.businessName || storeData?.name || 'Canonica workspace';

    return (
        <Flex vertical gap={isMobile ? 16 : 24}>
            <div>
                <Title level={4} style={{ margin: 0 }}>Settings</Title>
                <Text type="secondary">Widget configuration, access key, and workspace setup</Text>
            </div>

            {/* ===== SETUP PROGRESS (shown until all steps done) ===== */}
            {completedSteps < setupProgress.length && (
                <Card size="small">
                    <Flex vertical gap={12}>
                        <Flex align="center" gap={8}>
                            <LuRocket size={16} />
                            <Text strong>Setup Progress</Text>
                            <Tag color="blue">{completedSteps}/{setupProgress.length}</Tag>
                        </Flex>
                        <Steps
                            size="small"
                            current={completedSteps}
                            direction={isMobile ? 'vertical' : 'horizontal'}
                            items={setupProgress.map(step => ({
                                title: step.label,
                                status: step.done ? 'finish' : 'wait',
                            }))}
                        />
                    </Flex>
                </Card>
            )}

            <Row gutter={[24, 24]}>
                {/* ===== API KEY ===== */}
                <Col xs={24} lg={12}>
                    <Card title={<Flex align="center" gap={8}><LuKey size={16} /> Widget Key</Flex>}>
                        {hasWidgetKey ? (
                            <Flex vertical gap={12}>
                                <Input.Password
                                    value={apiKey || `${apiKeyPrefix || 'cn_****'}...stored securely`}
                                    readOnly
                                    style={{ fontFamily: 'monospace' }}
                                />
                                <Flex gap={8} wrap="wrap">
                                    <Button icon={<LuClipboard size={14} />} onClick={copyApiKey} disabled={!apiKey}>
                                        Copy Key
                                    </Button>
                                    <Button icon={<LuKey size={14} />} onClick={handleGenerateKey} loading={generatingKey}>
                                        Regenerate
                                    </Button>
                                    <Button danger icon={<LuTrash2 size={14} />} onClick={handleRevokeKey}>
                                        Revoke
                                    </Button>
                                </Flex>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    This key connects the widget to your Canonica workspace. Keep it private.
                                </Text>
                                {!apiKey && (
                                    <Alert
                                        message="Existing keys are hidden after creation"
                                        description="Generate a new key if you need to copy it or build a fresh embed code."
                                        type="info"
                                        showIcon
                                    />
                                )}
                            </Flex>
                        ) : (
                            <Flex vertical gap={12}>
                                <Text type="secondary">Create a widget key before adding Canonica to your product.</Text>
                                <Button type="primary" onClick={handleGenerateKey} loading={generatingKey}>
                                    Create Widget Key
                                </Button>
                            </Flex>
                        )}
                    </Card>
                </Col>

                {/* ===== WORKSPACE INFO ===== */}
                <Col xs={24} lg={12}>
                    <Card title={<Flex align="center" gap={8}><LuSettings size={16} /> Workspace</Flex>}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Workspace">{workspaceName}</Descriptions.Item>
                            <Descriptions.Item label="Signed in as">{session?.user?.email || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Product"><Tag color="blue">Canonica</Tag></Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                {/* ===== WIDGET CONFIGURATION ===== */}
                {FEATURE_FLAGS.ENABLE_CANONICA_WIDGET && (
                    <Col xs={24}>
                        <Card
                            title={<Flex align="center" gap={8}><LuCode size={16} /> Widget Configuration</Flex>}
                            extra={!isMobile && <Button type="primary" onClick={handleSaveConfig} loading={saving}>Save Settings</Button>}
                        >
                            <Row gutter={[24, 16]}>
                                {/* Position */}
                                <Col xs={24} sm={12} md={8}>
                                    <Flex vertical gap={4}>
                                        <Text strong style={{ fontSize: 12 }}>Position</Text>
                                        <Select
                                            value={config.position}
                                            onChange={(v) => setConfig(prev => ({ ...prev, position: v }))}
                                            options={[
                                                { value: 'bottom-right', label: 'Bottom Right' },
                                                { value: 'bottom-left', label: 'Bottom Left' },
                                                { value: 'top-right', label: 'Top Right' },
                                                { value: 'top-left', label: 'Top Left' },
                                            ]}
                                            style={{ width: '100%' }}
                                        />
                                    </Flex>
                                </Col>

                                {/* Shape */}
                                <Col xs={24} sm={12} md={8}>
                                    <Flex vertical gap={4}>
                                        <Text strong style={{ fontSize: 12 }}>Shape</Text>
                                        <Segmented
                                            value={config.shape}
                                            onChange={(v) => setConfig(prev => ({ ...prev, shape: v as any }))}
                                            options={[
                                                { value: 'rounded', label: 'Circle' },
                                                { value: 'pill', label: 'Pill' },
                                            ]}
                                            block
                                        />
                                    </Flex>
                                </Col>

                                {/* Display */}
                                <Col xs={24} sm={12} md={8}>
                                    <Flex vertical gap={4}>
                                        <Text strong style={{ fontSize: 12 }}>Display</Text>
                                        <Segmented
                                            value={config.display}
                                            onChange={(v) => setConfig(prev => ({ ...prev, display: v as any }))}
                                            options={[
                                                { value: 'icon', label: 'Icon' },
                                                { value: 'text', label: 'Text' },
                                                { value: 'icon-text', label: 'Icon + Text' },
                                            ]}
                                            block
                                        />
                                    </Flex>
                                </Col>

                                {/* Accent Color */}
                                <Col xs={24} sm={12} md={8}>
                                    <Flex vertical gap={4}>
                                        <Text strong style={{ fontSize: 12 }}>Accent Color</Text>
                                        <ColorPicker
                                            value={config.accentColor}
                                            onChange={(_, hex) => setConfig(prev => ({ ...prev, accentColor: hex }))}
                                            showText
                                        />
                                    </Flex>
                                </Col>

                                {/* Size */}
                                <Col xs={24} sm={12} md={8}>
                                    <Flex vertical gap={4}>
                                        <Text strong style={{ fontSize: 12 }}>Size</Text>
                                        <Segmented
                                            value={config.size}
                                            onChange={(v) => setConfig(prev => ({ ...prev, size: v as any }))}
                                            options={[
                                                { value: 'small', label: 'Small' },
                                                { value: 'medium', label: 'Medium' },
                                                { value: 'large', label: 'Large' },
                                            ]}
                                            block
                                        />
                                    </Flex>
                                </Col>

                                {/* Label */}
                                <Col xs={24} sm={12} md={8}>
                                    <Flex vertical gap={4}>
                                        <Text strong style={{ fontSize: 12 }}>Label</Text>
                                        <Input
                                            value={config.label}
                                            onChange={(e) => setConfig(prev => ({ ...prev, label: e.target.value.slice(0, 20) }))}
                                            placeholder="?"
                                            maxLength={20}
                                        />
                                    </Flex>
                                </Col>

                                {/* Offset X */}
                                <Col xs={12} sm={6}>
                                    <Flex vertical gap={4}>
                                        <Text strong style={{ fontSize: 12 }}>Offset X (px)</Text>
                                        <InputNumber
                                            value={config.offsetX}
                                            onChange={(v) => setConfig(prev => ({ ...prev, offsetX: v || 20 }))}
                                            min={0} max={200}
                                            style={{ width: '100%' }}
                                        />
                                    </Flex>
                                </Col>

                                {/* Offset Y */}
                                <Col xs={12} sm={6}>
                                    <Flex vertical gap={4}>
                                        <Text strong style={{ fontSize: 12 }}>Offset Y (px)</Text>
                                        <InputNumber
                                            value={config.offsetY}
                                            onChange={(v) => setConfig(prev => ({ ...prev, offsetY: v || 20 }))}
                                            min={0} max={200}
                                            style={{ width: '100%' }}
                                        />
                                    </Flex>
                                </Col>

                                {/* Launcher Preview */}
                                <Col xs={24}>
                                    <Flex vertical gap={4}>
                                        <Text strong style={{ fontSize: 12 }}>Preview</Text>
                                        <div style={{ position: 'relative', height: 80, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
                                            <div style={{
                                                position: 'absolute',
                                                ...(config.position.includes('bottom') ? { bottom: 12 } : { top: 12 }),
                                                ...(config.position.includes('right') ? { right: 12 } : { left: 12 }),
                                                background: config.accentColor,
                                                color: '#fff',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                cursor: 'default',
                                                fontFamily: 'system-ui, sans-serif',
                                                fontWeight: 700,
                                                boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
                                                ...(config.shape === 'pill'
                                                    ? { height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13 }
                                                    : { width: config.size === 'small' ? 40 : config.size === 'large' ? 56 : 48, height: config.size === 'small' ? 40 : config.size === 'large' ? 56 : 48, borderRadius: '50%', fontSize: config.size === 'small' ? 16 : config.size === 'large' ? 22 : 18 }
                                                ),
                                            }}>
                                                {config.label}
                                            </div>
                                        </div>
                                    </Flex>
                                </Col>
                                {isMobile && (
                                    <Col xs={24}>
                                        <Button type="primary" block onClick={handleSaveConfig} loading={saving}>
                                            Save Settings
                                        </Button>
                                    </Col>
                                )}
                            </Row>
                        </Card>
                    </Col>
                )}

                {/* ===== ORIGIN ALLOWLIST ===== */}
                {FEATURE_FLAGS.ENABLE_CANONICA_WIDGET && (
                    <Col xs={24}>
                        <Card title={<Flex align="center" gap={8}><LuShield size={16} /> Allowed Origins</Flex>}>
                            <Flex vertical gap={12}>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    Restrict which domains can embed your widget. Leave empty to allow all domains.
                                </Text>

                                <Flex gap={8} vertical={isMobile} align={isMobile ? 'stretch' : 'center'}>
                                    <Input
                                        value={newOrigin}
                                        onChange={(e) => setNewOrigin(e.target.value)}
                                        placeholder="https://app.yourproduct.com"
                                        onPressEnter={handleAddOrigin}
                                        style={{ maxWidth: isMobile ? '100%' : 400 }}
                                    />
                                    <Button icon={<LuPlus size={14} />} onClick={handleAddOrigin}>Add</Button>
                                </Flex>

                                {origins.length > 0 ? (
                                    <Flex gap={8} wrap="wrap">
                                        {origins.map((origin, i) => (
                                            <Tag
                                                key={i}
                                                closable
                                                onClose={() => setOrigins(prev => prev.filter((_, idx) => idx !== i))}
                                            >
                                                {origin}
                                            </Tag>
                                        ))}
                                    </Flex>
                                ) : (
                                    <Text type="secondary" style={{ fontSize: 12 }}>All origins allowed (no restrictions)</Text>
                                )}

                                <Button type="primary" onClick={handleSaveConfig} loading={saving} style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
                                    Save Origins
                                </Button>
                            </Flex>
                        </Card>
                    </Col>
                )}

                {/* ===== EMBED CODE ===== */}
                {FEATURE_FLAGS.ENABLE_CANONICA_WIDGET && (
                    <Col xs={24}>
                        <Card
                            title={<Flex align="center" gap={8}><LuCode size={16} /> Embed Code</Flex>}
                            extra={<Button icon={<LuClipboard size={14} />} onClick={copyEmbedCode} size="small" disabled={!apiKey}>Copy</Button>}
                        >
                            <Flex vertical gap={8}>
                                {!apiKey && (
                                    <Alert
                                        message={hasWidgetKey ? 'Generate a fresh embed code key' : 'Generate a widget key first'}
                                        description={hasWidgetKey
                                            ? 'For security, existing widget keys are not shown after creation.'
                                            : 'You need a widget key before embedding the widget.'}
                                        type="warning"
                                        showIcon
                                    />
                                )}
                                <Input.TextArea
                                    value={embedCode}
                                    readOnly
                                    rows={6}
                                    style={{ fontFamily: 'monospace', fontSize: 12, background: '#f9fafb' }}
                                />
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    Place this script before the closing &lt;/body&gt; tag on your website.
                                </Text>
                            </Flex>
                        </Card>
                    </Col>
                )}
            </Row>
        </Flex>
    );
}

/** Build the widget embed code string based on current config */
function escapeHtmlAttribute(value: string | number): string {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function buildEmbedCode(
    apiKey: string | null,
    config: WidgetConfig,
): string {
    const attrs: string[] = [
        `  src="https://canonica.app/widget/canonica-widget.js"`,
        `  data-api-key="${escapeHtmlAttribute(apiKey || 'YOUR_API_KEY')}"`,
    ];

    if (config.position !== 'bottom-right') attrs.push(`  data-position="${escapeHtmlAttribute(config.position)}"`);
    if (config.accentColor !== '#6366f1') attrs.push(`  data-accent-color="${escapeHtmlAttribute(config.accentColor)}"`);
    if (config.shape !== 'rounded') attrs.push(`  data-shape="${escapeHtmlAttribute(config.shape)}"`);
    if (config.display !== 'icon') attrs.push(`  data-display="${escapeHtmlAttribute(config.display)}"`);
    if (config.label !== '?') attrs.push(`  data-label="${escapeHtmlAttribute(config.label)}"`);
    if (config.size !== 'medium') attrs.push(`  data-size="${escapeHtmlAttribute(config.size)}"`);
    if (config.offsetX !== 20) attrs.push(`  data-offset-x="${escapeHtmlAttribute(config.offsetX)}"`);
    if (config.offsetY !== 20) attrs.push(`  data-offset-y="${escapeHtmlAttribute(config.offsetY)}"`);

    return `<script\n${attrs.join('\n')}\n></script>`;
}
