'use client';

/**
 * Canonica Dashboard — Settings Template
 *
 * General workspace settings entry point. Widget installation/configuration
 * lives in /canonica/widget to keep a single save path and runtime contract.
 */

import { CANONICA_ROUTES, toCanonicaDashboardRoute } from '@constant/canonica/navigations';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { Alert, Button, Card, Checkbox, Descriptions, Divider, Flex, Form, Grid, Input, Select, Skeleton, Space, Switch, Tag, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LuBell, LuCode, LuSave, LuSettings } from 'react-icons/lu';

const { Title, Text } = Typography;

type WorkspaceProfile = {
    productName: string;
    productUrl?: string;
    supportEmail?: string;
    billingModel: 'free' | 'subscription' | 'usage' | 'one_time' | 'not_sure';
    primarySurfaces: string[];
};

type WorkflowIntegrationsForm = {
    slack: {
        enabled: boolean;
        webhookUrl?: string;
        clearWebhook?: boolean;
        channel?: string;
        eventFilters: string[];
    };
    email: {
        enabled: boolean;
        recipients: string[];
        eventFilters: string[];
    };
};

type WorkflowIntegrationsResponse = {
    slack?: {
        enabled?: boolean;
        webhookConfigured?: boolean;
        channel?: string;
        eventFilters?: string[];
    };
    email?: {
        enabled?: boolean;
        recipients?: string[];
        eventFilters?: string[];
    };
    eventTypes?: string[];
    defaultEventFilters?: string[];
};

const SURFACE_OPTIONS = [
    { label: 'Billing', value: 'billing' },
    { label: 'Onboarding', value: 'onboarding' },
    { label: 'Settings', value: 'settings' },
    { label: 'Team', value: 'team' },
    { label: 'Integrations', value: 'integrations' },
    { label: 'Release notes', value: 'release_notes' },
];

export default function CanonicaSettings() {
    const session = useClientAuthSession();
    const router = useRouter();
    const screens = Grid.useBreakpoint();
    const isMobile = screens.md !== true;
    const currentHostname = typeof window === 'undefined' ? undefined : window.location.hostname;
    const [form] = Form.useForm<WorkspaceProfile>();
    const [integrationsForm] = Form.useForm<WorkflowIntegrationsForm>();
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [savingProfile, setSavingProfile] = useState(false);
    const [loadingIntegrations, setLoadingIntegrations] = useState(true);
    const [savingIntegrations, setSavingIntegrations] = useState(false);
    const [integrationEventTypes, setIntegrationEventTypes] = useState<string[]>([]);
    const [slackWebhookConfigured, setSlackWebhookConfigured] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoadingProfile(true);
        try {
            const response = await fetch('/api/canonica/workspace-profile', { method: 'GET' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to load product details');
            form.setFieldsValue(data.profile || {});
        } catch (error: any) {
            message.error(error?.message || 'Failed to load product details');
        } finally {
            setLoadingProfile(false);
        }
    }, [form]);

    const loadIntegrations = useCallback(async () => {
        setLoadingIntegrations(true);
        try {
            const response = await fetch('/api/canonica/integrations', { method: 'GET' });
            const data: WorkflowIntegrationsResponse & { error?: string } = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to load workflow notifications');
            const defaults = data.defaultEventFilters || [];
            setIntegrationEventTypes(data.eventTypes || []);
            setSlackWebhookConfigured(Boolean(data.slack?.webhookConfigured));
            integrationsForm.setFieldsValue({
                slack: {
                    enabled: Boolean(data.slack?.enabled),
                    webhookUrl: '',
                    clearWebhook: false,
                    channel: data.slack?.channel || '',
                    eventFilters: data.slack?.eventFilters?.length ? data.slack.eventFilters : defaults,
                },
                email: {
                    enabled: Boolean(data.email?.enabled),
                    recipients: data.email?.recipients || [],
                    eventFilters: data.email?.eventFilters?.length ? data.email.eventFilters : defaults,
                },
            });
        } catch (error: any) {
            message.error(error?.message || 'Failed to load workflow notifications');
        } finally {
            setLoadingIntegrations(false);
        }
    }, [integrationsForm]);

    useEffect(() => {
        loadProfile();
        loadIntegrations();
    }, [loadIntegrations, loadProfile]);

    const handleSaveProfile = useCallback(async () => {
        setSavingProfile(true);
        try {
            const values = await form.validateFields();
            const response = await fetch('/api/canonica/workspace-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to save product details');
            form.setFieldsValue(data.profile || values);
            message.success('Product details saved');
        } catch (error: any) {
            message.error(error?.message || 'Failed to save product details');
        } finally {
            setSavingProfile(false);
        }
    }, [form]);

    const handleSaveIntegrations = useCallback(async () => {
        setSavingIntegrations(true);
        try {
            const values = await integrationsForm.validateFields();
            const response = await fetch('/api/canonica/integrations', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data: WorkflowIntegrationsResponse & { error?: string } = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to save workflow notifications');
            setSlackWebhookConfigured(Boolean(data.slack?.webhookConfigured));
            integrationsForm.setFieldsValue({
                slack: {
                    enabled: Boolean(data.slack?.enabled),
                    webhookUrl: '',
                    clearWebhook: false,
                    channel: data.slack?.channel || '',
                    eventFilters: data.slack?.eventFilters || [],
                },
                email: {
                    enabled: Boolean(data.email?.enabled),
                    recipients: data.email?.recipients || [],
                    eventFilters: data.email?.eventFilters || [],
                },
            });
            message.success('Workflow notifications saved');
        } catch (error: any) {
            message.error(error?.message || 'Failed to save workflow notifications');
        } finally {
            setSavingIntegrations(false);
        }
    }, [integrationsForm]);

    const eventTypeOptions = integrationEventTypes.map(value => ({
        value,
        label: value.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    }));

    return (
        <Flex vertical gap={isMobile ? 14 : 20}>
            <div>
                <Title level={4} style={{ margin: 0 }}>Product Details</Title>
                <Text type="secondary">Workspace profile and management shortcuts</Text>
            </div>

            <Card
                title={<Flex align="center" gap={8}><LuSettings size={16} /> Workspace Profile</Flex>}
                extra={!isMobile && (
                    <Button type="primary" icon={<LuSave size={14} />} loading={savingProfile} onClick={handleSaveProfile}>
                        Save
                    </Button>
                )}
            >
                {loadingProfile ? (
                    <Skeleton active paragraph={{ rows: 6 }} />
                ) : (
                    <Flex vertical gap={16}>
                        <Alert
                            type="info"
                            showIcon
                            message="These details power setup, widget verification, and support routing."
                            description="Use Product Surfaces for detailed page mapping after saving the main profile."
                        />
                        <Form form={form} layout="vertical">
                            <Form.Item name="productName" label="Product name" rules={[{ required: true, message: 'Product name is required' }]}>
                                <Input placeholder="Acme CRM" />
                            </Form.Item>
                            <Form.Item name="productUrl" label="Product URL">
                                <Input placeholder="https://app.example.com" />
                            </Form.Item>
                            <Form.Item name="supportEmail" label="Support email">
                                <Input placeholder="support@example.com" />
                            </Form.Item>
                            <Form.Item name="billingModel" label="Billing model" initialValue="subscription">
                                <Select
                                    options={[
                                        { value: 'subscription', label: 'Subscription' },
                                        { value: 'usage', label: 'Usage based' },
                                        { value: 'one_time', label: 'One-time payment' },
                                        { value: 'free', label: 'Free product' },
                                        { value: 'not_sure', label: 'Not sure yet' },
                                    ]}
                                />
                            </Form.Item>
                            <Form.Item name="primarySurfaces" label="Main product pages" initialValue={['billing', 'onboarding', 'settings']}>
                                <Select mode="multiple" options={SURFACE_OPTIONS} placeholder="Select the pages users ask about most" />
                            </Form.Item>
                        </Form>
                        {isMobile && (
                            <Button type="primary" block icon={<LuSave size={14} />} loading={savingProfile} onClick={handleSaveProfile}>
                                Save Product Details
                            </Button>
                        )}
                    </Flex>
                )}
            </Card>

            <Card title="Workspace Access">
                <Descriptions column={1} size="small">
                    <Descriptions.Item label="Signed in as">{session?.user?.email || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Account ID">{session?.tId || session?.user?.tenantId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Workspace ID">{session?.sId || session?.user?.storeId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Product"><Tag color="blue">Canonica</Tag></Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title={<Flex align="center" gap={8}><LuCode size={16} /> Widget Management</Flex>}>
                <Flex vertical gap={12}>
                    <Flex vertical={isMobile} align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12}>
                        <Text type="secondary">
                            Configure the embeddable widget, create keys, copy install code, set origins, blocked routes, and preview desktop/mobile behavior.
                        </Text>
                        <Button type="primary" onClick={() => router.push(toCanonicaDashboardRoute(CANONICA_ROUTES.WIDGET, currentHostname))}>
                            Open Widget Management
                        </Button>
                    </Flex>
                    <Space wrap>
                        <Button onClick={() => router.push(toCanonicaDashboardRoute(CANONICA_ROUTES.PRODUCT_SURFACES, currentHostname))}>
                            Map Product Surfaces
                        </Button>
                    </Space>
                </Flex>
            </Card>

            <Card
                title={<Flex align="center" gap={8}><LuBell size={16} /> Workflow Notifications</Flex>}
                extra={!isMobile && (
                    <Button type="primary" icon={<LuSave size={14} />} loading={savingIntegrations} onClick={handleSaveIntegrations}>
                        Save
                    </Button>
                )}
            >
                {loadingIntegrations ? (
                    <Skeleton active paragraph={{ rows: 5 }} />
                ) : (
                    <Flex vertical gap={16}>
                        <Alert
                            type="info"
                            showIcon
                            message="Send governance alerts to Slack or email."
                            description="Use this for drift, repeated gaps, coverage drops, and new review items. Webhook secrets stay server-side and are not shown after save."
                        />

                        <Form form={integrationsForm} layout="vertical">
                            <Card size="small" title="Slack">
                                <Flex vertical gap={12}>
                                    <Form.Item name={['slack', 'enabled']} valuePropName="checked" style={{ marginBottom: 0 }}>
                                        <Switch checkedChildren="On" unCheckedChildren="Off" />
                                    </Form.Item>
                                    <Form.Item
                                        name={['slack', 'webhookUrl']}
                                        label={slackWebhookConfigured ? 'Slack webhook URL (already configured)' : 'Slack webhook URL'}
                                        extra={slackWebhookConfigured ? 'Leave blank to keep the existing webhook.' : 'Use a Slack incoming webhook URL from hooks.slack.com.'}
                                    >
                                        <Input.Password placeholder={slackWebhookConfigured ? 'Existing webhook kept if blank' : 'https://hooks.slack.com/services/...'} autoComplete="off" />
                                    </Form.Item>
                                    {slackWebhookConfigured && (
                                        <Form.Item name={['slack', 'clearWebhook']} valuePropName="checked" style={{ marginBottom: 0 }}>
                                            <Checkbox>Remove saved Slack webhook</Checkbox>
                                        </Form.Item>
                                    )}
                                    <Form.Item name={['slack', 'channel']} label="Channel label">
                                        <Input placeholder="#support-review" maxLength={80} />
                                    </Form.Item>
                                    <Form.Item name={['slack', 'eventFilters']} label="Events">
                                        <Select mode="multiple" options={eventTypeOptions} placeholder="Choose events" />
                                    </Form.Item>
                                </Flex>
                            </Card>

                            <Divider style={{ margin: '16px 0' }} />

                            <Card size="small" title="Email">
                                <Flex vertical gap={12}>
                                    <Form.Item name={['email', 'enabled']} valuePropName="checked" style={{ marginBottom: 0 }}>
                                        <Switch checkedChildren="On" unCheckedChildren="Off" />
                                    </Form.Item>
                                    <Form.Item
                                        name={['email', 'recipients']}
                                        label="Recipients"
                                        extra="Maximum 5 recipients. Email delivery also requires SMTP to be configured in Canonica functions."
                                    >
                                        <Select mode="tags" tokenSeparators={[',', ' ']} placeholder="owner@example.com" />
                                    </Form.Item>
                                    <Form.Item name={['email', 'eventFilters']} label="Events">
                                        <Select mode="multiple" options={eventTypeOptions} placeholder="Choose events" />
                                    </Form.Item>
                                </Flex>
                            </Card>
                        </Form>

                        {isMobile && (
                            <Button type="primary" block icon={<LuSave size={14} />} loading={savingIntegrations} onClick={handleSaveIntegrations}>
                                Save Workflow Notifications
                            </Button>
                        )}
                    </Flex>
                )}
            </Card>
        </Flex>
    );
}
