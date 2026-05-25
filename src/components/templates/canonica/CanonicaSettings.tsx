'use client';

/**
 * Canonica Dashboard — Settings Template
 *
 * General workspace settings entry point. Widget installation/configuration
 * lives in /canonica/widget to keep a single save path and runtime contract.
 */

import { CANONICA_ROUTES, toCanonicaDashboardRoute } from '@constant/canonica/navigations';
import TIMEZONES_LIST from '@data/timeZones';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getCanonicaUiErrorMessage } from '@lib/canonica/uiErrors';
import { Alert, Button, Card, Checkbox, Descriptions, Divider, Flex, Form, Grid, Input, Select, Skeleton, Space, Switch, Tag, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LuBell, LuCode, LuSave, LuSend, LuSettings } from 'react-icons/lu';

const { Title, Text } = Typography;

type WorkspaceProfile = {
    productName: string;
    productUrl?: string;
    supportEmail?: string;
    billingModel: 'free' | 'subscription' | 'usage' | 'one_time' | 'not_sure';
    primarySurfaces: string[];
    timeZone?: string;
    businessDayEndTime?: string;
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
    health?: Record<string, {
        lastStatus?: string | null;
        lastAttemptAt?: string | null;
        lastSuccessAt?: string | null;
        lastFailureAt?: string | null;
        lastError?: string | null;
    }>;
};

const SURFACE_OPTIONS = [
    { label: 'Billing', value: 'billing' },
    { label: 'Onboarding', value: 'onboarding' },
    { label: 'Settings', value: 'settings' },
    { label: 'Team', value: 'team' },
    { label: 'Integrations', value: 'integrations' },
    { label: 'Release notes', value: 'release_notes' },
];

const TIMEZONE_OPTIONS = (TIMEZONES_LIST as Array<{ label: string; tzCode: string }>).map((zone) => ({
    label: zone.label,
    value: zone.tzCode,
}));

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
    const [testingIntegrations, setTestingIntegrations] = useState(false);
    const [integrationEventTypes, setIntegrationEventTypes] = useState<string[]>([]);
    const [integrationHealth, setIntegrationHealth] = useState<WorkflowIntegrationsResponse['health']>({});
    const [slackWebhookConfigured, setSlackWebhookConfigured] = useState(false);

    const loadProfile = useCallback(async () => {
        setLoadingProfile(true);
        try {
            const response = await fetch('/api/canonica/workspace-profile', { method: 'GET' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to load product details');
            form.setFieldsValue(data.profile || {});
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not load product details'));
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
            setIntegrationHealth(data.health || {});
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
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not load workflow notifications'));
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
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not save product details'));
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
            setIntegrationHealth(data.health || integrationHealth);
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
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not save workflow notifications'));
        } finally {
            setSavingIntegrations(false);
        }
    }, [integrationsForm, integrationHealth]);

    const handleTestIntegrations = useCallback(async () => {
        setTestingIntegrations(true);
        try {
            const response = await fetch('/api/canonica/integrations/test', { method: 'POST' });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(data.error || 'Failed to send test notification');
            message.success(data.message || 'Test notification queued');
            window.setTimeout(loadIntegrations, 2500);
        } catch (error) {
            message.error(getCanonicaUiErrorMessage(error, 'Could not send test notification'));
        } finally {
            setTestingIntegrations(false);
        }
    }, [loadIntegrations]);

    const eventTypeOptions = integrationEventTypes.map(value => ({
        value,
        label: value.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' '),
    }));

    const renderHealthStatus = (adapter: 'slack' | 'email') => {
        const status = integrationHealth?.[adapter];
        if (!status?.lastAttemptAt) return <Text type="secondary">No delivery test yet.</Text>;
        const color = status.lastStatus === 'success' ? 'green' : status.lastStatus === 'rate_limited' ? 'gold' : 'red';
        return (
            <Flex vertical gap={4}>
                <Space wrap>
                    <Tag color={color}>{status.lastStatus || 'unknown'}</Tag>
                    <Text type="secondary">{new Date(status.lastAttemptAt).toLocaleString()}</Text>
                </Space>
                {status.lastError && (
                    <Text type="secondary">
                        {getCanonicaUiErrorMessage(status.lastError, 'Last delivery needs review')}
                    </Text>
                )}
            </Flex>
        );
    };

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
                            <Form.Item name="timeZone" label="Workspace timezone" initialValue="UTC">
                                <Select
                                    showSearch
                                    optionFilterProp="label"
                                    options={TIMEZONE_OPTIONS}
                                    placeholder="UTC"
                                />
                            </Form.Item>
                            <Form.Item name="businessDayEndTime" label="Support day ends" initialValue="00:00">
                                <Input type="time" />
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
                    <Space>
                        <Button icon={<LuSend size={14} />} loading={testingIntegrations} onClick={handleTestIntegrations}>
                            Send Test
                        </Button>
                        <Button type="primary" icon={<LuSave size={14} />} loading={savingIntegrations} onClick={handleSaveIntegrations}>
                            Save
                        </Button>
                    </Space>
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
                                    <div>
                                        <Text strong>Delivery health</Text>
                                        <div style={{ marginTop: 6 }}>{renderHealthStatus('slack')}</div>
                                    </div>
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
                                    <div>
                                        <Text strong>Delivery health</Text>
                                        <div style={{ marginTop: 6 }}>{renderHealthStatus('email')}</div>
                                    </div>
                                </Flex>
                            </Card>
                        </Form>

                        {isMobile && (
                            <Flex vertical gap={8}>
                                <Button block icon={<LuSend size={14} />} loading={testingIntegrations} onClick={handleTestIntegrations}>
                                    Send Test Notification
                                </Button>
                                <Button type="primary" block icon={<LuSave size={14} />} loading={savingIntegrations} onClick={handleSaveIntegrations}>
                                    Save Workflow Notifications
                                </Button>
                            </Flex>
                        )}
                    </Flex>
                )}
            </Card>
        </Flex>
    );
}
