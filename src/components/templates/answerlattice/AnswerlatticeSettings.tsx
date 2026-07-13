'use client';

/**
 * Answerlattice Dashboard — Settings Template
 *
 * General workspace settings entry point. Widget installation/configuration
 * lives in /answerlattice/widget to keep a single save path and runtime contract.
 */

import { ANSWERLATTICE_ROUTES, toAnswerlatticeDashboardRoute } from '@constant/answerlattice/navigations';
import TIMEZONES_LIST from '@data/timeZones';
import { useClientAuthSession } from '@hook/useClientAuthSession';
import { getBoundedAnswerlatticeStringContext, logAnswerlatticeFailure } from '@lib/answerlattice/diagnostics';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { Alert, Button, Card, Checkbox, Descriptions, Divider, Flex, Form, Grid, Input, Select, Skeleton, Space, Switch, Tag, Typography, message } from 'antd';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { LuBell, LuCode, LuSave, LuSend, LuSettings } from 'react-icons/lu';
import AnswerlatticeSupportTruthExport from './settings/AnswerlatticeSupportTruthExport';

const { Title, Text } = Typography;
const ANSWERLATTICE_PROFILE_LOAD_FAILED = 'Could not load product details';
const ANSWERLATTICE_PROFILE_SAVE_FAILED = 'Could not save product details';
const ANSWERLATTICE_INTEGRATIONS_LOAD_FAILED = 'Could not load workflow notifications';
const ANSWERLATTICE_INTEGRATIONS_SAVE_FAILED = 'Could not save workflow notifications';
const ANSWERLATTICE_INTEGRATIONS_TEST_FAILED = 'Could not send test notification';
const ANSWERLATTICE_LAST_DELIVERY_NEEDS_REVIEW = 'Last delivery needs review';
const ANSWERLATTICE_SETTINGS_RESPONSE_JSON_MAX_BYTES = 64 * 1024;
const ANSWERLATTICE_SETTINGS_REQUEST_POLICY: Pick<RequestInit, 'cache' | 'credentials' | 'redirect'> = {
    cache: 'no-store',
    credentials: 'same-origin',
    redirect: 'manual',
};

type WorkspaceProfile = {
    productName: string;
    productUrl?: string;
    supportEmail?: string;
    billingModel: 'subscription' | 'usage' | 'one_time' | 'not_sure';
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

type WorkspaceProfileResponse = {
    profile: WorkspaceProfile;
};

type IntegrationTestResponse = {
    eventId: string;
    message?: string;
};

type AnswerlatticeSettingsResponseKind =
    | 'profile_load'
    | 'profile_save'
    | 'integrations_load'
    | 'integrations_save'
    | 'integrations_test';

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

const isRecord = (value: unknown): value is Record<string, unknown> => (
    Boolean(value) && typeof value === 'object' && !Array.isArray(value)
);

const isStringArray = (value: unknown): value is string[] => (
    Array.isArray(value) && value.every(item => typeof item === 'string')
);

const isWorkspaceProfileResponse = (value: unknown): value is WorkspaceProfileResponse => {
    if (!isRecord(value) || !isRecord(value.profile)) return false;
    const profile = value.profile;
    return (
        typeof profile.productName === 'string'
        && typeof profile.billingModel === 'string'
        && isStringArray(profile.primarySurfaces)
    );
};

const isWorkflowIntegrationsResponse = (value: unknown): value is WorkflowIntegrationsResponse => (
    isRecord(value)
    && isRecord(value.slack)
    && isRecord(value.email)
    && isStringArray(value.eventTypes)
    && isStringArray(value.defaultEventFilters)
    && isRecord(value.health)
);

const isIntegrationTestResponse = (value: unknown): value is IntegrationTestResponse => (
    isRecord(value)
    && typeof value.eventId === 'string'
    && value.eventId.length > 0
    && (value.message === undefined || typeof value.message === 'string')
);

const getSettingsResponseLogContext = (kind: AnswerlatticeSettingsResponseKind, response: Response) => ({
    ...getBoundedAnswerlatticeStringContext('responseKind', kind),
    responseOk: response.ok,
    responseStatus: response.status,
});

const readAnswerlatticeSettingsResponse = async <T,>(
    response: Response,
    kind: AnswerlatticeSettingsResponseKind,
    isValid: (value: unknown) => value is T,
    fallbackMessage: string,
): Promise<T> => {
    let payload: unknown = null;
    try {
        payload = await readJsonResponseWithLimit<unknown>(response, ANSWERLATTICE_SETTINGS_RESPONSE_JSON_MAX_BYTES);
    } catch (error) {
        logAnswerlatticeFailure(
            'answerlattice_settings_response_parse_failed',
            error,
            getSettingsResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    if (!response.ok) {
        logAnswerlatticeFailure(
            'answerlattice_settings_response_rejected',
            undefined,
            getSettingsResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    if (!isValid(payload)) {
        logAnswerlatticeFailure(
            'answerlattice_settings_response_invalid',
            undefined,
            getSettingsResponseLogContext(kind, response),
        );
        throw new Error(fallbackMessage);
    }

    return payload;
};

export default function AnswerlatticeSettings() {
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
            const response = await fetch('/api/answerlattice/workspace-profile', {
                ...ANSWERLATTICE_SETTINGS_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readAnswerlatticeSettingsResponse(
                response,
                'profile_load',
                isWorkspaceProfileResponse,
                ANSWERLATTICE_PROFILE_LOAD_FAILED,
            );
            form.setFieldsValue(data.profile);
        } catch {
            message.error(ANSWERLATTICE_PROFILE_LOAD_FAILED);
        } finally {
            setLoadingProfile(false);
        }
    }, [form]);

    const loadIntegrations = useCallback(async () => {
        setLoadingIntegrations(true);
        try {
            const response = await fetch('/api/answerlattice/integrations', {
                ...ANSWERLATTICE_SETTINGS_REQUEST_POLICY,
                method: 'GET',
            });
            const data = await readAnswerlatticeSettingsResponse(
                response,
                'integrations_load',
                isWorkflowIntegrationsResponse,
                ANSWERLATTICE_INTEGRATIONS_LOAD_FAILED,
            );
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
        } catch {
            message.error(ANSWERLATTICE_INTEGRATIONS_LOAD_FAILED);
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
            const response = await fetch('/api/answerlattice/workspace-profile', {
                ...ANSWERLATTICE_SETTINGS_REQUEST_POLICY,
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data = await readAnswerlatticeSettingsResponse(
                response,
                'profile_save',
                isWorkspaceProfileResponse,
                ANSWERLATTICE_PROFILE_SAVE_FAILED,
            );
            form.setFieldsValue(data.profile);
            message.success('Product details saved');
        } catch {
            message.error(ANSWERLATTICE_PROFILE_SAVE_FAILED);
        } finally {
            setSavingProfile(false);
        }
    }, [form]);

    const handleSaveIntegrations = useCallback(async () => {
        setSavingIntegrations(true);
        try {
            const values = await integrationsForm.validateFields();
            const response = await fetch('/api/answerlattice/integrations', {
                ...ANSWERLATTICE_SETTINGS_REQUEST_POLICY,
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const data = await readAnswerlatticeSettingsResponse(
                response,
                'integrations_save',
                isWorkflowIntegrationsResponse,
                ANSWERLATTICE_INTEGRATIONS_SAVE_FAILED,
            );
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
        } catch {
            message.error(ANSWERLATTICE_INTEGRATIONS_SAVE_FAILED);
        } finally {
            setSavingIntegrations(false);
        }
    }, [integrationsForm, integrationHealth]);

    const handleTestIntegrations = useCallback(async () => {
        setTestingIntegrations(true);
        try {
            const response = await fetch('/api/answerlattice/integrations/test', {
                ...ANSWERLATTICE_SETTINGS_REQUEST_POLICY,
                method: 'POST',
            });
            const data = await readAnswerlatticeSettingsResponse(
                response,
                'integrations_test',
                isIntegrationTestResponse,
                ANSWERLATTICE_INTEGRATIONS_TEST_FAILED,
            );
            message.success(data.message || 'Test notification queued');
            window.setTimeout(loadIntegrations, 2500);
        } catch {
            message.error(ANSWERLATTICE_INTEGRATIONS_TEST_FAILED);
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
                        {ANSWERLATTICE_LAST_DELIVERY_NEEDS_REVIEW}
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

            <Card title="Account Reference">
                <Descriptions column={1} size="small">
                    <Descriptions.Item label="Signed in as">{session?.user?.email || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Account reference">{session?.tId || session?.user?.tenantId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Workspace reference">{session?.sId || session?.user?.storeId || '-'}</Descriptions.Item>
                    <Descriptions.Item label="Product"><Tag color="blue">Answerlattice</Tag></Descriptions.Item>
                </Descriptions>
            </Card>

            <Card title={<Flex align="center" gap={8}><LuCode size={16} /> Widget Management</Flex>}>
                <Flex vertical gap={12}>
                    <Flex vertical={isMobile} align={isMobile ? 'stretch' : 'center'} justify="space-between" gap={12}>
                        <Text type="secondary">
                            Configure the embeddable widget, create keys, copy install code, set origins, blocked routes, and preview desktop/mobile behavior.
                        </Text>
                        <Button type="primary" onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.WIDGET, currentHostname))}>
                            Open Widget Management
                        </Button>
                    </Flex>
                    <Space wrap>
                        <Button onClick={() => router.push(toAnswerlatticeDashboardRoute(ANSWERLATTICE_ROUTES.PRODUCT_SURFACES, currentHostname))}>
                            Map Product Surfaces
                        </Button>
                    </Space>
                </Flex>
            </Card>

            <AnswerlatticeSupportTruthExport />

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
                                        extra="Maximum 5 recipients. Email delivery also requires SMTP to be configured in Answerlattice functions."
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
