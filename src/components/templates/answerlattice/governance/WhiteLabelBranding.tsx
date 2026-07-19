'use client'

/**
 * Answerlattice — Advanced Branding Profile
 *
 * Private configuration prototype. It is not applied to customer surfaces.
 * Feature-flagged: ENABLE_ANSWERLATTICE_WHITE_LABEL
 *
 * @see __docs__/answerlattice/advanced-white-label/
 */

import { FEATURE_FLAGS } from '@config/features';
import {
    isAnswerlatticeAdvancedBrandingHttpsUrl,
    parseAnswerlatticeAdvancedBranding,
} from '@lib/answerlattice/advancedBrandingContracts';
import {
    ANSWERLATTICE_DEFAULT_BRANDING,
    AnswerlatticeBrandingConfig,
} from '@type/answerlattice';
import {
    Alert,
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
    message
} from 'antd';
import { useState } from 'react';
import {
    LuImage,
    LuPaintbrush,
    LuShield,
    LuType
} from 'react-icons/lu';

const { Text, Title } = Typography;

interface Props {
    initialConfig?: Partial<AnswerlatticeBrandingConfig>;
    onSave?: (config: AnswerlatticeBrandingConfig) => Promise<void>;
}

const getColorValue = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (
        value
        && typeof value === 'object'
        && 'toHexString' in value
        && typeof value.toHexString === 'function'
    ) {
        return value.toHexString();
    }
    return undefined;
};

const isFormValidationError = (error: unknown): boolean => (
    Boolean(error && typeof error === 'object' && 'errorFields' in error)
);

const optionalHttpsUrlRule = {
    validator: async (_: unknown, value: unknown) => {
        if (!value || isAnswerlatticeAdvancedBrandingHttpsUrl(value)) return;
        throw new Error('Use an HTTPS URL without credentials, whitespace, or a fragment');
    },
};

export default function WhiteLabelBranding({ initialConfig, onSave }: Props) {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);

    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_WHITE_LABEL) {
        return <Empty description="Advanced branding is not enabled" />;
    }

    const defaults = { ...ANSWERLATTICE_DEFAULT_BRANDING, ...initialConfig };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const config = parseAnswerlatticeAdvancedBranding({
                companyName: values.companyName || defaults.companyName,
                logoUrl: values.logoUrl || undefined,
                faviconUrl: values.faviconUrl || undefined,
                primaryColor: getColorValue(values.primaryColor) || defaults.primaryColor,
                accentColor: getColorValue(values.accentColor),
                backgroundColor: getColorValue(values.backgroundColor),
                textColor: getColorValue(values.textColor),
                headerBackground: getColorValue(values.headerBackground),
                headerTextColor: getColorValue(values.headerTextColor),
                poweredByVisible: values.poweredByVisible ?? true,
                supportEmail: values.supportEmail || undefined,
                privacyPolicyUrl: values.privacyPolicyUrl || undefined,
                termsUrl: values.termsUrl || undefined,
            });

            if (onSave) {
                await onSave(config);
            }
            message.success('Branding profile saved');
        } catch (err) {
            if (!isFormValidationError(err)) {
                message.error('Failed to save branding profile');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Alert
                type="warning"
                showIcon
                message="Private profile only"
                description="These values are not applied to the widget, hosted help, knowledge base, or emails. Use Widget settings for the live widget appearance."
            />
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
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="companyName"
                                label="Company Name"
                                rules={[
                                    { required: true, message: 'Company name is required' },
                                    { max: 100, message: 'Use 100 characters or fewer' },
                                ]}
                            >
                                <Input placeholder="Your Company" />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="supportEmail"
                                label="Support Email"
                                rules={[
                                    { type: 'email', message: 'Use a valid email address' },
                                    { max: 160, message: 'Use 160 characters or fewer' },
                                ]}
                            >
                                <Input placeholder="support@yourcompany.com" type="email" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="logoUrl"
                                label="Logo URL"
                                rules={[optionalHttpsUrlRule]}
                            >
                                <Input placeholder="https://..." prefix={<LuImage size={14} />} />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="faviconUrl"
                                label="Favicon URL"
                                rules={[optionalHttpsUrlRule]}
                            >
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
                        <Col xs={12} md={6}>
                            <Form.Item name="primaryColor" label="Primary">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                            <Form.Item name="accentColor" label="Accent">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                            <Form.Item name="backgroundColor" label="Background">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                            <Form.Item name="textColor" label="Text">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={[16, 8]}>
                        <Col xs={12} md={6}>
                            <Form.Item name="headerBackground" label="Header Background">
                                <ColorPicker showText />
                            </Form.Item>
                        </Col>
                        <Col xs={12} md={6}>
                            <Form.Item name="headerTextColor" label="Header Text">
                                <ColorPicker showText />
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
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="privacyPolicyUrl"
                                label="Privacy Policy URL"
                                rules={[optionalHttpsUrlRule]}
                            >
                                <Input placeholder="https://..." />
                            </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                            <Form.Item
                                name="termsUrl"
                                label="Terms of Service URL"
                                rules={[optionalHttpsUrlRule]}
                            >
                                <Input placeholder="https://..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item
                        name="poweredByVisible"
                        label="Show 'Powered by Answerlattice' badge"
                        valuePropName="checked"
                    >
                        <Switch checkedChildren="Visible" unCheckedChildren="Hidden" />
                    </Form.Item>
                </Card>

                <Button
                    type="primary"
                    onClick={handleSave}
                    loading={saving}
                    style={{ width: 200 }}
                >
                    Save Profile
                </Button>
            </Form>
        </div>
    );
}
