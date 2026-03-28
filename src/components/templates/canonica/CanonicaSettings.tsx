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

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function CanonicaSettings() {
    const session = useClientAuthSession();
    const [storeData, setStoreData] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Widget config state
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [origins, setOrigins] = useState<string[]>([]);
    const [newOrigin, setNewOrigin] = useState('');

    // API key state
    const [apiKey, setApiKey] = useState<string | null>(null);
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
                        setOrigins(store.widgetAllowedOrigins);
                    }
                    if (store.publicApi?.apiKey) {
                        setApiKey(store.publicApi.apiKey);
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
            const res = await fetch('/api/store/public-api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate' }),
            });
            const data = await res.json();
            if (data.apiKey) {
                setApiKey(data.apiKey);
                message.success('API key generated');
            }
        } catch {
            message.error('Failed to generate API key');
        } finally {
            setGeneratingKey(false);
        }
    };

    // Revoke API key
    const handleRevokeKey = async () => {
        try {
            await fetch('/api/store/public-api-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke' }),
            });
            setApiKey(null);
            message.success('API key revoked');
        } catch {
            message.error('Failed to revoke');
        }
    };

    // Add origin
    const handleAddOrigin = () => {
        const trimmed = newOrigin.trim();
        if (!trimmed) return;
        try {
            new URL(trimmed); // validate URL format
        } catch {
            message.error('Enter a valid URL (e.g., https://app.example.com)');
            return;
        }
        if (origins.includes(trimmed)) {
            message.warning('Origin already added');
            return;
        }
        setOrigins(prev => [...prev, trimmed]);
        setNewOrigin('');
    };

    // Build embed code
    const embedCode = buildEmbedCode(apiKey, config);

    // Copy to clipboard
    const copyEmbedCode = () => {
        navigator.clipboard.writeText(embedCode);
        message.success('Embed code copied');
    };

    // Setup progress for onboarding guide
    const setupProgress = useMemo(() => {
        const steps = [
            { done: !!apiKey, label: 'Generate API Key' },
            { done: !!storeData?.widgetConfig, label: 'Configure Widget' },
            { done: (origins.length > 0), label: 'Set Allowed Origins' },
        ];
        return steps;
    }, [apiKey, storeData?.widgetConfig, origins.length]);

    const completedSteps = setupProgress.filter(s => s.done).length;

    return (
        <Flex vertical gap={24}>
            <div>
                <Title level={4} style={{ margin: 0 }}>Settings</Title>
                <Text type="secondary">Widget configuration, API keys, and workspace setup</Text>
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
                    <Card title={<Flex align="center" gap={8}><LuKey size={16} /> API Key</Flex>}>
                        {apiKey ? (
                            <Flex vertical gap={12}>
                                <Input.Password
                                    value={apiKey}
                                    readOnly
                                    style={{ fontFamily: 'monospace' }}
                                />
                                <Flex gap={8}>
                                    <Button size="small" icon={<LuClipboard size={12} />} onClick={() => { navigator.clipboard.writeText(apiKey); message.success('Copied'); }}>
                                        Copy Key
                                    </Button>
                                    <Button size="small" danger icon={<LuTrash2 size={12} />} onClick={handleRevokeKey}>
                                        Revoke
                                    </Button>
                                </Flex>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                    This key authenticates your widget and API requests. Keep it secret.
                                </Text>
                            </Flex>
                        ) : (
                            <Flex vertical gap={12}>
                                <Text type="secondary">Generate an API key to enable the widget and public API.</Text>
                                <Button type="primary" onClick={handleGenerateKey} loading={generatingKey}>
                                    Generate API Key
                                </Button>
                            </Flex>
                        )}
                    </Card>
                </Col>

                {/* ===== WORKSPACE INFO ===== */}
                <Col xs={24} lg={12}>
                    <Card title={<Flex align="center" gap={8}><LuSettings size={16} /> Workspace</Flex>}>
                        <Descriptions column={1} size="small">
                            <Descriptions.Item label="Tenant ID"><Text code>{session?.tId || '—'}</Text></Descriptions.Item>
                            <Descriptions.Item label="Store ID"><Text code>{session?.sId || '—'}</Text></Descriptions.Item>
                            <Descriptions.Item label="User">{session?.user?.email || '—'}</Descriptions.Item>
                            <Descriptions.Item label="Product"><Tag color="blue">Canonica</Tag></Descriptions.Item>
                        </Descriptions>
                    </Card>
                </Col>

                {/* ===== WIDGET CONFIGURATION ===== */}
                {FEATURE_FLAGS.ENABLE_CANONICA_WIDGET && (
                    <Col xs={24}>
                        <Card
                            title={<Flex align="center" gap={8}><LuCode size={16} /> Widget Configuration</Flex>}
                            extra={<Button type="primary" onClick={handleSaveConfig} loading={saving}>Save Settings</Button>}
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

                                <Flex gap={8}>
                                    <Input
                                        value={newOrigin}
                                        onChange={(e) => setNewOrigin(e.target.value)}
                                        placeholder="https://app.yourproduct.com"
                                        onPressEnter={handleAddOrigin}
                                        style={{ maxWidth: 400 }}
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

                                <Button type="primary" size="small" onClick={handleSaveConfig} loading={saving} style={{ alignSelf: 'flex-start' }}>
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
                            extra={<Button icon={<LuClipboard size={14} />} onClick={copyEmbedCode} size="small">Copy</Button>}
                        >
                            <Flex vertical gap={8}>
                                {!apiKey && (
                                    <Alert
                                        message="Generate an API key first"
                                        description="You need an API key before embedding the widget."
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
function buildEmbedCode(
    apiKey: string | null,
    config: WidgetConfig,
): string {
    const attrs: string[] = [
        `  src="https://canonica.app/widget/canonica-widget.js"`,
        `  data-api-key="${apiKey || 'YOUR_API_KEY'}"`,
    ];

    if (config.position !== 'bottom-right') attrs.push(`  data-position="${config.position}"`);
    if (config.accentColor !== '#6366f1') attrs.push(`  data-accent-color="${config.accentColor}"`);
    if (config.shape !== 'rounded') attrs.push(`  data-shape="${config.shape}"`);
    if (config.display !== 'icon') attrs.push(`  data-display="${config.display}"`);
    if (config.label !== '?') attrs.push(`  data-label="${config.label}"`);
    if (config.size !== 'medium') attrs.push(`  data-size="${config.size}"`);
    if (config.offsetX !== 20) attrs.push(`  data-offset-x="${config.offsetX}"`);
    if (config.offsetY !== 20) attrs.push(`  data-offset-y="${config.offsetY}"`);

    return `<script\n${attrs.join('\n')}\n></script>`;
}
