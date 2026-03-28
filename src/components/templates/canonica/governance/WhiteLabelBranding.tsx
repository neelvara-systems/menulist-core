'use client'

/**
 * Canonica — White-Label / Custom Branding Settings
 * 
 * Per-tenant branding configuration for help widget, KB pages, and emails.
 * SaaS founders can customize: colors, logo, company name, powered-by badge.
 * 
 * Phase 4 — Competitive Differentiator (4.1)
 * Feature-flagged: ENABLE_CANONICA_WHITE_LABEL
 * 
 * @see __docs__/canonica/canonica-build-priority-roadmap.md Phase 4
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    CANONICA_DEFAULT_BRANDING,
    CanonicaBrandingConfig,
} from '@type/canonica';
import {
    Button,
    Card,
    Col,
    ColorPicker,
    Empty,
    Form,
    Input,
    Row,
    Switch,
    Typography,
    message,
    theme
} from 'antd';
import { useState } from 'react';
import {
    LuEye,
    LuImage,
    LuPaintbrush,
    LuShield,
    LuType
} from 'react-icons/lu';

const { Text, Title } = Typography;

interface Props {
    tId: number;
    sId: number;
    initialConfig?: Partial<CanonicaBrandingConfig>;
    onSave?: (config: CanonicaBrandingConfig) => Promise<void>;
}

export default function WhiteLabelBranding({ tId, sId, initialConfig, onSave }: Props) {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const { token } = theme.useToken();

    if (!FEATURE_FLAGS.ENABLE_CANONICA_WHITE_LABEL) {
        return <Empty description="White-Label branding is not enabled" />;
    }

    const defaults = { ...CANONICA_DEFAULT_BRANDING, ...initialConfig };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const config: CanonicaBrandingConfig = {
                companyName: values.companyName || defaults.companyName,
                logoUrl: values.logoUrl || undefined,
                faviconUrl: values.faviconUrl || undefined,
                primaryColor: typeof values.primaryColor === 'string'
                    ? values.primaryColor
                    : values.primaryColor?.toHexString?.() || defaults.primaryColor,
                accentColor: typeof values.accentColor === 'string'
                    ? values.accentColor
                    : values.accentColor?.toHexString?.() || undefined,
                backgroundColor: typeof values.backgroundColor === 'string'
                    ? values.backgroundColor
                    : values.backgroundColor?.toHexString?.() || undefined,
                textColor: typeof values.textColor === 'string'
                    ? values.textColor
                    : values.textColor?.toHexString?.() || undefined,
                headerBackground: typeof values.headerBackground === 'string'
                    ? values.headerBackground
                    : values.headerBackground?.toHexString?.() || undefined,
                headerTextColor: typeof values.headerTextColor === 'string'
                    ? values.headerTextColor
                    : values.headerTextColor?.toHexString?.() || undefined,
                fontFamily: values.fontFamily || undefined,
                customCss: values.customCss?.slice(0, 2000) || undefined,
                poweredByVisible: values.poweredByVisible ?? true,
                supportEmail: values.supportEmail || undefined,
                privacyPolicyUrl: values.privacyPolicyUrl || undefined,
                termsUrl: values.termsUrl || undefined,
            };

            if (onSave) {
                await onSave(config);
            }
            message.success('Branding settings saved');
        } catch (err) {
            message.error('Failed to save branding settings');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Form
                form={form}
                layout="vertical"
                initialValues={defaults}
                style={{ maxWidth: 900 }}
            >
                {/* Identity Section */}
                <Card
                    size="small"
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LuType /> Identity
                        </span>
                    }
                    style={{ marginBottom: 16 }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="companyName"
                                label="Company Name"
                                rules={[{ required: true, message: 'Company name is required' }]}
                            >
                                <Input placeholder="Your Company" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="supportEmail" label="Support Email">
                                <Input placeholder="support@yourcompany.com" type="email" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="logoUrl" label="Logo URL">
                                <Input placeholder="https://..." prefix={<LuImage size={14} />} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="faviconUrl" label="Favicon URL">
                                <Input placeholder="https://..." prefix={<LuImage size={14} />} />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Colors Section */}
                <Card
                    size="small"
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LuPaintbrush /> Colors
                        </span>
                    }
                    style={{ marginBottom: 16 }}
                >
                    <Row gutter={[16, 8]}>
                        <Col span={6}>
                            <Form.Item name="primaryColor" label="Primary">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="accentColor" label="Accent">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="backgroundColor" label="Background">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="textColor" label="Text">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={[16, 8]}>
                        <Col span={6}>
                            <Form.Item name="headerBackground" label="Header Background">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="headerTextColor" label="Header Text">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="fontFamily" label="Font Family">
                                <Input placeholder="Inter, system-ui, sans-serif" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Card>

                {/* Legal & Visibility */}
                <Card
                    size="small"
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LuShield /> Legal & Visibility
                        </span>
                    }
                    style={{ marginBottom: 16 }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="privacyPolicyUrl" label="Privacy Policy URL">
                                <Input placeholder="https://..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="termsUrl" label="Terms of Service URL">
                                <Input placeholder="https://..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="poweredByVisible"
                        label="Show 'Powered by Canonica' badge"
                        valuePropName="checked"
                    >
                        <Switch checkedChildren="Visible" unCheckedChildren="Hidden" />
                    </Form.Item>
                </Card>

                {/* Custom CSS */}
                <Card
                    size="small"
                    title={
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <LuEye /> Advanced
                        </span>
                    }
                    style={{ marginBottom: 16 }}
                >
                    <Form.Item
                        name="customCss"
                        label="Custom CSS (max 2000 characters)"
                        extra="Injected into help widget and KB pages. Use with caution."
                    >
                        <Input.TextArea
                            rows={4}
                            maxLength={2000}
                            showCount
                            placeholder=".help-widget-header { border-radius: 12px; }"
                            style={{ fontFamily: 'monospace', fontSize: 12 }}
                        />
                    </Form.Item>
                </Card>

                <Button
                    type="primary"
                    onClick={handleSave}
                    loading={saving}
                    style={{ width: 200 }}
                >
                    Save Branding
                </Button>
            </Form>
        </div>
    );
}
